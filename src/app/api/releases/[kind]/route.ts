import type { NextRequest } from "next/server";
import { handle, BadRequest } from "@/lib/server/services";
import { parseKind } from "@/lib/server/library";
import { getJob, parseTarget, startSearch } from "@/lib/server/releases";

// POST { target }  → starts an interactive search and returns the job
// GET ?job=<id>    → the job's status and, once done, its releases
export async function POST(req: Request, ctx: RouteContext<"/api/releases/[kind]">) {
  const { kind } = await ctx.params;
  return handle(async () => {
    const k = parseKind(kind);
    const { target } = await req.json();
    return startSearch(parseTarget(k, String(target)));
  });
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/releases/[kind]">) {
  const { kind } = await ctx.params;
  return handle(async () => {
    parseKind(kind);
    const id = req.nextUrl.searchParams.get("job");
    if (!id) throw new BadRequest("Missing job");
    return getJob(id);
  });
}
