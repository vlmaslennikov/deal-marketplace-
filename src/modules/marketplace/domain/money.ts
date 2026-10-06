export const currencies = ["EUR", "USD", "GBP", "PLN"] as const;
export type Currency = (typeof currencies)[number];
export type RateSnapshot = { date: string; rates: Record<Currency, number> };
export function convertCents(
  amount: number,
  from: Currency,
  to: Currency,
  snapshot: RateSnapshot | null,
): number | null {
  if (from === to) return amount;
  if (!snapshot) return null;
  const converted = Math.round(
    (amount * snapshot.rates[to]) / snapshot.rates[from],
  );
  return Number.isSafeInteger(converted) ? converted : null;
}
