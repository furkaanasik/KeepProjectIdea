import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, resolveDbPath } from '../src/db/index.js';

describe('db/index.ts', () => {
  let tmp: string;
  const originalEnv = process.env.DB_PATH;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'kpi-db-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalEnv === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = originalEnv;
  });

  it('resolveDbPath honors DB_PATH env override', () => {
    process.env.DB_PATH = ':memory:';
    expect(resolveDbPath()).toBe(':memory:');
  });

  it('openDb on a file path creates parent directory and the analyses table', () => {
    const dbPath = join(tmp, 'nested', 'app.db');
    const db = openDb(dbPath);
    expect(existsSync(dbPath)).toBe(true);
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='analyses'",
      )
      .get() as { name: string } | undefined;
    expect(row?.name).toBe('analyses');
    db.close();
  });

  it('openDb on :memory: works and migration is applied', () => {
    const db = openDb(':memory:');
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='analyses'",
      )
      .get() as { name: string } | undefined;
    expect(row?.name).toBe('analyses');
    db.close();
  });
});
