import "server-only";
import { randomUUID } from "node:crypto";
import { arr, BadRequest } from "./services";
import { SERVICE } from "./library";
import type { LibraryKind, Release, ReleaseJob } from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

// An interactive search can take well over a minute (the app grades every result), which is longer than
// Cloudflare will hold a request open. So a search runs as a background job and the phone polls for it.

/** "movie-3", "season-12-2", "episode-4411", "album-87" */
export interface Target {
  kind: LibraryKind;
  query: string;
}

export function parseTarget(kind: LibraryKind, target: string): Target {
  const m = target.match(/^(movie|season|episode|album)-(\d+)(?:-(\d+))?$/);
  if (!m) throw new BadRequest("Bad search target");
  const [, type, a, b] = m;
  if (kind === "movies" && type === "movie") return { kind, query: `movieId=${a}` };
  if (kind === "shows" && type === "episode") return { kind, query: `episodeId=${a}` };
  if (kind === "shows" && type === "season" && b !== undefined) return { kind, query: `seriesId=${a}&seasonNumber=${b}` };
  if (kind === "music" && type === "album") return { kind, query: `albumId=${a}` };
  throw new BadRequest("Bad search target");
}

interface Job extends ReleaseJob {
  key: string;
  at: number;
}
const jobs = new Map<string, Job>();

function prune() {
  for (const [id, j] of jobs) if (Date.now() - j.at > 15 * 60_000) jobs.delete(id);
}

function age(x: Any) {
  const h = x.ageHours ?? (x.age ?? 0) * 24;
  if (h < 1) return `${Math.max(1, Math.round(x.ageMinutes ?? 0))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  const d = x.age ?? Math.round(h / 24);
  return d > 730 ? `${(d / 365).toFixed(1)}y` : `${d}d`;
}

function shape(x: Any): Release {
  return {
    guid: x.guid,
    indexerId: x.indexerId,
    title: x.title,
    quality: x.quality?.quality?.name ?? "Unknown",
    size: x.size ?? 0,
    age: age(x),
    indexer: String(x.indexer ?? "").replace(/ \(Prowlarr\)$/, ""),
    protocol: x.protocol,
    seeders: x.protocol === "torrent" ? x.seeders : undefined,
    approved: Boolean(x.approved),
    rejections: (x.rejections ?? []).map((r: Any) => (typeof r === "string" ? r : r.reason ?? r.message ?? String(r))),
    score: x.customFormatScore ?? 0,
    languages: (x.languages ?? []).map((l: Any) => l.name).filter((n: string) => n && n !== "English"),
    fullSeason: x.fullSeason || undefined,
    weight: x.releaseWeight ?? 0,
  };
}

/** Starts a search, or returns the one already running/finished for the same target in the last 5 minutes. */
export function startSearch(t: Target): ReleaseJob {
  prune();
  const key = `${t.kind}:${t.query}`;
  for (const j of jobs.values()) {
    if (j.key === key && (j.status === "running" || Date.now() - j.at < 5 * 60_000)) return view(j);
  }
  const job: Job = { id: randomUUID(), key, at: Date.now(), startedAt: new Date().toISOString(), status: "running", results: [] };
  jobs.set(job.id, job);
  arr<Any[]>(SERVICE[t.kind], `/release?${t.query}`, "GET", undefined, 5 * 60_000)
    .then((r) => {
      job.results = r
        .map(shape)
        .sort((a, b) => Number(b.approved) - Number(a.approved) || a.weight - b.weight);
      job.status = "done";
    })
    .catch((e) => {
      job.status = "error";
      job.error = e instanceof Error ? e.message : "Search failed";
    });
  return view(job);
}

export function getJob(id: string): ReleaseJob {
  const j = jobs.get(id);
  if (!j) throw new BadRequest("That search has expired; start it again");
  return view(j);
}

function view(j: Job): ReleaseJob {
  return { id: j.id, status: j.status, startedAt: j.startedAt, results: j.status === "done" ? j.results : [], error: j.error };
}

export async function grab(kind: LibraryKind, guid: string, indexerId: number) {
  if (!guid || !Number.isInteger(indexerId)) throw new BadRequest("Bad release");
  await arr(SERVICE[kind], "/release", "POST", { guid, indexerId }, 60_000);
  return { ok: true };
}
