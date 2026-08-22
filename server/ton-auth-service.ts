import { Address, Cell, loadStateInit, contractAddress } from '@ton/core';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import { NonceModel } from './mongodb.js';

interface TonProofPayload {
  address: string;
  proof: {
    timestamp: number;
    domain: {
      lengthBytes: number;
      value: string;
    };
    signature: string;
    payload: string;
    state_init: string;
  };
}

const ALLOWED_DOMAINS = [
  process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost',
  'localhost',
  '127.0.0.1'
];

const VALID_AUTH_TIME = 600;

export async function generateNonce(walletAddress: string): Promise<string> {
  const nonce = Buffer.from(nacl.randomBytes(24)).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  await NonceModel.findOneAndDelete({ walletAddress });
  
  await NonceModel.create({
    walletAddress,
    nonce,
    expiresAt
  });
  
  return nonce;
}

export async function verifyTonProof(payload: TonProofPayload): Promise<boolean> {
  try {
    const domain = payload.proof.domain.value;
    const isDomainAllowed = ALLOWED_DOMAINS.some(
      allowed => domain.includes(allowed) || allowed.includes(domain)
    );
    
    if (!isDomainAllowed) {
      console.error('[TON Auth] Invalid domain:', domain);
      return false;
    }
    
    const nonceDoc = await NonceModel.findOne({ 
      nonce: payload.proof.payload,
      walletAddress: payload.address,
      expiresAt: { $gte: new Date() }
    });
    
    if (!nonceDoc) {
      console.error('[TON Auth] Invalid or expired nonce, or nonce does not match wallet address');
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (now - VALID_AUTH_TIME > payload.proof.timestamp) {
      console.error('[TON Auth] Proof expired');
      return false;
    }
    
    const stateInitCell = Cell.fromBase64(payload.proof.state_init);
    const stateInit = loadStateInit(stateInitCell.beginParse());
    
    if (!stateInit.data) {
      console.error('[TON Auth] No data in stateInit');
      return false;
    }
    
    const dataSlice = stateInit.data.beginParse();
    dataSlice.skip(32);
    dataSlice.skip(32);
    const publicKey = dataSlice.loadBuffer(32);
    
    const wantedAddress = Address.parse(payload.address);
    const address = contractAddress(wantedAddress.workChain, stateInit);
    
    if (!address.equals(wantedAddress)) {
      console.error('[TON Auth] Address mismatch');
      return false;
    }
    
    const wc = Buffer.alloc(4);
    wc.writeUInt32BE(address.workChain, 0);
    
    const ts = Buffer.alloc(8);
    ts.writeBigUInt64LE(BigInt(payload.proof.timestamp), 0);
    
    const dl = Buffer.alloc(4);
    dl.writeUInt32LE(payload.proof.domain.lengthBytes, 0);
    
    const message = Buffer.concat([
      Buffer.from('ton-proof-item-v2/', 'utf8'),
      wc,
      address.hash,
      dl,
      Buffer.from(payload.proof.domain.value, 'utf8'),
      ts,
      Buffer.from(payload.proof.payload, 'utf8')
    ]);
    
    const messageHash = createHash('sha256').update(message).digest();
    
    const fullMessage = Buffer.concat([
      Buffer.from([0xff, 0xff]),
      Buffer.from('ton-connect', 'utf8'),
      messageHash
    ]);
    
    const finalHash = createHash('sha256').update(fullMessage).digest();
    
    const signature = Buffer.from(payload.proof.signature, 'base64');
    const isValid = nacl.sign.detached.verify(finalHash, signature, publicKey);
    
    if (isValid) {
      await NonceModel.deleteOne({ nonce: payload.proof.payload });
    }
    
    return isValid;
    
  } catch (error: any) {
    console.error('[TON Auth] Verification error:', error);
    return false;
  }
}
