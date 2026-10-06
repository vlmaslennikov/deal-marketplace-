import { it, expect } from "vitest";
import { MarketplaceService } from "../src/modules/marketplace/application/service";
import type {
  MarketplaceStore,
  Transaction,
} from "../src/modules/marketplace/domain/model";
const make = (users: any[]) =>
  new MarketplaceService({
    transaction: async (f) =>
      f({ lockUsers: async () => users } as unknown as Transaction),
  } satisfies MarketplaceStore);
it("denies an unknown actor", async () => {
  await expect(
    make([]).execute("missing", { type: "archiveAsset", id: "a" }),
  ).rejects.toThrow();
});
it("validates input before persistence", async () => {
  await expect(
    make([]).execute("b", { type: "profile", data: { role: "MANAGER" } }),
  ).rejects.toThrow();
});
it("denies mutation by suspended actor", async () => {
  await expect(
    make([{ id: "b", role: "BUYER", status: "SUSPENDED" }]).execute("b", {
      type: "archiveAsset",
      id: "a",
    }),
  ).rejects.toThrow();
});
it("buyer cannot moderate", async () => {
  await expect(
    make([
      { id: "b", role: "BUYER", status: "ACTIVE" },
      { id: "s", role: "SELLER", status: "ACTIVE" },
    ]).execute("b", {
      type: "moderate",
      targetId: "s",
      status: "SUSPENDED",
      reason: "Demo reason",
    }),
  ).rejects.toThrow();
});
