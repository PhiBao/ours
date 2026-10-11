/**
 * Create a pair, join one, or read the current state of a pair.
 *
 * GET  /api/pair?code=ABC123          → what exists right now
 * POST /api/pair  { code, name }      → create the pair and add this person, or add a
 *                                        second person to an existing one
 */

import { NextResponse } from "next/server";
import { addPerson, createPair, getPair, pairExists } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const CODE_LENGTH = 6;

export function isValidCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z0-9]{6}$/.test(code);
}

export function isValidName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 24;
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.toUpperCase() ?? "";
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "That code doesn't look right." }, { status: 400 });
  }

  const state = await getPair(code);
  if (!state) {
    return NextResponse.json({ error: "No pair with that code." }, { status: 404 });
  }

  return NextResponse.json({
    code,
    reveal: state.reveal,
    people: state.people,
    // Never the words, never the commitment of someone else.
    canDerive: state.reveal === null && state.people.filter((p) => p.sealed).length >= 2,
  });
}

export async function POST(req: Request) {
  let body: { code?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read that." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
  if (!isValidCode(code)) {
    return NextResponse.json(
      { error: "A code is six letters and numbers." },
      { status: 400 },
    );
  }
  if (!isValidName(body.name)) {
    return NextResponse.json({ error: "We need a name for you." }, { status: 400 });
  }

  const name = String(body.name).trim();
  const existed = await pairExists(code);
  if (existed) {
    const state = await getPair(code);
    if (state && state.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: "Someone with that name is already here." }, { status: 409 });
    }
  }

  await createPair(code);
  if (!await addPerson(code, name)) {
    return NextResponse.json({ error: "Someone with that name is already here." }, { status: 409 });
  }
  const state = await getPair(code);
  return NextResponse.json({
    code,
    created: !existed,
    people: state?.people ?? [],
    reveal: state?.reveal ?? null,
  });
}

export { ALPHABET };