import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { user, session, account, verification } from "../db/schema";
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  session: { cookieCache: { enabled: false } },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "BUYER", input: false },
      status: { type: "string", defaultValue: "ACTIVE", input: false },
    },
  },
});
