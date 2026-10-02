import type { NextRequest } from "next/server";
import { handle, BadRequest } from "@/lib/server/services";
import { addItem, addOptions, lookup, parseKind, type AddRequest } from "@/lib/server/library";

// GET ?term=...  → search results;  GET (no term) → profiles / root folders
export async function GET(req: NextRequest, ctx: RouteContext<"/api/add/[kind]">) {
  const { kind } = await ctx.params;
  const term = req.nextUrl.searchParams.get("term")?.trim();
  return handle(() => (term ? lookup(parseKind(kind), term) : addOptions(parseKind(kind))));
}

export async function POST(req: Request, ctx: RouteContext<"/api/add/[kind]">) {
  const { kind } = await ctx.params;
  return handle(async () => {
    const body = (await req.json()) as AddRequest;
    if (!body.key || !body.qualityProfileId || !body.rootFolderPath) throw new BadRequest("Missing fields");
    return addItem(parseKind(kind), body);
  });
}
