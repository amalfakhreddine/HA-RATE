import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-mongodb.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import session from "express-session";
import MongoStore from "connect-mongo";

// Extend Express Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup session middleware with MongoDB persistence
  const { config } = await import('./config.js');
  
  // Determine if we're running on HTTPS (Replit always uses HTTPS)
  const isSecure = process.env.NODE_ENV === 'production' || !!process.env.REPL_ID;
  
  // Only use sameSite: 'none' if frontend is on a different origin
  // In Replit, frontend and backend are on the same origin, so use 'lax'
  const isCrossOrigin = !!process.env.FRONTEND_ORIGIN;
  
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: config.mongodbUri,
        dbName: 'Bittnexis_protocol',
        collectionName: 'sessions',
        ttl: 365 * 24 * 60 * 60, // 365 days in seconds
        autoRemove: 'native', // Use MongoDB TTL for cleanup
        touchAfter: 24 * 3600 // Lazy update session every 24 hours
      }),
      cookie: {
        secure: isSecure, // Require HTTPS in production/Replit
        httpOnly: true, // Prevent XSS attacks
        sameSite: isCrossOrigin ? 'none' : 'lax', // 'none' only for true cross-origin; 'lax' for same-origin
        maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days - persistent session until manual logout
        domain: undefined, // Let browser determine domain
        path: '/', // Cookie available for all paths
      },
      name: 'bittnexis.sid', // Custom session cookie name
    })
  );
  
  // Debug logging for session configuration
  console.log('[Session Config]', {
    secure: isSecure,
    sameSite: isCrossOrigin ? 'none' : 'lax',
    isCrossOrigin,
    nodeEnv: process.env.NODE_ENV,
    replId: process.env.REPL_ID ? 'present' : 'not set'
  });
  
  // Wallet authentication - get wallet address from session
  function getWalletAddress(req: any): string | null {
    return req.session?.walletAddress || null;
  }

  // Generate nonce for signature
  app.get("/api/auth/nonce", async (req, res) => {
    try {
      const { walletAddress } = req.query;
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      const { generateNonce } = await import('./ton-auth-service.js');
      const nonce = await generateNonce(walletAddress);
      
      res.json({ nonce });
    } catch (error) {
      console.error('Nonce generation error:', error);
      res.status(500).json({ error: "Failed to generate nonce" });
    }
  });

  // Verify ton_proof and login
  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const schema = z.object({
        address: z.string().min(1),
        proof: z.object({
          timestamp: z.number(),
          domain: z.object({
            lengthBytes: z.number(),
            value: z.string(),
          }),
          signature: z.string(),
          payload: z.string(),
          state_init: z.string(),
        }),
      });

      const payload = schema.parse(req.body);
      
      const { verifyTonProof } = await import('./ton-auth-service.js');
      const isValid = await verifyTonProof(payload);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid proof" });
      }
      
      // Normalize address to UQ... format (same as Tonkeeper)
      const { normalizeAddress } = await import('./address-utils.js');
      const walletAddress = normalizeAddress(payload.address);
      
      console.log('[Auth] Normalizing address:', {
        original: payload.address.slice(0, 10) + '...',
        normalized: walletAddress.slice(0, 10) + '...'
      });
      
      // Store normalized wallet address in session (UQ... format)
      req.session.walletAddress = walletAddress;
      
      // Save session explicitly to ensure it's persisted
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      console.log('[Auth] Session saved for wallet:', walletAddress.slice(0, 10) + '...');
      console.log('[Auth] Session ID:', req.sessionID);
      console.log('[Auth] Cookie will be sent with settings:', {
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        sameSite: req.session.cookie.sameSite,
      });
      
      // Check if user exists
      let user = await storage.getUser(walletAddress);
      let isNewUser = false;
      
      if (!user) {
        // Check if new user registrations are paused
        const { getAppConfig } = await import('./admin-service.js');
        const config = await getAppConfig();
        
        if (config.registrationsPaused) {
          return res.status(403).json({ 
            error: "New user registrations are temporarily paused. Please try again later." 
          });
        }
        
        isNewUser = true;
        // Create new user with wallet address
        // Handle both TON and Ethereum address formats
        let username: string;
        if (walletAddress.startsWith('0x')) {
          // Ethereum format
          username = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        } else if (walletAddress.startsWith('EQ') || walletAddress.startsWith('UQ')) {
          // TON user-friendly format
          username = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        } else if (walletAddress.includes(':')) {
          // TON raw format (0:workchain:hash)
          const parts = walletAddress.split(':');
          const hash = parts[parts.length - 1];
          username = `TON_${hash.slice(0, 6)}...${hash.slice(-4)}`;
        } else {
          // Fallback
          username = `User_${walletAddress.slice(0, 8)}`;
        }
        
        user = await storage.createUser({
          walletAddress,
          username,
        });
        // Give new user welcome bonus
        await storage.updateUserBalance(walletAddress, 1, 0);
      }

      res.json({ 
        success: true, 
        user,
        isNewUser
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data" });
      }
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });

  // Simple authentication without ton_proof (for better mobile wallet compatibility)
  app.post("/api/auth/simple", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      // Normalize address to UQ... format (same as Tonkeeper)
      const { normalizeAddress } = await import('./address-utils.js');
      const normalizedAddress = normalizeAddress(address);
      
      console.log('[Simple Auth] Normalizing address:', {
        original: address.slice(0, 10) + '...',
        normalized: normalizedAddress.slice(0, 10) + '...'
      });
      
      // Store normalized wallet address in session (UQ... format)
      req.session.walletAddress = normalizedAddress;
      
      // Save session explicitly to ensure it's persisted
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      console.log('[Simple Auth] Session saved for wallet:', normalizedAddress.slice(0, 10) + '...');
      console.log('[Simple Auth] Session ID:', req.sessionID);
      
      // Check if user exists
      let user = await storage.getUser(normalizedAddress);
      let isNewUser = false;
      
      if (!user) {
        // Check if new user registrations are paused
        const { getAppConfig } = await import('./admin-service.js');
        const config = await getAppConfig();
        
        if (config.registrationsPaused) {
          return res.status(403).json({ 
            error: "New user registrations are temporarily paused. Please try again later." 
          });
        }
        
        isNewUser = true;
        // Create new user - username same as wallet address (UQ... format)
        const username = `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;
        
        user = await storage.createUser({
          walletAddress: normalizedAddress,
          username,
        });
        // Give new user welcome bonus
        await storage.updateUserBalance(normalizedAddress, 1, 0);
      }

      res.json({ 
        success: true, 
        user,
        isNewUser
      });
    } catch (error) {
      console.error('[Simple Auth] Error:', error);
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Get current user profile
  app.get("/api/user", async (req, res) => {
    try {
      // Debug logging
      console.log('[API /user] Session ID:', req.sessionID);
      console.log('[API /user] Session data:', req.session);
      console.log('[API /user] Cookies:', req.headers.cookie);
      
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        console.log('[API /user] No wallet address in session - returning 401');
        return res.status(401).json({ error: "No wallet connected" });
      }

      // Normalize address to handle old sessions with different formats
      const { normalizeAddress } = await import('./address-utils.js');
      const normalizedAddress = normalizeAddress(walletAddress);
      
      console.log('[API /user] Found wallet in session:', walletAddress.slice(0, 10) + '...');
      if (normalizedAddress !== walletAddress) {
        console.log('[API /user] Normalized to:', normalizedAddress.slice(0, 10) + '...');
        // Update session with normalized address (UQ... format)
        req.session.walletAddress = normalizedAddress;
        await new Promise((resolve) => req.session.save(() => resolve(true)));
      }
      
      const user = await storage.getUser(normalizedAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check subscription expiry and adjust status
      const now = new Date();
      let activeMiningPower = user.miningPower;
      let activeAutoMine = user.hasAutoMine;
      
      if (user.miningPowerExpiryAt && now > user.miningPowerExpiryAt) {
        activeMiningPower = 1;
      }
      
      if (user.autoMineExpiryAt && now > user.autoMineExpiryAt) {
        activeAutoMine = false;
      }
      
      // Get referral count and earnings
      const referrals = await storage.getReferrals(normalizedAddress);
      const referralEarnings = referrals.length; // 1 token per referral
      
      res.json({
        ...user,
        miningPower: activeMiningPower,
        hasAutoMine: activeAutoMine,
        referralCount: referrals.length,
        referralEarnings,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Claim mining rewards (manual claim when auto-mining is OFF)
  app.post("/api/mining/claim", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const user = await storage.getUser(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const now = new Date();
      
      // Check if user has active auto-mining
      let activeAutoMine = user.hasAutoMine;
      if (user.autoMineExpiryAt && now > user.autoMineExpiryAt) {
        activeAutoMine = false;
      }
      
      // If auto-mining is active, user shouldn't use manual claim
      if (activeAutoMine) {
        return res.status(400).json({ 
          error: "You have auto-mining active. Rewards are automatically added to your balance.",
        });
      }
      
      const lastClaim = user.lastClaimTime;
      
      // Check if 6 hours have passed
      if (lastClaim) {
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim < 6) {
          return res.status(400).json({ 
            error: "Cannot claim yet",
            nextClaimTime: new Date(lastClaim.getTime() + 6 * 60 * 60 * 1000)
          });
        }
      }

      // Check if mining power subscription has expired
      let activeMiningPower = user.miningPower;
      if (user.miningPowerExpiryAt && now > user.miningPowerExpiryAt) {
        activeMiningPower = 1;
      }

      // Calculate rewards based on active mining power
      const baseReward = 500;
      const reward = baseReward * activeMiningPower;

      // Claim the reward from MongoDB (add to pending first, then claim it)
      await storage.updatePendingMiningReward(walletAddress, reward);
      const updatedUser = await storage.claimMiningReward(walletAddress);

      console.log(`[Mining Claim] User ${walletAddress} manually claimed ${reward} HA-RATE tokens`);

      res.json({
        success: true,
        reward,
        newBalance: updatedUser.bittnexisBalance,
        nextClaimTime: new Date(now.getTime() + 6 * 60 * 60 * 1000)
      });
    } catch (error) {
      console.error('[Mining Claim Error]', error);
      res.status(500).json({ error: "Failed to claim rewards" });
    }
  });

  // Get merchant wallet address for TON payments
  app.get("/api/merchant-wallet", async (req, res) => {
    try {
      const merchantWallet = process.env.MAIN_WALLET;
      if (!merchantWallet) {
        return res.status(500).json({ error: "Merchant wallet not configured" });
      }
      res.json({ address: merchantWallet });
    } catch (error) {
      res.status(500).json({ error: "Failed to get merchant wallet" });
    }
  });

  // Get subscription prices (public endpoint)
  app.get("/api/subscription-prices", async (req, res) => {
    try {
      const { getAppConfig } = await import('./admin-service.js');
      const config = await getAppConfig();
      res.json({ 
        prices: config.subscriptionPrices || {
          auto_mine: 15,
          '2x_power': 10,
          '3x_power': 18,
          '4x_power': 23
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscription prices" });
    }
  });

  // Create pending payment (step 1: initiate payment)
  app.post("/api/payments/create", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const schema = z.object({
        package: z.enum(["dragon_boost"]),
      });

      const { package: packageType } = schema.parse(req.body);
      const merchantWallet = process.env.MAIN_WALLET;
      
      if (!merchantWallet) {
        return res.status(500).json({ error: "Merchant wallet not configured" });
      }

      const { createPendingPayment } = await import('./payment-service.js');
      const payment = await createPendingPayment({
        walletAddress,
        packageType,
        merchantWallet
      });

      res.json({ 
        success: true, 
        paymentId: payment._id.toString(),
        amount: payment.amountTon.toString(),
        merchantWallet
      });
    } catch (error) {
      console.error('Create payment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package type" });
      }
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Verify payment on blockchain (step 2: verify after transaction sent)
  app.post("/api/payments/verify", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const schema = z.object({
        paymentId: z.string(),
      });

      const { paymentId } = schema.parse(req.body);
      const merchantWallet = process.env.MAIN_WALLET;
      
      if (!merchantWallet) {
        return res.status(500).json({ error: "Merchant wallet not configured" });
      }

      const { verifyPayment } = await import('./payment-service.js');
      const result = await verifyPayment(paymentId, merchantWallet);

      if (result.success) {
        const updatedUser = await storage.getUser(walletAddress);
        res.json({ 
          success: true, 
          verified: true,
          user: updatedUser
        });
      } else {
        res.json({ 
          success: false, 
          verified: false,
          error: result.error,
          canRetry: result.canRetry 
        });
      }
    } catch (error: any) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: error.message || "Failed to verify payment" });
    }
  });

  // Subscribe to mining package (legacy USDT method)
  app.post("/api/mining/subscribe", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const schema = z.object({
        package: z.enum(["auto-mine", "2x", "3x", "4x"]),
      });

      const { package: pkg } = schema.parse(req.body);
      const user = await storage.getUser(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const prices: Record<string, number> = {
        "auto-mine": 15,
        "2x": 10,
        "3x": 18,
        "4x": 23,
      };

      const price = prices[pkg];
      const currentUsdt = parseFloat(user.usdtBalance);

      if (currentUsdt < price) {
        return res.status(400).json({ error: "Insufficient USDT balance" });
      }

      // Deduct USDT
      await storage.updateUserBalance(walletAddress, 0, -price);

      // Apply package benefits
      if (pkg === "auto-mine") {
        await storage.updateAutoMine(walletAddress, true);
      } else {
        const power = parseInt(pkg.replace('x', ''));
        await storage.updateMiningPower(walletAddress, power);
      }

      // Fetch final updated state
      const updatedUser = await storage.getUser(walletAddress);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to retrieve updated user" });
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package type" });
      }
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Get user tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      let tasks = await storage.getTasksByUser(walletAddress);
      
      // Check if daily-login task needs to be reset (24 hour cooldown)
      const dailyLoginTask = tasks.find(t => t.taskId === 'daily-login');
      if (dailyLoginTask && dailyLoginTask.completed) {
        const lastUpdated = new Date(dailyLoginTask.lastUpdated);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate >= 24) {
          // Reset the task
          await storage.updateTaskProgress(walletAddress, 'daily-login', 0, false);
          // Refresh tasks after reset
          tasks = await storage.getTasksByUser(walletAddress);
        }
      }
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  // Update task progress / complete task
  app.post("/api/tasks/update", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const schema = z.object({
        taskId: z.string(),
        progress: z.number(),
        completed: z.boolean(),
      });

      const { taskId, progress, completed } = schema.parse(req.body);
      
      // Update task with provided values
      const task = await storage.updateTaskProgress(
        walletAddress,
        taskId,
        progress,
        completed
      );

      // Award tokens every time (for testing - allows repeatable tasks)
      if (completed) {
        const rewards: Record<string, number> = {
          "daily-login": 0.2,
          "follow-x": 0.2,
          "follow-telegram": 0.2,
        };

        const reward = rewards[taskId] || 0;
        if (reward > 0) {
          await storage.updateUserBalance(walletAddress, reward);
        }
      }

      res.json({ success: true, task });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data" });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(limit);
      
      const entries = leaderboard.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        tokens: parseFloat(user.bittnexisBalance),
        isCurrentUser: walletAddress ? user.walletAddress === walletAddress : false,
      }));

      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // Get referral data
  app.get("/api/referrals", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const user = await storage.getUser(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const referrals = await storage.getReferrals(walletAddress);
      
      res.json({
        referralCode: user.referralCode,
        referralCount: referrals.length,
        referralEarnings: referrals.length, // 1 token per referral
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get referrals" });
    }
  });

  // Get withdrawal status (enabled/disabled by team)
  app.get("/api/withdrawals/status", async (req, res) => {
    try {
      const { config } = await import('./config.js');
      const { getAppConfig } = await import('./admin-service.js');
      const appConfig = await getAppConfig();
      
      res.json({ 
        enabled: appConfig.withdrawalActive || false,
        feeAmount: config.tonWithdrawalFee,
        merchantWallet: config.tonMerchantWallet
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get withdrawal status" });
    }
  });

  // Create withdrawal request (automatic system - no fee verification yet)
  app.post("/api/withdrawals/request", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      // Check if withdrawals are enabled in database settings
      const { getAppConfig } = await import('./admin-service.js');
      const appConfig = await getAppConfig();
      
      if (!appConfig.withdrawalActive) {
        return res.status(403).json({ error: "Withdrawals are currently disabled" });
      }

      const schema = z.object({
        amount: z.number().positive(),
      });

      const { amount } = schema.parse(req.body);

      const { createWithdrawalRequest } = await import('./withdrawal-service.js');
      const result = await createWithdrawalRequest({
        walletAddress,
        amount,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Withdrawal Request Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid withdrawal data" });
      }
      res.status(400).json({ error: error.message || "Failed to create withdrawal request" });
    }
  });

  // Get user's withdrawal history
  app.get("/api/withdrawals", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(401).json({ error: "No wallet connected" });
      }

      const { WithdrawalModel } = await import('./mongodb.js');
      const withdrawals = await WithdrawalModel.find({ 
        walletAddress 
      }).sort({ createdAt: -1 }).limit(50);
      
      res.json({ withdrawals });
    } catch (error) {
      console.error('[Get Withdrawals Error]', error);
      res.status(500).json({ error: "Failed to get withdrawal history" });
    }
  });

  // Process pending withdrawal (can be called manually or by a worker)
  app.post("/api/withdrawals/:id/process", async (req, res) => {
    try {
      const { id } = req.params;
      
      const { processWithdrawal } = await import('./withdrawal-service.js');
      const result = await processWithdrawal(id);

      res.json(result);
    } catch (error: any) {
      console.error('[Process Withdrawal Error]', error);
      res.status(500).json({ error: error.message || "Failed to process withdrawal" });
    }
  });

  // ============================================
  // ADMIN AUTHENTICATION ROUTES
  // ============================================
  
  // Register admin authentication routes (login, logout, status)
  const { registerAdminAuthRoutes, requireAdminAuth } = await import('./admin-auth-routes.js');
  registerAdminAuthRoutes(app);
  
  // ============================================
  // ADMIN PANEL ROUTES
  // ============================================
  
  // All admin panel routes require authentication via username/password + 2FA
  const requireAdmin = requireAdminAuth;

  // Get app configuration
  app.get("/api/admin/config", requireAdmin, async (req, res) => {
    try {
      const { getAppConfig } = await import('./admin-service.js');
      const config = await getAppConfig();
      
      console.log('[Admin Config] Current config fetched:', {
        registrationsPaused: config.registrationsPaused,
        withdrawalActive: config.withdrawalActive,
        miningIntervalHours: config.miningIntervalHours,
        miningBaseReward: config.miningBaseReward,
      });
      
      res.json(config);
    } catch (error) {
      console.error('[Admin Config Get Error]', error);
      res.status(500).json({ error: "Failed to get configuration" });
    }
  });

  // Update mining configuration
  app.post("/api/admin/config/mining", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        miningIntervalHours: z.number().positive(),
        miningBaseReward: z.number().positive(),
      });

      const { miningIntervalHours, miningBaseReward } = schema.parse(req.body);
      
      const { updateMiningConfig } = await import('./admin-service.js');
      const result = await updateMiningConfig(miningIntervalHours, miningBaseReward);

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Admin Mining Config Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mining configuration" });
      }
      res.status(500).json({ error: "Failed to update mining configuration" });
    }
  });

  // Update subscription prices
  app.post("/api/admin/config/prices", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        prices: z.record(z.number().positive()),
      });

      const { prices } = schema.parse(req.body);
      
      const { updateSubscriptionPrices } = await import('./admin-service.js');
      const result = await updateSubscriptionPrices(prices);

      res.json({ success: true, prices: result });
    } catch (error) {
      console.error('[Admin Prices Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid price configuration" });
      }
      res.status(500).json({ error: "Failed to update subscription prices" });
    }
  });

  // Toggle withdrawal activation
  app.post("/api/admin/config/withdrawal-active", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        active: z.boolean(),
      });

      const { active } = schema.parse(req.body);
      
      const { toggleWithdrawalActive } = await import('./admin-service.js');
      const result = await toggleWithdrawalActive(active);

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Admin Withdrawal Active Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid withdrawal active configuration" });
      }
      res.status(500).json({ error: "Failed to update withdrawal activation" });
    }
  });

  // Toggle new user registrations
  app.post("/api/admin/config/registrations-paused", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        paused: z.boolean(),
      });

      const { paused } = schema.parse(req.body);
      
      console.log('[Admin Config] Updating registrationsPaused to:', paused);
      
      const { toggleRegistrationsPaused } = await import('./admin-service.js');
      const result = await toggleRegistrationsPaused(paused);

      console.log('[Admin Config] Updated successfully:', result);

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Admin Registrations Paused Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid registrations configuration" });
      }
      res.status(500).json({ error: "Failed to update registrations setting" });
    }
  });

  // Get all task definitions
  app.get("/api/admin/tasks", requireAdmin, async (req, res) => {
    try {
      const { getAllTaskDefinitions } = await import('./admin-service.js');
      const tasks = await getAllTaskDefinitions();
      
      res.json({ tasks });
    } catch (error) {
      console.error('[Admin Get Tasks Error]', error);
      res.status(500).json({ error: "Failed to get task definitions" });
    }
  });

  // Create task definition
  app.post("/api/admin/tasks", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        taskId: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        reward: z.number().positive(),
        type: z.enum(['daily', 'one_time', 'social']),
        action: z.string().min(1),
        iconType: z.string().optional(),
        verificationRequired: z.boolean().optional(),
        verificationUrl: z.string().optional(),
        resetInterval: z.number().optional(),
        isActive: z.boolean().optional(),
      });

      const taskData = schema.parse(req.body);
      
      const { createTaskDefinition } = await import('./admin-service.js');
      const task = await createTaskDefinition(taskData);

      res.json({ success: true, task });
    } catch (error: any) {
      console.error('[Admin Create Task Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data" });
      }
      if (error.code === 11000) {
        return res.status(400).json({ error: "Task ID already exists" });
      }
      res.status(500).json({ error: error.message || "Failed to create task" });
    }
  });

  // Update task definition
  app.put("/api/admin/tasks/:taskId", requireAdmin, async (req, res) => {
    try {
      const { taskId } = req.params;
      const schema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        reward: z.number().positive().optional(),
        type: z.enum(['daily', 'one_time', 'social']).optional(),
        action: z.string().min(1).optional(),
        iconType: z.string().optional(),
        verificationRequired: z.boolean().optional(),
        verificationUrl: z.string().optional(),
        resetInterval: z.number().optional(),
        isActive: z.boolean().optional(),
      });

      const updates = schema.parse(req.body);
      
      const { updateTaskDefinition } = await import('./admin-service.js');
      const task = await updateTaskDefinition(taskId, updates);

      res.json({ success: true, task });
    } catch (error: any) {
      console.error('[Admin Update Task Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data" });
      }
      res.status(500).json({ error: error.message || "Failed to update task" });
    }
  });

  // Delete task definition
  app.delete("/api/admin/tasks/:taskId", requireAdmin, async (req, res) => {
    try {
      const { taskId } = req.params;
      
      const { deleteTaskDefinition } = await import('./admin-service.js');
      const result = await deleteTaskDefinition(taskId);

      res.json(result);
    } catch (error: any) {
      console.error('[Admin Delete Task Error]', error);
      res.status(500).json({ error: error.message || "Failed to delete task" });
    }
  });

  // Get user tasks for a specific task (for verification)
  app.get("/api/admin/tasks/:taskId/users", requireAdmin, async (req, res) => {
    try {
      const { taskId } = req.params;
      
      const { getUserTasksForDefinition } = await import('./admin-service.js');
      const userTasks = await getUserTasksForDefinition(taskId);

      res.json({ userTasks });
    } catch (error) {
      console.error('[Admin Get User Tasks Error]', error);
      res.status(500).json({ error: "Failed to get user tasks" });
    }
  });

  // Verify/complete a task for a user
  app.post("/api/admin/tasks/verify", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(1),
        taskId: z.string().min(1),
        completed: z.boolean(),
      });

      const { walletAddress, taskId, completed } = schema.parse(req.body);
      
      const { verifyUserTask } = await import('./admin-service.js');
      const result = await verifyUserTask(walletAddress, taskId, completed);

      res.json({ success: true, task: result });
    } catch (error) {
      console.error('[Admin Verify Task Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid verification data" });
      }
      res.status(500).json({ error: "Failed to verify task" });
    }
  });

  // Enable TGE and finish all subscriptions
  app.post("/api/admin/tge/enable", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        tgeDate: z.string().optional(),
      });

      const { tgeDate } = schema.parse(req.body);
      const date = tgeDate ? new Date(tgeDate) : new Date();
      
      const { enableTGE } = await import('./admin-service.js');
      const result = await enableTGE(date);

      res.json(result);
    } catch (error) {
      console.error('[Admin TGE Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid TGE data" });
      }
      res.status(500).json({ error: "Failed to enable TGE" });
    }
  });

  // Disable TGE
  app.post("/api/admin/tge/disable", requireAdmin, async (req, res) => {
    try {
      const { disableTGE } = await import('./admin-service.js');
      const result = await disableTGE();

      res.json(result);
    } catch (error) {
      console.error('[Admin TGE Disable Error]', error);
      res.status(500).json({ error: "Failed to disable TGE" });
    }
  });

  // Get all withdrawals for admin monitoring
  app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
    try {
      const { WithdrawalModel } = await import('./mongodb.js');
      const withdrawals = await WithdrawalModel.find({})
        .sort({ createdAt: -1 })
        .limit(100);
      
      // Calculate statistics
      const stats = {
        total: await WithdrawalModel.countDocuments({}),
        pending: await WithdrawalModel.countDocuments({ status: 'pending' }),
        feeVerified: await WithdrawalModel.countDocuments({ status: 'fee_verified' }),
        processing: await WithdrawalModel.countDocuments({ status: 'processing' }),
        completed: await WithdrawalModel.countDocuments({ status: 'completed' }),
        failed: await WithdrawalModel.countDocuments({ status: 'failed' }),
      };
      
      res.json({ withdrawals, stats });
    } catch (error) {
      console.error('[Admin Withdrawals Error]', error);
      res.status(500).json({ error: "Failed to get withdrawals" });
    }
  });

  // Get admin statistics
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const { getAdminStats } = await import('./admin-service.js');
      const stats = await getAdminStats();
      
      res.json(stats);
    } catch (error) {
      console.error('[Admin Stats Error]', error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Fix usernames to match wallet addresses (one-time admin action)
  app.post("/api/admin/fix-usernames", requireAdmin, async (req, res) => {
    try {
      const { UserModel } = await import('./mongodb.js');
      const allUsers = await UserModel.find({});
      const updates: string[] = [];
      
      for (const user of allUsers) {
        const walletAddress = user.walletAddress;
        const correctUsername = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        
        if (user.username !== correctUsername) {
          // Update username in MongoDB
          await UserModel.updateOne(
            { walletAddress },
            { $set: { username: correctUsername } }
          );
          
          updates.push(`${user.walletAddress.slice(0, 10)}... → ${correctUsername}`);
        }
      }
      
      res.json({ 
        success: true, 
        updated: updates.length,
        details: updates 
      });
    } catch (error) {
      console.error('[Admin Fix Usernames Error]', error);
      res.status(500).json({ error: "Failed to fix usernames" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
