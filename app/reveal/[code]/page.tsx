import { Reveal } from "./reveal-client";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { code } = await params;
  const { as } = await searchParams;
  return <Reveal code={code.toUpperCase()} name={(as ?? "").trim()} />;
}