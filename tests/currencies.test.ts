import { expect, it } from "vitest";
import { match } from "../src/modules/marketplace/domain/policies";
import {
  assetInput,
  profileInput,
} from "../src/modules/marketplace/application/validation";
const criteria = {
  countries: ["PL"],
  categories: [],
  licenses: [],
  minBudget: 10000,
  maxBudget: 20000,
  budgetCurrency: "EUR" as const,
};
const asset = {
  country: "PL",
  category: "PAYMENT",
  licenseType: "SPI",
  priceCents: 15000,
  currency: "USD" as const,
};
it("does not score budgets across currencies", () => {
  const result = match(criteria, asset);
  expect(result.score).toBeNull();
  expect(result.reasons.find((r) => r.label === "Budget")?.matched).toBeNull();
});
it("can match nonmonetary criteria when no budget is configured", () => {
  expect(
    match({ ...criteria, minBudget: null, maxBudget: null }, asset).score,
  ).toBe(100);
});
it.each(["EUR", "USD", "GBP", "PLN"] as const)(
  "validates and preserves %s",
  (currency) => {
    expect(
      assetInput.parse({
        ...asset,
        currency,
        title: "Example listing",
        description: "",
        businessStatus: "ACTIVE",
        regulator: "",
        features: [],
      }).currency,
    ).toBe(currency);
    expect(
      profileInput.parse({
        ...criteria,
        budgetCurrency: currency,
        company: "Example",
        country: "PL",
        bio: "",
      }).budgetCurrency,
    ).toBe(currency);
  },
);
it("rejects unsupported and missing currencies", () => {
  for (const currency of ["BTC", undefined])
    expect(
      assetInput.safeParse({
        ...asset,
        currency,
        title: "Example listing",
        description: "",
        businessStatus: "ACTIVE",
        regulator: "",
        features: [],
      }).success,
    ).toBe(false);
});
import {
  convertCents,
  type RateSnapshot,
} from "../src/modules/marketplace/domain/money";
const rates: RateSnapshot = {
  date: "2026-10-05",
  rates: { EUR: 1, USD: 1.2, GBP: 0.8, PLN: 4 },
};
it("converts minor units using one rate snapshot and rounds to cents", () => {
  expect(convertCents(10001, "EUR", "USD", rates)).toBe(12001);
  expect(convertCents(12000, "USD", "PLN", rates)).toBe(40000);
  expect(convertCents(10001, "EUR", "EUR", null)).toBe(10001);
  expect(convertCents(10000, "EUR", "USD", null)).toBeNull();
});
it("matches cross-currency budget using converted price", () => {
  expect(match(criteria, asset, rates).score).toBe(100);
  expect(match(criteria, { ...asset, priceCents: 30000 }, rates).score).toBe(
    40,
  );
});
