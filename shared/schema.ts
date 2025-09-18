import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("customer"), // "admin" or "customer"
  orderHistory: jsonb("order_history").default([]),
  preferences: jsonb("preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").default(true),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull().default('0.0600'), // Maryland default 6%
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const localEvents = pgTable("local_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventName: text("event_name").notNull(),
  dateTime: timestamp("date_time").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  active: boolean("active").default(true),
});

export const ads = pgTable("ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bizName: text("biz_name").notNull(),
  imageUrl: text("image_url"),
  location: text("location").notNull(),
  link: text("link"),
  description: text("description"),
  active: boolean("active").default(true),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  items: jsonb("items").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  paymentStatus: text("payment_status").default("pending"), // pending, processing, completed, failed
  transactionId: text("transaction_id"), // Square transaction ID
  paymentMethod: text("payment_method"), // card, apple_pay, google_pay
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  paymentCurrency: text("payment_currency").default("USD"),
  deliveryMethod: text("delivery_method").default("pickup"), // pickup, grubhub, doordash
  deliveryData: jsonb("delivery_data"), // Store platform-specific data like redirect URLs, order IDs
  createdAt: timestamp("created_at").defaultNow(),
});

export const truckLocation = pgTable("truck_location", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  radius: decimal("radius", { precision: 5, scale: 2 }).default('5.00'), // miles for geofencing
  gpsEnabled: boolean("gps_enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  attempts: integer("attempts").default(0),
  verified: boolean("verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  pushEnabled: boolean("push_enabled").default(false),
  pushToken: text("push_token"), // Device push token from Capacitor
  permissionStatus: text("permission_status").default("default"), // "default", "granted", "denied"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  updatedAt: true,
});

export const insertLocalEventSchema = createInsertSchema(localEvents).omit({
  id: true,
});

export const insertAdSchema = createInsertSchema(ads).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertTruckLocationSchema = createInsertSchema(truckLocation).omit({
  id: true,
  updatedAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type LocalEvent = typeof localEvents.$inferSelect;
export type InsertLocalEvent = z.infer<typeof insertLocalEventSchema>;

export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type TruckLocation = typeof truckLocation.$inferSelect;
export type InsertTruckLocation = z.infer<typeof insertTruckLocationSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
