"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SHORT_PAGE, type Reveal as RevealData } from "@/lib/compose";

/**
 * The page.
 *
 * Two typefaces, and the difference is the whole design: the serif sentences belong to the
 * people, the mono numbers belong to the measurement. Any line can be tapped to see the
 * number behind it and the reader's *own* words — their own, never the other person's,
 * because those were destroyed when this page was built.
 *
 * Movements fade in one at a time. Nothing here is animated other than that.
 */
export function Reveal({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [data, setData] = useState<RevealData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "waiting" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ownWords, setOwnWords] = useState<string[]>([]);
  const [talked, setTalked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const d = await res.json();
        if (cancelled) return;
        if (res.ok && d.reveal) {
          setData(d.reveal as RevealData);
          setState("ready");
        } else if (d.waiting) {
          setState("waiting");
        } else {
          setError(d.error ?? "Something went wrong.");
          setState("error");
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't reach the server.");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // The reader's own copy of their words. This is the only place those words still exist.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ours:${code}:${name}`);
      if (raw) setOwnWords(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, [code, name]);

  async function mark(value: boolean) {
    setTalked(value);
    await fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, mark: value }),
    }).catch(() => {});
  }

  if (state === "loading") {
    return (
      <main>
        <p className="measure">BUILDING YOUR PAGE</p>
      </main>
    );
  }

  if (state === "waiting") {
    return (
      <main>
        <p className="measure">NOT READY YET</p>
        <h1 className="mt-6 text-[2rem] leading-[1.25] font-light">
          Still waiting for both of you.
        </h1>
        <button
          type="button"
          onClick={() => router.replace(`/waiting/${code}?as=${encodeURIComponent(name)}`)}
          className="mt-8 text-[1.0625rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent"
        >
          Back to waiting
        </button>
      </main>
    );
  }

  if (state === "error" || !data) {
    return (
      <main>
        <p className="measure">COULDN'T BUILD THE PAGE</p>
        <h1 className="mt-6 text-[2rem] leading-[1.25] font-light max-w-[30rem]">{error}</h1>
        <p className="mt-6 text-ink/75 max-w-[30rem]">
          Nothing either of you wrote was lost. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => router.replace(`/waiting/${code}?as=${encodeURIComponent(name)}`)}
          className="mt-8 text-[1.0625rem] underline decoration-hairline underline-offset-[6px] hover:decoration-accent"
        >
          Try again
        </button>
      </main>
    );
  }

  const shown = data.movements;

  return (
    <main>
      <div className="flex items-baseline justify-between">
        <p className="measure">{name.toUpperCase()}</p>
        <p className="measure">BOTH OF YOU · {shown.length} FOUND</p>
      </div>

      {data.tooThin ? (
        <section className="mt-20" style={{ animation: "rise 900ms ease-out both" }}>
          <h1 className="text-[2.25rem] leading-[1.15] font-light">{SHORT_PAGE.headline}</h1>
          <p className="mt-6 text-ink/75 leading-relaxed">{SHORT_PAGE.detail}</p>
        </section>
      ) : shown.length === 0 ? (
        <section className="mt-20" style={{ animation: "rise 900ms ease-out both" }}>
          <h1 className="text-[2.25rem] leading-[1.15] font-light">
            Nothing we could stand behind.
          </h1>
          <p className="mt-6 text-ink/75 leading-relaxed">
            Between the two of you there wasn't enough for us to say anything we'd be
            certain of. That is a real answer, not a failure — there just isn't enough here
            to claim.
          </p>
        </section>
      ) : (
        shown.map((m, i) => {
          const mine = ownWords[m.evidencePrompt]?.trim();
          const isOpen = open === m.id;
          return (
            <section
              key={m.id}
              className="mt-20 min-h-[60vh] flex flex-col justify-center"
              style={{ animation: `rise 1100ms ease-out both`, animationDelay: `${i * 420}ms` }}
            >
              <h2 className="text-[2.25rem] leading-[1.15] font-light text-accent">{m.headline}</h2>
              <p className="mt-6 text-[1.1875rem] leading-relaxed text-ink/80">{m.detail}</p>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : m.id)}
                  aria-expanded={isOpen}
                  className="measure underline decoration-hairline underline-offset-[4px] hover:decoration-accent transition-colors"
                >
                  {isOpen ? "HIDE" : "WHY WE THINK SO"} · {m.number.toFixed(2)}
                </button>

                {isOpen ? (
                  <div className="mt-5 border-l border-hairline pl-5 space-y-4">
                    <p className="measure leading-relaxed">
                      MEASURED {m.number.toFixed(2)} · SHOWN ABOVE {m.threshold.toFixed(2)}
                    </p>
                    <div>
                      <p className="measure mb-2">YOU WROTE</p>
                      <p className="text-ink/75 leading-relaxed">
                        {mine ? `“${mine}”` : "Not available on this device."}
                      </p>
                    </div>
                    <p className="measure leading-relaxed">
                      THEIR WORDS ARE NOT HERE, AND CANNOT BE — THEY WERE DELETED WHEN THIS
                      PAGE WAS BUILT.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })
      )}

      {/* The one next step. Always present. */}
      <section
        className="mt-20 min-h-[55vh] flex flex-col justify-center border-t border-hairline pt-16"
        style={{ animation: "rise 1100ms ease-out both", animationDelay: `${shown.length * 420}ms` }}
      >
        <h2 className="measure mb-6">{data.nextStep.headline.toUpperCase()}</h2>
        <p className="text-[1.75rem] leading-[1.25] font-light">{data.nextStep.detail}</p>
      </section>

      {/* The only follow-up the product asks for. */}
      <section className="mt-20 pt-16 border-t border-hairline">
        <p className="text-[1.25rem] leading-relaxed max-w-[28rem]">
          Did you end up talking about it?
        </p>
        <div className="mt-6 flex gap-6">
          {[
            { v: true, label: "Yes" },
            { v: false, label: "Not yet" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => mark(o.v)}
              aria-pressed={talked === o.v}
              className={`text-[1.0625rem] underline underline-offset-[6px] transition-colors ${
                talked === o.v
                  ? "text-accent decoration-accent"
                  : "text-muted decoration-hairline hover:text-accent hover:decoration-accent"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {data.withheld.length > 0 ? (
        <section className="mt-16 pt-8 border-t border-hairline">
          <p className="measure mb-4">
            {data.withheld.length} THINGS WE COULDN&apos;T STAND BEHIND
          </p>
          <ul className="measure space-y-1 leading-relaxed">
            {data.withheld.map((w) => (
              <li key={w.id}>
                {w.id.replace(/_/g, " ")} — measured {w.number.toFixed(2)}, needed{" "}
                {w.threshold.toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <style jsx>{`
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}