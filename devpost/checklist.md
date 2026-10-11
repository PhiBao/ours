---
doc: checklist
status: approved
---

# Build Checklist

Build mode: **fast** — chosen because the founder has delegated implementation decisions
repeatedly and the deadline is fixed. Less code discussion per slice; the two hands-on
checkpoints below are still where the founder actually looks at the app and gives
feedback, and both are kept.

## Slices

- [x] **1. The measurements produce the reveal, proven on a real pair**
  Becomes usable: A command you can run that takes two people's written answers and prints the finished reveal — every movement, its number, and whether it cleared the bar — with no UI involved.
  Why now: This is the kernel, and it is the riskiest assumption in the spec: that numbers from a model can carry a page whose sentences are written in code. Proving it first means every later slice is UI on top of something known to work. It also produces the learning moment the spec committed to — the contrast between the weak broad question and the reliable narrow one.
  PRD ref: `prd.md > What the measurements actually do`, `prd.md > The reveal`
  Spec ref: `spec.md > Components > Measurement layer`, `spec.md > Components > Sentence composer`, `spec.md > Components > Response cache`
  Build: Scaffold the project per the spec's file structure with pnpm, TypeScript and Zod. Add `questions.ts` (two rounds: per person, then about the pair), `typesafe.ts` (typed client, Zod validation of every response, response cache keyed by request hash), `derive.ts` (thresholds), and `compose.ts` as a pure function with no I/O. Add `seeds/demo-pair.ts` holding the two people from the PRD. Add a script that runs the seeded pair through the real pipeline and prints the page.
  Verify (mechanical): Run the script with the network on and confirm it prints the four movements with their numbers, and that movement 3's number is near 0.89 and movement 4's near 0.91. Run it a second time and confirm identical output and that the cache served it. Run it against the aligned control pair and confirm it withholds the movements instead of inventing them.
  Learner check: Run `pnpm seed` yourself. Read the printed page and the two contrasting calibration results in the script's output, and say whether the sentences feel like something you'd be willing to show two people.
  Commit: `Prove measurements and sentence composition on a real pair`

- [x] **2. Two people can get in, answer, seal, and wait**
  Becomes usable: Two browsers can join the same code, each answer six prompts alone, see their own commitment hash, and land on a waiting screen showing one card sealed and one not.
  Why now: The whole entry half of the loop, end to end and usable, before any of it depends on a model being reachable. Also proves the data model and the local-copy mechanism the privacy claim rests on.
  PRD ref: `prd.md > Arriving and joining`, `prd.md > Answering alone`, `prd.md > The seal`, `prd.md > Waiting`
  Spec ref: `spec.md > Components > Pair store`, `spec.md > Components > Answer flow`, `spec.md > Components > Commitment hash`, `spec.md > Data Model`
  Build: Add the pair store with the three tables from the spec. Build the join, answer, seal, and waiting surfaces and the three API routes. Compute the commitment hash in the browser over the six answers plus the pair code, and keep the person's own answers in browser storage. Partial answers persist on every keystroke.
  Verify (mechanical): Start the dev server. Join the same code from two separate browser profiles, answer as each person, and confirm each reaches the waiting screen with one card sealed. Confirm the stored commitment matches the hash shown on screen. Restart the server and confirm partial answers are still there.
  Learner check: Open the site in a normal window and a private window, join both with one code, and answer. Tell me what the waiting screen felt like and whether the seal screen made you trust it.
  Commit: `Join, answer, seal, and wait — the entry loop end to end`

