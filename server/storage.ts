import { type User, type InsertUser, type Task, type InsertTask, users, tasks } from "../shared/schema.js";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { eq, desc, sql } from "drizzle-orm";

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'HARATE';
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
  
  // Task methods
  getTasksByUser(walletAddress: string): Promise<Task[]>;
  getTask(walletAddress: string, taskId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskProgress(walletAddress: string, taskId: string, progress: number, completed?: boolean): Promise<Task>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tasks: Map<string, Task>;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
  }

  async getUser(walletAddress: string): Promise<User | undefined> {
    return this.users.get(walletAddress);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.referralCode === code,
    );
  }

  async createUser(insertUser: InsertUser, referredBy?: string): Promise<User> {
    const referralCode = generateReferralCode();
    
    const user: User = {
      ...insertUser,
      bittnexisBalance: "0",
      usdtBalance: "0",
      pendingMiningReward: "0",
      referralCode,
      referredBy: referredBy || null,
      miningPower: 1,
      miningPowerExpiryAt: null,
      hasAutoMine: false,
      autoMineExpiryAt: null,
      lastClaimTime: null,
      createdAt: new Date(),
    };
    
    this.users.set(insertUser.walletAddress, user);
    return user;
  }

  async updateUserBalance(walletAddress: string, bittnexisAmount: number, usdtAmount: number = 0): Promise<User> {
    const user = await this.getUser(walletAddress);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      bittnexisBalance: (parseFloat(user.bittnexisBalance) + bittnexisAmount).toFixed(8),
      usdtBalance: (parseFloat(user.usdtBalance) + usdtAmount).toFixed(2),
    };
    
    this.users.set(walletAddress, updatedUser);
    return updatedUser;
  }

  async updateMiningPower(walletAddress: string, power: number): Promise<User> {
    const user = await this.getUser(walletAddress);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      miningPower: power,
    };
    
    this.users.set(walletAddress, updatedUser);
    return updatedUser;
  }

  async updateAutoMine(walletAddress: string, hasAutoMine: boolean): Promise<User> {
    const user = await this.getUser(walletAddress);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      hasAutoMine,
    };
    
    this.users.set(walletAddress, updatedUser);
    return updatedUser;
  }

  async updateLastClaimTime(walletAddress: string, time: Date): Promise<User> {
    const user = await this.getUser(walletAddress);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      lastClaimTime: time,
    };
    
    this.users.set(walletAddress, updatedUser);
    return updatedUser;
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    return allUsers
      .sort((a, b) => parseFloat(b.bittnexisBalance) - parseFloat(a.bittnexisBalance))
      .slice(0, limit);
  }

  async getReferrals(walletAddress: string): Promise<User[]> {
    const user = await this.getUser(walletAddress);
    if (!user) return [];
    
    return Array.from(this.users.values()).filter(
      (u) => u.referredBy === user.referralCode
    );
  }

  async getTasksByUser(walletAddress: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.walletAddress === walletAddress
    );
  }

  async getTask(walletAddress: string, taskId: string): Promise<Task | undefined> {
    return Array.from(this.tasks.values()).find(
      (task) => task.walletAddress === walletAddress && task.taskId === taskId
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      id,
      walletAddress: insertTask.walletAddress,
      taskId: insertTask.taskId,
      progress: insertTask.progress ?? 0,
      completed: insertTask.completed ?? false,
      lastUpdated: new Date(),
    };
    
    this.tasks.set(id, task);
    return task;
  }

  async updateTaskProgress(walletAddress: string, taskId: string, progress: number, completed: boolean = false): Promise<Task> {
    const task = await this.getTask(walletAddress, taskId);
    
    if (task) {
      const updatedTask: Task = {
        ...task,
        progress,
        completed,
        lastUpdated: new Date(),
      };
      this.tasks.set(task.id, updatedTask);
      return updatedTask;
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

export class DatabaseStorage implements IStorage {
  async getUser(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, referredBy?: string): Promise<User> {
    const referralCode = generateReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        referralCode,
        referredBy: referredBy || null,
      })
      .returning();
    
    return user;
  }

  async updateUserBalance(walletAddress: string, bittnexisAmount: number, usdtAmount: number = 0): Promise<User> {
    const user = await this.getUser(walletAddress);
    if (!user) throw new Error('User not found');
    
    const [updatedUser] = await db
      .update(users)
      .set({
        bittnexisBalance: sql`${users.bittnexisBalance} + ${bittnexisAmount.toFixed(8)}`,
        usdtBalance: sql`${users.usdtBalance} + ${usdtAmount.toFixed(2)}`,
      })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    
    return updatedUser;
  }

  async updateMiningPower(walletAddress: string, power: number): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ miningPower: power })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async updateAutoMine(walletAddress: string, hasAutoMine: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ hasAutoMine })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async updateLastClaimTime(walletAddress: string, time: Date): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastClaimTime: time })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(sql`CAST(${users.bittnexisBalance} AS DECIMAL)`))
      .limit(limit);
  }

  async getReferrals(walletAddress: string): Promise<User[]> {
    const user = await this.getUser(walletAddress);
    if (!user) return [];
    
    return await db
      .select()
      .from(users)
      .where(eq(users.referredBy, user.referralCode));
  }

  async getTasksByUser(walletAddress: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.walletAddress, walletAddress));
  }

  async getTask(walletAddress: string, taskId: string): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.walletAddress} = ${walletAddress} AND ${tasks.taskId} = ${taskId}`);
    
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    
    return task;
  }

  async updateTaskProgress(walletAddress: string, taskId: string, progress: number, completed: boolean = false): Promise<Task> {
    const existingTask = await this.getTask(walletAddress, taskId);
    
    if (existingTask) {
      const [updatedTask] = await db
        .update(tasks)
        .set({
          progress,
          completed,
          lastUpdated: new Date(),
        })
        .where(eq(tasks.id, existingTask.id))
        .returning();
      
      return updatedTask;
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

export const storage = new DatabaseStorage();
