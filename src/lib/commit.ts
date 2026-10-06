/**
 * The commitment hash.
 *
 * Computed in the browser, before submitting, over the six answers plus the pair code,
 * and shown on the seal screen. When the same hash comes back from the server after
 * submission, the person can see that the words committed to are the words that arrived.
 *
 * Stated accurately, because it matters: this is tamper-evidence for the person, not a
 * zero-knowledge proof against a hostile server. The server knows the pair code, so it
 * could in principle recompute a hash. What it cannot do is quietly change someone's
 * answers after the fact without the stored commitment no longer matching.
 *
 * Web Crypto is used rather than node:crypto so the identical function runs in the
 * browser and on the server with no branching.
 */

export async function commitment(code: string, answers: string[]): Promise<string> {
  const payload = JSON.stringify({ code, answers });
  const bytes = new TextEncoder().encode(payload);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** First twelve characters, grouped, for showing on screen. */
export function shortHash(hash: string): string {
  return hash.slice(0, 4).replace(/(.{4})/g, "$1 ").trim();
}