- [x] **3. The reveal, and the deletion that makes it true**
  Becomes usable: When the second person seals, the page is derived, the raw answers are deleted, and both people opening the reveal see the same letter — including the honest short page when nothing clears the bar.
  Why now: This is the payoff, and it is the slice where the privacy claim becomes real rather than intended. It also has the most interesting failure state in the product.
  PRD ref: `prd.md > The reveal`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Reveal page`, `spec.md > Components > Pair store`, `spec.md > The Core Journey Through the System`
  Build: Trigger derivation from the reveal request when both are sealed, in one transaction that writes the page and clears both raw-answer columns. Build the reveal surface reading the stored page, never re-deriving. Render the movements in order with the reveal motion. Add the too-thin outcome and the model-unavailable outcome as real states.
  Verify (mechanical): Complete the seeded pair through the UI, then query the database directly and confirm both `raw_answers` columns are NULL while `reveal_json` is populated. Open the reveal in both browsers and confirm the pages are identical. Answer as a dismissive pair and confirm the short page renders.
  Learner check: Finish the seeded pair in two windows and read the reveal. Tell me which line landed, which didn't, and whether anything on it felt wrong.
  Commit: `Derive the reveal and delete the raw answers`

- [x] **4. Show the evidence, and let one answer change**
  Becomes usable: Any movement can be expanded to show the number behind it and the reader's own words, and the demonstration control swaps one person's answers so the numbers can be seen moving.
  Why now: This is what turns a claim into evidence, and it is the beat that makes the submission credible rather than assertive. It depends on slice 3 existing.
  PRD ref: `prd.md > Proving it is real`
  Spec ref: `spec.md > Components > Demonstration control`, `spec.md > Components > Reveal page`
  Build: Add the per-movement expansion showing the number and the reader's own locally-stored words. Add the demonstration control with the alternative answer set, labelled on screen as a demonstration control.
  Verify (mechanical): Expand every movement and confirm each shows a number and that a movement's expansion shows only the reader's own words. Use the control to swap one person's answers and confirm at least two numbers change and a movement appears or disappears.
  Learner check: Open the control, change one person's answers, and watch which movements vanish. Tell me whether that changed your mind about whether the page is real.
  Commit: `Add per-movement evidence and the demonstration control`

- [x] **5. Make it look like a product, and make it recordable**
  Becomes usable: The whole app in its intended visual register, with every consequential state designed rather than defaulted, and a script that drives the seeded pair end to end for recording.
  Why now: Design is a judged criterion and the demo is judged from the video alone, so the look and the recording path are both load-bearing rather than cosmetic. Last, because it needs all five screens to exist to be judged as a whole.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Failure Modes`
  Build: Self-host the serif and mono, build the four colour tokens and the type scale, apply the single-column layout and the reveal motion across all five screens. Design every consequential state: first arrival, too thin, model unavailable, already viewed. Add `demo/capture.mjs` driving the seeded pair with Playwright, writing to `demo/raw/`.
  Verify (mechanical): Run the capture script end to end and confirm it produces the full run with no console errors. Re-run it with the network disabled and confirm identical output from the cache. Check every screen for overflow and every state for a real message.
  Learner check: Run `pnpm capture` and watch the recording. Tell me which screen you'd want to look at longest, and whether anything looks like an AI product.
  Commit: `Design pass across all screens and add the capture script`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2, once two people are in and waiting
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and founder confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — the slice 1 calibration contrast, walked through with the founder
- [ ] Optional edit and transfer reflection addressed
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- **Ochre was on every headline, so it meant nothing.** The PRD reserved the accent for
  movements concerning both people — which is all of them. Re-pointed: headlines and prose
  are ink, and the accent marks only the machine's contribution (the evidence labels and the
  one next step). Colour now carries the serif/mono division instead of decorating it.
- **The reveal had no opening.** It went from a header strip straight into the first
  finding, so the page arrived mid-thought. Added an opening beat, and widened this one
  surface to 42rem so a headline reads five words to a line rather than three.

- **The first version of the "one answer changed" demonstration variant did not actually
  change the page.** It moved the numbers but kept all three movements, so the beat it was
  supposed to demonstrate — one answer changing, one finding disappearing — was invisible.
  Tuned against the live model until `enjoy_vs_control` drops from 0.85 to 0.09 and the
  movement disappears while the other two hold.

