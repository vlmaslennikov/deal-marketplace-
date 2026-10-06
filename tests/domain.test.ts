import { describe, it, expect } from "vitest";
import {
  assertPublish,
  assertTransition,
  match,
  parseMoney,
  assertContact,
} from "../src/modules/marketplace/domain/policies";
const seller = { id: "s", role: "SELLER", status: "ACTIVE" };
const asset = {
  sellerId: "s",
  title: "Polish payment platform",
  description: "A payments platform with established merchant integrations.",
  currency: "EUR" as const,
  priceCents: 9500000,
  category: "PAYMENT",
  country: "PL",
  licenseType: "SPI",
  regulator: "KNF",
  status: "DRAFT",
};
describe("publishing", () => {
  it("allows an active seller to publish a complete own draft", () =>
    expect(() => assertPublish(seller, asset)).not.toThrow());
  it.each([
    { ...seller, status: "SUSPENDED" },
    { ...seller, role: "BUYER" },
    { ...seller, id: "other" },
  ])("rejects unauthorized publisher %j", (actor) =>
    expect(() => assertPublish(actor, asset)).toThrow(),
  );
  it.each([
    { ...asset, priceCents: 0 },
    { ...asset, description: "short" },
    { ...asset, status: "ARCHIVED" },
  ])("rejects incomplete or archived asset %j", (a) =>
    expect(() => assertPublish(seller, a)).toThrow(),
  );
});
describe("moderation", () => {
  it("removal is terminal", () =>
    expect(() => assertTransition("REMOVED", "ACTIVE")).toThrow());
  it("permits suspension and reactivation", () => {
    expect(() => assertTransition("ACTIVE", "SUSPENDED")).not.toThrow();
    expect(() => assertTransition("SUSPENDED", "ACTIVE")).not.toThrow();
  });
});
describe("money", () => {
  it("converts decimal EUR to integer cents exactly", () =>
    expect(parseMoney("123.45")).toBe(12345));
  it.each(["-1", "1.001", "NaN", "1e3", "999999999999", ""])(
    "rejects invalid amount %s",
    (s) => expect(() => parseMoney(s)).toThrow(),
  );
});
describe("matching", () => {
  it("does not invent a score for empty criteria", () =>
    expect(
      match(
        {
          countries: [],
          categories: [],
          licenses: [],
          budgetCurrency: "EUR",
          minBudget: null,
          maxBudget: null,
        },
        asset,
      ).score,
    ).toBeNull());
  it("normalizes configured criteria only", () =>
    expect(
      match(
        {
          countries: ["PL"],
          categories: [],
          licenses: [],
          budgetCurrency: "EUR",
          minBudget: null,
          maxBudget: null,
        },
        asset,
      ).score,
    ).toBe(100));
  it("treats budget inclusively", () =>
    expect(
      match(
        {
          countries: [],
          categories: [],
          licenses: [],
          budgetCurrency: "EUR",
          minBudget: 9500000,
          maxBudget: 9500000,
        },
        asset,
      ).score,
    ).toBe(100));
  it("explains mismatches", () => {
    const r = match(
      {
        countries: ["DE"],
        categories: [],
        licenses: [],
        budgetCurrency: "EUR",
        minBudget: null,
        maxBudget: null,
      },
      asset,
    );
    expect(r.score).toBe(0);
    expect(r.reasons[0].matched).toBe(false);
  });
});
it("blocks contact if either participant is suspended", () =>
  expect(() =>
    assertContact(seller, { id: "b", role: "BUYER", status: "SUSPENDED" }),
  ).toThrow());
it("blocks same-role contact", () =>
  expect(() => assertContact(seller, { ...seller, id: "s2" })).toThrow());
