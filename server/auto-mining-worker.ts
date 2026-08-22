import { storage } from './storage-mongodb';
import { config } from './config';

// Auto-mining worker - processes mining rewards for users with auto-mining active
export class AutoMiningWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private intervalMinutes: number = 1) {}

  start() {
    if (this.isRunning) {
      console.log('[Auto-Mining Worker] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[Auto-Mining Worker] Starting... (checking every ${this.intervalMinutes} minute(s))`);

    // Run immediately on start
    this.processAutoMining();

    // Then run at intervals
    this.intervalId = setInterval(
      () => this.processAutoMining(),
      this.intervalMinutes * 60 * 1000
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Auto-Mining Worker] Stopped');
  }

  private async processAutoMining() {
    try {
      console.log('[Auto-Mining Worker] Checking for users with completed mining timers...');

      // Get all users with active auto-mining subscriptions
      const usersWithAutoMining = await storage.getUsersWithActiveAutoMining();
      const now = new Date();
      let processedCount = 0;

      console.log(`[Auto-Mining Worker] Found ${usersWithAutoMining.length} user(s) with active auto-mining`);

      for (const user of usersWithAutoMining) {
        try {

          // Check if mining timer has completed (6 hours since last claim)
          const lastClaim = user.lastClaimTime;
          if (!lastClaim) {
            // First time mining - allow immediate claim
            await this.autoClaimForUser(user.walletAddress, now);
            processedCount++;
            continue;
          }

          const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastClaim >= config.miningIntervalHours) {
            // Mining timer completed - auto-claim for user
            await this.autoClaimForUser(user.walletAddress, now);
            processedCount++;
          }
        } catch (error) {
          console.error(`[Auto-Mining Worker] Error processing user ${user.walletAddress}:`, error);
        }
      }

      if (processedCount > 0) {
        console.log(`[Auto-Mining Worker] Processed ${processedCount} auto-mining claim(s)`);
      }
    } catch (error) {
      console.error('[Auto-Mining Worker] Error in processAutoMining:', error);
    }
  }

  private async autoClaimForUser(walletAddress: string, now: Date) {
    try {
      const user = await storage.getUser(walletAddress);
      if (!user) {
        console.error(`[Auto-Mining Worker] User ${walletAddress} not found`);
        return;
      }

      // Check mining power (account for expired subscriptions)
      let activeMiningPower = user.miningPower;
      if (user.miningPowerExpiryAt && now > user.miningPowerExpiryAt) {
        activeMiningPower = 1;
      }

      // Calculate rewards
      const baseReward = config.miningBaseReward;
      const reward = baseReward * activeMiningPower;

      // Directly add to balance (auto-mining bypasses pending state)
      await storage.updateUserBalance(walletAddress, reward, 0);
      await storage.updateLastClaimTime(walletAddress, now);

      console.log(`[Auto-Mining Worker] Auto-claimed ${reward} HA-RATE for user ${walletAddress} (power: ${activeMiningPower}x)`);
    } catch (error) {
      console.error(`[Auto-Mining Worker] Error auto-claiming for ${walletAddress}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const autoMiningWorker = new AutoMiningWorker(1); // Check every 1 minute
