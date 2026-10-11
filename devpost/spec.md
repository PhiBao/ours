---
doc: spec
status: approved
---

# Ours — Technical Spec

## How This Works, In Plain Language

There are five screens and one small brain.

**The screens** are just pages: join, answer, seal, waiting, reveal. They are ordinary web
pages with no login. People get in by sharing a six-character code.

**The brain** is not a chatbot and it does not write anything. It is a small set of
questions asked of the two people's answers together, and it answers each one with a
number between 0 and 1. That is all it does — it does not generate sentences, and there
is no language model anywhere in the product.

Those numbers decide everything. If "are they both carrying this alone on their own?"
comes back at 0.91, the reveal page includes that line. If it comes back at 0.06, the page
leaves it out entirely. There is no middle version where the page says something vague to
fill the space.

**The sentences are written by code.** A file of hand-written templates says: this number
means this sentence, using this person's name. That is why the page can promise something
strong — every claim on it is a claim that was actually measured, and you can tap any line
and see the number and the words it came from.

**The privacy is structural, not a promise.** When a person submits their answers, the
server reads both people's answers at once, works out the findings, and then *deletes both
sets of words*. What is left is the finished page and a hash. There is no screen, link, or
address in the whole app that returns one person's words to the other, because after the
page is built the words are not in the database at all.

**Why this shape.** The obvious alternative — send the answers to a language model and
print what it says — would be quicker to write and would produce a page that reads like
every other AI product: plausible, slightly generic, and impossible to check. This way the
interesting work is the questions and the thresholds, both of which can be inspected,
measured, and tuned against real examples. It also runs in about a second, which means the
reveal appears while the person is still looking at the screen.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. **Join.** Someone opens the site and gets the join screen. They type a code or ask for
   one. → The server creates or finds a pair row → they land on the answer screen.
2. **Answer.** Six prompts, one at a time. Each answer is saved as it is typed, so a
   dropped connection loses nothing. → Answers go into the database against that pair and
   that person → nothing is sent to TypeSafe yet.
3. **Seal.** On the sixth prompt the browser computes a SHA-256 hash of the six answers
   plus the pair code, and shows it. → The person submits → the server stores the hash and
   the answers, and marks the person sealed.
4. **Waiting.** The waiting screen reads the pair row and shows two cards. → No model call
   happens on this screen at all; it is a plain read.
5. **The other person answers.** Same as steps 2–3 from their device.
6. **Derive.** When both are sealed, the server makes its model calls. It first asks
   questions about each person's answers on their own, then asks questions about the two
   answers together, because the interesting questions are about the *pair*. → The numbers
   come back → **the raw answers are deleted** → the finished page and both hashes are
   stored.
7. **Reveal.** The reveal screen reads the stored page. → It never re-derives, so the page
   is identical for both people and identical every time it is opened. Tapping a line
   expands to the number and to the reader's *own* words, which the server retrieves from
   the browser's own copy, never from the server.

Step 7 has a detail worth stating plainly: the reveal screen needs the reader's own words
to show them, and the server no longer has them. So the answers are kept in the browser's
local storage for the person who wrote them. That is what makes the privacy promise
survivable — the words were never shared in the first place, so there is nothing to leak.

## Stack

| Choice | Why | Tradeoff accepted |
|---|---|---|
| **Next.js 15**, App Router, TypeScript | One project that serves both the pages and the small API, so the TypeSafe key can stay on the server and never reach the browser. | More framework than a static page would need. Accepted because the privacy requirement is enforced by the server, and a static site cannot enforce it. |
| **Tailwind CSS v4** | Styling is almost entirely type, spacing, and colour, so a utility framework is more than enough. Design lives in one place. | The look leans on custom type scale and colour tokens rather than component defaults. |
| **One store, two drivers: `node:sqlite` locally, Cloudflare D1 deployed** | The data is small, temporary by design, and partly *meant* to be deleted — so locally a single file is the honest representation of it, with no native module to compile. A file cannot survive between serverless invocations, so the deployed build binds D1 instead. `src/lib/db.ts` hides the difference behind one small interface and D1's atomic `batch()` strengthens the shred transaction. | Two code paths for the store to keep correct. Accepted because the alternative was shipping a local file that silently cannot work in production. |
| **TypeSafe (`jev-latest`)** via plain `fetch` | The product needs calibrated numbers, not generated text. This is the whole reason the architecture is shaped this way. | A young, single-provider dependency. Mitigated by a response cache — see **Failure Modes**. |
| **Zod** for validating model output | The model returns typed data we then act on. Validating before use means a malformed response degrades instead of producing a wrong claim on the reveal. | One more dependency, bought deliberately: this is the boundary where a bad response would become a false statement about someone's relationship. |

