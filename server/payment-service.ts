import { PaymentModel } from './mongodb.js';
import { verifyTransaction } from './ton-service.js';
import { storage } from './storage-mongodb.js';

interface CreatePaymentParams { walletAddress: string; packageType: string; merchantWallet: string; }

export async function createPendingPayment({ walletAddress, packageType, merchantWallet }: CreatePaymentParams) {
  if (packageType !== 'dragon_boost') throw new Error('Invalid package type');
  return PaymentModel.create({ walletAddress, walletFrom: walletAddress, walletTo: merchantWallet, amountTon: 0.5, packageType, status: 'pending', createdAt: new Date() });
}

export async function verifyPayment(paymentId: string, merchantWallet: string) {
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'verified') return { success: true, alreadyVerified: true };
  const result = await verifyTransaction(merchantWallet, '0.5', payment.walletFrom);
  if (!result.verified) return { success: false, error: result.error || '0.5 TON transfer not found yet', canRetry: true };
  payment.status = 'verified'; payment.txHash = result.txHash || ''; payment.lt = result.lt || ''; payment.rawTx = result.rawTx; payment.verifiedAt = new Date(); await payment.save();
  await storage.updateMiningPower(payment.walletAddress, 5);
  return { success: true, payment };
}

export async function retryPendingPayments(merchantWallet: string) {
  const pending = await PaymentModel.find({ status:'pending', createdAt:{ $gte:new Date(Date.now()-60*60*1000) } });
  for (const payment of pending) { try { await verifyPayment(payment._id.toString(), merchantWallet); } catch {} }
}

export async function startPaymentRetryWorker(merchantWallet: string) {
  setInterval(() => retryPendingPayments(merchantWallet).catch(()=>{}), 30000);
}
