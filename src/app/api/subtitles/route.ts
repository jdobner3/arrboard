import type { NextRequest } from "next/server";
import { handle } from "@/lib/server/services";
import { getWanted, subtitleAction, type SubtitleAction } from "@/lib/server/ops";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const kind = p.get("kind") === "movies" ? "movies" : "episodes";
  return handle(() => getWanted(kind, Math.max(1, Number(p.get("page")) || 1)));
}

export async function POST(req: Request) {
  return handle(async () => subtitleAction((await req.json()) as SubtitleAction));
}
