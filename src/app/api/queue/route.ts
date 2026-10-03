import { handle, BadRequest } from "@/lib/server/services";
import { removeQueueItems } from "@/lib/server/ops";

// Remove stuck items from a Sonarr/Radarr/Lidarr queue: { service, ids: number[], blocklist }.
// Blocklisting makes the app search for a different release.
export async function POST(req: Request) {
  return handle(async () => {
    const { service, ids, blocklist } = await req.json();
    if (!["sonarr", "radarr", "lidarr"].includes(service)) throw new BadRequest("Bad service");
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every(Number.isInteger)) throw new BadRequest("Bad ids");
    return removeQueueItems(service, ids, Boolean(blocklist));
  });
}
