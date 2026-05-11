import type { Database as DatabaseType } from 'better-sqlite3';
import type { AnalysisResult, DevelopmentSuggestion } from '../types/analysis.js';

export interface AnalysisRecord {
  id: number;
  created_at: string;
  idea: string;
  result: AnalysisResult & { selected_suggestions?: DevelopmentSuggestion[] };
}

export interface AnalysesRepo {
  insert(idea: string, result: AnalysisResult): { id: number; created_at: string };
  listRecent(limit?: number): AnalysisRecord[];
  getById(id: number): AnalysisRecord | null;
  saveSuggestions(id: number, suggestions: DevelopmentSuggestion[]): boolean;
  saveViability(id: number, viability: { score: number; status: string; reasoning: string }): boolean;
  saveFullResult(id: number, result: AnalysisResult): boolean;
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
  const getByIdStmt = db.prepare(
    'SELECT id, created_at, idea, result_json FROM analyses WHERE id = ?',
  );
  const updateStmt = db.prepare(
    'UPDATE analyses SET result_json = ? WHERE id = ?',
  );

  function rowToRecord(row: AnalysisRow): AnalysisRecord {
    return {
      id: row.id,
      created_at: row.created_at,
      idea: row.idea,
      result: JSON.parse(row.result_json) as AnalysisRecord['result'],
    };
  }

  return {
    insert(idea, result) {
      const created_at = new Date().toISOString();
      const info = insertStmt.run(created_at, idea, JSON.stringify(result));
      return { id: Number(info.lastInsertRowid), created_at };
    },
    listRecent(limit = 20) {
      const rows = listStmt.all(limit) as AnalysisRow[];
      return rows.map(rowToRecord);
    },
    getById(id) {
      const row = getByIdStmt.get(id) as AnalysisRow | undefined;
      return row ? rowToRecord(row) : null;
    },
    saveSuggestions(id, suggestions) {
      const row = getByIdStmt.get(id) as AnalysisRow | undefined;
      if (!row) return false;
      const current = JSON.parse(row.result_json) as Record<string, unknown>;
      current['selected_suggestions'] = suggestions;
      updateStmt.run(JSON.stringify(current), id);
      return true;
    },
    saveViability(id, viability) {
      const row = getByIdStmt.get(id) as AnalysisRow | undefined;
      if (!row) return false;
      const current = JSON.parse(row.result_json) as Record<string, unknown>;
      current['viability'] = viability;
      updateStmt.run(JSON.stringify(current), id);
      return true;
    },
    saveFullResult(id, result) {
      const row = getByIdStmt.get(id) as AnalysisRow | undefined;
      if (!row) return false;
      const current = JSON.parse(row.result_json) as Record<string, unknown>;
      const selectedSuggestions = current['selected_suggestions'];
      const merged = { ...result, selected_suggestions: selectedSuggestions };
      updateStmt.run(JSON.stringify(merged), id);
      return true;
    },
  };
}
