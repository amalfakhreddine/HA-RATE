import { WithdrawalModel } from './mongodb';
import { storage } from './storage-mongodb';
import { config } from './config';

// Fee configuration
const WITHDRAWAL_FEE_TON = 0.5;

interface CreateWithdrawalParams {
  walletAddress: string;
  amount: number;
}

/**
 * Create a new withdrawal request (automatic system)
 * 
 * New workflow:
 * 1. User requests withdrawal (no fee verification yet)
 * 2. System creates withdrawal record with status='pending', feePaid=false
 * 3. System returns fee payment instructions to user
 * 4. User pays fee to merchant wallet
 * 5. FastAPI cron job automatically detects fee payment
 * 6. FastAPI cron job automatically sends coins
 */
export async function createWithdrawalRequest(params: CreateWithdrawalParams) {
  const { walletAddress, amount } = params;
  
  // Get user
  const user = await storage.getUser(walletAddress);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if user has sufficient balance
  const balance = parseFloat(user.bittnexisBalance);
  if (balance < amount) {
    throw new Error(`Insufficient balance. You have ${balance} HA-RATE but requested ${amount}`);
  }
  
  if (amount <= 0) {
    throw new Error('Withdrawal amount must be greater than 0');
  }
  
  // Check merchant wallet is configured
  const merchantWallet = config.tonMerchantWallet;
  if (!merchantWallet) {
    throw new Error('Merchant wallet not configured');
  }
  
  // Deduct the amount from user's balance immediately
  await storage.updateUserBalance(walletAddress, -amount, 0);
  
  // Create withdrawal record with new schema
  const withdrawal = await WithdrawalModel.create({
    userId: walletAddress,
    walletAddress: walletAddress,
    amount: amount.toString(),
    feeExpected: WITHDRAWAL_FEE_TON.toString(),
    feePaid: false,
    status: 'pending',
    createdAt: new Date(),
  });
  
  console.log(`[Withdrawal] Created withdrawal request ${withdrawal._id} for ${walletAddress}, amount: ${amount} Bittnexis`);
  
  // Return withdrawal info with fee payment instructions
  return {
    success: true,
    withdrawal: {
      id: withdrawal._id.toString(),
      amount: amount,
      status: 'pending',
      feeRequired: WITHDRAWAL_FEE_TON,
      merchantWallet: merchantWallet,
      instructions: `Send exactly ${WITHDRAWAL_FEE_TON} TON to ${merchantWallet} to process your withdrawal. Your coins will be sent automatically within 1-2 minutes after fee payment is detected.`
    }
  };
}

export async function processWithdrawal(withdrawalId: string) {
  const withdrawal = await storage.getWithdrawal(withdrawalId);
  
  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }
  
  if (withdrawal.status !== 'pending') {
    return { success: false, error: 'Withdrawal already processed or failed' };
  }
  
  // Update status to processing
  await storage.updateWithdrawalStatus(withdrawalId, 'processing');
  
  try {
    // Send coins to user's wallet
    const txHash = await sendBittnexisCoins(withdrawal.walletAddress, parseFloat(withdrawal.amount));
    
    // Update status to completed
    await storage.updateWithdrawalStatus(withdrawalId, 'completed', txHash);
    
    console.log(`[Withdrawal] Successfully processed withdrawal ${withdrawalId}, tx: ${txHash}`);
    
    return { success: true, txHash };
  } catch (error: any) {
    console.error(`[Withdrawal] Failed to process withdrawal ${withdrawalId}:`, error);
    
    // Update status to failed and refund the user
    await storage.updateWithdrawalStatus(withdrawalId, 'failed');
    await storage.updateUserBalance(withdrawal.walletAddress, parseFloat(withdrawal.amount), 0);
    
    throw error;
  }
}

async function sendBittnexisCoins(toWalletAddress: string, amount: number): Promise<string> {
  // Check if project wallet is configured
  if (!config.projectWalletKey) {
    throw new Error('PROJECT_WALLET_KEY not configured. Cannot send HA-RATE tokens.');
  }
  
  // TODO: Implement actual HA-RATE token sending logic
  // This would involve:
  // 1. Creating a wallet from the project wallet private key
  // 2. Creating a transfer transaction for HA-RATE tokens (jetton transfer)
  // 3. Signing and sending the transaction
  // 4. Returning the transaction hash
  
  // For now, we'll throw an error to indicate this needs implementation
  throw new Error('Coin sending not yet implemented. Please configure TON_SENDER_PRIVATE_KEY and implement the sending logic.');
  
  // Example implementation (commented out):
  /*
  const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
  const wallet = tonweb.wallet.create({ 
    privateKey: TonWeb.utils.hexToBytes(config.tonSenderPrivateKey) 
  });
  
  const seqno = await wallet.methods.seqno().call() || 0;
  const transfer = wallet.methods.transfer({
    secretKey: TonWeb.utils.hexToBytes(config.tonSenderPrivateKey),
    toAddress: toWalletAddress,
    amount: TonWeb.utils.toNano(amount.toString()),
    seqno: seqno,
    payload: 'HA-RATE withdrawal',
    sendMode: 3,
  });
  
  const result = await transfer.send();
  return result; // Transaction hash
  */
}

export async function retryPendingWithdrawals() {
  const pendingWithdrawals = await WithdrawalModel.find({ 
    status: 'pending' 
  }).limit(10);
  
  console.log(`[Withdrawal Service] Processing ${pendingWithdrawals.length} pending withdrawals`);
  
  for (const withdrawal of pendingWithdrawals) {
    try {
      await processWithdrawal(withdrawal._id.toString());
    } catch (error) {
      console.error(`[Withdrawal Service] Failed to process withdrawal ${withdrawal._id}:`, error);
    }
  }
}
