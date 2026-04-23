import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env" });

const client = postgres(
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp"
);

export const db = drizzle(client);
