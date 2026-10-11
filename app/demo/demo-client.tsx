"use client";

import { useEffect, useState } from "react";
import { VARIANTS } from "@/seeds/variants";
import { SHORT_PAGE, type Reveal as RevealData } from "@/lib/compose";
import type { Measurements } from "@/lib/compose";

/**
 * The demonstration control.
 *
 * Not a product feature — it says so at the top. Real pairs have their words destroyed
 * when the page is built, which is the point, so this demo works on written pairs instead.
 *
 * It exists to answer one question a page cannot answer about itself: does anything here
 * actually depend on what the two people wrote? Changing one person's first answer and
 * watching the page lose a movement is the evidence.
 */
export function Demo() {
  const [current, setCurrent] = useState("target");
  const [data, setData] = useState<null | {
    reveal: RevealData;
    measurements: Measurements;
    names: { a: string; b: string };
    trace: { ms: number; cached: boolean };
  }>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const res = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant: current }),
        });
        const d = await res.json();
        if (!cancelled && d.reveal) setData(d);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current]);

  const m = data?.measurements;
  const bars = m
    ? ([
        ["both carry it alone", m.both_alone],
        ["both feel unseen", m.both_feel_unseen],
        ["enjoy vs. control", m.enjoy_vs_control],
      ] as [string, number][])
    : [];

  return (
    <main>
      <p className="measure">DEMONSTRATION CONTROL · NOT A PRODUCT FEATURE</p>

      <h1 className="mt-6 text-[2rem] leading-[1.25] font-light max-w-[32rem]">
        Change one answer. Watch the page change.
      </h1>

      <p className="mt-6 text-ink/75 max-w-[32rem] leading-relaxed">
        A real pair&rsquo;s words are destroyed the moment its page is built, so this uses
        written pairs instead. Pick one and the whole page is rebuilt in front of you — the
        sentences, and the numbers underneath them.
      </p>

      <div className="mt-10 flex flex-col gap-3">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setCurrent(v.id)}
            className={`text-left border-b pb-4 transition-colors ${
              current === v.id ? "border-accent" : "border-hairline hover:border-ink/25"
            }`}
          >
            <span className={current === v.id ? "text-[1.1875rem]" : "text-[1.1875rem] text-ink/65"}>
              {v.label}
            </span>
            <span className="measure block mt-2">{v.note}</span>
          </button>
        ))}
      </div>

      {busy || !m || !data ? (
        <p className="measure mt-14">MEASURING…</p>
      ) : (
        <>
          {/* The numbers first, because that is the part that is easy to check. */}
          <section className="mt-14">
            <p className="measure mb-6">
              THE MEASUREMENTS · {data.trace.cached ? "CACHED" : `${data.trace.ms} MS`}
            </p>
            <div className="space-y-3">
              {bars.map(([label, value]) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="measure w-44 shrink-0">{label}</span>
                  <span className="h-px bg-hairline flex-1 relative">
                    <span
                      className="absolute left-0 top-0 h-px bg-ink transition-all duration-500"
                      style={{ width: `${Math.round(value * 100)}%` }}
                    />
                  </span>
                  <span className="measure w-10 text-right">{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="measure mt-6">
              SUBSTANCE · {data.names.a.toUpperCase()} {m.substance.a.toFixed(2)} ·{" "}
              {data.names.b.toUpperCase()} {m.substance.b.toFixed(2)}
            </p>
          </section>

          {/* Then the page those numbers produce. */}
          <section className="mt-14 border-t border-hairline pt-12">
            <p className="measure mb-8">WHAT THE PAGE SAYS</p>
            {data.reveal.tooThin ? (
              <>
                <h2 className="text-[2rem] leading-[1.15] font-light text-accent">{SHORT_PAGE.headline}</h2>
                <p className="mt-5 text-ink/80 leading-relaxed">{SHORT_PAGE.detail}</p>
              </>
            ) : data.reveal.movements.length === 0 ? (
              <h2 className="text-[2rem] leading-[1.15] font-light text-ink/60">
                Nothing it could stand behind.
              </h2>
            ) : (
              data.reveal.movements.map((mv) => (
                <div key={mv.id} className="mb-12">
                  <h3 className="text-[1.875rem] leading-[1.15] font-light text-accent">{mv.headline}</h3>
                  <p className="mt-4 text-ink/80 leading-relaxed">{mv.detail}</p>
                  <p className="measure mt-3">
                    {mv.number.toFixed(2)} · NEEDED {mv.threshold.toFixed(2)}
                  </p>
                </div>
              ))
            )}
            <p className="measure">
              {data.reveal.withheld.length} WITHHELD ·{" "}
              {data.reveal.withheld.map((w) => `${w.id} ${w.number.toFixed(2)}`).join(" · ") || "none"}
            </p>
          </section>
        </>
      )}
    </main>
  );
}