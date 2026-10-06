import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/shared/db/client";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
await migrate(db, { migrationsFolder: "drizzle" });
await pool.end();
console.log("Migrations applied.");
