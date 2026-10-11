/**
 * Building the page — and destroying the words it was built from.
 *
 * POST /api/reveal  { code }        → derive if both are sealed, otherwise report state
 *
 * Derivation reads both sets of answers, composes the page, then writes the page and
 * clears both columns in one transaction. By the time this returns, the sentences on the
 * page exist and the words behind them do not.
 */

import { NextResponse } from "next/server";
import {
  areBothSealed,
  getPair,
  readSealedAnswers,
  storeRevealAndShred,
  markTalked,
} from "@/lib/db";
import { measure } from "@/lib/derive";
import { compose } from "@/lib/compose";
import { TypesafeError } from "@/lib/typesafe";
import { isValidCode } from "../pair/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { code?: unknown; mark?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read that." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "That code doesn't look right." }, { status: 400 });
  }

  if (typeof body.mark === "boolean") {
    await markTalked(code, body.mark);
    return NextResponse.json({ ok: true });
  }

  const state = await getPair(code);
  if (!state) {
    return NextResponse.json({ error: "No pair with that code." }, { status: 404 });
  }

  // Already built. Never rebuild on read: both people must see the same page.
  if (state.reveal) {
    return NextResponse.json({ reveal: state.reveal });
  }

  if (!await areBothSealed(code)) {
    return NextResponse.json({ waiting: true, people: state.people });
  }

  const sealed = await readSealedAnswers(code);
  if (!sealed) {
    return NextResponse.json({ waiting: true, people: state.people });
  }

  try {
    const { measurements } = await measure(
      { name: sealed.a.name, answers: sealed.a.answers },
      { name: sealed.b.name, answers: sealed.b.answers },
    );
    const reveal = compose(measurements, { a: sealed.a.name, b: sealed.b.name });
    await storeRevealAndShred(code, reveal);
    return NextResponse.json({ reveal });
  } catch (err) {
    if (err instanceof TypesafeError) {
      // Nothing was shredded, nothing was lost. The person can try again.
      return NextResponse.json(
        { error: "We couldn't build your page just now. Nothing you wrote was lost." },
        { status: 503 },
      );
    }
    throw err;
  }
}