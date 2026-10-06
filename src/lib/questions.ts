/**
 * The measurements, and the six prompts they are made from.
 *
 * Everything here was calibrated against four written pairs during planning. The
 * numbers in the comments are the reason the reveal is ordered the way it is, and the
 * reason some movements exist at all.
 *
 * The one lesson worth stating: a broad question cannot be trusted, a narrow one can.
 * Asking "are these two people worried about the same thing?" returned 0.37 confidence
 * and disagreed with itself across runs about people whose answers plainly disagreed.
 * Asking instead "is one of them driven by enjoying money while the other is driven by
 * wanting certainty?" returned 0.89 against a 0.05 control. Same subject, opposite
 * reliability — so every question below is phrased as a concrete claim the reveal can
 * actually make.
 */

/** The six prompts, asked one at a time. Deliberately open-ended: no categories. */
export const PROMPTS = [
  "What does money feel like to you?",
  "When did money last make you feel something strong?",
  "What do you think your partner assumes about you and money?",
  "What about money haven't you said yet?",
  "What's the money thing you're most tired of?",
  "What would you want to happen — this week, money-wise?",
] as const;

/**
 * Which prompt a movement draws its evidence from, so a person can see their own words
 * underneath a line about the two of them.
 */
export const EVIDENCE_PROMPT: Record<string, number> = {
  both_alone: 3,
  both_feel_unseen: 2,
  enjoy_vs_control: 0,
};

/* --------------------------------------------------------------------------- round 1 */

/** Asked about one person's six answers on their own. */
export const PERSON_QUESTIONS = {
  /** Contrastive criteria: `not_for` is what stops the options bleeding together. */
  concern: {
    type: "choice",
    instructions: {
      question:
        "Which single underlying concern best describes this person's feelings about money?",
      focus:
        "Choose the emotion driving them, not the topic they mention. If two apply, choose the one they are more likely to act on.",
    },
    criteria: {
      wants_to_enjoy: {
        what: "Wanting to enjoy spending without guilt, especially on something for themselves.",
        not_for: "Wanting to know or track what is being spent.",
        examples: [
          "I want to be able to treat us without it becoming a thing",
          "I feel bad every time I spend",
        ],
      },
      wants_control: {
        what: "Wanting to know, see, or be certain about what money is actually being spent on.",
        not_for: "Wanting to enjoy a purchase, or wanting the split to be fair.",
        examples: [
          "I genuinely cannot tell what we're spending",
          "I found subscriptions I didn't know about",
        ],
      },
      feels_unfair: {
        what: "Feeling the balance of who pays or contributes is wrong.",
        not_for: "Not knowing the numbers; wanting to enjoy a purchase.",
        examples: ["I do more of it and I never hear about it", "it's not an even split"],
      },
      feels_anxious: {
        what: "Fear about money being uncertain, running out, or going wrong.",
        not_for: "Disagreement about spending choices.",
        examples: ["I do sums at midnight and it doesn't look good", "what if it all goes wrong"],
      },
      feels_free: {
        what: "Relief, freedom, or contentment about money.",
        not_for: "Any strain, worry, or want for change.",
        examples: ["I'm honestly fine, I just like knowing", "money doesn't stress me out"],
      },
    },
  },

  /**
   * Substance, as an ordered scale rather than a yes/no — a dismissive answer is
   * confidently empty, and a noul near 0.5 could not tell "idk its money" apart from a
   * real opinion. Calibrated: dismissive 0.74, real answers 1.63–2.00.
   */
  substance: {
    type: "score",
    instructions: "How much real substance is in these answers?",
    criteria: [
      "Nothing to work with: empty, a joke, a shrug, or a single word.",
      "Thin: a real opinion but almost no specifics a person could be understood by.",
      "Substantial: specific, in their own words, enough to characterize how they feel about money.",
    ],
  },

  belief_about_partner: {
    type: "noul",
    instructions:
      "Does this person state a belief about what their PARTNER thinks, feels, or does regarding money? Require an explicit belief about the other person, not a statement about their own spending.",
    criteria: {
      no: "No explicit belief stated about the partner's mind or behaviour.",
      yes: "States what the partner thinks, notices, or does about money.",
    },
  },

  carried_alone: {
    type: "noul",
    instructions:
      "Does this person describe absorbing a money concern on their own, without telling their partner about it?",
    criteria: {
      no: "Does not describe carrying it alone.",
      yes: "Describes holding it alone without telling the partner.",
    },
  },
} as const;

/* --------------------------------------------------------------------------- round 2 */

/**
 * Asked about the two people's answers together, in one request. These are the claims
 * the reveal actually makes, so each is phrased as the specific sentence it licenses.
 *
 * Calibrated on the target pair / same-worry control / aligned control:
 *   both_alone         0.91 / 0.95 / 0.06
 *   both_feel_unseen   0.88 / 0.06 / 0.03
 *   enjoy_vs_control   0.89 / 0.10 / 0.05
 */
export const PAIR_QUESTIONS = {
  both_alone: {
    type: "noul",
    instructions:
      "Do BOTH `a` and `b` describe absorbing a money concern alone without telling the other person? Both must.",
    criteria: {
      no: "Not both of them are carrying it alone.",
      yes: "Both of them are carrying it alone.",
    },
  },

  both_feel_unseen: {
    type: "noul",
    instructions:
      "Do BOTH `a` and `b` express that the other person does not pay attention to, or does not think about, money? Both must.",
    criteria: {
      no: "Not both feel unseen about money.",
      yes: "Both feel the other does not pay attention to money.",
    },
  },

  enjoy_vs_control: {
    type: "noul",
    instructions:
      "Is it true that one of these two people mainly wants to be able to ENJOY spending money, while the other mainly wants to KNOW what the money is being spent on? Judge the whole pair. Answer no if that is not the situation between them.",
    criteria: {
      no: "That is not the situation: either both are driven by the same thing, or neither is split enjoy-vs-control.",
      yes: "One person is driven by wanting to enjoy money and the other by wanting certainty about it.",
    },
  },
} as const;

/** Above this a finding is shown. Below it, it is withheld rather than softened. */
export const THRESHOLD = 0.65;

/** A finding also needs at least this much confidence in the distribution. */
export const MIN_CONFIDENCE = 0.5;

/** Either person's substance must reach this level (of 2) or the page comes back short. */
export const MIN_SUBSTANCE = 1;

/**
 * How to describe each extracted concern in the reveal. Only `wants_to_enjoy` and
 * `wants_control` currently license a sentence, because only that contrast was asked
 * about directly — see `enjoy_vs_control` above. The rest are recorded so the concern
 * can be shown, not asserted.
 */
export const CONCERN_LABEL: Record<string, string> = {
  wants_to_enjoy: "wanting to enjoy it",
  wants_control: "knowing where it went",
  feels_unfair: "feeling the split isn't fair",
  feels_anxious: "being scared about money",
  feels_free: "feeling okay about money",
};