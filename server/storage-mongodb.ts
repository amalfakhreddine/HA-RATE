import { type User, type InsertUser, type Task, type InsertTask, type Withdrawal } from "@shared/schema";
import { UserModel, TaskModel, WithdrawalModel, connectToDatabase } from "./mongodb";

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'Bittnexis';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface IStorage {
  // User methods
  getUser(walletAddress: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser, referredBy?: string): Promise<User>;
  updateUserBalance(walletAddress: string, bittnexisAmount: number, usdtAmount?: number): Promise<User>;
  updateMiningPower(walletAddress: string, power: number): Promise<User>;
  updateAutoMine(walletAddress: string, hasAutoMine: boolean): Promise<User>;
  updateLastClaimTime(walletAddress: string, time: Date): Promise<User>;
  getLeaderboard(limit?: number): Promise<User[]>;
  getReferrals(walletAddress: string): Promise<User[]>;
  getUsersWithActiveAutoMining(limit?: number): Promise<User[]>;
  
  // Mining Claim methods
  updatePendingMiningReward(walletAddress: string, amount: number): Promise<User>;
  claimMiningReward(walletAddress: string): Promise<User>;
  
  // Withdrawal methods
  createWithdrawal(walletAddress: string, amount: number, feeTransactionHash: string): Promise<Withdrawal>;
  getWithdrawal(id: string): Promise<Withdrawal | undefined>;
  getUserWithdrawals(walletAddress: string): Promise<Withdrawal[]>;
  updateWithdrawalStatus(id: string, status: string, coinTransactionHash?: string): Promise<Withdrawal>;
  
  // Task methods
  getTasksByUser(walletAddress: string): Promise<Task[]>;
  getTask(walletAddress: string, taskId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskProgress(walletAddress: string, taskId: string, progress: number, completed?: boolean): Promise<Task>;
}

export class MongoDBStorage implements IStorage {
  constructor() {
    // Ensure connection on initialization
    connectToDatabase().catch(err => {
      console.error('Failed to connect to MongoDB:', err);
    });
  }

  private toUser(doc: any): User {
    return {
      walletAddress: doc.walletAddress,
      username: doc.username,
      bittnexisBalance: doc.bittnexisBalance ? doc.bittnexisBalance.toString() : "0",
      usdtBalance: doc.usdtBalance ? doc.usdtBalance.toString() : "0",
      pendingMiningReward: doc.pendingMiningReward ? doc.pendingMiningReward.toString() : "0",
      referralCode: doc.referralCode,
      referredBy: doc.referredBy,
      miningPower: doc.miningPower,
      miningPowerExpiryAt: doc.miningPowerExpiryAt,
      hasAutoMine: doc.hasAutoMine,
      autoMineExpiryAt: doc.autoMineExpiryAt,
      lastClaimTime: doc.lastClaimTime,
      createdAt: doc.createdAt,
    };
  }

  private toTask(doc: any): Task {
    return {
      id: doc._id.toString(),
      walletAddress: doc.walletAddress,
      taskId: doc.taskId,
      progress: doc.progress,
      completed: doc.completed,
      lastUpdated: doc.lastUpdated,
    };
  }

  async getUser(walletAddress: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ walletAddress });
    return user ? this.toUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return user ? this.toUser(user) : undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ referralCode: code });
    return user ? this.toUser(user) : undefined;
  }

  async createUser(insertUser: InsertUser, referredBy?: string): Promise<User> {
    await connectToDatabase();
    const referralCode = generateReferralCode();
    
    const user = await UserModel.create({
      ...insertUser,
      referralCode,
      referredBy: referredBy || null,
      bittnexisBalance: 0,
      usdtBalance: 0,
      miningPower: 1,
      hasAutoMine: false,
      lastClaimTime: null,
      createdAt: new Date(),
    });
    
    return this.toUser(user);
  }

  async updateUserBalance(walletAddress: string, bittnexisAmount: number, usdtAmount: number = 0): Promise<User> {
    const user = await UserModel.findOne({ walletAddress });
    if (!user) throw new Error('User not found');
    
    user.bittnexisBalance = (parseFloat(user.bittnexisBalance.toString()) + bittnexisAmount).toFixed(8) as any;
    user.usdtBalance = (parseFloat(user.usdtBalance.toString()) + usdtAmount).toFixed(2) as any;
    
    await user.save();
    return this.toUser(user);
  }

  async updateMiningPower(walletAddress: string, power: number): Promise<User> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    const user = await UserModel.findOneAndUpdate(
      { walletAddress },
      { 
        miningPower: power,
        miningPowerExpiryAt: expiryDate
      },
      { new: true }
    );
    
    if (!user) throw new Error('User not found');
    return this.toUser(user);
  }

  async updateAutoMine(walletAddress: string, hasAutoMine: boolean): Promise<User> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    const user = await UserModel.findOneAndUpdate(
      { walletAddress },
      { 
        hasAutoMine,
        autoMineExpiryAt: hasAutoMine ? expiryDate : null
      },
      { new: true }
    );
    
    if (!user) throw new Error('User not found');
    return this.toUser(user);
  }

  async updateLastClaimTime(walletAddress: string, time: Date): Promise<User> {
    const user = await UserModel.findOneAndUpdate(
      { walletAddress },
      { lastClaimTime: time },
      { new: true }
    );
    
    if (!user) throw new Error('User not found');
    return this.toUser(user);
  }

  async updatePendingMiningReward(walletAddress: string, amount: number): Promise<User> {
    const user = await UserModel.findOne({ walletAddress });
    if (!user) throw new Error('User not found');
    
    user.pendingMiningReward = (parseFloat(user.pendingMiningReward.toString()) + amount).toFixed(8) as any;
    await user.save();
    
    return this.toUser(user);
  }

  async claimMiningReward(walletAddress: string): Promise<User> {
    const user = await UserModel.findOne({ walletAddress });
    if (!user) throw new Error('User not found');
    
    const pendingAmount = parseFloat(user.pendingMiningReward.toString());
    if (pendingAmount <= 0) {
      throw new Error('No pending mining rewards to claim');
    }
    
    // Transfer pending rewards to balance and reset pending
    user.bittnexisBalance = (parseFloat(user.bittnexisBalance.toString()) + pendingAmount).toFixed(8) as any;
    user.pendingMiningReward = "0" as any;
    user.lastClaimTime = new Date();
    await user.save();
    
    console.log(`[Mining Claim] User ${walletAddress} claimed ${pendingAmount} HA-RATE tokens`);
    return this.toUser(user);
  }

  private toWithdrawal(doc: any): Withdrawal {
    return {
      id: doc._id.toString(),
      walletAddress: doc.walletAddress,
      amount: doc.amount ? doc.amount.toString() : "0",
      feeTransactionHash: doc.feeTransactionHash,
      coinTransactionHash: doc.coinTransactionHash,
      status: doc.status,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
    };
  }

  async createWithdrawal(walletAddress: string, amount: number, feeTransactionHash: string): Promise<Withdrawal> {
    const withdrawal = await WithdrawalModel.create({
      walletAddress,
      amount,
      feeTransactionHash,
      status: 'pending',
      createdAt: new Date(),
    });
    
    console.log(`[Withdrawal] Created withdrawal request for ${walletAddress}, amount: ${amount}, fee tx: ${feeTransactionHash}`);
    return this.toWithdrawal(withdrawal);
  }

  async getWithdrawal(id: string): Promise<Withdrawal | undefined> {
    const withdrawal = await WithdrawalModel.findById(id);
    return withdrawal ? this.toWithdrawal(withdrawal) : undefined;
  }

  async getUserWithdrawals(walletAddress: string): Promise<Withdrawal[]> {
    const withdrawals = await WithdrawalModel.find({ walletAddress }).sort({ createdAt: -1 });
    return withdrawals.map(w => this.toWithdrawal(w));
  }

  async updateWithdrawalStatus(id: string, status: string, coinTransactionHash?: string): Promise<Withdrawal> {
    const updateData: any = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    if (coinTransactionHash) {
      updateData.coinTransactionHash = coinTransactionHash;
    }
    
    const withdrawal = await WithdrawalModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!withdrawal) throw new Error('Withdrawal not found');
    
    console.log(`[Withdrawal] Updated withdrawal ${id} status to ${status}`);
    return this.toWithdrawal(withdrawal);
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    await connectToDatabase();
    // Sort by numeric value of Decimal128 field in descending order
    const users = await UserModel
      .find()
      .sort({ bittnexisBalance: -1 })
      .limit(limit);
    
    return users.map(u => this.toUser(u));
  }

  async getReferrals(walletAddress: string): Promise<User[]> {
    const user = await this.getUser(walletAddress);
    if (!user) return [];
    
    const referrals = await UserModel.find({ referredBy: user.referralCode });
    return referrals.map(r => this.toUser(r));
  }

  async getUsersWithActiveAutoMining(limit?: number): Promise<User[]> {
    await connectToDatabase();
    
    const now = new Date();
    
    // Find all users who have hasAutoMine=true and autoMineExpiryAt is either null or in the future
    let query = UserModel.find({
      hasAutoMine: true,
      $or: [
        { autoMineExpiryAt: null },
        { autoMineExpiryAt: { $gt: now } }
      ]
    });
    
    // Only apply limit if explicitly provided as a positive number (for testing purposes)
    if (typeof limit === 'number' && limit > 0) {
      query = query.limit(limit);
    }
    
    const users = await query.exec();
    
    return users.map(u => this.toUser(u));
  }

  async getTasksByUser(walletAddress: string): Promise<Task[]> {
    const tasks = await TaskModel.find({ walletAddress });
    return tasks.map(t => this.toTask(t));
  }

  async getTask(walletAddress: string, taskId: string): Promise<Task | undefined> {
    const task = await TaskModel.findOne({ walletAddress, taskId });
    return task ? this.toTask(task) : undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const task = await TaskModel.create({
      ...insertTask,
      progress: insertTask.progress ?? 0,
      completed: insertTask.completed ?? false,
      lastUpdated: new Date(),
    });
    
    return this.toTask(task);
  }

  async updateTaskProgress(walletAddress: string, taskId: string, progress: number, completed: boolean = false): Promise<Task> {
    let task = await TaskModel.findOne({ walletAddress, taskId });
    
    if (task) {
      task.progress = progress;
      task.completed = completed;
      task.lastUpdated = new Date();
      await task.save();
      return this.toTask(task);
    }
    
    // Create new task if it doesn't exist
    return this.createTask({
      walletAddress,
      taskId,
      progress,
      completed,
    });
  }
}

export const storage = new MongoDBStorage();
