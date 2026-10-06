import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/shared/db/client";
import {
  user,
  profiles,
  assets,
  conversations,
  messages,
  moderationActions,
} from "../src/shared/db/schema";
import { MarketplaceService } from "../src/modules/marketplace/application/service";
import { store } from "../src/modules/marketplace/infrastructure/store";
import { readMarketplace } from "../src/modules/marketplace/infrastructure/queries";
const enabled = process.env.RUN_DB_TESTS === "true";
const service = new MarketplaceService(store);
const ids = ["it-b", "it-b2", "it-s", "it-s2", "it-m"];
const listing = {
  title: "Integration payment platform",
  description:
    "An established platform with enough detail for publishing and evaluating the acquisition.",
  category: "PAYMENT",
  country: "PL",
  currency: "EUR" as const,
  priceCents: 9000000,
  businessStatus: "ACTIVE",
  licenseType: "SPI",
  regulator: "KNF",
  features: ["Merchant services"],
};
let assetId = "";
let conversationId = "";
describe.skipIf(!enabled)(
  "database contract (requires dedicated demo/test database)",
  () => {
    beforeAll(async () => {
      for (const [id, role] of [
        ["it-b", "BUYER"],
        ["it-b2", "BUYER"],
        ["it-s", "SELLER"],
        ["it-s2", "SELLER"],
        ["it-m", "MANAGER"],
      ] as const)
        await db
          .insert(user)
          .values({
            id,
            role,
            status: "ACTIVE",
            name: id,
            email: id + "@test.local",
          })
          .onConflictDoUpdate({ target: user.id, set: { status: "ACTIVE" } });
    });
    afterAll(async () => {
      await db.delete(messages).where(inArray(messages.senderId, ids));
      await db.delete(conversations).where(inArray(conversations.buyerId, ids));
      await db
        .delete(moderationActions)
        .where(inArray(moderationActions.managerId, ids));
      await db.delete(assets).where(inArray(assets.sellerId, ids));
      await db.delete(profiles).where(inArray(profiles.userId, ids));
      await db.delete(user).where(inArray(user.id, ids));
      await pool.end();
    });
    it("publishes own asset and exposes no private user fields", async () => {
      assetId = (
        await service.execute("it-s", {
          type: "saveAsset",
          publish: true,
          data: listing,
        })
      ).id;
      const r = await readMarketplace(
        "it-b",
        new URLSearchParams({ asset: assetId }),
      );
      expect(r.assets[0].title).toBe(listing.title);
      expect(JSON.stringify(r)).not.toContain("@test.local");
    });
    it("rejects changing another seller asset", async () => {
      await expect(
        service.execute("it-s2", {
          type: "saveAsset",
          id: assetId,
          publish: true,
          data: listing,
        }),
      ).rejects.toThrow("not found");
    });
    it("hides draft from another participant", async () => {
      const draft = (
        await service.execute("it-s", {
          type: "saveAsset",
          publish: false,
          data: { ...listing, title: "Draft" },
        })
      ).id;
      await expect(
        readMarketplace("it-b", new URLSearchParams({ asset: draft })),
      ).rejects.toThrow("not found");
    });
    it("upserts buyer profile while discarding role injection", async () => {
      await service.execute("it-b", {
        type: "profile",
        data: {
          company: "Test Capital",
          bio: "Acquisition interests",
          country: "PL",
          countries: ["PL"],
          categories: ["PAYMENT"],
          licenses: ["SPI"],
          budgetCurrency: "EUR",
          minBudget: 0,
          maxBudget: 10000000,
          role: "MANAGER",
        },
      });
      expect(
        (await db.select().from(user).where(eq(user.id, "it-b")))[0].role,
      ).toBe("BUYER");
      expect(
        (await readMarketplace("it-b", new URLSearchParams())).profile?.company,
      ).toBe("Test Capital");
    });
    it("persists currencies and filters and sorts converted prices", async () => {
      const rates = {
        date: "2026-10-05",
        rates: { EUR: 1, USD: 2, GBP: 0.8, PLN: 4 },
      };
      const usdId = (
        await service.execute("it-s", {
          type: "saveAsset",
          publish: true,
          data: {
            ...listing,
            currency: "USD",
            priceCents: 5000000,
            title: "Dollar payment listing",
          },
        })
      ).id;
      const all = await readMarketplace(
        "it-b",
        new URLSearchParams({ currency: "EUR", sort: "price-asc" }),
        rates,
      );
      expect(all.assets.find((a) => a.id === usdId)?.convertedPriceCents).toBe(
        2500000,
      );
      expect(all.assets.find((a) => a.id === usdId)?.priceCents).toBe(5000000);
      const filtered = await readMarketplace(
        "it-b",
        new URLSearchParams({ currency: "EUR", min: "24000", max: "26000" }),
        rates,
      );
      expect(filtered.assets.map((a) => a.id)).toContain(usdId);
      const restored = (
        await db.select().from(assets).where(eq(assets.id, usdId))
      )[0];
      expect(restored.currency).toBe("USD");
      expect(restored.priceCents).toBe(5000000);
      await expect(
        readMarketplace(
          "it-b",
          new URLSearchParams({ sort: "price-asc" }),
          rates,
        ),
      ).rejects.toThrow("Choose a currency");
      await expect(
        readMarketplace("it-b", new URLSearchParams({ currency: "PLN" }), null),
      ).rejects.toThrow("unavailable");
    });
    it("converts budget in matching across currencies", async () => {
      const rates = {
        date: "2026-10-05",
        rates: { EUR: 1, USD: 2, GBP: 0.8, PLN: 4 },
      };
      const usdId = (
        await service.execute("it-s", {
          type: "saveAsset",
          publish: true,
          data: {
            ...listing,
            currency: "USD",
            priceCents: 12000000,
            title: "Dollar matching listing",
          },
        })
      ).id;
      const converted = await readMarketplace(
        "it-b",
        new URLSearchParams({ asset: usdId }),
        rates,
      );
      expect(converted.assets[0].score).toBe(100);
      const outage = await readMarketplace(
        "it-b",
        new URLSearchParams({ asset: usdId }),
        null,
      );
      expect(outage.assets[0].score).toBeNull();
      expect(
        outage.assets[0].reasons.find((r) => r.label === "Budget")?.matched,
      ).toBeNull();
    });
    it("deduplicates repeated contact and scopes messages to members", async () => {
      const command = {
        type: "contact",
        targetId: "it-s",
        assetId,
        body: "Discuss acquisition criteria.",
        nonce: crypto.randomUUID(),
      };
      const first = await service.execute("it-b", command);
      const second = await service.execute("it-b", command);
      expect(second.id).toBe(first.id);
      conversationId = first.id;
      expect(
        await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, first.id)),
      ).toHaveLength(1);
      await expect(
        readMarketplace(
          "it-b2",
          new URLSearchParams({ view: "inbox", thread: first.id }),
        ),
      ).rejects.toThrow("not found");
      await expect(
        readMarketplace(
          "it-m",
          new URLSearchParams({ view: "inbox", thread: first.id }),
        ),
      ).rejects.toThrow("not found");
    });
    it("rejects retry nonce reuse for different content", async () => {
      const nonce = crypto.randomUUID();
      await service.execute("it-b", {
        type: "message",
        conversationId,
        body: "First body",
        nonce,
      });
      await expect(
        service.execute("it-b", {
          type: "message",
          conversationId,
          body: "Different body",
          nonce,
        }),
      ).rejects.toThrow("different message");
    });
    it("suspension hides listing and blocks contact, then reactivation restores it", async () => {
      await service.execute("it-m", {
        type: "moderate",
        targetId: "it-s",
        status: "SUSPENDED",
        reason: "Test moderation",
      });
      await expect(
        readMarketplace("it-b", new URLSearchParams({ asset: assetId })),
      ).rejects.toThrow("not found");
      await expect(
        service.execute("it-s", {
          type: "saveAsset",
          publish: true,
          data: listing,
        }),
      ).rejects.toThrow("not active");
      await expect(
        service.execute("it-b", {
          type: "message",
          conversationId,
          body: "Another message",
          nonce: crypto.randomUUID(),
        }),
      ).rejects.toThrow("not active");
      expect(
        (
          await readMarketplace(
            "it-b",
            new URLSearchParams({ view: "inbox", thread: conversationId }),
          )
        ).messages.length,
      ).toBeGreaterThan(0);
      await service.execute("it-m", {
        type: "moderate",
        targetId: "it-s",
        status: "ACTIVE",
        reason: "Test reactivation",
      });
      expect(
        (await readMarketplace("it-b", new URLSearchParams({ asset: assetId })))
          .assets,
      ).toHaveLength(1);
    });
    it("removal is terminal and managers cannot moderate managers", async () => {
      await service.execute("it-m", {
        type: "moderate",
        targetId: "it-s2",
        status: "REMOVED",
        reason: "Test removal",
      });
      await expect(
        service.execute("it-m", {
          type: "moderate",
          targetId: "it-s2",
          status: "ACTIVE",
          reason: "Try restore",
        }),
      ).rejects.toThrow("transition");
      await expect(
        service.execute("it-m", {
          type: "moderate",
          targetId: "it-m",
          status: "SUSPENDED",
          reason: "Self suspend",
        }),
      ).rejects.toThrow("cannot be moderated");
    });
    it("rejects buyer-directory access through person parameter outside buyers view", async () => {
      await expect(
        readMarketplace(
          "it-b",
          new URLSearchParams({ view: "profile", person: "it-b2" }),
        ),
      ).rejects.toThrow("Seller access required");
    });
    it("searches matching buyers without applying buyer search to the context asset", async () => {
      const r = await readMarketplace(
        "it-s",
        new URLSearchParams({
          view: "buyers",
          asset: assetId,
          q: "Test Capital",
          sort: "match",
        }),
      );
      expect(r.people.map((p) => p.id)).toContain("it-b");
      expect(r.people.find((p) => p.id === "it-b")?.score).toBe(100);
    });
    it("validates malformed and inverted URL criteria", async () => {
      await expect(
        readMarketplace("it-b", new URLSearchParams({ min: "abc" })),
      ).rejects.toThrow();
      await expect(
        readMarketplace(
          "it-b",
          new URLSearchParams({ min: "500", max: "100" }),
        ),
      ).rejects.toThrow();
    });
  },
);
