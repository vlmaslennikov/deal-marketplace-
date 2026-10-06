export const countryNames: Record<string, string> = {
  PL: "Poland",
  LT: "Lithuania",
  DE: "Germany",
  GB: "United Kingdom",
  MT: "Malta",
  CA: "Canada",
};
export const categoryNames: Record<string, string> = {
  PAYMENT: "Payments",
  EMI: "E-money",
  FINTECH: "Fintech",
  BANK: "Banking",
  CRYPTO: "Digital assets",
};
export const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export const initials = (s: string) =>
  s
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
export async function mutate(command: unknown) {
  const r = await fetch("/api/marketplace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? "Could not save changes.");
  return body as { id: string };
}
