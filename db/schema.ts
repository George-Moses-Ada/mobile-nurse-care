import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("patient"), // "patient" or "nurse"
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  duration: text("duration").notNull(),
  price: integer("price").notNull(),
  icon: text("icon").notNull(),
  modes: text("modes").notNull(), // JSON array of modes
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  mode: text("mode").notNull(), // "Online" or "Home visit"
  status: text("status").notNull().default("pending"), // "pending", "confirmed", "completed", "cancelled"
  totalAmount: integer("total_amount").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"), // "pending", "paid"
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const availability = sqliteTable("availability", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nurseId: integer("nurse_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  isAvailable: integer("is_available").notNull().default(1), // 1 = available, 0 = booked
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
