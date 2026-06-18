import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  city: text("city").notNull(),
  skill: text("skill").notNull(),
  upiId: text("upi_id"),
  profileImage: text("profile_image"),
  isOnline: boolean("is_online").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  subscriptionStatus: text("subscription_status").notNull().default("inactive"),
  fcmToken: text("fcm_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkerSchema = createInsertSchema(workersTable).omit({ id: true, createdAt: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workersTable.$inferSelect;
