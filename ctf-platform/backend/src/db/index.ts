import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

const sqlite = new Database("sqlite.db");
export const db = drizzle(sqlite, { schema });

// Graceful shutdown
process.on("SIGINT", () => {
  sqlite.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  sqlite.close();
  process.exit(0);
});
