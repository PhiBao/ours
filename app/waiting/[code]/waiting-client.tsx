"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Person = { name: string; sealed: number; commitment: string | null; hasAnswers: boolean };

/**
 * The whole loop, visible at a glance: two cards, one sealed and one not.
 *
 * This screen has to communicate one thing above all else — the page is not available
 * yet, and it is the other person who unlocks it. Not a timer, not a notification, not
 * anything they can hurry along.
 */
export function Waiting({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [building, setBuilding] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const tried = useRef(false);

  const derive = useCallback(async () => {
    if (tried.current) return;
    tried.current = true;
    setBuilding(true);
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFailed(d.error ?? "We couldn't build the page just now.");
        tried.current = false;
        setBuilding(false);
        return;
      }
      router.replace(`/reveal/${code}?as=${encodeURIComponent(name)}`);
    } catch {
      setFailed("Couldn't reach the server.");
      tried.current = false;
      setBuilding(false);
    }
  }, [code, name, router]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/pair?code=${code}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.reveal) {
            router.replace(`/reveal/${code}?as=${encodeURIComponent(name)}`);
            return;
          }
          setPeople(data.people ?? []);
          if (data.canDerive) {
            await derive();
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (!cancelled) timer = setTimeout(poll, 2000);
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, name, router, derive]);

  const me = people.find((p) => p.name === name);
  const partner = people.find((p) => p.name !== name);
  const bothSealed = people.filter((p) => p.sealed).length >= 2;

  return (
    <main className="min-h-[calc(100vh-8.5rem)] flex flex-col">
      <p className="measure">{building ? "BUILDING YOUR PAGE" : "SEALED"}</p>

      <h1 className="mt-6 text-[2rem] leading-[1.25] font-light max-w-[30rem]">
        {bothSealed
          ? "Both in."
          : partner?.sealed
            ? "Waiting on you."
            : "Now it’s with them."}
      </h1>

      <p className="mt-6 text-ink/75 max-w-[30rem]">
        {bothSealed
          ? "Reading both sets of answers now."
          : "The page is built from both of your answers, so it doesn't exist yet. Come back to this same link — you don't need to do anything else."}
      </p>

      <div className="mt-10 space-y-3">
        {[me, partner].filter(Boolean).map((p) => (
          <div
            key={p!.name}
            className="flex items-baseline justify-between border-b border-hairline pb-4"
          >
            <span className={p!.name === name ? "text-[1.25rem]" : "text-[1.25rem] text-ink/65"}>
              {p!.name}
              {p!.name === name ? <span className="measure ml-3">YOU</span> : null}
            </span>
            <span className="measure">
              {p!.sealed ? "SEALED" : p!.hasAnswers ? "WRITING…" : "NOT YET"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {failed ? (
        <div className="mb-6">
          <p role="alert" className="text-[0.95rem] text-accent">
            {failed}
          </p>
          <button
            type="button"
            onClick={() => {
              tried.current = false;
              void derive();
            }}
            className="text-[0.95rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent mt-2 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : null}

      <p className="measure leading-relaxed pt-8 border-t border-hairline">
        THE PAGE UNLOCKS WHEN BOTH OF YOU HAVE FINISHED · NEITHER OF YOU CAN HURRY THE OTHER
      </p>
    </main>
  );
}