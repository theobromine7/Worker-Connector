import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  jobId: integer("job_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  transactionReference: text("transaction_reference"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPayoutSchema = createInsertSchema(payoutsTable).omit({ id: true, createdAt: true });
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payoutsTable.$inferSelect;
