import { AppConfigModel, TaskDefinitionModel, UserModel, TaskModel } from './mongodb.js';
import { config } from './config.js';

// Check if a wallet address is an admin
export function isAdmin(walletAddress: string | null): boolean {
  if (!walletAddress) return false;
  return config.adminWallets.includes(walletAddress);
}

// Get or create app configuration
export async function getAppConfig() {
  let appConfig = await AppConfigModel.findOne({ configKey: 'main' });
  
  if (!appConfig) {
    // Create default configuration
    appConfig = await AppConfigModel.create({
      configKey: 'main',
      miningIntervalHours: 6,
      miningBaseReward: 0.2,
      subscriptionPrices: new Map([
        ['auto_mine', 15],
        ['2x_power', 10],
        ['3x_power', 18],
        ['4x_power', 23]
      ]),
      tgeEnabled: false,
      tgeDate: null,
      withdrawalActive: false,
    });
  }
  
  return {
    miningIntervalHours: appConfig.miningIntervalHours,
    miningBaseReward: appConfig.miningBaseReward,
    subscriptionPrices: Object.fromEntries(appConfig.subscriptionPrices),
    tgeEnabled: appConfig.tgeEnabled,
    tgeDate: appConfig.tgeDate,
    withdrawalActive: appConfig.withdrawalActive || false,
    registrationsPaused: appConfig.registrationsPaused || false,
    updatedAt: appConfig.updatedAt,
  };
}

// Update mining configuration
export async function updateMiningConfig(intervalHours: number, baseReward: number) {
  const appConfig = await AppConfigModel.findOneAndUpdate(
    { configKey: 'main' },
    { 
      miningIntervalHours: intervalHours,
      miningBaseReward: baseReward,
      updatedAt: new Date()
    },
    { new: true, upsert: true }
  );
  
  return {
    miningIntervalHours: appConfig.miningIntervalHours,
    miningBaseReward: appConfig.miningBaseReward,
  };
}

// Update subscription prices
export async function updateSubscriptionPrices(prices: { [key: string]: number }) {
  const appConfig = await AppConfigModel.findOneAndUpdate(
    { configKey: 'main' },
    { 
      subscriptionPrices: new Map(Object.entries(prices)),
      updatedAt: new Date()
    },
    { new: true, upsert: true }
  );
  
  return Object.fromEntries(appConfig.subscriptionPrices);
}

// Toggle withdrawal activation
export async function toggleWithdrawalActive(active: boolean) {
  const appConfig = await AppConfigModel.findOneAndUpdate(
    { configKey: 'main' },
    { 
      withdrawalActive: active,
      updatedAt: new Date()
    },
    { new: true, upsert: true }
  );
  
  return {
    withdrawalActive: appConfig.withdrawalActive,
  };
}

// Toggle new user registrations
export async function toggleRegistrationsPaused(paused: boolean) {
  const appConfig = await AppConfigModel.findOneAndUpdate(
    { configKey: 'main' },
    { 
      registrationsPaused: paused,
      updatedAt: new Date()
    },
    { new: true, upsert: true }
  );
  
  return {
    registrationsPaused: appConfig.registrationsPaused,
  };
}

