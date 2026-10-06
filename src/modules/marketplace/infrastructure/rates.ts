import { z } from "zod";
import type { RateSnapshot } from "../domain/money";
const payload = z.object({
  date: z.iso.date(),
  base: z.literal("EUR"),
  rates: z.object({
    USD: z.number().positive().finite(),
    GBP: z.number().positive().finite(),
    PLN: z.number().positive().finite(),
  }),
});
let cache: { snapshot: RateSnapshot | null; expires: number } | null = null;
let pending: Promise<RateSnapshot | null> | null = null;
export async function latestRates(): Promise<RateSnapshot | null> {
  if (cache && cache.expires > Date.now()) return cache.snapshot;
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch(
        "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,PLN",
        {
          signal: AbortSignal.timeout(2500),
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error(`Rates HTTP ${response.status}`);
      const data = payload.parse(await response.json());
      const snapshot: RateSnapshot = {
        date: data.date,
        rates: { EUR: 1, ...data.rates },
      };
      cache = { snapshot, expires: Date.now() + 6 * 60 * 60 * 1000 };
      return snapshot;
    } catch (error) {
      console.warn(
        "Exchange rates unavailable",
        error instanceof Error ? error.message : error,
      );
      if (
        cache?.snapshot &&
        Date.now() - Date.parse(cache.snapshot.date) < 7 * 86400000
      ) {
        cache.expires = Date.now() + 5 * 60 * 1000;
        return cache.snapshot;
      }
      cache = { snapshot: null, expires: Date.now() + 60_000 };
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
