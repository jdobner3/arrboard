import "server-only";
import { arr, bazarr, cached, sab, seerr, settle, BadRequest, type ArrKind } from "./services";
import { listLibrary, localImage } from "./library";
import type {
  CalendarEntry, Downloads, HealthItem, ImportIssue, Indexer, Overview, QueueSlot, RequestItem, WantedSub,
} from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/* ---------- Downloads (SABnzbd) ---------- */

const PRIORITY: Record<string, string> = { "-1": "Low", "0": "Normal", "1": "High", "2": "Force" };

function queueSlot(s: Any): QueueSlot {
  return {
    id: s.nzo_id, name: s.filename, status: s.status, percent: Number(s.percentage) || 0,
    size: s.size, left: s.sizeleft, timeleft: s.timeleft, priority: PRIORITY[s.priority] ?? s.priority, category: s.cat,
  };
}

export async function getDownloads(): Promise<Downloads> {
  const [q, h] = await Promise.all([
    sab<Any>({ mode: "queue", start: "0", limit: "100" }),
    sab<Any>({ mode: "history", start: "0", limit: "25" }),
  ]);
  const queue = q.queue;
  return {
    paused: Boolean(queue.paused),
    status: queue.status,
    speed: queue.kbpersec && Number(queue.kbpersec) > 0 ? `${(Number(queue.kbpersec) / 1024).toFixed(1)} MB/s` : "0 MB/s",
    timeleft: queue.timeleft,
    sizeleft: queue.sizeleft,
    diskFree: Number(queue.diskspace1) >= 1000 ? `${(Number(queue.diskspace1) / 1024).toFixed(1)} TB free` : `${Math.round(Number(queue.diskspace1))} GB free`,
    speedLimit: queue.speedlimit && queue.speedlimit !== "100" ? `${queue.speedlimit}%` : "",
    queue: (queue.slots ?? []).map(queueSlot),
    history: (h.history.slots ?? []).map((s: Any) => ({
      id: s.nzo_id, name: s.name, status: s.status, category: s.category, completed: s.completed,
      size: s.bytes ? `${(s.bytes / 1024 ** 3).toFixed(2)} GB` : "", fail: s.fail_message || undefined,
    })),
  };
}

export type DownloadAction =
  | { action: "pauseAll" | "resumeAll" }
  | { action: "pauseFor"; minutes: number }
  | { action: "pause" | "resume" | "delete"; id: string }
  | { action: "priority"; id: string; value: -1 | 0 | 1 | 2 }
  | { action: "retry" | "deleteHistory"; id: string };

export async function downloadAction(a: DownloadAction) {
  switch (a.action) {
    case "pauseAll": return sab({ mode: "pause" });
    case "resumeAll": return sab({ mode: "resume" });
    case "pauseFor": return sab({ mode: "config", name: "set_pause", value: String(Math.max(1, Math.round(a.minutes))) });
    case "pause": case "resume": return sab({ mode: "queue", name: a.action, value: a.id });
    case "delete": return sab({ mode: "queue", name: "delete", value: a.id, del_files: "1" });
    case "priority": return sab({ mode: "queue", name: "priority", value: a.id, value2: String(a.value) });
    case "retry": return sab({ mode: "retry", value: a.id });
    case "deleteHistory": return sab({ mode: "history", name: "delete", value: a.id, del_files: "1" });
    default: throw new BadRequest("Unknown action");
  }
}

/* ---------- Import problems in the *arr queues ---------- */

const QUEUE_EXTRA: Record<ArrKind, string> = {
  sonarr: "&includeSeries=true&includeEpisode=true",
  radarr: "&includeMovie=true",
  lidarr: "&includeArtist=true&includeAlbum=true",
};

async function importIssues(service: ArrKind): Promise<ImportIssue[]> {
  const q = await arr<Any>(service, `/queue?page=1&pageSize=100${QUEUE_EXTRA[service]}`);
  return (q.records ?? [])
    .filter((r: Any) => r.trackedDownloadStatus !== "ok" || r.status === "failed" || r.trackedDownloadState === "importBlocked")
    .map((r: Any) => ({
      service, id: r.id, title: r.title, state: r.trackedDownloadState ?? r.status,
      messages: [...new Set<string>((r.statusMessages ?? []).flatMap((m: Any) => m.messages ?? []).concat(r.errorMessage ? [r.errorMessage] : []))],
    }));
}

export async function removeQueueItem(service: ArrKind, id: number, blocklist: boolean) {
  const qs = `removeFromClient=true&blocklist=${blocklist}&skipRedownload=${!blocklist}`;
  return arr(service, `/queue/${id}?${qs}`, "DELETE");
}

/* ---------- Home ---------- */

