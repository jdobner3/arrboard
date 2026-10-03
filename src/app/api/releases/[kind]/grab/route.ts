import { handle } from "@/lib/server/services";
import { parseKind } from "@/lib/server/library";
import { grab } from "@/lib/server/releases";

export async function POST(req: Request, ctx: RouteContext<"/api/releases/[kind]/grab">) {
  const { kind } = await ctx.params;
  return handle(async () => {
    const { guid, indexerId } = await req.json();
    return grab(parseKind(kind), String(guid ?? ""), Number(indexerId));
  });
}
