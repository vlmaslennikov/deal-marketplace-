// Explicit sandbox-only preview; production uses a standard PostgreSQL service.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const db = await PGlite.create(".pgdata");
const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 5432 });
await server.start();
console.log("PGlite preview listening on 127.0.0.1:5432");
for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
