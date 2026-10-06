/**
 * The pair store.
 *
 * Three tables in one file. Storing this little is a product decision, not laziness: the
 * words are deleted on purpose, and a database that holds almost nothing is harder to
 * leak from.
 *
 * The important function is `storeRevealAndShred`. It writes the finished page and clears
 * both people's words in a single transaction, and it lives here rather than in a route
 * handler so that no endpoint can derive a page while quietly keeping the answers.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Reveal } from "./compose";

const DB_PATH = join(process.cwd(), "data", "ours.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pair (
      code        TEXT PRIMARY KEY,
      created_at  INTEGER NOT NULL,
      reveal_json TEXT,
      revealed_at INTEGER,
      talked_mark INTEGER
    );
    CREATE TABLE IF NOT EXISTS person (
      pair_code    TEXT NOT NULL REFERENCES pair(code),
      name         TEXT NOT NULL,
      sealed       INTEGER NOT NULL DEFAULT 0,
      sealed_at    INTEGER,
      commitment   TEXT,
      raw_answers  TEXT,
      alt_answers  TEXT,
      PRIMARY KEY (pair_code, name)
    );
  `);
  _db = db;
  return db;
}

/* ------------------------------------------------------------------------ pair */

export function createPair(code: string): boolean {
  const db = getDb();
  const res = db
    .prepare("INSERT OR IGNORE INTO pair (code, created_at) VALUES (?, ?)")
    .run(code, Date.now());
  return res.changes > 0;
}

/** Put a person in the pair. Called on join; joining twice under one name is refused. */
export function addPerson(code: string, name: string): boolean {
  const res = getDb()
    .prepare("INSERT OR IGNORE INTO person (pair_code, name) VALUES (?, ?)")
    .run(code, name);
  return res.changes > 0;
}

export function pairExists(code: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM pair WHERE code = ?").get(code);
}

export type PersonRow = {
  name: string;
  sealed: number;
  commitment: string | null;
  hasAnswers: boolean;
};

export function getPair(code: string): {
  reveal: Reveal | null;
  people: PersonRow[];
} | null {
  const db = getDb();
  const pair = db.prepare("SELECT reveal_json FROM pair WHERE code = ?").get(code) as
    | { reveal_json: string | null }
    | undefined;
  if (!pair) return null;

  const people = db
    .prepare(
      "SELECT name, sealed, commitment, raw_answers FROM person WHERE pair_code = ? ORDER BY name",
    )
    .all(code) as { name: string; sealed: number; commitment: string | null; raw_answers: string | null }[];

  return {
    reveal: pair.reveal_json ? (JSON.parse(pair.reveal_json) as Reveal) : null,
    people: people.map((p) => ({
      name: p.name,
      sealed: p.sealed,
      commitment: p.commitment,
      hasAnswers: !!p.raw_answers,
    })),
  };
}

/* ------------------------------------------------------------------------ person */

/** Drafts save as you type, so a dropped connection loses nothing. */
export function saveDraft(code: string, name: string, answers: string[]): void {
  getDb()
    .prepare(
      `INSERT INTO person (pair_code, name, raw_answers) VALUES (?, ?, ?)
       ON CONFLICT(pair_code, name) DO UPDATE SET raw_answers = excluded.raw_answers
       WHERE person.sealed = 0`,
    )
    .run(code, name, JSON.stringify(answers));
}

export function getDraft(code: string, name: string): string[] {
  const row = getDb()
    .prepare("SELECT raw_answers FROM person WHERE pair_code = ? AND name = ?")
    .get(code, name) as { raw_answers: string | null } | undefined;
  return row?.raw_answers ? (JSON.parse(row.raw_answers) as string[]) : [];
}

export function sealPerson(
  code: string,
  name: string,
  commitment: string,
  answers: string[],
): void {
  getDb()
    .prepare(
      `INSERT INTO person (pair_code, name, sealed, sealed_at, commitment, raw_answers)
       VALUES (?, ?, 1, ?, ?, ?)
       ON CONFLICT(pair_code, name) DO UPDATE SET
         sealed = 1, sealed_at = excluded.sealed_at,
         commitment = excluded.commitment, raw_answers = excluded.raw_answers`,
    )
    .run(code, name, Date.now(), commitment, JSON.stringify(answers));
}

export function areBothSealed(code: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM person WHERE pair_code = ? AND sealed = 1",
    )
    .get(code) as { n: number };
  return row.n >= 2;
}

/** Read the two sealed answer sets for derivation. Called once, then they are gone. */
export function readSealedAnswers(code: string): { a: PersonRow & { answers: string[] }; b: PersonRow & { answers: string[] } } | null {
  const rows = getDb()
    .prepare(
      "SELECT name, raw_answers FROM person WHERE pair_code = ? AND sealed = 1 ORDER BY name",
    )
    .all(code) as { name: string; raw_answers: string | null }[];
  if (rows.length < 2) return null;

  const parsed = rows.map((r) => ({
    name: r.name,
    sealed: 1,
    commitment: null,
    hasAnswers: true,
    answers: r.raw_answers ? (JSON.parse(r.raw_answers) as string[]) : [],
  }));

  return { a: parsed[0], b: parsed[1] };
}

/**
 * Write the finished page and destroy both sets of words, atomically.
 *
 * After this runs there is no copy of either person's answers anywhere in the database.
 * The reveal they see afterwards was computed from both, and neither of them can retrieve
 * the other's words — because the words no longer exist.
 */
export function storeRevealAndShred(code: string, reveal: Reveal): void {
  const db = getDb();
  const write = db.prepare(
    "UPDATE pair SET reveal_json = ?, revealed_at = ? WHERE code = ?",
  );
  const shred = db.prepare(
    "UPDATE person SET raw_answers = NULL WHERE pair_code = ?",
  );
  db.exec("BEGIN");
  try {
    write.run(JSON.stringify(reveal), Date.now(), code);
    shred.run(code);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function markTalked(code: string, talked: boolean): void {
  getDb()
    .prepare("UPDATE pair SET talked_mark = ? WHERE code = ?")
    .run(talked ? 1 : 0, code);
}

/* ------------------------------------------- demonstration control (not a feature) */

/**
 * Swap one person's answers for the alternative set and let a page be derived again.
 * Used only by the labelled demonstration control. Never reachable from the normal flow.
 */
export function setAltAnswers(code: string, name: string, answers: string[]): void {
  getDb()
    .prepare("UPDATE person SET alt_answers = ? WHERE pair_code = ? AND name = ?")
    .run(JSON.stringify(answers), code, name);
}

export function readAltAnswers(code: string, name: string): string[] | null {
  const row = getDb()
    .prepare("SELECT alt_answers FROM person WHERE pair_code = ? AND name = ?")
    .get(code, name) as { alt_answers: string | null } | undefined;
  return row?.alt_answers ? (JSON.parse(row.alt_answers) as string[]) : null;
}

/** Put a pair back the way it was, so the control can be toggled off again. */
export function resetToRealAnswers(code: string): void {
  getDb().prepare("DELETE FROM person WHERE pair_code = ? AND sealed = 1").run(code);
  getDb().prepare("UPDATE pair SET reveal_json = NULL, revealed_at = NULL WHERE code = ?").run(code);
}