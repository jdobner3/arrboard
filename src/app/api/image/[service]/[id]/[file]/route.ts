// Relays poster/fanart images from Sonarr/Radarr/Lidarr so the API key stays on the server.

const API: Record<string, string> = {
  sonarr: "/api/v3/mediacover/",
  radarr: "/api/v3/mediacover/",
  lidarr: "/api/v1/mediacover/artist/",
};

export async function GET(req: Request, ctx: RouteContext<"/api/image/[service]/[id]/[file]">) {
  const { service, id, file } = await ctx.params;
  if (!API[service] || !/^\d+$/.test(id) || !/^(poster|fanart)(-\d+)?\.jpg$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const name = service.toUpperCase();
  const base = process.env[`${name}_URL`];
  const key = process.env[`${name}_API_KEY`];
  if (!base || !key) return new Response("Not configured", { status: 500 });

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}${API[service]}${id}/${file}`, {
      headers: { "X-Api-Key": key },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return new Response("Unreachable", { status: 502 });
  }
  const type = res.headers.get("Content-Type") ?? "";
  if (!res.ok || !res.body || !type.startsWith("image/")) return new Response("Not found", { status: 404 });
  return new Response(res.body, {
    headers: {
      "Content-Type": type,
      // the URL carries the service's cache-buster, so it's safe to keep for a long time
      "Cache-Control": new URL(req.url).search ? "private, max-age=2592000, immutable" : "private, max-age=86400",
    },
  });
}
