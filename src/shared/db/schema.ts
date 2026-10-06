import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import type { Currency } from "@/modules/marketplace/domain/money";
import { sql } from "drizzle-orm";
export const roleEnum = pgEnum("role", ["BUYER", "SELLER", "MANAGER"]);
export const userStatus = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "REMOVED",
]);
export const assetStatus = pgEnum("asset_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: roleEnum("role").notNull().default("BUYER"),
  status: userStatus("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const session = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
export const account = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const verification = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id),
    company: text("company").notNull(),
    bio: text("bio").notNull().default(""),
    country: text("country").notNull().default("PL"),
    countries: jsonb("countries").$type<string[]>().notNull().default([]),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    licenses: jsonb("licenses").$type<string[]>().notNull().default([]),
    budgetCurrency: text("budget_currency")
      .$type<Currency>()
      .notNull()
      .default("EUR"),
    minBudget: integer("min_budget"),
    maxBudget: integer("max_budget"),
  },
  (t) => [
    check(
      "budget_currency",
      sql`${t.budgetCurrency} in ('EUR', 'USD', 'GBP', 'PLN')`,
    ),
    check(
      "budget_range",
      sql`(${t.minBudget} is null or ${t.minBudget} >= 0) and (${t.maxBudget} is null or ${t.maxBudget} >= 0) and (${t.minBudget} is null or ${t.maxBudget} is null or ${t.maxBudget} >= ${t.minBudget})`,
    ),
  ],
);
export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    country: text("country").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").$type<Currency>().notNull().default("EUR"),
    businessStatus: text("business_status").notNull(),
    licenseType: text("license_type").notNull(),
    regulator: text("regulator").notNull(),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    status: assetStatus("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("assets_discovery").on(t.status, t.country, t.category),
    index("assets_seller").on(t.sellerId),
    check(
      "asset_price",
      sql`${t.priceCents}>=0 and ${t.priceCents}<=2000000000`,
    ),
    check("asset_currency", sql`${t.currency} in ('EUR', 'USD', 'GBP', 'PLN')`),
  ],
);
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id),
    assetId: text("asset_id").references(() => assets.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("conversation_pair").on(t.buyerId, t.sellerId),
    check("different_participants", sql`${t.buyerId}<>${t.sellerId}`),
  ],
);
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id),
    body: text("body").notNull(),
    nonce: text("nonce").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("message_retry").on(t.senderId, t.nonce),
    index("message_history").on(t.conversationId, t.createdAt),
  ],
);
export const moderationActions = pgTable("moderation_actions", {
  id: text("id").primaryKey(),
  managerId: text("manager_id")
    .notNull()
    .references(() => user.id),
  targetUserId: text("target_user_id")
    .notNull()
    .references(() => user.id),
  action: userStatus("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type User = typeof user.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
