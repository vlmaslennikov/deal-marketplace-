import { auth } from "@/shared/auth/auth";
import { readMarketplace } from "@/modules/marketplace/infrastructure/queries";
import { store } from "@/modules/marketplace/infrastructure/store";
import { MarketplaceService } from "@/modules/marketplace/application/service";
import { DomainError } from "@/modules/marketplace/domain/policies";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
async function actor(request: Request) {
  const s = await auth.api.getSession({ headers: request.headers });
  if (!s) throw new DomainError("Please sign in.", 401);
  return s.user.id;
}
function error(e: unknown) {
  if (e instanceof DomainError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return Response.json(
      {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  console.error("Marketplace request failed", e);
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
export async function GET(request: Request) {
  try {
    return Response.json(
      await readMarketplace(
        await actor(request),
        new URL(request.url).searchParams,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return error(e);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(process.env.BETTER_AUTH_URL!).origin)
      throw new DomainError("Invalid request origin.", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new DomainError("JSON body required.", 415);
    const body = await request.text();
    if (body.length > 20000) throw new DomainError("Request too large.", 413);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new DomainError("Invalid JSON.", 400);
    }
    return Response.json(
      await new MarketplaceService(store).execute(await actor(request), parsed),
    );
  } catch (e) {
    return error(e);
  }
}
