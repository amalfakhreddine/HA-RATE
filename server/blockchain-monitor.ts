import { WithdrawalModel } from './mongodb.js';
import { config } from './config.js';
import TonWeb from 'tonweb';

/**
 * TON Blockchain Monitor Service
 * 
 * Monitors the TON blockchain for withdrawal fee payments
 * and updates withdrawal records when fees are detected
 */

const WITHDRAWAL_FEE = '0.50'; // TON fee for withdrawals

interface Transaction {
  source: string;
  value: string;
  hash: string;
}

/**
 * Check if a withdrawal fee has been paid by scanning blockchain transactions
 */
async function checkFeePayment(
  walletAddress: string,
  feeExpected: string,
  merchantWallet: string
): Promise<string | null> {
  try {
    const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
    
    // Get recent transactions for the merchant wallet
    const transactions = await tonweb.provider.getTransactions(merchantWallet, 50);
    
    // Convert expected fee to nanotons for comparison
    const feeNanotons = TonWeb.utils.toNano(feeExpected);
    
    // Check each transaction
    for (const tx of transactions) {
      try {
        // Check if transaction has incoming message
        if (!tx.in_msg || !tx.in_msg.source) continue;
        
        const source = tx.in_msg.source;
        const value = tx.in_msg.value;
        
        // Normalize addresses for comparison
        const normalizedSource = source.toLowerCase().replace(/[^0-9a-f:]/g, '');
        const normalizedWallet = walletAddress.toLowerCase().replace(/[^0-9a-f:]/g, '');
        
        // Check if source matches user wallet and value matches expected fee (with small tolerance)
        if (normalizedSource === normalizedWallet) {
          const diff = Math.abs(parseInt(value) - parseInt(feeNanotons.toString()));
          const tolerance = parseInt(TonWeb.utils.toNano('0.01').toString()); // 0.01 TON tolerance
          
          if (diff <= tolerance) {
            // Found matching payment!
            const txHash = tx.transaction_id?.hash || 'unknown';
            console.log(`[Blockchain Monitor] ✓ Fee payment detected: ${walletAddress} → ${merchantWallet}, tx: ${txHash}`);
            return txHash;
          }
        }
      } catch (err) {
        // Skip invalid transactions
        continue;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('[Blockchain Monitor] Error checking fee payment:', error.message);
    return null;
  }
}

/**
 * Monitor pending withdrawals and verify fee payments
 */
export async function monitorPendingWithdrawals() {
  try {
    const merchantWallet = config.tonMerchantWallet;
    if (!merchantWallet) {
      console.warn('[Blockchain Monitor] Merchant wallet not configured, skipping fee checks');
      return;
    }

    // Find withdrawals waiting for fee payment
    const pendingWithdrawals = await WithdrawalModel.find({
      feePaid: false,
      status: 'pending'
    }).sort({ createdAt: 1 }).limit(20);

    if (pendingWithdrawals.length === 0) {
      console.log('[Blockchain Monitor] No pending withdrawals to check');
      return;
    }

    console.log(`[Blockchain Monitor] Checking ${pendingWithdrawals.length} pending withdrawal(s) for fee payments`);

    let verifiedCount = 0;

    for (const withdrawal of pendingWithdrawals) {
      try {
        const walletAddress = withdrawal.walletAddress;
        const feeExpected = withdrawal.feeExpected || WITHDRAWAL_FEE;
        
        // Check blockchain for fee payment
        const txHash = await checkFeePayment(walletAddress, feeExpected, merchantWallet);
        
        if (txHash) {
          // Fee paid! Update withdrawal record
          await WithdrawalModel.findByIdAndUpdate(withdrawal._id, {
            feePaid: true,
            feeTxHash: txHash,
            status: 'pending', // Still pending - needs token sending
            feeVerifiedAt: new Date(),
            updatedAt: new Date(),
          });
          
          verifiedCount++;
          console.log(`[Blockchain Monitor] ✓ Verified fee payment for withdrawal ${withdrawal._id}`);
        }
      } catch (error: any) {
        console.error(`[Blockchain Monitor] Error checking withdrawal ${withdrawal._id}:`, error.message);
      }
    }

    if (verifiedCount > 0) {
      console.log(`[Blockchain Monitor] ✓ Verified ${verifiedCount} fee payment(s)`);
    }

  } catch (error: any) {
    console.error('[Blockchain Monitor] Error in monitoring loop:', error);
  }
}

/**
 * Start the blockchain monitoring worker
 */
export function startBlockchainMonitor() {
  if (!config.tonMerchantWallet) {
    console.warn('[Blockchain Monitor] MAIN_WALLET not set. Fee monitoring is disabled.');
    return;
  }

  console.log('[Blockchain Monitor] Worker started - checking for fee payments every 60 seconds');

  // Check immediately on startup
  monitorPendingWithdrawals();

  // Then check every 60 seconds
  setInterval(async () => {
    await monitorPendingWithdrawals();
  }, 60000); // 60 seconds
}
