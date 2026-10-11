---
doc: prd
status: approved
---

# Ours — Product Requirements

Two people who share money each answer six open questions alone, and then open the same
page: whether they are actually arguing about the same thing.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

1. **Arrival.** A person lands on one screen. It names the product and asks one question:
   do you have a code from the other person, or do you want to start one. There is no
   account, no sign-up, no tour.
2a. **Creating a pair ends on its own screen.** Because generating a code the person can
   never see makes the pair unusable, creation stops on a screen that shows the code, says
   to give it to the other person, and offers a link that goes straight to their
   questions. The code then stays visible on the answer and waiting screens.

2. **Getting in.** They enter or create a short pair code. Two people can join the same
   code from different devices. No personal information is requested at any point.

3. **Answering alone.** They answer six open prompts, one at a time, in their own words.
   The screen stays quiet — a prompt, a text field, and nothing else. They can stop and
   come back; partial answers are kept. On the last one they see a commitment hash of
   their own answers *before* submitting, and a plain statement of what will and will
   not happen to their words.

4. **The waiting.** Their card now says sealed, with their name on it. The partner's card
   is visibly empty. The one thing this screen must communicate: **the reveal is not
   available yet, and it is the other person who unlocks it, not them.** They leave.

5. **The other person arrives,** gets the same link, answers the same six prompts alone,
   and submits. The system now derives the shared findings.

6. **The reveal.** Both open the same page. It reads as a short letter, in movements,
   scrolled slowly. It leads with the thing neither person has said out loud, then the
   belief they each hold about the other, then what they are actually disagreeing about,
   then one thing to do this week. Every finding carries the number behind it, and each
   person can open their own words underneath.

7. **After.** The page stays. There is one action: mark whether they talked about it. That
   is the only follow-up, and the only history kept is the mark.

**Success** looks like this: a person reads the reveal and says out loud, to the other
person, something they had not planned to say.

## Screens and Layout

Five surfaces. One column, no navigation, no sidebar, no header chrome.

1. **Join** — the product name, one sentence, and the code field. The single first
   impression; it must be understandable in three seconds.
2. **Answer** — one prompt, one text field. Full-height, vertically centred, maximum
   about thirty lines of text. Nothing else on screen.
3. **Seal** — the moment before submitting. Shows what happens next, what is kept, and
   the commitment hash. The trust moment.
4. **Waiting** — two cards side by side, one sealed with a name, one empty. This is the
   whole loop, visible at a glance.
5. **Reveal** — the letter. Scrolls. The screen that carries the submission.

Movement between surfaces is a cut, not a slide. The reveal is the only surface with
motion.

## Look and Feel

The design idea is one sentence: **the human voice is typeset like a letter, and the
machine's judgments are typeset like evidence.**

That is not decoration. It is the product thesis made visible. The sentences are
composed in code and belong to the people; the numbers come from a model and belong to
the judgment. Setting them in two different registers, on one page, shows the division of
labour without a single word of explanation.

- **Type.** One transitional serif for all prose — the sentences, the prompts, the names.
  It should read as considered and slightly literary, not corporate. A small mono for
  numbers, labels, and hashes — quiet, technical, deliberately secondary in size.
  The serif carries the eye; the mono never competes.
- **Colour.** Warm paper, near-white with a slight tint, never pure white. Very dark warm
  ink for text. One warm accent — ochre or terracotta — reserved for moments that concern
  *both* people. No blue, no purple, no grey-on-white. Borders replaced by space and one
  hairline.
- **Layout.** A single centred column, roughly 34rem. Very large vertical gaps between
  movements on the reveal. No cards-with-drop-shadows on grey backgrounds.
- **Motion.** On the reveal only: the two sealed cards opening, then each sentence
  resolving in sequence with a soft fade. Restrained. Nothing springs, bounces, or
  celebrates.
- **Explicitly avoid.** Gradients, glassmorphism, purple/indigo AI palettes, emoji,
  chat bubbles, sidebar-and-cards dashboard layouts, sparkle or robot iconography, any
  "AI-generated" visual tell. If it looks like it could be any AI wrapper, it is wrong.

> Recorded under delegation: the founder authorised the agent to make this call rather
> than supply direction. It is specified concretely here so it can be reacted to.

## Features and Behavior

### Arriving and joining

- Someone can arrive at the product and be in the answering flow within about twenty
  seconds, with no account.
- A six-character pair code identifies the pair. Both people use the same code.
- A code that does not exist is reported plainly, not as a dead end.

### Answering alone

- Six prompts, asked one at a time, in this order. Each is open-ended and non-leading; none
  of them names a category or suggests an answer.
  1. "What does money feel like to you?"
  2. "When did money last make you feel something strong?"
  3. "What do you think your partner assumes about you and money?"
  4. "What about money haven't you said yet?"
  5. "What's the money thing you're most tired of?"
  6. "What would you want to happen — this week, money-wise?"
