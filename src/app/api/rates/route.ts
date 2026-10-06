import { auth } from "@/shared/auth/auth";
import { latestRates } from "@/modules/marketplace/infrastructure/rates";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Please sign in." }, { status: 401 });
  const rates = await latestRates();
  if (!rates)
    return Response.json(
      { error: "Exchange rates are temporarily unavailable." },
      { status: 503 },
    );
  return Response.json(rates, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