Docs: [Next.js](https://nextjs.org/docs), [Tailwind CSS v4](https://tailwindcss.com/docs),
[TypeSafe API reference](https://docs.typesafe.ai/api),
[TypeSafe JavaScript SDK](https://docs.typesafe.ai/sdk/javascript),
[Zod](https://zod.dev).

Not used, deliberately: no LLM SDK, no auth library, no component library. The component
library is the single biggest temptation here — it is also the fastest route to a page
that looks like every other AI product.

## Where It Runs and How Someone Tries It

- **Runtime:** Node 22, a browser, and one local process. No Docker, no database server.
- **Required:** Node 22+ and Git. One secret: `TYPESAFE_API_KEY`.
- **Start:** `pnpm install && pnpm dev` — then open `http://localhost:3000`.
- **To try the whole loop:** open the site in two different browser profiles (or one normal
  and one private window), join both with the same code, answer as each person, and the
  second submission builds the page.
- **For the demo recording:** `pnpm demo` runs the seeded pair end to end, which is what
  gets recorded. See **Failure Modes** for why this exists.
- **Submission requires** the demo video *and* a public repository; deployment is not required
  and is not a substitute for either. It is deployed anyway, because "here is the live thing"
  costs a reviewer nothing and argues for the product: **<https://ours.kiter0211.workers.dev>**
  on Cloudflare Workers with D1 bound and the TypeSafe key held as a Worker secret.
- **The deployed build is verified, not assumed.** `pnpm e2e:live` runs the whole loop against
  the live URL — join, seal, tampered-hash rejection, reveal, page stability, deletion — and
  the privacy claim was additionally confirmed by reading D1 directly: both rows `sealed=1`,
  `raw_answers IS NULL`, both commitment hashes retained.
- **Latency note:** from the build machine, edge round-trips measured 0.25s–5.7s. Remote test
  timeouts are scaled accordingly (`demo/fixes.mjs`) and transport failures are retried, so a
  slow edge node is never reported as a broken app.

## Look and Feel

PRD ref: `prd.md > Look and Feel`. Implementable translation, no new decisions.

- **Type.** One transitional serif for all prose — prompts, answers, names, every sentence
  on the reveal. Self-hosted, variable weight, so the page has no external font request and
  renders identically during recording. A single mono for numbers, labels, and hashes,
  always smaller and never competing with the serif.
- **Colour.** Four tokens and no others.
  - paper: warm off-white, faintly tinted — never pure `#fff`
  - ink: very dark warm brown-black for text
  - muted: warm grey for secondary text and the mono labels
  - accent: one warm ochre, reserved for the two movements that concern *both* people
  Borders are avoided. Separation comes from space and a single hairline colour.
- **Density.** One centred column, about 34rem. Large vertical gaps between reveal
  movements — roughly a full screen between them, so each one lands alone.
- **Motion.** Reveal only. The two sealed cards open; then each movement fades in sequence.
  Slow, soft, no easing that bounces. Everything else cuts between screens.
- **Copy tone.** Short sentences. Second person. Never "insights", "discover", "unlock",
  or "AI". Never an exclamation mark. The reveal reads like something someone wrote to you,
  which is the entire point.
- **What Tailwind can and cannot honour here:** everything above is achievable with custom
  tokens and a type scale. Tailwind's default palette and spacing are deliberately unused —
  using them would pull the look toward the generic default the PRD rules out.

## Components

### Pair store
Creates and looks up pairs by six-character code, records who has sealed, and **deletes
raw answers after derivation**. The deletion lives here, not in a route handler, so it
cannot be skipped by calling a different endpoint.
PRD ref: `prd.md > The reveal`, `prd.md > States and Boundaries`.

### Answer flow
The six prompts, one at a time. Saves each answer as it is typed. Keeps a local copy in
browser storage for the person who wrote it — the only copy that survives.
PRD ref: `prd.md > Answering alone`.

### Commitment hash
Computes SHA-256 over the six answers plus the pair code, in the browser, and shows it on
the seal screen before submission. Stated honestly: this proves *to the person* that the
words were committed to before the page existed, and it is tamper-evident against anyone
changing their own answers afterwards. It is **not** a zero-knowledge proof against a
hostile server, and the product does not claim that.
PRD ref: `prd.md > The seal`.

### Measurement layer
The TypeSafe questions, in two rounds — per person, then about the pair — and the
thresholds that decide what clears the bar. Every threshold carries the calibration
evidence for it.
PRD ref: `prd.md > What the measurements actually do`, `prd.md > Open Questions`.

### Response cache
Keys every TypeSafe call by a hash of its request body. A hit returns the stored answer
and makes no network call. Exists so the demo cannot fail on a bad network day, and so
that re-running the build produces the same numbers.
PRD ref: `prd.md > The reveal`.

### Sentence composer
Pure function, no I/O. Takes validated measurements and returns the ordered movements, each
with its number, its threshold decision, and the sentence. **The only place English
sentences exist.** Keeping it pure means the sentences can be read, edited, and tested
without a model or a database.
PRD ref: `prd.md > The reveal`, `prd.md > Product Decisions`.

### Reveal page
Renders the movements in order, fades them in, and expands a line to its number and the
reader's own words. Also renders the honest short page when nothing cleared the bar.
PRD ref: `prd.md > The reveal`, `prd.md > States and Boundaries`.

### Demonstration control
Swaps one person's stored answers for an alternative set and re-derives, showing the numbers
move. Labelled on screen as a demonstration control so it is never mistaken for a product
feature.
PRD ref: `prd.md > Proving it is real`.

## Data Model

Three tables. Storing so little is a product decision, not laziness — raw words are deleted by
design. In a SQLite file locally, in D1 when deployed.

```
pair
  code            TEXT PRIMARY KEY      -- six characters, the only identifier
  created_at      INTEGER
  reveal_json     TEXT NULL              -- the finished page; null until both sealed
  revealed_at     INTEGER NULL
  talked_mark     INTEGER NULL           -- 0 / 1 / null: the one follow-up action

person
  pair_code       TEXT REFERENCES pair
  name            TEXT
  sealed          INTEGER DEFAULT 0
  sealed_at       INTEGER NULL
  commitment      TEXT NULL              -- SHA-256, set at seal time
  raw_answers     TEXT NULL              -- DELETED at derivation; never re-read after
  alt_answers     TEXT NULL              -- alternative set, used only by the demo control
  PRIMARY KEY (pair_code, name)
```

**What survives:** the finished page, two commitments, two timestamps, and the mark.
**What does not:** the words. Derivation reads `raw_answers`, composes the page, writes
`reveal_json`, then clears both rows in the same transaction.
**On return:** everything reads from the database, so the page is the same for both people
on any device, any number of times.
**Where the reader's own words come from on the reveal:** their own browser, not the
server — the local copy from the answer step. This is the mechanism that makes the privacy
promise structurally true rather than merely intended.

## File Structure

```
ours/
├── app/
│   ├── layout.tsx                 # fonts, tokens, serif/mono pairing
│   ├── page.tsx                   # Join
│   ├── answer/[code]/page.tsx     # six prompts, one at a time
│   ├── seal/[code]/page.tsx       # commitment hash + what happens next
│   ├── waiting/[code]/page.tsx    # two cards, one sealed
│   ├── reveal/[code]/page.tsx     # the letter
│   ├── demo/page.tsx              # ablation control
│   └── api/
│       ├── pair/route.ts          # create / join by code
│       ├── answer/route.ts        # save drafts, seal
│       └── reveal/route.ts        # read page; derive when both sealed
├── src/
│   ├── lib/
│   │   ├── db.ts                  # schema, and the post-derivation deletion
│   │   ├── commit.ts              # SHA-256 helper (browser + server)
│   │   ├── typesafe.ts            # typed client, Zod validation, response cache
│   │   ├── questions.ts           # the measurements, with calibration notes
│   │   ├── derive.ts              # two rounds + thresholds
│   │   └── compose.ts             # numbers → sentences. pure. no I/O.
│   ├── seeds/demo-pair.ts         # the two people used in the recording
│   └── styles/tokens.css          # paper / ink / muted / accent, type scale
├── demo/
│   └── capture.mjs                # Playwright run of the seeded pair
├── devpost/                       # scope, prd, spec, checklist
├── .env.example                   # TYPESAFE_API_KEY= (no secrets committed)
└── package.json
```

`compose.ts` having no imports of anything else is deliberate. It is the file where the
product's voice lives, and it should be readable on its own.

## External Services and Dependencies

**TypeSafe System One API** — the only external call.

- **Endpoint:** `POST https://api.typesafe.ai/v1/systemone`
- **Auth:** `Authorization: Bearer $TYPESAFE_API_KEY`, server-side only
- **Docs:** [API reference](https://docs.typesafe.ai/api) · [models](https://docs.typesafe.ai/models)
- **Payload:** `{ state, model: "jev-latest", questions }` where questions are `choice`,
  `noul`, or `score` definitions
- **Returns:** per question a `choice` + probabilities + confidence, a `noul` probability,
  or a `score` + level probabilities + confidence
- **Calls per reveal:** 3 — one per person, then one about the pair
- **Measured:** ~330–450 ms per call, ~1 s for a full derivation, ~1,300 input tokens
- **Limits:** the published cookbooks note the public endpoint rate-limits above roughly
  eight concurrent requests. Well clear of that here. **To verify early in the build:**
  the exact plan limit on this key, and behaviour when it is exceeded.
- **Cost:** not stated in the docs I read. **To verify early.** If it is metered, the
  cache keeps the demo free regardless, since a re-run makes no network call.

Deliberately not used: any LLM, any bank API, any auth provider, any analytics.

## Important Failure Modes

- **TypeSafe is unreachable or slow on the day of recording** → Every response is cached by
  request hash, so a re-run of the seeded pair makes no network call at all and produces
  identical numbers. The recording can be made with the network off. This is the single
  biggest reliability decision in the build.
- **The model returns a shape the code does not expect** → Responses are validated with Zod
  before use. A malformed response fails the derivation rather than producing a wrong claim
  on someone's relationship, and the person sees "we couldn't build your page right now —
  nothing you wrote was lost."
- **One person's answers are too thin to judge** → Already measured: a dismissive answer
  scores 0.74 on substance against 1.99 for a real one, and correctly takes the page down.
  The reveal says plainly that it does not have enough from both of them. This is a real
  outcome, not an error state.

## What Was Simplified and Why

- **A relational store with no scale story** — three tables, one file locally and one D1
  database deployed, both behind a small interface so swapping either is a contained change.
  The data is small and is meant to be deleted. A real version would want Postgres and a job
  queue; neither helps prove the kernel.
- **Derivation runs on the request, not in a queue** — a real version would need background
  work, retries, and a status machine. At ~1 second, the request path is the honest choice.
- **The reveal is generated once and frozen** — no history, no re-derivation, no versioning.
  Deferred deliberately: `prd.md > Deferred From the POC`.
- **A pair code instead of accounts** — the whole product is two people and a code.
  Everything the accounts would enable is out of scope.
- **No notifications.** The person returns to the same link. Sending "your partner
  answered" is the growth loop in the full product, but it needs delivery infrastructure
  and a phone number, and neither is visible in a one-minute video.

## Decisions and Open Issues

- **Next.js over a static site** — the privacy claim is enforced by server code that a
  static site cannot run. The framework is not free; it buys the guarantee. *(Learner
  delegated; recommended and accepted.)*
- **No language model, anywhere** — the PRD's strongest constraint, and the reason the
  reveal's sentences live in a pure function. *(Learner's decision, stated in
  `prd.md > Non-Goals`.)*
- **Raw answers deleted after derivation, with the reader's copy kept in their own
  browser** — this is what makes "you never see their words" true rather than intended.
  The cost is that clearing site data loses the expand-a-line detail. Accepted: the reveal
  itself survives.
- **The commitment hash is not a zero-knowledge proof** — decided to describe it accurately
  rather than let the word "cryptographic" imply more than it delivers. `prd.md > The seal`
  wording was written to match.
- **Learner uncertainty carried forward — probability versus generation.** Not yet discussed
  with the learner in conversation, and it is the one concept this project turns on. *How it
  will be settled:* rather than asking, the calibration runs during planning already
  demonstrate it directly — the broad question returned 0.37 confidence and disagreed with
  itself across runs, while the narrow one returned 0.89 against a 0.05 control. That
  contrast is the lesson, and `5-build` should walk the founder through those two responses
  side by side as the app's first build step.
- **To verify early in the build:** TypeSafe plan limits and cost on this key; that `node:sqlite`
  behaves as expected under Next.js's server runtime on this Node 22. Both confirmed during
  `6-ship`. Deployment itself then turned up two real defects, recorded in `checklist.md`:
  the binding lookup silently falling back to a file driver that cannot work on Workers, and
  an unguarded cache write throwing on a filesystem-free runtime.
- **Open, carried from `prd.md > Open Questions`:** none blocking. Threshold calibration
  should be re-checked against fresh written pairs rather than trusted from the four used
  so far.