"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROMPTS } from "@/lib/questions";
import { PairBadge } from "@/ui/pair-badge";

/**
 * Six prompts, one at a time, in your own words.
 *
 * Two copies of every answer exist: one in this browser (yours — which is why the reveal
 * can show you your own words later without asking the server for them) and one on the
 * server so a dropped connection loses nothing. The server copy is destroyed when the page
 * is built, and after that this browser copy is the only one left anywhere.
 */
export function Answer({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(() => PROMPTS.map(() => ""));
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localKey = `ours:${code}:${name}`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let server: string[] = [];
      let ok = false;

      try {
        const res = await fetch(`/api/pair?code=${code}`);
        if (res.ok) {
          const data = await res.json();
          ok = true;
          const me = data.people?.find((p: { name: string }) => p.name === name);
          if (!me) {
            if (!cancelled) router.replace("/");
            return;
          }
          if (me.sealed) {
            if (!cancelled) router.replace(`/waiting/${code}?as=${encodeURIComponent(name)}`);
            return;
          }
        }

        const draft = await fetch(
          `/api/answer?code=${code}&as=${encodeURIComponent(name)}`,
        );
        if (draft.ok) {
          const d = await draft.json();
          if (Array.isArray(d.answers)) server = d.answers;
        }
      } catch {
        /* offline: whatever is in this browser still works */
      }

      let local: string[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) local = JSON.parse(raw) as string[];
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      // The browser copy wins where it has more: it is this person's own device.
      const merged = PROMPTS.map((_, i) => (local[i] ?? server[i] ?? ""));
      setAnswers(merged);
      const firstEmpty = merged.findIndex((a) => !a.trim());
      setStep(firstEmpty === -1 ? 0 : firstEmpty);
      setReady(ok || true);
    })();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [code, name, localKey, router]);

  const save = useCallback(
    (next: string[]) => {
      try {
        localStorage.setItem(localKey, JSON.stringify(next));
      } catch {
        /* private mode: the server copy still works */
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void fetch("/api/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name, answers: next, action: "draft" }),
        }).catch(() => {});
      }, 500);
    },
    [code, name, localKey],
  );

  function set(index: number, value: string) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    save(next);
  }

  function next() {
    if (!answers[step].trim()) return;
    if (step < PROMPTS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    router.push(`/seal/${code}?as=${encodeURIComponent(name)}`);
  }

  if (!ready) {
    return (
      <main>
        <p className="measure">ONE MOMENT</p>
      </main>
    );
  }

  const value = answers[step];
  const last = step === PROMPTS.length - 1;
  const answered = answers.filter((a) => a.trim()).length;

  return (
    <main className="min-h-[calc(100vh-8.5rem)] flex flex-col">
      <div className="flex items-baseline justify-between">
        <h1 className="measure">{name.toUpperCase()}</h1>
        <ol
          className="flex gap-2"
          aria-label={`Question ${step + 1} of ${PROMPTS.length}`}
        >
          {PROMPTS.map((p, i) => (
            <li
              key={p}
              aria-current={i === step ? "true" : undefined}
              className={
                i === step
                  ? "w-4 h-px bg-accent"
                  : answers[i].trim()
                    ? "w-4 h-px bg-ink/45"
                    : "w-4 h-px bg-hairline"
              }
            />
          ))}
        </ol>
      </div>

      <div className="flex-1 flex flex-col justify-center py-14">
        <p className="text-[2rem] leading-[1.25] font-light max-w-[30rem]">{PROMPTS[step]}</p>

        <textarea
          key={step}
          autoFocus
          rows={7}
          value={value}
          onChange={(e) => set(step, e.target.value)}
          placeholder="In your own words."
          aria-label={PROMPTS[step]}
          className="mt-8 max-w-[32rem]"
        />
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-hairline">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="text-muted text-[0.95rem] underline decoration-hairline underline-offset-[6px] hover:text-accent disabled:opacity-0 disabled:cursor-default transition-colors"
        >
          back
        </button>

        <div className="flex items-center gap-6">
          <span className="measure">
            {step + 1} OF {PROMPTS.length}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={!value.trim()}
            className="text-[1.0625rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent disabled:opacity-35 disabled:no-underline disabled:cursor-not-allowed transition-colors"
          >
            {last ? "One last thing" : "Next"}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="measure">
          {answered} OF {PROMPTS.length} ANSWERED · NOBODY SEES THIS UNTIL YOU BOTH FINISH
        </p>
        <PairBadge code={code} name={name} />
      </div>
    </main>
  );
}