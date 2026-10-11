"use client";

import { useState } from "react";

/**
 * The pair code, and the one thing a person has to do with it.
 *
 * It exists because of a gap found in testing: you could create a pair, but nothing ever
 * told you what your code was or how to get it to the other person — so creating one felt
 * identical to joining one. The pair is only real once two people hold the same code, so
 * the code is the single most important thing on the screen after that.
 */
export function PairBadge({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const link = `${window.location.origin}/answer/${code}?as=${encodeURIComponent(name)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-baseline gap-3">
      <span className="measure tracking-[0.18em]">{code}</span>
      <button
        type="button"
        onClick={copy}
        className="measure underline decoration-hairline underline-offset-[4px] hover:decoration-accent transition-colors"
      >
        {copied ? "COPIED" : "COPY LINK"}
      </button>
    </div>
  );
}