- Answers are the only input. No numbers, no amounts, no dropdowns, no categories.
- Partial answers persist. Someone can leave after three prompts and return to the same
  screen.
- Progress is visible as a quiet row of six marks, so it is clear there is an end.
- Nothing submitted is ever shown to the other person in raw form. This is stated on the
  seal screen in plain words, not as a policy link.

### The seal

- Before submitting, the person sees a hash of their own answers, so they have something
  concrete rather than a promise.
- The seal screen also states, in one line each: their answers are used to produce the
  shared page, and the other person cannot read their words back.

### Waiting

- Two cards, one per person. A sealed card shows the name and the time. An unsealed card
  shows the name and that they have not answered.
- The waiting screen states plainly that the page unlocks when the other person answers,
  and that neither person can hurry the other.

### The reveal

Four movements, in a deliberate order: **the strongest and most reliably measurable
finding comes first**, so the page opens on the thing that is most true rather than the
thing that is most quotable.

Each movement appears only when the number behind it clears a threshold *and* the model's
confidence in it is high enough. Each carries its number, and each links to the words it
came from.

1. **What you're both doing.** Fires when both people describe absorbing it alone.
   > *You're both carrying it alone.*
   > Neither of you has said that out loud. You each think you're the one holding it.

2. **What you each assume.** Fires when both say the other isn't paying attention to
   money. The finding is joint; the words are shown only to the person who wrote them.
   > *You both think the other one isn't listening.*
   > Neither of you has told the other that. You've both just decided, on your own.

3. **What you're not actually arguing about.** Fires when one person is driven by wanting
   to enjoy money and the other by wanting certainty about what it is spent on.
   > *You're not arguing about the restaurants.*
   > Maya's isn't really about enjoying money. Sam's is about not knowing what's being
   > spent. Different problems, one fight.

4. **One thing this week.** Always present. Drawn from what they said they want, not
   invented.
   > *Say the real one out loud. Not the number — the thing underneath it.*

**Why this order.** Calibrating the measurements against four written pairs showed the
"you're not arguing about it" finding was by far the weakest to measure — an abstract
comparison of two people's concerns came back at only 0.37 confidence. The two findings
that measure cleanly are *both carrying it alone* and *both feeling unseen*, which are
also the two that name something neither person has said. Leading with a weakly-measured
claim and following with a strong one would have been a worse product and a more fragile
one. Leading with the strong ones is honest, and it happens to be the better page.

- Every sentence is composed from a measurement. No sentence is written by a language
  model, and none can be produced without a number that supports it.
- Each finding can be expanded to show the numbers it was built from and the words behind
  it. A person sees their own words. They never see the other person's.
- When a number is not strong enough, that movement is **absent** — not hedged, not
  softened. A shorter page is a valid page.

### What the measurements actually do

Each movement is backed by a narrow, concrete question asked about both people's answers
together. This was not the first design. An earlier version asked one broad question —
"are these two people worried about the same thing?" — and it was unreliable: it drifted
across runs and disagreed with itself about people whose answers plainly disagreed.
Asking the specific question instead — *is one of them driven by enjoying money while the
other is driven by wanting certainty?* — is both more accurate and more honest, because
the claim the page makes is the claim the question asked.

Two rules learned from that calibration, now product rules rather than engineering details:

- **A narrow claim earns the right to be stated.** The page never generalises past what was
  measured. It can say "you're not arguing about the restaurants" because it asked about
  the restaurants; it cannot say "you have different money problems" as a flourish.
- **A finding needs both a strong number and high confidence.** Where the model is
  uncertain — measured at 0.37 confidence on the abstract version — the movement is
  withheld rather than softened.

### Proving it is real

- A control that lets you substitute one person's answers with an alternative set, so the
  reveal can be seen to change. It is labelled as a demonstration control.
- The control shows the numbers changing, not just the words.

### Afterwards

- One action on the reveal: mark whether they talked about it.
- That mark is the only thing kept about a past reveal.

## States and Boundaries

- **First arrival, no code** — the join screen explains both options without jargon.
- **Just created a pair** — the code is shown and must be sent onward. This state is
  mandatory: the pair does not exist for anybody until two people hold the code, so a
  screen that hides it is a broken state, not a convenience.
- **Partial answers** — returning resumes at the first unanswered prompt; completed marks
  stay visible.
- **Answers too short to judge** — if either person's answers give the model too little to
  work with, the reveal says plainly that it does not have enough from both of you to say
  anything true yet, and does not attempt a finding. This is a real outcome, not an error.
- **Model unavailable or slow** — a plain message that the page could not be built right
  now, and that nothing was lost. The person's answers stay sealed and can be re-run.
