import { handle, BadRequest } from "@/lib/server/services";
import { getSeason } from "@/lib/server/library";

export async function GET(_req: Request, ctx: RouteContext<"/api/library/[kind]/[id]/season/[n]">) {
  const { kind, id, n } = await ctx.params;
  return handle(async () => {
    if (kind !== "shows") throw new BadRequest("Only shows have seasons");
    const seriesId = Number(id);
    const season = Number(n);
    if (!Number.isInteger(seriesId) || !Number.isInteger(season) || season < 0) throw new BadRequest("Bad season");
    return getSeason(seriesId, season);
  });
}
