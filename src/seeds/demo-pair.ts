/**
 * The people used in the recording, and two controls used to calibrate them.
 *
 * These are written pairs, not real people. `target` is the pair the demo is built
 * around: two people who each think the other is not paying attention, and who have both
 * decided to say nothing rather than have the row again.
 *
 * `sameWorry` and `aligned` exist so the calibration can be re-checked at any time
 * without trusting the numbers recorded in `questions.ts`. On a healthy, aligned pair the
 * page should come back nearly empty. If it does not, the thresholds have drifted and
 * the product is making claims it should not.
 */

import type { Person } from "../lib/derive";

export const target = {
  a: {
    name: "Maya",
    answers: [
      "I always want to go to the good restaurant, and I know it winds him up but it is the one thing I do for myself.",
      "It feels wrong to spend money when we said we would save for the summer.",
      "He doesn't really notice what things cost. He has never once asked.",
      "I keep track of all of it and I never say anything, because I don't want to sound petty.",
      "I am so tired of being the one who plans everything and then being told I spend too much.",
      "I just want to be able to book the nice place without it turning into a thing.",
    ],
  },
  b: {
    name: "Sam",
    answers: [
      "I honestly cannot tell what we are spending. It feels like guessing.",
      "Last month I found three subscriptions I did not know about and it made me feel sick.",
      "She does not think about this stuff at all. She will just book the restaurant and it is done.",
      "I have tried to bring it up twice and it always turns into a row, so now I say nothing.",
      "I am tired of being the one who has to keep track, and nobody notices what I do about it.",
      "I want to be able to say what is going on with our money without it becoming a fight.",
    ],
  },
} satisfies { a: Person; b: Person };

/** Control: the same underlying worry on both sides. The reveal should stay short. */
export const sameWorry = {
  a: {
    name: "Ada",
    answers: [
      "We never look at the joint account and I think we are both a bit scared about it.",
      "I did some sums at midnight and it did not look good.",
      "",
      "I have not said that to him.",
      "",
      "I want to sleep better at night.",
    ],
  },
  b: {
    name: "Ben",
    answers: [
      "The joint account is the thing. I open it and then I close it again.",
      "I keep doing sums in my head and never write them down.",
      "",
      "I have not said that to her either.",
      "",
      "I want to sleep better too.",
    ],
  },
} satisfies { a: Person; b: Person };

/** Control: a genuinely healthy pair who agree and say so. Nothing should fire. */
export const aligned = {
  a: {
    name: "Cleo",
    answers: [
      "I want us to save properly this year and I think we can if we try.",
      "We blew the holiday money again and I felt sick about it.",
      "I think he agrees with me about saving, we just never sit down and do it.",
      "I bring it up and then I drop it, because it always turns into a row.",
      "I am tired of us being in the same spot every January.",
      "I want to actually plan the year with him instead of guessing.",
    ],
  },
  b: {
    name: "Dara",
    answers: [
      "Honestly I want the same thing, a proper plan for the year.",
      "The holiday money went again and I felt bad about it too.",
      "I think we agree, we just never actually sit down.",
      "I bring it up and then I drop it, because it always turns into a row.",
      "I am tired of us being in the same spot every January.",
      "I want to actually do it with her instead of guessing.",
    ],
  },
} satisfies { a: Person; b: Person };

/** Control: one person is dismissive. The page should refuse to say much. */
export const dismissive = {
  a: {
    name: "Eve",
    answers: [
      "idk its money",
      "same as last time",
      "he spends too much",
      "",
      "tired of it",
      "nothing really",
    ],
  },
  b: {
    name: "Finn",
    answers: [
      "I honestly cannot tell what we are spending and it makes me anxious every month.",
      "I found three subscriptions I did not know about last month.",
      "She does not think about this stuff at all.",
      "I have tried twice and it becomes a row, so I stopped.",
      "I am tired of being the only one keeping track.",
      "I want to say what is going on without it becoming a fight.",
    ],
  },
} satisfies { a: Person; b: Person };

/** Used by the demonstration control to show the reveal changing. */
export const alternativeForMaya: Person = {
  name: "Maya",
  answers: [
    "Money has always felt tight and I've never felt like I get to choose anything.",
    "The month the car went I sat in the kitchen doing sums for two hours.",
    "I think he thinks I'm careful, but really I just don't want to be the one who says no.",
    "I've wanted to tell him I'm scared but I don't know how to start.",
    "I'm tired of being the one who has to check everything twice.",
    "I want one evening where we just look at it together.",
  ],
};

export const ALL_PAIRS = {
  target,
  sameWorry,
  aligned,
  dismissive,
} as const;