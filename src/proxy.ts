import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

// Arrboard has no login of its own and holds full-access keys, so this is the lock.
//
// - Opened directly on Homer's port (LAN or Tailscale): allowed.
// - Arrived through Nginx Proxy Manager or Cloudflare: must carry a valid Cloudflare Access token
//   for this app (CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD). If those aren't set, remote access is refused.
//
// Detection uses X-Real-IP (NPM sets it on every proxied request) and Cloudflare's own headers.
// X-Forwarded-For can't be used: Next adds it to every request itself.

const team = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
const aud = process.env.CF_ACCESS_AUD;
const jwks = team ? createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`)) : null;

function deny(req: NextRequest, reason: string) {
  console.warn(`[arrboard] blocked ${req.method} ${req.nextUrl.pathname}: ${reason}`);
  const body = "Arr! This ship only takes crew: sign in through Cloudflare Access or connect from the home network.";
  return req.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ error: body }, { status: 403 })
    : new NextResponse(body, { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function proxy(req: NextRequest) {
  const h = req.headers;
  const proxied = h.has("x-real-ip") || h.has("cf-ray") || h.has("cf-connecting-ip");
  if (!proxied) return NextResponse.next();

  if (!jwks || !aud) return deny(req, "remote request, but Cloudflare Access isn't configured");
  const token = h.get("cf-access-jwt-assertion") ?? req.cookies.get("CF_Authorization")?.value;
  if (!token) return deny(req, "no Cloudflare Access token");
  try {
    await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: aud });
    return NextResponse.next();
  } catch (e) {
    return deny(req, `invalid Cloudflare Access token (${e instanceof Error ? e.message : "unknown"})`);
  }
}
