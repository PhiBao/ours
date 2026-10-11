/**
 * The demonstration control's data.
 *
 * Deliberately NOT built on a real pair. A real pair's words are destroyed the moment its
 * page exists, so there is nothing left to re-derive from — which is the point. This page
 * demonstrates the mechanism using written pairs instead, and says so on screen, so it can
 * never be mistaken for a feature of the product.
 */

import type { Person } from "../lib/derive";

export type Variant = {
  id: string;
  label: string;
  note: string;
  a: Person;
  b: Person;
};

/** The pair the whole product is built around. */
const MAYA_BASE = [
  "I always want to go to the good restaurant, and I know it winds him up but it is the one thing I do for myself.",
  "It feels wrong to spend money when we said we would save for the summer.",
  "He doesn't really notice what things cost. He has never once asked.",
  "I keep track of all of it and I never say anything, because I don't want to sound petty.",
  "I am so tired of being the one who plans everything and then being told I spend too much.",
  "I just want to be able to book the nice place without it turning into a thing.",
];

const SAM_BASE = [
  "I honestly cannot tell what we are spending. It feels like guessing.",
  "Last month I found three subscriptions I did not know about and it made me feel sick.",
  "She does not think about this stuff at all. She will just book the restaurant and it is done.",
  "I have tried to bring it up twice and it always turns into a row, so now I say nothing.",
  "I am tired of being the one who has to keep track, and nobody notices what I do about it.",
  "I want to be able to say what is going on with our money without it becoming a fight.",
];

export const VARIANTS: Variant[] = [
  {
    id: "target",
    label: "Two people who have both given up",
    note: "She wants to enjoy it. He wants to know where it went. Neither has said either thing.",
    a: { name: "Maya", answers: [...MAYA_BASE] },
    b: { name: "Sam", answers: [...SAM_BASE] },
  },
  {
    id: "one-answer",
    label: "The same pair, one answer changed",
    note:
      "Only Maya's first answer differs. She now says she just wants the worrying to stop — " +
      "and the page loses a finding it could no longer stand behind.",
    a: {
      name: "Maya",
      answers: [
        "I just want to stop worrying about it. I genuinely cannot tell where our money goes most months.",
        MAYA_BASE[1],
        MAYA_BASE[2],
        MAYA_BASE[3],
        MAYA_BASE[4],
        "I just want to know we are okay instead of guessing all the time.",
      ],
    },
    b: { name: "Sam", answers: [...SAM_BASE] },
  },
  {
    id: "aligned",
    label: "A pair who agree, and say so",
    note: "Same worries, both stated openly. The page should come back nearly empty.",
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
  },
  {
    id: "dismissive",
    label: "One of them barely answers",
    note: "The page should refuse to claim anything rather than fill the space.",
    a: {
      name: "Eve",
      answers: ["idk its money", "same as last time", "he spends too much", "", "tired of it", "nothing really"],
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
  },
];

export function variantById(id: string): Variant {
  return VARIANTS.find((v) => v.id === id) ?? VARIANTS[0];
}