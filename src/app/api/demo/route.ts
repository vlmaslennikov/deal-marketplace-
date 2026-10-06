import { auth } from "@/shared/auth/auth";
import { z } from "zod";
export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== "true")
    return Response.json(
      { error: "Demo access is disabled." },
      { status: 404 },
    );
  if (
    request.headers.get("origin") !==
    new URL(process.env.BETTER_AUTH_URL!).origin
  )
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const { role } = z
      .object({ role: z.enum(["buyer", "seller", "manager"]) })
      .parse(await request.json());
    return await auth.api.signInEmail({
      body: {
        email: `${role}@dealdemo.local`,
        password: process.env.DEMO_PASSWORD!,
      },
      headers: request.headers,
      asResponse: true,
    });
  } catch {
    return Response.json(
      { error: "Could not sign in. Check that demo accounts are seeded." },
      { status: 400 },
    );
  }
}
