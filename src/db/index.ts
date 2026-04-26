import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import Database, { type Database as DatabaseType } from 'better-sqlite3';

const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    idea TEXT NOT NULL,
    result_json TEXT NOT NULL
  );
`;

const DEFAULT_DB_PATH = './data/app.db';

export function resolveDbPath(envPath?: string): string {
  const raw = (envPath ?? process.env.DB_PATH ?? DEFAULT_DB_PATH).trim();
  return raw === '' ? DEFAULT_DB_PATH : raw;
}

export function openDb(path?: string): DatabaseType {
  const dbPath = path ?? resolveDbPath();
  if (dbPath !== ':memory:') {
    const absolute = isAbsolute(dbPath) ? dbPath : resolve(dbPath);
    mkdirSync(dirname(absolute), { recursive: true });
  }
  const db = new Database(dbPath);
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.exec(MIGRATION_SQL);
  return db;
}

let cached: DatabaseType | null = null;

export function getDb(): DatabaseType {
  if (cached === null) {
    cached = openDb();
  }
  return cached;
}

export function closeDb(): void {
  if (cached !== null) {
    cached.close();
    cached = null;
  }
}