async function health(service: ArrKind | "prowlarr"): Promise<HealthItem[]> {
  const items = await arr<Any[]>(service, "/health");
  return items.map((h) => ({ service, type: h.type, message: h.message }));
}

export async function getOverview(): Promise<Overview> {
  const { data, errors } = await settle({
    downloads: getDownloads(),
    issues: Promise.all((["sonarr", "radarr", "lidarr"] as ArrKind[]).map((s) => importIssues(s).catch(() => []))),
    health: Promise.all((["sonarr", "radarr", "lidarr", "prowlarr"] as const).map((s) => health(s).catch(() => []))),
    requests: seerr<Any>("/request/count"),
    subtitles: bazarr<Any>("/badges"),
    shows: listLibrary("shows"),
    movies: listLibrary("movies"),
    music: listLibrary("music"),
  });
  const d = data.downloads;
  return {
    downloads: d && {
      paused: d.paused, status: d.status, speed: d.speed, timeleft: d.timeleft, diskFree: d.diskFree,
      count: d.queue.length, top: d.queue[0],
    },
    issues: data.issues?.flat() ?? [],
    health: data.health?.flat() ?? [],
    requests: data.requests && { pending: data.requests.pending, processing: data.requests.processing },
    subtitles: data.subtitles && { episodes: data.subtitles.episodes, movies: data.subtitles.movies },
    counts: { shows: data.shows?.length, movies: data.movies?.length, music: data.music?.length },
    errors,
  };
}

/* ---------- Calendar ---------- */

export async function getCalendar(days: number): Promise<{ entries: CalendarEntry[]; errors: string[] }> {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days + 1);
  const range = `start=${start.toISOString()}&end=${end.toISOString()}`;

  const { data, errors } = await settle({
    shows: arr<Any[]>("sonarr", `/calendar?${range}&includeSeries=true&unmonitored=false`),
    movies: arr<Any[]>("radarr", `/calendar?${range}&unmonitored=false`),
    music: arr<Any[]>("lidarr", `/calendar?${range}&includeArtist=true&unmonitored=false`),
  });

  const entries: CalendarEntry[] = [];
  for (const e of data.shows ?? []) {
    if (!e.airDateUtc) continue;
    entries.push({
      key: `s${e.id}`, kind: "shows", libraryId: e.seriesId, date: e.airDateUtc, title: e.series?.title ?? "Episode",
      sub: `S${String(e.seasonNumber).padStart(2, "0")}E${String(e.episodeNumber).padStart(2, "0")} · ${e.title ?? "TBA"}`,
      hasFile: e.hasFile, poster: localImage("sonarr", e.seriesId, e.series?.images, "poster", 250),
    });
  }
  for (const m of data.movies ?? []) {
    const dates: [string, string | undefined][] = [["In cinemas", m.inCinemas], ["Digital release", m.digitalRelease], ["Physical release", m.physicalRelease]];
    for (const [label, date] of dates) {
      if (!date || date < start.toISOString() || date > end.toISOString()) continue;
      entries.push({
        key: `m${m.id}${label}`, kind: "movies", libraryId: m.id, date, title: m.title, sub: label,
        hasFile: m.hasFile, poster: localImage("radarr", m.id, m.images, "poster", 250),
      });
    }
  }
  for (const a of data.music ?? []) {
    if (!a.releaseDate) continue;
    entries.push({
      key: `a${a.id}`, kind: "music", libraryId: a.artistId, date: a.releaseDate, title: a.artist?.artistName ?? "Album",
      sub: `${a.title}${a.albumType ? ` · ${a.albumType}` : ""}`,
      hasFile: (a.statistics?.trackFileCount ?? 0) > 0, poster: localImage("lidarr", a.artistId, a.artist?.images, "poster", 250),
    });
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { entries, errors };
}

/* ---------- Requests (Seerr) ---------- */

async function mediaInfo(type: "movie" | "tv", tmdbId: number) {
  return cached(`seerr:${type}:${tmdbId}`, 86_400_000, async () => {
    const m = await seerr<Any>(`/${type}/${tmdbId}`);
    return {
      title: (type === "movie" ? m.title : m.name) as string,
      year: String((type === "movie" ? m.releaseDate : m.firstAirDate) ?? "").slice(0, 4) || undefined,
      poster: m.posterPath ? `https://image.tmdb.org/t/p/w185${m.posterPath}` : undefined,
    };
  });
}

