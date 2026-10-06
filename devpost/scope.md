---
doc: scope
status: approved
---

# Ours

Two people who share money each tell the truth about it — privately, in their own words —
and find out whether they're actually arguing about the same thing.

## The Unique Kernel

**Nobody goes first.**

Every product in this market is built on asymmetric disclosure. To get a shared picture,
someone has to connect their accounts or open up first — and going first feels like
conceding, so it never happens, so both people argue from partial pictures forever.

Ours inverts it. Each partner answers alone. The reveal does not exist until *both* are
in. Neither person is exposed, and neither person had to go first. That inversion is the
whole product. If you deleted it and replaced it with a shared dashboard, this would be
commodity — and everyone would build it that way.

The consequence that makes it feel like magic: **you learn something true about your
partner that they never had to say out loud.**

## Who It's For

Someone sharing money with someone they love, who has learned to avoid the conversation.

They are not disorganized. They have usually already tried the obvious things — a shared
spreadsheet, a budgeting app, Mint or Monarch, the group chat — and those all require the
exact move that does not survive contact with a real relationship: revealing everything
about your money first.

Tonight they will open the app at 10pm, feel the familiar dread, and not bring it up
again. What they want is not a budget. They want to say the thing without it becoming a
fight.

56% of couples argue about money. The dollar amount is almost never the real subject.

## The Core Loop

Each partner opens it alone and answers six open prompts in their own words — what money
feels like, what they assume about the other person, what they're carrying alone. Not
numbers. Not a form about a form.

Then the waiting: her card says *"Sam hasn't answered yet."* She can see the reward — she
cannot see the reveal until he does. This is the hook. The loop is a person, not a
notification.

When he answers, they both open the **same** page.

They come back because the loop is unfinished and someone they care about is at the other
end of it. And later, because the page is the first artifact that has ever told them
something true about each other.

## Inspiration & Identity

Warm, quiet, and plain-spoken. It should read like a letter, not a dashboard. Type does
the work. Generous space, few elements, no chrome. The feeling of being told something by
someone who has been paying attention — not a product reporting metrics at you.

Deliberately anti-dashboard. The founder's standing constraint: no dashboards, no admin
panels, no analytics portals, no chatbot shell, no "AI + a database." The interface
should be something a person would want to keep.

Research map — studied and deliberately *not* imitated, because these are the shapes we
are different from:
- Shared-visibility finance: monarch.com, honeydue.com, usemuse.com/couples, origin.money
- Private-channel couples apps: twogle.com, connectedcouples.app
- Expense splitting: splitwise.com

Specific visual direction (palette, type, motion) is not yet decided — that is the one
thing `3-prd` should ask about.

## Why This Matters to the Learner

The founder wants a product that could plausibly become a real company after this, not a
demo that wins for a week. This is deliberately built on the founder's strongest domain
interest — financial products — while obeying the rule that the money has to start from
user value, not from the asset class.

It also aims past technical users. The sophistication lives under the surface; the person
using it should never have to think about how it works.

## What "Working" Looks Like

Two people answer privately. Both sealed boxes open into one shared page of plain
sentences, each one traceable to something one of them actually said.

The demo beat: **"I'm not mad about the restaurants."** She feels he is careless with
money; he feels she hides spending. Both are partially right, and it is not the real
subject. The page says so — and then says the thing that *is*: they are not fighting about
restaurants, they are both carrying it alone, and neither has ever said that out loud.

Judges will not run the code. "Working" therefore means a one-minute screen recording
where the reveal is legible without narration, every claim on it is visibly backed by a
quote from one of the two people, and flipping one partner's answers visibly changes the
result.

## The POC Boundary

**In:**
1. The private six-prompt answer flow — text, one prompt at a time
2. The sealed state, with a visible commitment hash before submit
3. The shared reveal page — agreements, each person's private assumption about the other,
   and one next step
4. Every line on the reveal traceable to a verbatim span, with the confidence behind it
5. The ablation control: change one partner's answers, watch the reveal change
6. A visible evidence affordance — the numbers and quotes behind each sentence
7. Polished states throughout: waiting, empty, error, and the reveal itself

**The one thing that must be executed exceptionally well:** the reveal page. Everything
else is scaffolding for it.

**Out:**
- No bank connections. Ever. Not even a mock. It is the product.
- No charts, budgets, net worth, categories, or "insights."
- No couples therapy, quizzes, prompt packs, streaks, or gamification.
- No accounts beyond a light pair code.
- No mobile app. Browser only.
- No LLM. The model returns judgments, never prose — the English is written in code.

## Later

History of past reveals. The "how did it go" tap after one. Voice input. Real-time
simultaneous unlock. Then the same mechanism applied to the other things two people have
to share — care decisions, a family, shared goals — because the primitive is not about
money, it is about *nobody going first*.

## Explicitly Cut

- **Bank connections and transaction import** — cut with a real reason: the product's
  promise is that you never show your money to a partner or an app. Adding data intake
  would not just bloat the scope, it would contradict the kernel.
- **A text-generating LLM** — cut because TypeSafe returns calibrated probabilities and
  the sentence is composed in code. A model-written reveal would be less reliable, less
  specific, and exactly the generic output this is trying not to be.
- **Couples content, questions, and games** — cut because it makes this a couples app.
  Ours produces one artifact about one shared reality.
- **Multi-party pairs (families, 3+)** — cut because the symmetric two-way disclosure is
  the mechanism. Diluting it to a group chat is how this becomes ordinary.
- **Accounts, auth, and onboarding** — cut to a light pair code. Everything else is the
  demo.