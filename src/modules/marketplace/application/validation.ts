import { currencies } from "../domain/money";
import { z } from "zod";
export const countries = ["PL", "LT", "DE", "GB", "MT", "CA"] as const;
export const categories = [
  "PAYMENT",
  "EMI",
  "FINTECH",
  "BANK",
  "CRYPTO",
] as const;
const money = z.number().int().min(0).max(2000000000);
export const assetInput = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(6000),
  category: z.enum(categories),
  country: z.enum(countries),
  priceCents: money,
  currency: z.enum(currencies),
  businessStatus: z.enum(["ACTIVE", "LICENSE_ONLY"]),
  licenseType: z.string().trim().max(80),
  regulator: z.string().trim().max(100),
  features: z.array(z.string().trim().min(1).max(80)).max(8),
});
export const profileInput = z
  .object({
    company: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(2000),
    country: z.enum(countries),
    countries: z.array(z.enum(countries)).max(6),
    categories: z.array(z.enum(categories)).max(5),
    licenses: z.array(z.string().trim().min(1).max(80)).max(8),
    budgetCurrency: z.enum(currencies),
    minBudget: money.nullable(),
    maxBudget: money.nullable(),
  })
  .refine(
    (p) =>
      p.minBudget === null ||
      p.maxBudget === null ||
      p.maxBudget >= p.minBudget,
    "Maximum budget must be at least minimum budget.",
  );
export const commandInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("saveAsset"),
    id: z.string().max(80).optional(),
    publish: z.boolean(),
    data: assetInput,
  }),
  z.object({ type: z.literal("archiveAsset"), id: z.string().min(1).max(80) }),
  z.object({ type: z.literal("profile"), data: profileInput }),
  z.object({
    type: z.literal("moderate"),
    targetId: z.string().min(1).max(80),
    status: z.enum(["ACTIVE", "SUSPENDED", "REMOVED"]),
    reason: z.string().trim().min(5).max(500),
  }),
  z.object({
    type: z.literal("contact"),
    targetId: z.string().min(1).max(80),
    assetId: z.string().max(80).optional(),
    body: z.string().trim().min(1).max(4000),
    nonce: z.string().uuid(),
  }),
  z.object({
    type: z.literal("message"),
    conversationId: z.string().min(1).max(80),
    body: z.string().trim().min(1).max(4000),
    nonce: z.string().uuid(),
  }),
]);
export type Command = z.infer<typeof commandInput>;
