import { handle } from "@/lib/server/services";
import { listLibrary, parseKind } from "@/lib/server/library";

export async function GET(_req: Request, ctx: RouteContext<"/api/library/[kind]">) {
  const { kind } = await ctx.params;
  return handle(() => listLibrary(parseKind(kind)));
}
