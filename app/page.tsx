"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function freshCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export default function Join() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function join(e?: React.FormEvent, overrideCode?: string) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const c = (overrideCode ?? code).toUpperCase().trim();

    try {
      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That didn't work.");
        setBusy(false);
        return;
      }
      // Creating a pair is a distinct moment: from here on the person has something they
      // have to hand to somebody else, so they need to see it and be able to send it.
      if (data.created) {
        setCreated(c);
        setBusy(false);
        return;
      }
      router.push(`/answer/${c}?as=${encodeURIComponent(name.trim())}`);
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  function startNew() {
    const c = freshCode();
    setCode(c);
    void join(undefined, c);
  }

  // ------------------------------------------------------------------ just created
  // Shown instead of the form. This is the only place the code is ever generated, so it
  // is the only place a person can learn it before they send someone else into it.
  if (created) {
    return (
      <main className="min-h-[calc(100vh-8.5rem)] flex flex-col">
        <p className="measure">YOUR PAIR</p>

        <h1 className="mt-6 text-[2rem] leading-[1.25] font-light max-w-[30rem]">
          Tell them this code.
        </h1>

        <p
          data-pair-code={created}
          className="measure mt-8 text-[2.5rem] tracking-[0.2em] text-ink"
        >
          {created}
        </p>

        <p className="mt-8 text-ink/75 max-w-[30rem] leading-relaxed">
          Nothing happens until they join with it and answer their six questions. Then you
          both open the same page. Send it to them now, or keep it — the link below goes
          straight there.
        </p>

        <p className="measure mt-6 leading-relaxed">
          {`${typeof window !== "undefined" ? window.location.origin : ""}/answer/${created}`}
        </p>

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-8 border-t border-hairline">
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="text-muted text-[0.95rem] underline decoration-hairline underline-offset-[6px] hover:text-accent transition-colors"
          >
            start over
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(`/answer/${created}?as=${encodeURIComponent(name.trim())}`)
            }
            className="text-[1.0625rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent transition-colors"
          >
            Answer my six questions
          </button>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------------ join form
  return (
    <main>
      <h1 className="text-[2.75rem] leading-none font-light tracking-tight">Ours</h1>

      <p className="mt-6 text-[1.375rem] leading-snug font-light max-w-[28rem]">
        Two people who share money each tell the truth about it — privately, in their own
        words — and find out whether they&rsquo;re actually arguing about the same thing.
      </p>

      <p className="mt-6 max-w-[30rem] text-ink/70">
        You each answer six questions alone. Neither of you sees the other&rsquo;s answers,
        and the page stays shut until you&rsquo;ve both finished. Then you open the same
        page.
      </p>

      <div className="mt-10 h-px bg-hairline" />

      <form onSubmit={join} className="mt-8 space-y-6">
        <div>
          <label htmlFor="code" className="measure block mb-2">
            CODE · SIX LETTERS AND NUMBERS
          </label>
          <input
            id="code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoComplete="off"
            spellCheck={false}
            className="measure text-ink w-full bg-transparent border-b border-hairline py-3 text-[1.25rem] tracking-[0.18em] uppercase placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="name" className="measure block mb-2">
            YOUR NAME
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maya"
            autoComplete="off"
            className="w-full bg-transparent border-b border-hairline py-3 text-[1.25rem] font-normal placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        {error ? (
          <p role="alert" className="text-[0.95rem] text-accent">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
          <button
            type="submit"
            disabled={busy || code.length < 6 || !name.trim()}
            className="text-[1.0625rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent disabled:opacity-35 disabled:no-underline disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "One moment…" : "Join with this code"}
          </button>

          <span className="text-muted text-[0.95rem]">or</span>

          <button
            type="button"
            onClick={startNew}
            disabled={busy || !name.trim()}
            className="text-[1.0625rem] text-muted underline decoration-hairline underline-offset-[6px] hover:text-accent hover:decoration-accent disabled:opacity-35 disabled:no-underline transition-colors"
          >
            start a new pair
          </button>
        </div>

        {code.length === 6 && !busy ? (
          <p className="measure">
            JOINING {code} AS {name.trim() ? name.trim().toUpperCase() : "—"}
          </p>
        ) : null}
      </form>

      <p className="measure mt-14 max-w-[26rem] leading-relaxed">
        NO ACCOUNTS · NO BANK CONNECTIONS · NOT SAVED AFTER THE PAGE IS BUILT
      </p>
    </main>
  );
}