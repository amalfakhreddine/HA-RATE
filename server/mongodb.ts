import mongoose from 'mongoose';
import { config } from './config';

if (!config.mongodbUri) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to add the MongoDB connection string?",
  );
}

const MONGODB_URI = config.mongodbUri;

// MongoDB connection
let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  try {
    // Use consistent database name to match existing MongoDB database
    await mongoose.connect(MONGODB_URI, {
      dbName: 'Bittnexis_protocol'
    });
    isConnected = true;
    console.log('[MongoDB] ✓ Connected to MongoDB Atlas successfully');
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[MongoDB] Disconnected from database');
  isConnected = false;
});

// User Schema
const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  bittnexisBalance: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  usdtBalance: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  pendingMiningReward: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  referralCode: { type: String, required: true, unique: true, index: true },
  referredBy: { type: String, default: null },
  miningPower: { type: Number, default: 1 },
  miningPowerExpiryAt: { type: Date, default: null },
  hasAutoMine: { type: Boolean, default: false },
  autoMineExpiryAt: { type: Date, default: null },
  lastClaimTime: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Task Schema
const taskSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, index: true },
  taskId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
});

// Compound index for efficient task queries
taskSchema.index({ walletAddress: 1, taskId: 1 }, { unique: true });

// Payment Schema for TON blockchain payments
const paymentSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, index: true },
  walletFrom: { type: String, required: true },
  walletTo: { type: String, required: true },
  amountTon: { type: mongoose.Schema.Types.Decimal128, required: true },
  txHash: { type: String, default: null },
  lt: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'failed'], 
    default: 'pending',
    index: true 
  },
  packageType: { 
    type: String, 
    enum: ['dragon_boost', 'auto_mine', '2x_power', '3x_power', '4x_power'],
    required: true 
  },
  verifiedAt: { type: Date, default: null },
  rawTx: { type: mongoose.Schema.Types.Mixed, default: null },
  failureReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  retryCount: { type: Number, default: 0 },
  lastRetryAt: { type: Date, default: null },
});

// Compound indexes for payment queries
paymentSchema.index({ txHash: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ walletAddress: 1, status: 1 });

// Nonce Schema for wallet authentication
const nonceSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, index: true },
  nonce: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index for auto-cleanup of expired nonces
nonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Withdrawal Schema for automatic coin withdrawals with fee verification
const withdrawalSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  walletAddress: { type: String, required: true, index: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  feeExpected: { type: mongoose.Schema.Types.Decimal128, required: true },
  feePaid: { type: Boolean, default: false, index: true },
  feeTxHash: { type: String, default: null, index: true },
  coinTxHash: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'fee_verified', 'processing', 'completed', 'failed'], 
    default: 'pending',
    index: true 
  },
  failureReason: { type: String, default: null },
  retryCount: { type: Number, default: 0 },
  lastRetryAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  feeVerifiedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
});

// Compound indexes for withdrawal queries
withdrawalSchema.index({ walletAddress: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ feePaid: 1, status: 1 });
withdrawalSchema.index({ userId: 1, createdAt: -1 });

// App Configuration Schema (for admin-controlled settings)
const appConfigSchema = new mongoose.Schema({
  configKey: { type: String, required: true, unique: true, index: true },
  miningIntervalHours: { type: Number, default: 6 },
  miningBaseReward: { type: Number, default: 0.2 },
  subscriptionPrices: {
    type: Map,
    of: Number,
    default: new Map([
      ['auto_mine', 15],
      ['2x_power', 10],
      ['3x_power', 18],
      ['4x_power', 23]
    ])
  },
  tgeEnabled: { type: Boolean, default: false },
  tgeDate: { type: Date, default: null },
  withdrawalActive: { type: Boolean, default: false },
  registrationsPaused: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

// Task Definition Schema (template for tasks)
const taskDefinitionSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  reward: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['daily', 'one_time', 'social'], 
    required: true 
  },
  action: { type: String, required: true },
  iconType: { type: String, default: 'CheckSquare' },
  verificationRequired: { type: Boolean, default: true },
  verificationUrl: { type: String, default: null },
  resetInterval: { type: Number, default: null }, // hours for daily tasks
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.model('User', userSchema);
export const TaskModel = mongoose.model('Task', taskSchema);
export const PaymentModel = mongoose.model('Payment', paymentSchema);
export const NonceModel = mongoose.model('Nonce', nonceSchema);
export const WithdrawalModel = mongoose.model('Withdrawal', withdrawalSchema);
export const AppConfigModel = mongoose.model('AppConfig', appConfigSchema);
export const TaskDefinitionModel = mongoose.model('TaskDefinition', taskDefinitionSchema);
