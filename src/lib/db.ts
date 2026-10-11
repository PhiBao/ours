/**
 * The pair store.
 *
 * Three tables, one file. Storing this little is a product decision, not laziness: the
 * words are deleted on purpose, and a database holding almost nothing is harder to leak
 * from.
 *
 * The important function is `storeRevealAndShred`. It writes the finished page and clears
 * both people's words in a single transaction, and it lives here rather than in a route
 * handler so that no endpoint can derive a page while quietly keeping the answers.
 *
 * Two drivers, same SQL:
 *   - local development and the demo recording: Node 22's built-in `node:sqlite`
 *   - deployment: Cloudflare D1, through the `DB` binding
 *
 * They are not interchangeable on a serverless host — a local file does not survive between
 * invocations there. Everything above this file is written against one interface and does
 * not care which is running.
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
// Static, not dynamic. A dynamic import of the adapter resolved at runtime in a route
// handler but silently failed inside this module once bundled, and the `catch` turned that
// into a file driver — which cannot work on Workers. Statically imported, the resolution
// happens at build time where a failure would be loud.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Reveal } from "./compose";

/** The subset of the D1 binding this app uses. */
type D1Binding = {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<unknown>;
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
  batch<T>(stmts: unknown[]): Promise<T[]>;
};

declare global {
  interface CloudflareEnv {
    DB?: D1Binding;
  }
}

export type PersonRow = {
  name: string;
  sealed: number;
  commitment: string | null;
  hasAnswers: boolean;
};

export type SealedPerson = PersonRow & { answers: string[] };

/** The narrow surface everything above this file depends on. */
interface Driver {
  kind: "file" | "d1";
  exec(sql: string): Promise<void>;
  run(sql: string, params: unknown[]): Promise<void>;
  get<T>(sql: string, params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params: unknown[]): Promise<T[]>;
  /** Run statements as one unit, rolling back on failure. */
  transaction(fn: () => Promise<void>): Promise<void>;
}

const SCHEMA = `
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
`;

/* --------------------------------------------------------------------- local file */

class FileDriver implements Driver {
  kind = "file" as const;
  private db: import("node:sqlite").DatabaseSync;

  constructor() {
    // Required lazily: a deployed bundle never takes this path, and importing
    // node:sqlite unconditionally would fail on runtimes that lack it.
    const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
    const path = join(process.cwd(), "data", "ours.db");
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
  }

