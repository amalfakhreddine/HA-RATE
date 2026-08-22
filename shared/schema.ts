import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  walletAddress: varchar("wallet_address", { length: 100 }).primaryKey(),
  username: text("username").notNull(),
  bittnexisBalance: decimal("bittnexis_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  usdtBalance: decimal("usdt_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  pendingMiningReward: decimal("pending_mining_reward", { precision: 18, scale: 8 }).notNull().default("0"),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredBy: varchar("referral_code_ref", { length: 20 }),
  miningPower: integer("mining_power").notNull().default(1),
  miningPowerExpiryAt: timestamp("mining_power_expiry_at"),
  hasAutoMine: boolean("has_auto_mine").notNull().default(false),
  autoMineExpiryAt: timestamp("auto_mine_expiry_at"),
  lastClaimTime: timestamp("last_claim_time"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 100 }).notNull().references(() => users.walletAddress),
  taskId: text("task_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 100 }).notNull().references(() => users.walletAddress),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  feeTransactionHash: text("fee_transaction_hash").notNull(),
  coinTransactionHash: text("coin_transaction_hash"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  username: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  lastUpdated: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
