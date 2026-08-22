import TonWeb from 'tonweb';
import { Address, Cell } from '@ton/core';
import { PaymentModel } from './mongodb.js';

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';
const TONCENTER_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';
const MIN_CONFIRMATIONS = 1;

const USDT_JETTON_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const USDT_DECIMALS = 6;

const tonweb = new TonWeb(new TonWeb.HttpProvider(TONCENTER_ENDPOINT, {
  apiKey: TONCENTER_API_KEY
}));

interface TransactionVerificationResult {
  verified: boolean;
  txHash?: string;
  lt?: string;
  amount?: string;
  rawTx?: any;
  error?: string;
}

export async function verifyTransaction(
  merchantWallet: string,
  expectedAmount: string,
  fromWallet: string,
  txHash?: string
): Promise<TransactionVerificationResult> {
  try {
    const merchantAddress = new TonWeb.utils.Address(merchantWallet);
    
    const transactions = await tonweb.getTransactions(merchantAddress.toString(true, true, true), 50);
    
    for (const tx of transactions) {
      if (!tx.in_msg || !tx.in_msg.source || !tx.in_msg.value) continue;
      
      const sourceAddress = tx.in_msg.source;
      const value = TonWeb.utils.fromNano(tx.in_msg.value);
      
      const matches = 
        sourceAddress.toLowerCase() === fromWallet.toLowerCase() &&
        Math.abs(parseFloat(value) - parseFloat(expectedAmount)) < 0.001;
      
      if (matches) {
        const txHashFound = tx.transaction_id?.hash || '';
        const ltFound = tx.transaction_id?.lt || '';
        
        if (txHash && txHashFound.toLowerCase() !== txHash.toLowerCase()) {
          continue;
        }
        
        const existingPayment = await PaymentModel.findOne({ 
          txHash: txHashFound,
          status: 'verified'
        });
        
        if (existingPayment) {
          return {
            verified: false,
            error: 'Transaction already used'
          };
        }
        
        return {
          verified: true,
          txHash: txHashFound,
          lt: ltFound,
          amount: value,
          rawTx: tx
        };
      }
    }
    
    return {
      verified: false,
      error: 'Transaction not found on blockchain'
    };
    
  } catch (error: any) {
    console.error('[TON Service] Verification error:', error);
    return {
      verified: false,
      error: error.message || 'Blockchain verification failed'
    };
  }
}

export async function getWalletBalance(address: string): Promise<string> {
  try {
    const tonAddress = new TonWeb.utils.Address(address);
    const balance = await tonweb.getBalance(tonAddress.toString(true, true, true));
    return TonWeb.utils.fromNano(balance);
  } catch (error) {
    console.error('[TON Service] Balance check error:', error);
    throw error;
  }
}

export function validateTonAddress(address: string): boolean {
  try {
    new TonWeb.utils.Address(address);
    return true;
  } catch {
    return false;
  }
}

async function getUserJettonWalletAddress(userAddress: string, jettonMasterAddress: string): Promise<string> {
  try {
    // Convert address to user-friendly format for TonCenter API
    let userFriendlyAddress: string;
    try {
      const tonAddress = new TonWeb.utils.Address(userAddress);
      userFriendlyAddress = tonAddress.toString(true, true, true); // user-friendly, bounceable, url-safe
      console.log('[TON Service] Converted address format:', { raw: userAddress, userFriendly: userFriendlyAddress });
    } catch (err) {
      console.error('[TON Service] Address conversion failed:', err);
      userFriendlyAddress = userAddress; // Use as-is if conversion fails
    }
    
    const response = await fetch('https://toncenter.com/api/v3/jetton/wallets', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': TONCENTER_API_KEY
      },
      body: JSON.stringify({
        owner_address: userFriendlyAddress,
        jetton_address: jettonMasterAddress
      })
    });
    
    const data = await response.json();
    console.log('[TON Service] Jetton wallet API response:', data);
    
    if (data.jetton_wallets && data.jetton_wallets.length > 0) {
      return data.jetton_wallets[0].address;
    }
    
    throw new Error('Jetton wallet not found for user');
  } catch (error) {
    console.error('[TON Service] Error getting Jetton wallet address:', error);
    throw error;
  }
}

export async function verifyUSDTJettonTransfer(
  merchantWallet: string,
  expectedAmountUsdt: string,
  fromWallet: string,
  paymentId: string
): Promise<TransactionVerificationResult> {
  try {
    const merchantJettonWallet = await getUserJettonWalletAddress(merchantWallet, USDT_JETTON_MASTER);
    console.log('[TON Service] Merchant USDT Jetton wallet:', merchantJettonWallet);
    
    const jettonWalletAddress = new TonWeb.utils.Address(merchantJettonWallet);
    const transactions = await tonweb.getTransactions(jettonWalletAddress.toString(true, true, true), 50);
    
    const expectedAmountRaw = Math.floor(parseFloat(expectedAmountUsdt) * Math.pow(10, USDT_DECIMALS));
    const expectedQueryId = BigInt('0x' + paymentId.slice(-16));
    
    console.log('[TON Service] Looking for USDT transfer:', {
      expectedAmount: expectedAmountRaw,
      expectedQueryId: expectedQueryId.toString(),
      merchantJettonWallet
    });
    
    for (const tx of transactions) {
      if (!tx.in_msg || !tx.in_msg.msg_data || tx.in_msg.msg_data['@type'] !== 'msg.dataRaw') continue;
      
      try {
        const msgBody = tx.in_msg.msg_data.body;
        if (!msgBody) continue;
        
        const cell = Cell.fromBoc(Buffer.from(msgBody, 'base64'))[0];
        const slice = cell.beginParse();
        
        const opCode = slice.loadUint(32);
        
        // internal_transfer op code - what merchant Jetton wallet receives
        if (opCode === 0x178d4519) {
          const queryId = slice.loadUintBig(64);
          const amount = slice.loadCoins();
          const fromAddress = slice.loadAddress();
          
          const senderJettonWallet = await getUserJettonWalletAddress(fromWallet, USDT_JETTON_MASTER);
          
          const amountMatches = Math.abs(Number(amount) - expectedAmountRaw) < 100;
          const queryIdMatches = queryId === expectedQueryId;
          const senderMatches = fromAddress.toString() === senderJettonWallet;
          
          console.log('[TON Service] Found internal_transfer:', {
            queryId: queryId.toString(),
            amount: amount.toString(),
            fromAddress: fromAddress.toString(),
            matches: { amountMatches, queryIdMatches, senderMatches }
          });
          
          if (amountMatches && queryIdMatches && senderMatches) {
            const txHashFound = tx.transaction_id?.hash || '';
            const ltFound = tx.transaction_id?.lt || '';
            
            const existingPayment = await PaymentModel.findOne({ 
              txHash: txHashFound,
              status: 'verified'
            });
            
            if (existingPayment) {
              return {
                verified: false,
                error: 'Transaction already used'
              };
            }
            
            return {
              verified: true,
              txHash: txHashFound,
              lt: ltFound,
              amount: expectedAmountUsdt,
              rawTx: tx
            };
          }
        }
      } catch (parseError) {
        console.error('[TON Service] Error parsing transaction:', parseError);
        continue;
      }
    }
    
    return {
      verified: false,
      error: 'USDT transfer not found on blockchain'
    };
    
  } catch (error: any) {
    console.error('[TON Service] USDT verification error:', error);
    return {
      verified: false,
      error: error.message || 'USDT verification failed'
    };
  }
}
