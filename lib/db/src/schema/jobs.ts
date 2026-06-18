import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  skillRequired: text("skill_required").notNull(),
  location: text("location").notNull(),
  payoutAmount: numeric("payout_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("open"),
  completionNotes: text("completion_notes"),
  assignedWorkerId: integer("assigned_worker_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
