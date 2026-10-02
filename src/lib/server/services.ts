import "server-only";

// Every call to a service goes through here. The API keys are read from the
// environment on the server and never sent to the browser.

export type ArrKind = "sonarr" | "radarr" | "lidarr";
export type Service = ArrKind | "prowlarr" | "sabnzbd" | "seerr" | "bazarr";

const ARR_API: Record<ArrKind | "prowlarr", string> = {
  sonarr: "/api/v3",
  radarr: "/api/v3",
  lidarr: "/api/v1",
  prowlarr: "/api/v1",
};

function env(service: Service) {
  const name = service.toUpperCase();
  const url = process.env[`${name}_URL`];
  const key = process.env[`${name}_API_KEY`];
  if (!url || !key) throw new ServiceError(service, 500, `${name}_URL / ${name}_API_KEY not set`);
  return { url: url.replace(/\/+$/, ""), key };
}

export class ServiceError extends Error {
  constructor(public service: Service, public status: number, message: string) {
    super(`${service}: ${message}`);
  }
}

async function request<T>(service: Service, url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "timed out" : "unreachable";
    throw new ServiceError(service, 502, msg);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = JSON.parse(text);
      const detail = Array.isArray(body)
        ? body.map((b) => b.errorMessage ?? b.message).filter(Boolean).join("; ")
        : body.message ?? body.error ?? body.errorMessage;
      if (detail) msg = String(detail);
    } catch {}
    throw new ServiceError(service, res.status, msg);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return body === undefined
    ? { method }
    : { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } };
}

/** Sonarr / Radarr / Lidarr / Prowlarr */
export function arr<T = unknown>(service: ArrKind | "prowlarr", path: string, method = "GET", body?: unknown, timeoutMs?: number) {
  const { url, key } = env(service);
  const init = jsonInit(method, body);
  init.headers = { ...(init.headers as Record<string, string>), "X-Api-Key": key };
  return request<T>(service, `${url}${ARR_API[service]}${path}`, init, timeoutMs);
}

export function seerr<T = unknown>(path: string, method = "GET", body?: unknown) {
  const { url, key } = env("seerr");
  const init = jsonInit(method, body);
  init.headers = { ...(init.headers as Record<string, string>), "X-Api-Key": key };
  return request<T>("seerr", `${url}/api/v1${path}`, init);
}

export function bazarr<T = unknown>(path: string, method = "GET", params?: Record<string, string>) {
  const { url, key } = env("bazarr");
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return request<T>("bazarr", `${url}/api${path}${qs}`, { method, headers: { "X-API-KEY": key } });
}

export function sab<T = unknown>(params: Record<string, string>) {
  const { url, key } = env("sabnzbd");
  const qs = new URLSearchParams({ ...params, output: "json", apikey: key });
  return request<T>("sabnzbd", `${url}/api?${qs}`);
}

/** Short in-memory cache for the big library lists (Radarr alone is ~2,000 movies). */
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}
export function invalidate(prefix: string) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

/** Wrap a route handler so service errors come back as JSON the UI can show. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return Response.json(data ?? { ok: true });
  } catch (e) {
    if (e instanceof ServiceError) return Response.json({ error: e.message }, { status: e.status >= 400 && e.status < 600 ? e.status : 502 });
    if (e instanceof BadRequest) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export class BadRequest extends Error {}

/** Settle a set of calls so one service being down doesn't blank the whole screen. */
export async function settle<T extends Record<string, Promise<unknown>>>(calls: T) {
  const keys = Object.keys(calls);
  const results = await Promise.allSettled(Object.values(calls));
  const out: Record<string, unknown> = {};
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") out[keys[i]] = r.value;
    else {
      out[keys[i]] = null;
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
  });
  return { data: out as { [K in keyof T]: Awaited<T[K]> | null }, errors };
}
