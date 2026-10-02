import { handle, BadRequest } from "@/lib/server/services";
import { removeQueueItem } from "@/lib/server/ops";

// Remove a stuck item from a Sonarr/Radarr/Lidarr queue, optionally blocklisting it so a new release is searched.
export async function POST(req: Request) {
  return handle(async () => {
    const { service, id, blocklist } = await req.json();
    if (!["sonarr", "radarr", "lidarr"].includes(service) || !Number.isInteger(id)) throw new BadRequest("Bad request");
    return removeQueueItem(service, id, Boolean(blocklist));
  });
}