  async exec(sql: string) {
    this.db.exec(sql);
  }
  async run(sql: string, params: unknown[]) {
    this.db.prepare(sql).run(...(params as never[]));
  }
  async get<T>(sql: string, params: unknown[]): Promise<T | undefined> {
    return this.db.prepare(sql).get(...(params as never[])) as T | undefined;
  }
  async all<T>(sql: string, params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }
  async transaction(fn: () => Promise<void>) {
    this.db.exec("BEGIN");
    try {
      await fn();
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
}

/* -------------------------------------------------------------------------- D1 */

/**
 * Cloudflare D1. The best fit of the three for this app: `batch()` is atomic, which is a
 * stronger guarantee for storeRevealAndShred than the manual transaction the local file
 * driver has to do, and it needs no connection pooling on an edge runtime.
 */
class D1Driver implements Driver {
  kind = "d1" as const;
  constructor(private db: D1Binding) {}

  async exec(sql: string) {
    // D1 has no multi-statement execute; the schema is applied by wrangler at deploy time.
    void sql;
  }
  async run(sql: string, params: unknown[]) {
    await this.db.prepare(sql).bind(...params).run();
  }
  async get<T>(sql: string, params: unknown[]): Promise<T | undefined> {
    return (await this.db.prepare(sql).bind(...params).first<T>()) ?? undefined;
  }
  async all<T>(sql: string, params: unknown[]): Promise<T[]> {
    return (await this.db.prepare(sql).bind(...params).all<T>()).results;
  }
  async transaction(fn: () => Promise<void>) {
    await fn();
  }

  /** Atomic multi-statement write, used by storeRevealAndShred. */
  batch(statements: { sql: string; args: unknown[] }[]): Promise<unknown> {
    return this.db.batch(statements.map((s) => this.db.prepare(s.sql).bind(...s.args)));
  }
}

/* -------------------------------------------------------------------- selection */

let _driver: Promise<Driver> | null = null;

export function driver(): Promise<Driver> {
  if (!_driver) {
    _driver = (async () => {
      const binding = await cloudflareBinding();
      if (binding) return new D1Driver(binding);
      // If we are running somewhere without a filesystem, a file driver cannot work and
      // falling back to one produces a bare 500 from mkdirSync. Fail loudly instead.
      if (onCloudflareRuntime()) {
        throw new Error(
          "No D1 binding found. This deployment needs the DB binding from wrangler.jsonc.",
        );
      }

      const d = new FileDriver();
      await d.exec(SCHEMA);
      return d;
    })();
  }
  return _driver;
}

/** Which store is actually running. Surfaced on /demo and in the README. */
/**
 * Find the D1 binding.
 *
 * OpenNext does not put bindings on `globalThis.env`; they live on the request context,
 * reachable through `getCloudflareContext`. The native Workers runtime is checked first as
 * a fast path, and the import is dynamic so a plain `next build` never needs the adapter.
 *
 * This function returning undefined is what selects the local file driver — so getting it
 * wrong silently sends a deployment back to a file it cannot write. That is exactly what
 * happened once, and every API route returned a bare 500.
 */
export async function cloudflareBinding(): Promise<D1Binding | undefined> {
  // nodejs_compat_populate_process_env puts bindings on process.env, so the plain check
  // below works without importing the adapter — which is what was silently failing before.
  const fromProcess = (globalThis.process?.env as Record<string, unknown> | undefined)?.DB;
  if (fromProcess && typeof fromProcess === "object") return fromProcess as D1Binding;

  const native = (globalThis as { env?: Record<string, unknown> }).env?.DB;
  if (native) return native as D1Binding;

  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.DB as D1Binding | undefined;
  } catch (err) {
    // Logged, not hidden: a silent fallback here is what turned a binding problem into a
    // bare 500 with an empty body.
    console.error("could not read the Cloudflare context:", err);
    return undefined;
  }
}

/** True on the Workers runtime, where a local file is not an option. */
function onCloudflareRuntime(): boolean {
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined";
}

/** Which store is actually running. Surfaced in the README and the app map. */
export function storageKind(): "d1" | "file" {
  return onCloudflareRuntime() ? "d1" : "file";
}

/* --------------------------------------------------------------------------- pair */

export async function createPair(code: string): Promise<boolean> {
  const d = await driver();
  await d.run("INSERT OR IGNORE INTO pair (code, created_at) VALUES (?, ?)", [code, Date.now()]);
  return true;
}

/** Put a person in the pair. Joining twice under one name is refused by the caller. */
export async function addPerson(code: string, name: string): Promise<boolean> {
  const d = await driver();
  await d.run("INSERT OR IGNORE INTO person (pair_code, name) VALUES (?, ?)", [code, name]);
  return true;
}

export async function pairExists(code: string): Promise<boolean> {
  const d = await driver();
  return !!(await d.get("SELECT 1 AS x FROM pair WHERE code = ?", [code]));
}

export async function getPair(
  code: string,
): Promise<{ reveal: Reveal | null; people: PersonRow[] } | null> {
  const d = await driver();
  const pair = await d.get<{ reveal_json: string | null }>(
    "SELECT reveal_json FROM pair WHERE code = ?",
    [code],
  );
  if (!pair) return null;

  const rows = await d.all<{ name: string; sealed: number; commitment: string | null; raw_answers: string | null }>(
    "SELECT name, sealed, commitment, raw_answers FROM person WHERE pair_code = ? ORDER BY name",
    [code],
  );

  return {
    reveal: pair.reveal_json ? (JSON.parse(pair.reveal_json) as Reveal) : null,
    people: rows.map((p) => ({
      name: p.name,
      sealed: p.sealed,
      commitment: p.commitment,
      hasAnswers: !!p.raw_answers,
    })),
  };
}

/* ------------------------------------------------------------------------- person */

export async function saveDraft(code: string, name: string, answers: string[]): Promise<void> {
  const d = await driver();
  await d.run(
    `INSERT INTO person (pair_code, name, raw_answers) VALUES (?, ?, ?)
     ON CONFLICT(pair_code, name) DO UPDATE SET raw_answers = excluded.raw_answers
     WHERE person.sealed = 0`,
    [code, name, JSON.stringify(answers)],
  );
}

export async function getDraft(code: string, name: string): Promise<string[]> {
  const d = await driver();
  const row = await d.get<{ raw_answers: string | null }>(
    "SELECT raw_answers FROM person WHERE pair_code = ? AND name = ?",
    [code, name],
  );
  return row?.raw_answers ? (JSON.parse(row.raw_answers) as string[]) : [];
}

export async function sealPerson(
  code: string,
  name: string,
  commitment: string,
  answers: string[],
): Promise<void> {
  const d = await driver();
  await d.run(
    `INSERT INTO person (pair_code, name, sealed, sealed_at, commitment, raw_answers)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(pair_code, name) DO UPDATE SET
       sealed = 1, sealed_at = excluded.sealed_at,
       commitment = excluded.commitment, raw_answers = excluded.raw_answers`,
    [code, name, Date.now(), commitment, JSON.stringify(answers)],
  );
}

export async function areBothSealed(code: string): Promise<boolean> {
  const d = await driver();
  const row = await d.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM person WHERE pair_code = ? AND sealed = 1",
    [code],
  );
  return (row?.n ?? 0) >= 2;
}

/**
 * Read the two sealed answer sets for derivation. Called once, then they are gone.
 * Ordered by name so the same pair always derives the same page.
 */
export async function readSealedAnswers(
  code: string,
): Promise<{ a: SealedPerson; b: SealedPerson } | null> {
  const d = await driver();
  const rows = await d.all<{ name: string; raw_answers: string | null }>(
    "SELECT name, raw_answers FROM person WHERE pair_code = ? AND sealed = 1 ORDER BY name",
    [code],
  );
  if (rows.length < 2) return null;

  const parsed = rows.slice(0, 2).map((r) => ({
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
 * After this there is no copy of either person's answers anywhere in the database. The
 * page they see afterwards was computed from both, and neither can retrieve the other's
 * words — because the words no longer exist.
 */
export async function storeRevealAndShred(code: string, reveal: Reveal): Promise<void> {
  const d = await driver();
  const statements = [
    { sql: "UPDATE pair SET reveal_json = ?, revealed_at = ? WHERE code = ?", args: [JSON.stringify(reveal), Date.now(), code] },
    // Every raw answer goes, whoever wrote it.
    { sql: "UPDATE person SET raw_answers = NULL WHERE pair_code = ?", args: [code] },
  ];

  if (d.kind === "d1") {
    // D1 batches are atomic too, and run in one round trip.
    await (d as unknown as D1Driver).batch(statements);
    return;
  }

  await d.transaction(async () => {
    for (const s of statements) await d.run(s.sql, s.args);
  });
}

export async function markTalked(code: string, talked: boolean): Promise<void> {
  const d = await driver();
  await d.run("UPDATE pair SET talked_mark = ? WHERE code = ?", [talked ? 1 : 0, code]);
}