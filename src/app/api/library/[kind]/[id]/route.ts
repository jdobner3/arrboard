import { handle, BadRequest } from "@/lib/server/services";
import { getDetail, parseKind, runAction, type DetailAction } from "@/lib/server/library";

function parseId(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new BadRequest("Bad id");
  return n;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/library/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  return handle(() => getDetail(parseKind(kind), parseId(id)));
}

export async function POST(req: Request, ctx: RouteContext<"/api/library/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  return handle(async () => runAction(parseKind(kind), parseId(id), (await req.json()) as DetailAction));
}
