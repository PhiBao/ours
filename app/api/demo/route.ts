/**
 * Derivation for the demonstration control.
 *
 * Writes nothing. It exists so a page can be shown changing without a stored reveal ever
 * being rebuilt — real pairs have their words destroyed and are never re-derived, so
 * re-deriving anything real would be impossible even if it were desirable.
 */

import { NextResponse } from "next/server";
import { measure } from "@/lib/derive";
import { compose } from "@/lib/compose";
import { variantById } from "@/seeds/variants";
import { TypesafeError } from "@/lib/typesafe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { variant?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read that." }, { status: 400 });
  }

  const variant = variantById(typeof body.variant === "string" ? body.variant : "");

  try {
    const { measurements, trace } = await measure(variant.a, variant.b);
    const reveal = compose(measurements, { a: variant.a.name, b: variant.b.name });
    return NextResponse.json({
      variant: variant.id,
      label: variant.label,
      note: variant.note,
      names: { a: variant.a.name, b: variant.b.name },
      measurements,
      reveal,
      trace: { ms: trace.ms, cached: trace.cached, model: trace.model },
    });
  } catch (err) {
    if (err instanceof TypesafeError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}