- **Both sealed** — the reveal exists and both can open it.
- **Already viewed** — reopening shows the same page and the mark; it is not regenerated.
- **One person answers again after the reveal exists** — allowed. The reveal is rebuilt and
  the other person is no longer waiting. Shown as "this changed," not silently.
- **Boundary: raw answers** — neither person can retrieve the other's words. There is no
  screen, link, or request that returns them. This is structural, not a setting.
- **Boundary: the reveal** — it is the only shared artefact, and both people see an
  identical version of it.
- **Boundary: retention** — only the derived page, the two commitment hashes, and the mark
  are kept. The words are not.

## Product Decisions

- **Nobody goes first** — every existing product requires one person to expose their
  finances first, and going first feels like conceding, so it never happens. Sealing both
  until both are in removes the concession entirely.
- **The page says something; it is not a dashboard** — the founder's standing rule against
  dashboards and metrics-first products. The output is a small number of sentences.
- **No bank connections, ever** — the promise that you never hand your money to an app or
  a partner is the product. Adding data intake would not just grow scope, it would
  contradict the kernel.
- **Sentences composed in code from measurements** — a model that writes the prose would
  be less reliable, less specific, and would produce exactly the generic output this is
  built against. Composing from numbers keeps the claim honest and the voice deliberate.
- **Withholding is the behaviour** — a finding below the threshold is not shown with a
  hedge. It is not shown. A page can be short, and short is a valid answer.
- **A narrow claim earns the right to be stated** — the page never generalises past what was
  measured. It can say "you're not arguing about the restaurants" because it asked about the
  restaurants; it cannot say "you have different money problems" as a flourish. This is why
  the measurements were rewritten from one broad question into four narrow ones during
  planning: the product's honesty is a direct consequence of that choice.
- **The reveal leads with its best evidence** — the ordering was chosen from calibration
  data, not from which line sounds best. Leading with a weakly-measured claim and following
  with a strong one would have been both a worse page and a more fragile one.
- **Serif for people, mono for the model** — makes the division between human voice and
  machine judgment visible on the page without explaining it.
- **Three named movements plus one action, not four plus a history** — kept tight so the
  reveal is readable in ninety seconds.

## What We're Building

1. Join by pair code, no account.
2. The six-prompt private answer flow, with partial answers persisted.
3. The seal screen with a real commitment hash of the person's own answers.
4. The waiting screen with two cards.
5. The four-movement reveal, composed from measurements, with each finding expandable to
   its numbers and to the reader's own words.
6. The demonstration control that substitutes one person's answers and shows the numbers
   moving.
7. The too-thin and model-unavailable outcomes handled as real states.
8. The single mark after the reveal.

## Deferred From the POC

- **Past reveals and history** — needs the reveal to be stable and worth revisiting first.
  For now one page and one mark.
- **Real pair notification** — "your partner answered" would need delivery infrastructure.
  For now the person returns to the same link.
- **Voice input** — the prompts are written for typing, which is also the more private
  act. Adding audio before the written flow is trustworthy would weaken it.
- **Editing after sealing** — needs a re-derivation story. For now, answering again is
  the only way, and it says so.

## Possible Later Enhancements

- A real-time unlock, so the reveal opens for both at the same moment.
- The same mechanism for the other things two people share — care decisions, a family, a
  shared goal — since the primitive is about not going first, not about money.

## Non-Goals

- **No charts, categories, budgets, or net worth.** — the product is not about the money,
  it is about what the money means. A chart would replace the sentence with a number.
- **No bank, card, or transaction connection.** — contradicts the kernel.
- **No couples content, quizzes, prompts, or games.** — that makes this a couples app.
  This produces one artefact about one shared reality.
- **No therapy, coaching, or advice language.** — the page reports what was found. It
  does not tell anyone what to do about their relationship.
- **No more than two people.** — symmetric two-way disclosure is the mechanism.
- **No generative text model.** — every sentence is a function of a measurement.

## Open Questions

- **Must be answered before `4-spec`:** none. Everything the spec needs to build is decided
  or measured.
- **Measured, not assumed — thresholds.** The four movements were calibrated against four
  written pairs during planning. Current setting: a finding is shown when its number is
  above 0.65 and its confidence is at least 0.5. On the target pair the two lead movements
  measured 0.91 and 0.88; on a deliberately healthy, aligned pair they measured 0.06 and
  0.03, so the page correctly comes back nearly empty rather than inventing findings. These
  numbers are the reason the ordering and the withholding behaviour are safe, and they
  should be re-checked against fresh pairs during the build rather than trusted as final.
- **Can wait until build:** the exact spacing scale, and whether the numbers are always one
  tap away or surfaced only in the demonstration control.
- **Known limitation, accepted:** a person who writes short or evasive answers will produce
  a shorter page, because there is genuinely less to say. This is correct behaviour and it
  is written down so it is not mistaken for a bug later. It is also the honest cost of not
  using a language model to fill the gaps with plausible-sounding prose.