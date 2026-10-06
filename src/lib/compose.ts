/**
 * Numbers in, sentences out.
 *
 * This file deliberately imports nothing. It has no database, no network, no framework.
 * That is the whole point: the reveal's English is a pure function of what was
 * measured, so it can be read, edited, argued with, and tested without anything else
 * running — and there is no path by which a sentence could reach the page except by
 * clearing a threshold here.
 *
 * If you are adding a line to the reveal, add it here and nowhere else.
 */

/* ------------------------------------------------------------------ types */

export type MeasurementId = "both_alone" | "both_feel_unseen" | "enjoy_vs_control";

export type Measurements = {
  both_alone: number;
  both_feel_unseen: number;
  enjoy_vs_control: number;
  /** Extracted concern per person, for showing rather than asserting. */
  concerns: { a: string; b: string };
  /** 0–2 per person. */
  substance: { a: number; b: number };
};

export type Names = { a: string; b: string };

export type Movement = {
  id: MeasurementId;
  headline: string;
  detail: string;
  /** The measurement behind this sentence. */
  number: number;
  threshold: number;
  /** Index of the prompt this movement's evidence comes from. */
  evidencePrompt: number;
};

export type Withheld = {
  id: MeasurementId;
  number: number;
  threshold: number;
};

export type Reveal = {
  movements: Movement[];
  withheld: Withheld[];
  nextStep: Movement;
  tooThin: boolean;
  substance: { a: number; b: number };
};

/* ------------------------------------------------------------------ configuration */

export const THRESHOLD = 0.65;
export const MIN_SUBSTANCE = 1;

/* ------------------------------------------------------------------ the sentences */

type Spec = {
  id: MeasurementId;
  evidencePrompt: number;
  /** Names may appear in the detail. Headlines are addressed to the reader directly. */
  detail: (names: Names, which: "enjoyer" | "controller") => string;
};

const SPECS: Spec[] = [
  {
    id: "both_alone",
    evidencePrompt: 3,
    detail: () =>
      "Neither of you has said that out loud. You each think you're the one holding it.",
  },
  {
    id: "both_feel_unseen",
    evidencePrompt: 2,
    detail: () =>
      "Neither of you has told the other. You've both just decided, on your own.",
  },
  {
    id: "enjoy_vs_control",
    evidencePrompt: 0,
    detail: (names) =>
      `${names.a}'s isn't really about enjoying money. ${names.b}'s is about not knowing what's being spent. Different problems, one fight.`,
  },
];

const HEADLINES: Record<MeasurementId, string> = {
  both_alone: "You're both carrying it alone.",
  both_feel_unseen: "You both think the other one isn't listening.",
  enjoy_vs_control: "You're not arguing about the restaurants.",
};

/** Shown when nothing cleared the bar. A real outcome, not an error. */
export const SHORT_PAGE = {
  headline: "Not enough to say anything true yet.",
  detail:
    "We didn't get enough from both of you to say anything we're sure of. That's an honest answer — there just isn't enough here to claim anything.",
};

/* ------------------------------------------------------------------ the function */

/**
 * Decide who enjoyed it and who wanted certainty, from the two extracted concerns.
 * The sentence only exists because that exact contrast was asked about directly.
 */
function enjoymentSplit(m: Measurements): "enjoyer" | "controller" | null {
  const aEnjoys = m.concerns.a === "wants_to_enjoy";
  const bEnjoys = m.concerns.b === "wants_to_enjoy";
  const aControls = m.concerns.a === "wants_control";
  const bControls = m.concerns.b === "wants_control";

  if (aEnjoys && bControls) return "enjoyer";
  if (bEnjoys && aControls) return "enjoyer";
  return null;
}

export function compose(m: Measurements, names: Names): Reveal {
  const tooThin = m.substance.a < MIN_SUBSTANCE || m.substance.b < MIN_SUBSTANCE;

  const nextStep: Movement = {
    id: "both_alone", // always present; its number is the fallback evidence
    headline: "One thing this week.",
    detail: "Say the real one out loud. Not the number — the thing underneath it.",
    number: Math.max(m.both_alone, m.both_feel_unseen),
    threshold: 0,
    evidencePrompt: 5,
  };

  if (tooThin) {
    return { movements: [], withheld: [], nextStep, tooThin: true, substance: m.substance };
  }

  const split = enjoymentSplit(m);
  const movements: Movement[] = [];
  const withheld: Withheld[] = [];

  for (const spec of SPECS) {
    // `enjoy_vs_control` additionally requires that we know which side is which,
    // otherwise there is no honest way to phrase it.
    if (spec.id === "enjoy_vs_control" && !split) {
      withheld.push({ id: spec.id, number: m[spec.id], threshold: THRESHOLD });
      continue;
    }

    const number = m[spec.id];
    if (number < THRESHOLD) {
      withheld.push({ id: spec.id, number, threshold: THRESHOLD });
      continue;
    }

    movements.push({
      id: spec.id,
      headline: HEADLINES[spec.id],
      detail: spec.detail(names, split ?? "enjoyer"),
      number,
      threshold: THRESHOLD,
      evidencePrompt: spec.evidencePrompt,
    });
  }

  return { movements, withheld, nextStep, tooThin: false, substance: m.substance };
}