import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

export const db_expo = openDatabaseSync("db", { enableChangeListener: true });
export const db_client = drizzle(db_expo);