export async function getRequests(filter: string, page: number): Promise<{ results: RequestItem[]; pages: number; total: number }> {
  const allowed = ["all", "pending", "approved", "processing", "available", "unavailable", "failed"];
  if (!allowed.includes(filter)) throw new BadRequest("Unknown filter");
  const take = 20;
  const r = await seerr<Any>(`/request?take=${take}&skip=${(page - 1) * take}&filter=${filter}&sort=added`);
  const results = await Promise.all(
    (r.results ?? []).map(async (x: Any): Promise<RequestItem> => {
      const info = await mediaInfo(x.type, x.media.tmdbId).catch(() => ({ title: `TMDB ${x.media.tmdbId}`, year: undefined, poster: undefined }));
      return {
        id: x.id, type: x.type, ...info, status: x.status, mediaStatus: x.media.status,
        requestedBy: x.requestedBy?.displayName ?? x.requestedBy?.email ?? "Unknown", createdAt: x.createdAt,
        seasons: x.type === "tv" ? (x.seasons ?? []).map((s: Any) => s.seasonNumber) : undefined,
      };
    }),
  );
  return { results, pages: r.pageInfo?.pages ?? 1, total: r.pageInfo?.results ?? results.length };
}

export async function requestAction(id: number, action: "approve" | "decline") {
  return seerr(`/request/${id}/${action}`, "POST");
}

/* ---------- Indexers (Prowlarr) ---------- */

export async function getIndexers(): Promise<Indexer[]> {
  const [list, status] = await Promise.all([arr<Any[]>("prowlarr", "/indexer"), arr<Any[]>("prowlarr", "/indexerstatus")]);
  return list
    .map((i) => {
      const s = status.find((x) => x.indexerId === i.id);
      return {
        id: i.id, name: i.name, protocol: i.protocol, enable: i.enable, priority: i.priority,
        failing: s ? { until: s.disabledTill, since: s.initialFailure } : undefined,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function testIndexers(id?: number): Promise<{ id: number; ok: boolean; message?: string }[]> {
  if (id === undefined) {
    const r = await arr<Any[]>("prowlarr", "/indexer/testall", "POST", undefined, 60000);
    return r.map((x) => ({ id: x.id, ok: x.isValid, message: x.validationFailures?.map((f: Any) => f.errorMessage).join("; ") || undefined }));
  }
  const indexer = await arr<Any>("prowlarr", `/indexer/${id}`);
  try {
    await arr("prowlarr", "/indexer/test", "POST", indexer, 60000);
    return [{ id, ok: true }];
  } catch (e) {
    return [{ id, ok: false, message: e instanceof Error ? e.message.replace(/^prowlarr: /, "") : "Test failed" }];
  }
}

export async function setIndexerEnabled(id: number, enable: boolean) {
  const indexer = await arr<Any>("prowlarr", `/indexer/${id}`);
  return arr("prowlarr", `/indexer/${id}`, "PUT", { ...indexer, enable });
}

/* ---------- Subtitles (Bazarr) ---------- */

export async function getWanted(kind: "episodes" | "movies", page: number): Promise<{ items: WantedSub[]; total: number }> {
  const length = 30;
  const r = await bazarr<Any>(`/${kind}/wanted`, "GET", { start: String((page - 1) * length), length: String(length) });
  const items: WantedSub[] = (r.data ?? []).map((x: Any) => {
    const missing = (x.missing_subtitles ?? []).map((m: Any) => ({ code: m.code2, name: m.name, forced: !!m.forced, hi: !!m.hi }));
    return kind === "episodes"
      ? { key: `e${x.sonarrEpisodeId}`, kind: "episode", title: x.seriesTitle, sub: `${x.episode_number} · ${x.episodeTitle}`, seriesId: x.sonarrSeriesId, episodeId: x.sonarrEpisodeId, missing }
      : { key: `m${x.radarrId}`, kind: "movie", title: x.title, radarrId: x.radarrId, missing };
  });
  return { items, total: r.total ?? items.length };
}

export type SubtitleAction =
  | { action: "searchAll"; kind: "episodes" | "movies" }
  | { action: "search"; kind: "episode"; seriesId: number; episodeId: number; language: string; forced: boolean; hi: boolean }
  | { action: "search"; kind: "movie"; radarrId: number; language: string; forced: boolean; hi: boolean };

export async function subtitleAction(a: SubtitleAction) {
  if (a.action === "searchAll") {
    const taskid = a.kind === "episodes" ? "wanted_search_missing_subtitles_series" : "wanted_search_missing_subtitles_movies";
    return bazarr("/system/tasks", "POST", { taskid });
  }
  const flags = { language: a.language, forced: String(a.forced), hi: String(a.hi) };
  if (a.kind === "episode") return bazarr("/episodes/subtitles", "PATCH", { seriesid: String(a.seriesId), episodeid: String(a.episodeId), ...flags });
  return bazarr("/movies/subtitles", "PATCH", { radarrid: String(a.radarrId), ...flags });
}
