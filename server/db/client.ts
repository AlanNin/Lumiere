import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

export const db_expo = SQLite.openDatabaseSync("db");

db_expo.execSync(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
`);

export const db_client = drizzle(db_expo);
