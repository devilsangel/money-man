import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.DATA_DIR ?? path.join(__dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "money-man.db");
export const db: DatabaseType = new Database(dbPath);

// Performance pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");
