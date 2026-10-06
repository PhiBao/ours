/**
 * Typed wrapper over the TypeSafe System One API.
 *
 * The model here never writes prose. It answers narrow questions with calibrated
 * probabilities, and every sentence on the reveal is composed from those numbers in
 * `compose.ts`. This module is the only place that talks to the network.
 *
 * Two things matter here beyond the request itself:
 *
 *  1. Every response is validated with Zod before anything can act on it. A malformed
 *     response must fail the derivation rather than become a false claim about
 *     somebody's relationship.
 *  2. Every response is cached on disk, keyed by a hash of the request. A cache hit
 *     makes no network call at all. That is what lets the demo be recorded with the
 *     network switched off, and what makes a re-run reproduce the same numbers.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
const CACHE_DIR = join(process.cwd(), ".cache", "typesafe");

/* ------------------------------------------------------------------ question types */

export type ChoiceCriteria = Record<
  string,
  string | { what: string; not_for?: string; examples?: string[] }
>;

export type Question =
  | { type: "choice"; instructions: string | Record<string, unknown>; criteria: ChoiceCriteria }
  | { type: "noul"; instructions: string | Record<string, unknown>; criteria: Record<string, string> }
  | { type: "score"; instructions: string | Record<string, unknown>; criteria: string[] };

/* ------------------------------------------------------------------ response shapes */

const choiceAnswer = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.number()),
});

const noulAnswer = z.object({
  type: z.literal("noul"),
  noul: z.number().min(0).max(1),
});

const scoreAnswer = z.object({
  type: z.literal("score"),
  score: z.number(),
  confidence: z.number().min(0).max(1),
  legend: z.record(z.string()),
  probabilities: z.record(z.number()),
});

const anyAnswer = z.union([choiceAnswer, noulAnswer, scoreAnswer]);

const responseSchema = z.object({
  model: z.string(),
  answers: z.record(anyAnswer),
  usage: z
    .object({
      input_tokens: z.number().nullable().optional(),
      output_tokens: z.number().nullable().optional(),
    })
    .optional(),
});

export type ChoiceAnswer = z.infer<typeof choiceAnswer>;
export type NoulAnswer = z.infer<typeof noulAnswer>;
export type ScoreAnswer = z.infer<typeof scoreAnswer>;
export type AnyAnswer = z.infer<typeof anyAnswer>;

export class TypesafeError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TypesafeError";
  }
}

/* ------------------------------------------------------------------ cache */

function requestHash(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, 40);
}

function cachePath(hash: string): string {
  return join(CACHE_DIR, `${hash}.json`);
}

function readCache(hash: string): unknown | undefined {
  try {
    return JSON.parse(readFileSync(cachePath(hash), "utf8"));
  } catch {
    return undefined;
  }
}

function writeCache(hash: string, value: unknown): void {
  const path = cachePath(hash);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

/* ------------------------------------------------------------------ the call */

export type EvaluateResult = {
  answers: Record<string, AnyAnswer>;
  model: string;
  cached: boolean;
  inputTokens: number;
  ms: number;
};

/** Ask every question in one request. Questions run in parallel server-side. */
export async function evaluate(
  state: unknown,
  questions: Record<string, Question>,
): Promise<EvaluateResult> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    throw new TypesafeError(
      "TYPESAFE_API_KEY is not set. Copy .env.example to .env and add a key from https://console.typesafe.ai/keys",
    );
  }

  const body = JSON.stringify({ state, model: MODEL, questions });
  const hash = requestHash(body);
  const fresh = process.env.TYPESAFE_FRESH === "1";

  if (!fresh) {
    const hit = readCache(hash);
    if (hit) {
      const parsed = responseSchema.safeParse(hit);
      if (parsed.success) {
        return {
          answers: parsed.data.answers,
          model: parsed.data.model,
          cached: true,
          inputTokens: parsed.data.usage?.input_tokens ?? 0,
          ms: 0,
        };
      }
    }
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new TypesafeError("Could not reach the measurement service.", err);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TypesafeError(`Measurement service returned ${res.status}. ${detail.slice(0, 300)}`);
  }

  const raw: unknown = await res.json();
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    // A shape we did not expect must not become a claim about someone's relationships.
    throw new TypesafeError(`Unexpected response shape: ${parsed.error.message.slice(0, 300)}`);
  }

  writeCache(hash, parsed.data);

  return {
    answers: parsed.data.answers,
    model: parsed.data.model,
    cached: false,
    inputTokens: parsed.data.usage?.input_tokens ?? 0,
    ms: Date.now() - started,
  };
}

/* ------------------------------------------------------------------ typed readers */

export function readNoul(answers: Record<string, AnyAnswer>, id: string): number {
  const a = answers[id];
  if (!a) throw new TypesafeError(`Missing measurement "${id}".`);
  if (a.type !== "noul") throw new TypesafeError(`Measurement "${id}" was expected to be a noul.`);
  return a.noul;
}

export function readChoice(answers: Record<string, AnyAnswer>, id: string): { choice: string; confidence: number } {
  const a = answers[id];
  if (!a) throw new TypesafeError(`Missing measurement "${id}".`);
  if (a.type !== "choice") throw new TypesafeError(`Measurement "${id}" was expected to be a choice.`);
  return { choice: a.choice, confidence: a.confidence };
}

export function readScore(answers: Record<string, AnyAnswer>, id: string): { score: number; confidence: number } {
  const a = answers[id];
  if (!a) throw new TypesafeError(`Missing measurement "${id}".`);
  if (a.type !== "score") throw new TypesafeError(`Measurement "${id}" was expected to be a score.`);
  return { score: a.score, confidence: a.confidence };
}