- **Storage moved from `better-sqlite3` to Node's built-in `node:sqlite`** — the native
  module would not build: pnpm 11 ignored its build script, and its native binding was
  absent afterwards. `node:sqlite` is part of Node 22, so `pnpm install` now needs no
  compilation at all, which is a better outcome for anyone cloning the repo to run it.
  Same file-backed storage, same three tables, same deletion transaction.
- **Drafts were being rejected because the server required all six answers before saving.**
  Drafts save on every keystroke, so they arrive at whatever length the person has reached;
  the handler now pads to six and only demands a complete set at seal time.
- **The pair code was never surfaced anywhere after creating a pair.** The PRD's core
  journey says two people join the same code, but the app generated one and then never
  showed it to anybody — so creating a pair was indistinguishable from joining one, and
  there was no way to hand the code to a partner. Found by the founder using the app, not
  by any check. Now its own screen on creation, on the answer and waiting screens, with a
  copy-link action.
- **The "did you talk about it" follow-up only changed colour.** Clicking a button and
  watching underlined text shift from grey to ochre reads as nothing having happened. It
  now confirms in words, and reports failure to save rather than going quiet.
- **Joining a pair never inserted the person.** `createPair` created the pair row and
  nothing wrote the person, so the second stage of the flow answered 403 for everyone. The
  end-to-end check caught it immediately, which is what it is for.
- **Pair questions are now asked in one combined request, and `both_feel_unseen` dropped
  from 0.88 to 0.70 on the target pair** — batching the three pair questions diluted the
  context. It still clears the 0.65 threshold, but by 0.05 rather than 0.23. Recorded
  rather than papered over: if this number ever falls below the bar, the page quietly
  loses a movement. The cache makes the recording deterministic, so the demo itself is not
  at risk; the honest fix, if needed, is to ask this one question in its own request.- **Deployment target changed from Vercel to Cloudflare Workers during `6-ship`,** after
  checking what was actually authenticated. Wrangler's account was live and provisioned a D1
  database immediately, while a hosted SQL database on Vercel (Turso or Neon) needed a browser
  signup. That mattered for more than convenience: D1's `batch()` is atomic, which is a
  *stronger* guarantee for `storeRevealAndShred` than the manual transaction the local file
  driver has to do. Spec updated to match.
- **The store grew a second driver, then lost a third.** An interim libSQL/Turso driver was
  written and tested locally while the deployment target was still undecided. Once D1 was
  confirmed it was redundant — three drivers for two environments is complexity with no
  buyer — and it also broke the Workers build by failing to resolve in the bundle. Removed,
  along with the dependency.
- **The D1 binding lookup silently fell back to a file driver.** OpenNext does not put
  bindings on `globalThis.env`, and a `try/catch` around a *dynamic* import of the adapter
  was swallowing the failure. The app then constructed the local file driver, which cannot
  write on Workers, so every API route returned a bare 500 with an empty body. Fixed by
  importing the accessor statically, adding the
  `nodejs_compat_populate_process_env` flag, and — the part that actually matters — replacing
  the silent fallback with a loud failure. A misconfiguration should never again present as
  an unexplained 500.
- **A stale `.next` cache deployed code that had already been fixed,** and made a solved bug
  look unsolved for two deploy cycles. Diagnosed by checking whether a newly added diagnostic
  route appeared in the build output at all. Builds are now clean.
- **The response cache could fail a request.** It writes to disk, and Workers has no writable
  filesystem, so an unguarded `mkdirSync` threw outside every error handler and turned a
  working model call into a 500. A cache is a performance optimisation and must never be able
  to break correctness, so the write can no longer throw and caching disables itself where it
  is unavailable. Locally it still works, which is what keeps the demo recording deterministic.
- **The live test was failing for reasons that were not the app.** Three separate times, a
  failure traced to the test rather than the product: pair codes generated at the wrong
  length, a code that collided with the previous run's pair, and an 8-second selector timeout
  losing to measured edge latency of 0.25–5.7s. Timeouts are now scaled for remote runs and
  transport failures are retried. Worth recording plainly: three red test runs in a row, all
  mine, none of them a defect in the product.
