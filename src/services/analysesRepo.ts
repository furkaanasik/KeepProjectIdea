import type { Database as DatabaseType } from 'better-sqlite3';
import type { AnalysisResult } from '../types/analysis.js';

export interface AnalysisRecord {
  id: number;
  created_at: string;
  idea: string;
  result: AnalysisResult;
}

export interface AnalysesRepo {
  insert(idea: string, result: AnalysisResult): { id: number; created_at: string };
  listRecent(limit?: number): AnalysisRecord[];
}

interface AnalysisRow {
  id: number;
  created_at: string;
  idea: string;
  result_json: string;
}

export function createAnalysesRepo(db: DatabaseType): AnalysesRepo {
  const insertStmt = db.prepare(
    'INSERT INTO analyses (created_at, idea, result_json) VALUES (?, ?, ?)',
  );
  const listStmt = db.prepare(
    'SELECT id, created_at, idea, result_json FROM analyses ORDER BY id DESC LIMIT ?',
  );

  return {
    insert(idea, result) {
      const created_at = new Date().toISOString();
      const info = insertStmt.run(created_at, idea, JSON.stringify(result));
      return { id: Number(info.lastInsertRowid), created_at };
    },
    listRecent(limit = 20) {
      const rows = listStmt.all(limit) as AnalysisRow[];
      return rows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        idea: row.idea,
        result: JSON.parse(row.result_json) as AnalysisResult,
      }));
    },
  };
}
