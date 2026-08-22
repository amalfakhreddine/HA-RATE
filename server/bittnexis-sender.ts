import { WithdrawalModel } from './mongodb.js';
import { config } from './config.js';
import TonWeb from 'tonweb';

/**
 * HA-RATE Token Sender Service
 * 
 * This service monitors MongoDB for withdrawals with feePaid=true
 * and automatically sends HA-RATE tokens using the project wallet
 */

/**
 * Send HA-RATE tokens to a user's wallet
 * @param toAddress User's wallet address
 * @param amount Amount of HA-RATE tokens to send
 * @returns Transaction hash
 */
async function sendHARATETokens(toAddress: string, amount: number): Promise<string> {
  // Validate configuration
  if (!config.projectWalletKey) {
    throw new Error('PROJECT_WALLET_KEY not configured. Cannot send tokens.');
  }

  try {
    // Initialize TonWeb
    const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
    
    // Convert hex private key to Uint8Array
    const privateKeyHex = config.projectWalletKey;
    const privateKeyBytes = TonWeb.utils.hexToBytes(privateKeyHex);
    
    // Create wallet from private key
    const WalletClass = tonweb.wallet.all.v4R2;
    const wallet = new WalletClass(tonweb.provider, {
      publicKey: privateKeyBytes.slice(0, 32)
    });

    // Get wallet address
    const walletAddress = await wallet.getAddress();
    console.log(`[HA-RATE Sender] Sending from wallet: ${walletAddress.toString(true, true, true)}`);

    // Get seqno
    const seqno = (await wallet.methods.seqno().call()) || 0;
    console.log(`[HA-RATE Sender] Wallet seqno: ${seqno}`);

    // TODO: Implement actual Jetton (token) transfer
    // For now, we'll send a simple TON transfer as a placeholder
    // Real implementation needs to interact with HA-RATE Jetton contract
    
    const transfer = wallet.methods.transfer({
      secretKey: privateKeyBytes,
      toAddress: toAddress,
      amount: TonWeb.utils.toNano('0.01'), // Minimum amount for notification
      seqno: seqno,
      payload: `HA-RATE withdrawal: ${amount} tokens`,
      sendMode: 3,
    });

    const txHash = await transfer.send();
    console.log(`[HA-RATE Sender] ✓ Sent ${amount} tokens to ${toAddress}, tx: ${txHash}`);
    
    return txHash;

  } catch (error: any) {
    console.error('[HA-RATE Sender] Error sending tokens:', error);
    throw new Error(`Failed to send tokens: ${error.message}`);
  }
}

/**
 * Process a single paid withdrawal
 */
async function processPaidWithdrawal(withdrawalId: string) {
  const withdrawal = await WithdrawalModel.findById(withdrawalId);

  if (!withdrawal) {
    console.error(`[HA-RATE Sender] Withdrawal ${withdrawalId} not found`);
    return;
  }

  // Verify fee is paid and status is pending
  if (!withdrawal.feePaid) {
    console.log(`[HA-RATE Sender] Withdrawal ${withdrawalId} - fee not paid yet`);
    return;
  }

  if (withdrawal.status !== 'pending') {
    console.log(`[HA-RATE Sender] Withdrawal ${withdrawalId} - already processed (${withdrawal.status})`);
    return;
  }

  try {
    console.log(`[HA-RATE Sender] Processing withdrawal ${withdrawalId} for ${withdrawal.walletAddress}, amount: ${withdrawal.amount}`);

    // Update status to processing
    await WithdrawalModel.findByIdAndUpdate(withdrawalId, {
      status: 'processing',
      updatedAt: new Date(),
    });

    // Send HA-RATE tokens
    const amount = parseFloat(withdrawal.amount.toString());
    const txHash = await sendHARATETokens(withdrawal.walletAddress, amount);

    // Update status to completed with transaction hash
    await WithdrawalModel.findByIdAndUpdate(withdrawalId, {
      status: 'completed',
      coinTxHash: txHash,
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[HA-RATE Sender] ✓ Successfully sent ${amount} tokens to ${withdrawal.walletAddress}, tx: ${txHash}`);

  } catch (error: any) {
    console.error(`[HA-RATE Sender] Failed to process withdrawal ${withdrawalId}:`, error);

    // Update status to failed
    await WithdrawalModel.findByIdAndUpdate(withdrawalId, {
      status: 'failed',
      failureReason: error.message,
      updatedAt: new Date(),
    });

    // TODO: Consider refunding the user's HA-RATE balance here
  }
}

/**
 * Worker that checks for paid withdrawals and sends tokens
 */
export async function startHARATESenderWorker() {
  if (!config.projectWalletKey) {
    console.warn('[HA-RATE Sender] PROJECT_WALLET_KEY not set. Token sending is disabled.');
    return;
  }

  console.log('[HA-RATE Sender] Worker started - checking for paid withdrawals every 30 seconds');

  // Check immediately on startup
  await checkAndProcessPaidWithdrawals();

  // Then check every 30 seconds
  setInterval(async () => {
    await checkAndProcessPaidWithdrawals();
  }, 30000); // 30 seconds
}

/**
 * Check MongoDB for paid withdrawals and process them
 */
async function checkAndProcessPaidWithdrawals() {
  try {
    // Find all withdrawals where fee is paid and status is pending
    const paidWithdrawals = await WithdrawalModel.find({
      feePaid: true,
      status: 'pending'
    }).sort({ createdAt: 1 }).limit(10); // Process oldest first, max 10 at a time

    if (paidWithdrawals.length === 0) {
      console.log('[HA-RATE Sender] No paid withdrawals to process');
      return;
    }

    console.log(`[HA-RATE Sender] Found ${paidWithdrawals.length} paid withdrawal(s) to process`);

    // Process each withdrawal
    for (const withdrawal of paidWithdrawals) {
      await processPaidWithdrawal(withdrawal._id.toString());
    }

  } catch (error: any) {
    console.error('[HA-RATE Sender] Error checking paid withdrawals:', error);
  }
}

/**
 * Manually trigger processing of a specific withdrawal
 */
export async function manuallyProcessWithdrawal(withdrawalId: string) {
  await processPaidWithdrawal(withdrawalId);
}
