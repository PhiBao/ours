/**
 * Two rounds of measurement, then thresholds.
 *
 * Round one asks about each person's answers on their own. Round two asks about the two
 * answers together, because the claims the reveal makes are all about the *pair* — nobody
 * is carrying this alone on their own. Round two needs round one's output, so it cannot
 * be batched with it; in practice the whole derivation is about a second.
 *
 * This module produces numbers. `compose.ts` turns them into English. They are kept
 * strictly apart so that no sentence can be produced without a number behind it.
 */

import {
  PERSON_QUESTIONS,
  PAIR_QUESTIONS,
  MIN_SUBSTANCE,
} from "./questions";
import {
  evaluate,
  readChoice,
  readNoul,
  readScore,
  TypesafeError,
} from "./typesafe";
import type { Measurements } from "./compose";

export type Person = { name: string; answers: string[] };

export type Trace = {
  model: string;
  cached: boolean;
  ms: number;
  inputTokens: number;
  /** Everything measured, including values the reveal does not use. */
  raw: Record<string, unknown>;
};

/**
 * Measure a pair. Throws `TypesafeError` if the service cannot be reached or answers
 * with a shape we do not recognise — in both cases we would rather show nothing than
 * show something we cannot stand behind.
 */
export async function measure(
  a: Person,
  b: Person,
): Promise<{ measurements: Measurements; trace: Trace }> {
  const started = Date.now();

  const [ra, rb] = await Promise.all([
    evaluate({ answers: a.answers }, PERSON_QUESTIONS as never),
    evaluate({ answers: b.answers }, PERSON_QUESTIONS as never),
  ]);

  const substanceA = readScore(ra.answers, "substance");
  const substanceB = readScore(rb.answers, "substance");

  // Not enough from both of them: stop before spending a second call, and say so.
  if (substanceA.score < MIN_SUBSTANCE || substanceB.score < MIN_SUBSTANCE) {
    return {
      measurements: {
        both_alone: 0,
        both_feel_unseen: 0,
        enjoy_vs_control: 0,
        concerns: {
          a: readChoiceOrEmpty(ra.answers, "concern"),
          b: readChoiceOrEmpty(rb.answers, "concern"),
        },
        substance: { a: substanceA.score, b: substanceB.score },
      },
      trace: {
        model: ra.model,
        cached: ra.cached && rb.cached,
        ms: Date.now() - started,
        inputTokens: ra.inputTokens + rb.inputTokens,
        raw: {
          round1: {
            a: {
              substance: substanceA.score,
              concern: readChoiceOrEmpty(ra.answers, "concern"),
              carried_alone: readNoul(ra.answers, "carried_alone"),
              belief_about_partner: readNoul(ra.answers, "belief_about_partner"),
            },
            b: {
              substance: substanceB.score,
              concern: readChoiceOrEmpty(rb.answers, "concern"),
              carried_alone: readNoul(rb.answers, "carried_alone"),
              belief_about_partner: readNoul(rb.answers, "belief_about_partner"),
            },
          },
          round2: "skipped — not enough substance to judge",
        },
      },
    };
  }

  const pair = await evaluate(
    {
      a: { name: a.name, answers: a.answers },
      b: { name: b.name, answers: b.answers },
    },
    PAIR_QUESTIONS as never,
  );

  const bothAlone = readNoul(pair.answers, "both_alone");
  const bothUnseen = readNoul(pair.answers, "both_feel_unseen");
  const split = readNoul(pair.answers, "enjoy_vs_control");

  return {
    measurements: {
      both_alone: bothAlone,
      both_feel_unseen: bothUnseen,
      enjoy_vs_control: split,
      concerns: {
        a: readChoiceOrEmpty(ra.answers, "concern"),
        b: readChoiceOrEmpty(rb.answers, "concern"),
      },
      substance: { a: substanceA.score, b: substanceB.score },
    },
    trace: {
      model: pair.model,
      cached: ra.cached && rb.cached && pair.cached,
      ms: Date.now() - started,
      inputTokens: ra.inputTokens + rb.inputTokens + pair.inputTokens,
      raw: {
        round1: {
          a: {
            substance: substanceA.score,
            concern: readChoiceOrEmpty(ra.answers, "concern"),
            carried_alone: readNoul(ra.answers, "carried_alone"),
            belief_about_partner: readNoul(ra.answers, "belief_about_partner"),
          },
          b: {
            substance: substanceB.score,
            concern: readChoiceOrEmpty(rb.answers, "concern"),
            carried_alone: readNoul(rb.answers, "carried_alone"),
            belief_about_partner: readNoul(rb.answers, "belief_about_partner"),
          },
        },
        round2: {
          both_alone: bothAlone,
          both_feel_unseen: bothUnseen,
          enjoy_vs_control: split,
        },
      },
    },
  };
}

function readChoiceOrEmpty(answers: Record<string, unknown>, id: string): string {
  try {
    return readChoice(answers as never, id).choice;
  } catch (err) {
    if (err instanceof TypesafeError) return "";
    throw err;
  }
}