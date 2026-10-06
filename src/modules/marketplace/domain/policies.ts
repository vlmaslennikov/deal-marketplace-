import { convertCents, type Currency, type RateSnapshot } from "./money";
export type Actor = { id: string; role: string; status: string };
export type Criteria = {
  countries: string[];
  categories: string[];
  licenses: string[];
  budgetCurrency: Currency;
  minBudget: number | null;
  maxBudget: number | null;
};
export type MatchAsset = {
  currency: Currency;
  priceCents: number;
  country: string;
  category: string;
  licenseType: string;
};
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function assertActive(actor: Actor) {
  if (actor.status !== "ACTIVE")
    throw new DomainError(
      "Your account is not active. Contact the platform manager.",
      403,
    );
}
export function assertPublish(
  actor: Actor,
  asset: {
    sellerId: string;
    title: string;
    description: string;
    priceCents: number;
    licenseType: string;
    regulator: string;
    status: string;
  },
) {
  assertActive(actor);
  if (actor.role !== "SELLER" || asset.sellerId !== actor.id)
    throw new DomainError("Only the owner can publish this asset.", 403);
  if (asset.status === "ARCHIVED")
    throw new DomainError("Archived listings cannot be changed.");
  if (
    asset.title.trim().length < 8 ||
    asset.description.trim().length < 40 ||
    asset.priceCents <= 0 ||
    !asset.licenseType.trim() ||
    !asset.regulator.trim()
  )
    throw new DomainError(
      "To publish: add a title (8+ characters), description (40+ characters), a positive price, licence and regulator.",
    );
}
export function assertTransition(from: string, to: string) {
  if (
    from === "REMOVED" ||
    !["ACTIVE", "SUSPENDED", "REMOVED"].includes(to) ||
    from === to
  )
    throw new DomainError("This status transition is not allowed.");
}
export function assertContact(a: Actor, b: Actor) {
  assertActive(a);
  assertActive(b);
  if (
    a.id === b.id ||
    ![a.role, b.role].includes("BUYER") ||
    ![a.role, b.role].includes("SELLER")
  )
    throw new DomainError("Contact requires a buyer and a seller.", 403);
}
export function parseMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new DomainError("Enter a valid amount with at most two decimals.");
  const [whole, frac = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 2000000000)
    throw new DomainError(
      "Amount must be at most 20,000,000 in the selected currency.",
    );
  return cents;
}
export function match(
  c: Criteria,
  a: MatchAsset,
  rates: RateSnapshot | null = null,
) {
  const budgetPrice = convertCents(
    a.priceCents,
    a.currency,
    c.budgetCurrency,
    rates,
  );
  const reasons: { label: string; matched: boolean | null; weight: number }[] =
    [];
  if (c.minBudget !== null || c.maxBudget !== null)
    reasons.push({
      label: "Budget",
      weight: 30,
      matched:
        budgetPrice === null
          ? null
          : (c.minBudget === null || budgetPrice >= c.minBudget) &&
            (c.maxBudget === null || budgetPrice <= c.maxBudget),
    });
  for (const [label, values, value, weight] of [
    ["Category", c.categories, a.category, 25],
    ["Jurisdiction", c.countries, a.country, 20],
    ["Licence", c.licenses, a.licenseType, 15],
  ] as const)
    if (values.length)
      reasons.push({ label, weight, matched: values.includes(value) });
  const total = reasons.reduce((s, r) => s + r.weight, 0);
  return {
    score:
      total && !reasons.some((r) => r.matched === null)
        ? Math.round(
            (100 *
              reasons.reduce((s, r) => s + (r.matched ? r.weight : 0), 0)) /
              total,
          )
        : null,
    reasons,
  };
}
