"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { commitment, shortHash } from "@/lib/commit";
import { PROMPTS } from "@/lib/questions";

/**
 * The trust moment.
 *
 * Before anything is sealed, the person sees the hash of their own six answers. It is
 * tamper-evidence for them — not a zero-knowledge proof against a hostile server, which
 * the server could not honour anyway since it knows the pair code. What it does mean is
 * that what arrives can be checked against what they saw, and cannot be quietly changed
 * afterwards.
 */
export function Seal({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(PROMPTS.map(() => ""));
  const [hash, setHash] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let a = PROMPTS.map(() => "");
      try {
        const raw = localStorage.getItem(`ours:${code}:${name}`);
        if (raw) a = JSON.parse(raw) as string[];
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      setAnswers(a);
      setHash(await commitment(code, a));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, name]);

  async function seal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          answers,
          action: "seal",
          commitment: hash,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That didn't work.");
        setBusy(false);
        return;
      }
      router.push(`/waiting/${code}?as=${encodeURIComponent(name)}`);
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main>
        <p className="measure">ONE MOMENT</p>
      </main>
    );
  }

  const missing = answers.filter((a) => !a.trim()).length;

  return (
    <main className="min-h-[calc(100vh-8.5rem)] flex flex-col">
      <p className="measure">BEFORE YOU SEAL IT</p>

      <h1 className="mt-6 text-[2rem] leading-[1.25] font-light max-w-[30rem]">
        This is what your six answers add up to.
      </h1>

      <p className="measure mt-6 tracking-[0.2em]">{shortHash(hash)}</p>

      <p className="mt-8 text-ink/75 max-w-[30rem]">
        Once this page is built from both of your answers, the words themselves are gone.
        What stays is the page, and these two hashes — so you can check that what arrived is
        what you sent, and nobody can quietly rewrite it afterwards.
      </p>

      <div className="mt-8 h-px bg-hairline" />

      <ul className="mt-8 space-y-4 text-[1.0625rem] max-w-[30rem]">
        <li className="flex gap-4">
          <span className="measure w-16 shrink-0 pt-1">KEPT</span>
          <span className="text-ink/75">
            The page you and {name === "Maya" ? "Sam" : "your partner"} will both open.
          </span>
        </li>
        <li className="flex gap-4">
          <span className="measure w-16 shrink-0 pt-1">KEPT</span>
          <span className="text-ink/75">This hash.</span>
        </li>
        <li className="flex gap-4">
          <span className="measure w-16 shrink-0 pt-1">DESTROYED</span>
          <span className="text-ink/75">
            Your words, and theirs. There is no screen that brings them back.
          </span>
        </li>
        <li className="flex gap-4">
          <span className="measure w-16 shrink-0 pt-1">NEVER</span>
          <span className="text-ink/75">
            Shown to the other person, in whole or in part.
          </span>
        </li>
      </ul>

      <div className="flex-1" />

      {error ? (
        <p role="alert" className="text-[0.95rem] text-accent mb-6">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between pt-8 border-t border-hairline">
        <button
          type="button"
          onClick={() => router.push(`/answer/${code}?as=${encodeURIComponent(name)}`)}
          className="text-muted text-[0.95rem] underline decoration-hairline underline-offset-[6px] hover:text-accent transition-colors"
        >
          back to the answers
        </button>
        <button
          type="button"
          onClick={seal}
          disabled={busy || missing > 0}
          className="text-[1.0625rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent disabled:opacity-35 disabled:no-underline disabled:cursor-not-allowed transition-colors"
        >
          {busy ? "Sealing…" : "Seal my answers"}
        </button>
      </div>

      {missing > 0 ? (
        <p className="measure mt-6">
          {missing} STILL EMPTY — GO BACK AND ANSWER THEM
        </p>
      ) : null}
    </main>
  );
}