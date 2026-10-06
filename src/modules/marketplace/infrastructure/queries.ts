import { and, eq, or, desc, ilike, sql } from "drizzle-orm";
import { db } from "@/shared/db/client";
import {
  user,
  profiles,
  assets,
  conversations,
  messages,
  moderationActions,
} from "@/shared/db/schema";
import { assertActive, DomainError, match } from "../domain/policies";
import type { ApiData, PersonCard } from "@/shared/contracts";
import { currencies, convertCents, type RateSnapshot } from "../domain/money";
import { latestRates } from "./rates";
import { z } from "zod";
const querySchema = z
  .object({
    view: z
      .enum(["assets", "buyers", "my-assets", "manager", "profile", "inbox"])
      .default("assets"),
    q: z.string().max(100).default(""),
    country: z.enum(["", "PL", "LT", "DE", "GB", "MT", "CA"]).default(""),
    category: z
      .enum(["", "PAYMENT", "EMI", "FINTECH", "BANK", "CRYPTO"])
      .default(""),
    currency: z.enum(["", ...currencies]).default(""),
    license: z.string().max(80).default(""),
    min: z.coerce.number().int().min(0).max(20000000).optional(),
    max: z.coerce.number().int().min(0).max(20000000).optional(),
    sort: z
      .enum(["newest", "price-asc", "price-desc", "match"])
      .default("newest"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    asset: z.string().max(80).optional(),
    person: z.string().max(80).optional(),
    thread: z.string().max(80).optional(),
    role: z.enum(["", "BUYER", "SELLER"]).default(""),
    status: z.enum(["", "ACTIVE", "SUSPENDED", "REMOVED"]).default(""),
    business: z.enum(["", "ACTIVE", "LICENSE_ONLY"]).default(""),
  })
  .refine(
    (q) => q.min === undefined || q.max === undefined || q.min <= q.max,
    "Minimum price cannot exceed maximum price.",
  )
  .refine(
    (q) =>
      !!q.currency ||
      (q.min === undefined &&
        q.max === undefined &&
        !q.sort.startsWith("price-")),
    "Choose a currency for price filters and sorting.",
  );
const publicUser = {
  id: user.id,
  name: user.name,
  role: user.role,
  status: user.status,
};
export async function readMarketplace(
  actorId: string,
  params: URLSearchParams,
  suppliedRates?: RateSnapshot | null,
): Promise<ApiData> {
  const q = querySchema.parse(Object.fromEntries(params));
  const [actor] = await db
    .select(publicUser)
    .from(user)
    .where(eq(user.id, actorId));
  if (!actor) throw new DomainError("Please sign in.", 401);
  assertActive(actor);
  if (q.view === "manager" && actor.role !== "MANAGER")
    throw new DomainError("Manager access required.", 403);
  if ((q.view === "buyers" || q.person) && actor.role === "BUYER")
    throw new DomainError("Seller access required.", 403);
  if (q.view === "my-assets" && actor.role !== "SELLER")
    throw new DomainError("Seller access required.", 403);
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, actor.id));
  const rates =
    suppliedRates === undefined ? await latestRates() : suppliedRates;
  if (q.currency && !rates)
    throw new DomainError(
      "Exchange rates are temporarily unavailable. Try again shortly.",
      503,
    );
  const result: ApiData = {
    rates,
    actor,
    profile: profile ?? null,
    assets: [],
    people: [],
    threads: [],
    messages: [],
    total: 0,
    page: q.page,
    stats: { assets: 0, buyers: 0, sellers: 0 },
    audit: [],
  };
  const stats = await db
    .select({ role: user.role, count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.status, "ACTIVE"))
    .groupBy(user.role);
  result.stats.buyers = stats.find((x) => x.role === "BUYER")?.count ?? 0;
  result.stats.sellers = stats.find((x) => x.role === "SELLER")?.count ?? 0;
  const [assetCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .innerJoin(user, eq(assets.sellerId, user.id))
    .where(and(eq(assets.status, "PUBLISHED"), eq(user.status, "ACTIVE")));
  result.stats.assets = assetCount.count;
  if (
    ["assets", "my-assets", "manager"].includes(q.view) ||
    (q.asset && q.view !== "buyers")
  ) {
    const filters = [];
    if (q.view === "my-assets") filters.push(eq(assets.sellerId, actor.id));
    else if (actor.role !== "MANAGER")
      filters.push(
        q.asset
          ? or(
              and(eq(assets.status, "PUBLISHED"), eq(user.status, "ACTIVE")),
              eq(assets.sellerId, actor.id),
            )
          : and(eq(assets.status, "PUBLISHED"), eq(user.status, "ACTIVE")),
      );
    if (q.asset) filters.push(eq(assets.id, q.asset));
    if (q.q)
      filters.push(
        or(
          ilike(assets.title, `%${q.q}%`),
          ilike(assets.description, `%${q.q}%`),
        ),
      );
    if (q.country) filters.push(eq(assets.country, q.country));
    if (q.category) filters.push(eq(assets.category, q.category));
    if (q.license) filters.push(ilike(assets.licenseType, `%${q.license}%`));
    if (q.business) filters.push(eq(assets.businessStatus, q.business));
    const rows = await db
      .select({
        asset: assets,
        sellerName: user.name,
        company: profiles.company,
      })
      .from(assets)
      .innerJoin(user, eq(assets.sellerId, user.id))
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .where(and(...filters))
      .orderBy(desc(assets.createdAt), assets.id);
    const cards = rows.map((r) => ({
      convertedPriceCents: q.currency
        ? convertCents(r.asset.priceCents, r.asset.currency, q.currency, rates)
        : null,
      convertedCurrency: q.currency || null,
      ...r.asset,
      createdAt: r.asset.createdAt.toISOString(),
      updatedAt: r.asset.updatedAt.toISOString(),
      sellerName: r.sellerName,
      company: r.company ?? "Independent seller",
      ...(actor.role === "BUYER" && profile
        ? match(profile, r.asset, rates)
        : { score: null, reasons: [] }),
    }));
    const selectedCards = cards.filter(
      (a) =>
        (q.min === undefined || (a.convertedPriceCents ?? 0) >= q.min * 100) &&
        (q.max === undefined ||
          (a.convertedPriceCents ?? Infinity) <= q.max * 100),
    );
    if (q.sort === "price-asc")
      selectedCards.sort(
        (a, b) =>
          (a.convertedPriceCents ?? 0) - (b.convertedPriceCents ?? 0) ||
          a.id.localeCompare(b.id),
      );
    if (q.sort === "price-desc")
      selectedCards.sort(
        (a, b) =>
          (b.convertedPriceCents ?? 0) - (a.convertedPriceCents ?? 0) ||
          a.id.localeCompare(b.id),
      );
    if (q.sort === "match")
      selectedCards.sort(
        (a, b) => (b.score ?? -1) - (a.score ?? -1) || a.id.localeCompare(b.id),
      );
    if (q.asset && !selectedCards.length)
      throw new DomainError("Asset not found.", 404);
    result.total = selectedCards.length;
    result.assets = q.asset
      ? selectedCards
      : selectedCards.slice((q.page - 1) * 12, q.page * 12);
  }
  if (q.view === "buyers" || q.view === "manager" || q.person) {
    const filters = [
      q.view === "manager"
        ? or(eq(user.role, "BUYER"), eq(user.role, "SELLER"))
        : eq(user.role, "BUYER"),
    ];
    if (actor.role !== "MANAGER") filters.push(eq(user.status, "ACTIVE"));
    if (q.person) filters.push(eq(user.id, q.person));
    if (q.role) filters.push(eq(user.role, q.role));
    if (q.status) filters.push(eq(user.status, q.status));
    if (q.q)
      filters.push(
        or(
          ilike(user.name, `%${q.q}%`),
          ilike(profiles.company, `%${q.q}%`),
          ilike(profiles.bio, `%${q.q}%`),
        ),
      );
    const rows = await db
      .select({ person: publicUser, profile: profiles })
      .from(user)
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .where(and(...filters))
      .orderBy(user.name);
    let selected = rows.filter(
      (r) =>
        (!q.category || r.profile?.categories.includes(q.category)) &&
        (!q.country || r.profile?.countries.includes(q.country)) &&
        (!q.license ||
          r.profile?.licenses.some((l) =>
            l.toLowerCase().includes(q.license.toLowerCase()),
          )) &&
        (q.min === undefined ||
          r.profile?.maxBudget === null ||
          (r.profile &&
            convertCents(
              r.profile.maxBudget,
              r.profile.budgetCurrency,
              q.currency as (typeof currencies)[number],
              rates,
            )! >=
              q.min * 100)) &&
        (q.max === undefined ||
          r.profile?.minBudget === null ||
          (r.profile &&
            convertCents(
              r.profile.minBudget,
              r.profile.budgetCurrency,
              q.currency as (typeof currencies)[number],
              rates,
            )! <=
              q.max * 100)),
    );
    let matchAsset = q.asset
      ? (await db.select().from(assets).where(eq(assets.id, q.asset)))[0]
      : undefined;
    if (
      q.asset &&
      (!matchAsset ||
        (matchAsset.sellerId !== actor.id && actor.role !== "MANAGER"))
    )
      throw new DomainError("Asset not found.", 404);
    const people: PersonCard[] = selected.map((r) => ({
      ...r.person,
      profile: r.profile,
      convertedMinBudget:
        q.currency && r.profile?.minBudget != null
          ? convertCents(
              r.profile.minBudget,
              r.profile.budgetCurrency,
              q.currency,
              rates,
            )
          : null,
      convertedMaxBudget:
        q.currency && r.profile?.maxBudget != null
          ? convertCents(
              r.profile.maxBudget,
              r.profile.budgetCurrency,
              q.currency,
              rates,
            )
          : null,
      convertedCurrency: q.currency || null,
      budgetNotCompared: !!(
        matchAsset &&
        r.profile &&
        match(r.profile, matchAsset, rates).reasons.some(
          (r) => r.matched === null,
        )
      ),
      score:
        matchAsset && r.profile
          ? match(r.profile, matchAsset, rates).score
          : null,
    }));
    if (q.sort === "match")
      people.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    if (q.person && !people.length)
      throw new DomainError("Buyer not found.", 404);
    if (q.view !== "manager") result.total = people.length;
    result.people =
      q.view === "manager" || q.person
        ? people
        : people.slice((q.page - 1) * 12, q.page * 12);
    if (q.view === "manager") {
      result.audit = (
        await db
          .select({
            id: moderationActions.id,
            targetUserId: moderationActions.targetUserId,
            action: moderationActions.action,
            reason: moderationActions.reason,
            createdAt: moderationActions.createdAt,
          })
          .from(moderationActions)
          .orderBy(desc(moderationActions.createdAt))
          .limit(20)
      ).map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
    }
  }
  if (q.view === "inbox") {
    const rows = await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.buyerId, actor.id),
          eq(conversations.sellerId, actor.id),
        ),
      )
      .orderBy(desc(conversations.createdAt));
    for (const c of rows) {
      const otherId = c.buyerId === actor.id ? c.sellerId : c.buyerId;
      const [other] = await db
        .select(publicUser)
        .from(user)
        .where(eq(user.id, otherId));
      const a = c.assetId
        ? (
            await db
              .select({ title: assets.title })
              .from(assets)
              .where(eq(assets.id, c.assetId))
          )[0]
        : null;
      result.threads.push({
        ...c,
        createdAt: c.createdAt.toISOString(),
        otherName: other.name,
        otherStatus: other.status,
        title: a?.title ?? "Direct introduction",
      });
    }
    if (q.thread) {
      if (!rows.some((c) => c.id === q.thread))
        throw new DomainError("Conversation not found.", 404);
      result.messages = (
        await db
          .select({
            id: messages.id,
            conversationId: messages.conversationId,
            senderId: messages.senderId,
            body: messages.body,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, q.thread))
          .orderBy(messages.createdAt, messages.id)
      ).map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
    }
  }
  return result;
}