// Get all task definitions
export async function getAllTaskDefinitions() {
  const tasks = await TaskDefinitionModel.find().sort({ createdAt: -1 });
  return tasks.map(task => ({
    id: task._id.toString(),
    taskId: task.taskId,
    title: task.title,
    description: task.description,
    reward: task.reward,
    type: task.type,
    action: task.action,
    iconType: task.iconType,
    verificationRequired: task.verificationRequired,
    verificationUrl: task.verificationUrl,
    resetInterval: task.resetInterval,
    isActive: task.isActive,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));
}

// Create task definition
export async function createTaskDefinition(taskData: any) {
  const task = await TaskDefinitionModel.create({
    ...taskData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return {
    id: task._id.toString(),
    taskId: task.taskId,
    title: task.title,
    description: task.description,
    reward: task.reward,
    type: task.type,
    action: task.action,
    iconType: task.iconType,
    verificationRequired: task.verificationRequired,
    verificationUrl: task.verificationUrl,
    resetInterval: task.resetInterval,
    isActive: task.isActive,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

// Update task definition
export async function updateTaskDefinition(taskId: string, updates: any) {
  const task = await TaskDefinitionModel.findOneAndUpdate(
    { taskId },
    { ...updates, updatedAt: new Date() },
    { new: true }
  );
  
  if (!task) throw new Error('Task not found');
  
  return {
    id: task._id.toString(),
    taskId: task.taskId,
    title: task.title,
    description: task.description,
    reward: task.reward,
    type: task.type,
    action: task.action,
    iconType: task.iconType,
    verificationRequired: task.verificationRequired,
    verificationUrl: task.verificationUrl,
    resetInterval: task.resetInterval,
    isActive: task.isActive,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

// Delete task definition
export async function deleteTaskDefinition(taskId: string) {
  const task = await TaskDefinitionModel.findOneAndDelete({ taskId });
  if (!task) throw new Error('Task not found');
  
  // Also delete all user task progress for this task
  await TaskModel.deleteMany({ taskId });
  
  return { success: true, deletedTaskId: taskId };
}

// Get all user tasks for a specific task definition (for verification)
export async function getUserTasksForDefinition(taskId: string) {
  const userTasks = await TaskModel.find({ taskId }).sort({ lastUpdated: -1 });
  return userTasks.map(task => ({
    walletAddress: task.walletAddress,
    taskId: task.taskId,
    progress: task.progress,
    completed: task.completed,
    lastUpdated: task.lastUpdated,
  }));
}

// Manually verify/complete a task for a user
export async function verifyUserTask(walletAddress: string, taskId: string, completed: boolean = true) {
  const task = await TaskModel.findOneAndUpdate(
    { walletAddress, taskId },
    { 
      completed,
      progress: completed ? 100 : 0,
      lastUpdated: new Date()
    },
    { new: true, upsert: true }
  );
  
  return {
    walletAddress: task.walletAddress,
    taskId: task.taskId,
    progress: task.progress,
    completed: task.completed,
    lastUpdated: task.lastUpdated,
  };
}

// Enable TGE (Token Generation Event)
export async function enableTGE(tgeDate: Date) {
  // 1. Set TGE enabled flag
  const appConfig = await AppConfigModel.findOneAndUpdate(
    { configKey: 'main' },
    { 
      tgeEnabled: true,
      tgeDate,
      updatedAt: new Date()
    },
    { new: true, upsert: true }
  );
  
  // 2. Expire all active subscriptions
  const now = new Date();
  await UserModel.updateMany(
    {
      $or: [
        { miningPowerExpiryAt: { $gt: now } },
        { autoMineExpiryAt: { $gt: now } }
      ]
    },
    {
      miningPowerExpiryAt: now,
      autoMineExpiryAt: now,
      miningPower: 1,
      hasAutoMine: false
    }
  );
  
  // 3. Mark all incomplete tasks as completed (optional - give everyone full rewards)
  // Uncomment if you want to give all users credit for incomplete tasks
  // await TaskModel.updateMany(
  //   { completed: false },
  //   { completed: true, progress: 100, lastUpdated: now }
  // );
  
  return {
    tgeEnabled: true,
    tgeDate,
    message: 'TGE enabled successfully. All subscriptions have been expired.',
  };
}

// Disable TGE (Token Generation Event)
export async function disableTGE() {
  const appConfig = await AppConfigModel.findOneAndUpdate(
    { configKey: 'main' },
    { 
      tgeEnabled: false,
      tgeDate: null,
      updatedAt: new Date()
    },
    { new: true, upsert: true }
  );
  
  return {
    tgeEnabled: false,
    tgeDate: null,
    message: 'TGE has been disabled.',
  };
}

// Get admin statistics
export async function getAdminStats() {
  const totalUsers = await UserModel.countDocuments();
  const totalBalance = await UserModel.aggregate([
    {
      $group: {
        _id: null,
        totalBittnexis: { $sum: { $toDouble: '$bittnexisBalance' } }
      }
    }
  ]);
  
  const activeSubscriptions = await UserModel.countDocuments({
    $or: [
      { miningPowerExpiryAt: { $gt: new Date() } },
      { autoMineExpiryAt: { $gt: new Date() } }
    ]
  });
  
  const totalTasks = await TaskDefinitionModel.countDocuments();
  const completedTasks = await TaskModel.countDocuments({ completed: true });
  
  return {
    totalUsers,
    totalBittnexisDistributed: totalBalance[0]?.totalBittnexis || 0,
    activeSubscriptions,
    totalTaskDefinitions: totalTasks,
    completedUserTasks: completedTasks,
  };
}
