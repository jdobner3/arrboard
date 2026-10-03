import "server-only";
import { arr, cached, invalidate, BadRequest, type ArrKind } from "./services";
import type { AddOptions, DetailGroup, LibraryDetail, LibraryItem, LibraryKind, LookupResult, SeasonDetail } from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export const SERVICE: Record<LibraryKind, ArrKind> = { shows: "sonarr", movies: "radarr", music: "lidarr" };
const ENTITY: Record<LibraryKind, string> = { shows: "/series", movies: "/movie", music: "/artist" };

export function parseKind(kind: string): LibraryKind {
  if (kind === "shows" || kind === "movies" || kind === "music") return kind;
  throw new BadRequest(`Unknown library "${kind}"`);
}

/** Library posters come from the service itself (resized, through /api/image). */
export function localImage(service: ArrKind, id: number, images: Any[] | undefined, type: "poster" | "fanart", size?: number) {
  const img = images?.find((i) => i.coverType === type);
  if (!img || !id) return remoteImage(images, type);
  // keep the service's cache-buster (?lastWrite= / ?h=) so a changed poster isn't served stale
  const query = img.url ? String(img.url).split("?")[1] : undefined;
  return `/api/image/${service}/${id}/${type}${size ? `-${size}` : ""}.jpg${query ? `?${query}` : ""}`;
}

/** Search results aren't in the library yet, so they use the public artwork URL. */
export function remoteImage(images: Any[] | undefined, type: "poster" | "fanart" | "cover" = "poster") {
  const img = images?.find((i) => i.coverType === type) ?? (type === "poster" ? images?.find((i) => i.coverType === "cover") : undefined);
  const url: string | undefined = img?.remoteUrl ?? img?.url;
  if (!url || !url.startsWith("http")) return undefined;
  return url.replace("image.tmdb.org/t/p/original/", "image.tmdb.org/t/p/w342/");
}

function raw(kind: LibraryKind): Promise<Any[]> {
  return cached(`lib:${kind}`, 60_000, () => arr<Any[]>(SERVICE[kind], ENTITY[kind], "GET", undefined, 30000));
}

function sortTitle(x: Any) {
  return String(x.sortTitle ?? x.sortName ?? x.title ?? x.artistName ?? "").toLowerCase();
}

export async function listLibrary(kind: LibraryKind): Promise<LibraryItem[]> {
  const items = await raw(kind);
  const service = SERVICE[kind];
  return items
    .map((x): LibraryItem => {
      if (kind === "shows") {
        const s = x.statistics ?? {};
        const have = s.episodeFileCount ?? 0;
        const want = s.episodeCount ?? 0;
        return {
          id: x.id, title: x.title, sortTitle: sortTitle(x), year: x.year, monitored: x.monitored, added: x.added,
          poster: localImage(service, x.id, x.images, "poster", 250),
          line: `${s.seasonCount ?? 0} season${s.seasonCount === 1 ? "" : "s"} · ${have}/${want} eps${x.ended ? " · ended" : ""}`,
          percent: want ? Math.round((have / want) * 100) : 100,
          missing: x.monitored && have < want,
        };
      }
      if (kind === "movies") {
        return {
          id: x.id, title: x.title, sortTitle: sortTitle(x), year: x.year, monitored: x.monitored, added: x.added,
          poster: localImage(service, x.id, x.images, "poster", 250),
          line: x.hasFile ? `On disk · ${x.movieFile?.quality?.quality?.name ?? ""}`.replace(/ · $/, "") : x.isAvailable ? "Missing" : `Not released · ${x.status}`,
          percent: x.hasFile ? 100 : 0,
          missing: x.monitored && !x.hasFile && x.isAvailable,
        };
      }
      const s = x.statistics ?? {};
      const have = s.trackFileCount ?? 0;
      const want = s.trackCount ?? 0;
      return {
        id: x.id, title: x.artistName, sortTitle: sortTitle(x), monitored: x.monitored, added: x.added,
        poster: localImage(service, x.id, x.images, "poster", 250),
        line: `${s.albumCount ?? 0} album${s.albumCount === 1 ? "" : "s"} · ${have}/${want} tracks`,
        percent: want ? Math.round((have / want) * 100) : 100,
        missing: x.monitored && have < want,
      };
    })
    .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
}

const gb = (bytes?: number) => (bytes ? `${(bytes / 1024 ** 3).toFixed(bytes > 100 * 1024 **3 ? 0 : 1)} GB` : "0 GB");

async function profileName(service: ArrKind, id?: number) {
  if (!id) return undefined;
  const profiles = await cached(`qp:${service}`, 300_000, () => arr<Any[]>(service, "/qualityprofile"));
  return profiles.find((p) => p.id === id)?.name;
}

export async function getDetail(kind: LibraryKind, id: number): Promise<LibraryDetail> {
  const service = SERVICE[kind];
  const x = await arr<Any>(service, `${ENTITY[kind]}/${id}`);
  const quality = await profileName(service, x.qualityProfileId).catch(() => undefined);
  const base = {
    kind, id: x.id, monitored: x.monitored, overview: x.overview,
    poster: localImage(service, x.id, x.images, "poster", 500),
    fanart: localImage(service, x.id, x.images, "fanart", 360),
  };

  if (kind === "shows") {
    const groups: DetailGroup[] = [...(x.seasons ?? [])]
      .sort((a: Any, b: Any) => b.seasonNumber - a.seasonNumber)
      .map((s: Any) => ({
        id: s.seasonNumber,
        title: s.seasonNumber === 0 ? "Specials" : `Season ${s.seasonNumber}`,
        monitored: s.monitored,
        have: s.statistics?.episodeFileCount ?? 0,
        total: s.statistics?.episodeCount ?? 0,
        sub: s.statistics?.totalEpisodeCount ? `${s.statistics.totalEpisodeCount} aired/announced` : undefined,
      }));
    return {
      ...base, title: x.title, year: x.year, groupLabel: "Seasons", groups,
      facts: [
        ["Status", x.ended ? "Ended" : "Continuing"],
        ["Network", x.network ?? "—"],
        ["Quality", quality ?? "—"],
        ["On disk", gb(x.statistics?.sizeOnDisk)],
        ["Path", x.path],
      ],
    };
  }

  if (kind === "movies") {
    const f = x.movieFile;
    const release = x.digitalRelease ?? x.physicalRelease ?? x.inCinemas;
    return {
      ...base, title: x.title, year: x.year, groups: [],
      facts: [
        ["File", x.hasFile ? `${f?.quality?.quality?.name ?? "On disk"} · ${gb(f?.size)}` : "Missing"],
        ["Quality profile", quality ?? "—"],
        ["Status", x.status],
        ["Release", release ? new Date(release).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—"],
        ["Runtime", x.runtime ? `${x.runtime} min` : "—"],
        ["Path", x.path],
      ],
    };
  }

  const albums = await arr<Any[]>(service, `/album?artistId=${id}`);
  const groups: DetailGroup[] = albums
    .sort((a, b) => String(b.releaseDate ?? "").localeCompare(String(a.releaseDate ?? "")))
    .map((a) => ({
      id: a.id,
      title: a.title,
      sub: [a.releaseDate?.slice(0, 4), a.albumType].filter(Boolean).join(" · "),
      monitored: a.monitored,
      have: a.statistics?.trackFileCount ?? 0,
      total: a.statistics?.trackCount ?? 0,
    }));
  return {
    ...base, title: x.artistName, groupLabel: "Albums", groups,
    facts: [
      ["Status", x.status ?? "—"],
      ["Quality", quality ?? "—"],
      ["On disk", gb(x.statistics?.sizeOnDisk)],
      ["Path", x.path],
    ],
  };
}

export type DetailAction =
  | { action: "search" }
  | { action: "searchGroup"; groupId: number }
  | { action: "monitor"; monitored: boolean }
  | { action: "monitorGroup"; groupId: number; monitored: boolean }
  | { action: "searchEpisode"; episodeId: number }
  | { action: "monitorEpisode"; episodeId: number; monitored: boolean };

export async function runAction(kind: LibraryKind, id: number, a: DetailAction) {
  const service = SERVICE[kind];
  const done = (r: unknown) => {
    invalidate(`lib:${kind}`);
    return r;
  };
  const command = async (body: object) => {
    await arr(service, "/command", "POST", body);
    return { ok: true };
  };
  switch (a.action) {
    case "search":
      return command(
        kind === "shows" ? { name: "SeriesSearch", seriesId: id }
        : kind === "movies" ? { name: "MoviesSearch", movieIds: [id] }
        : { name: "ArtistSearch", artistId: id },
      );
    case "searchGroup":
      if (kind === "shows") return command({ name: "SeasonSearch", seriesId: id, seasonNumber: a.groupId });
      if (kind === "music") return command({ name: "AlbumSearch", albumIds: [a.groupId] });
      throw new BadRequest("Movies have no groups");
    case "searchEpisode":
      if (kind !== "shows") throw new BadRequest("Only shows have episodes");
      return command({ name: "EpisodeSearch", episodeIds: [a.episodeId] });
    case "monitor": {
      const x = await arr<Any>(service, `${ENTITY[kind]}/${id}`);
      await arr(service, `${ENTITY[kind]}/${id}`, "PUT", { ...x, monitored: a.monitored });
      return done({ ok: true });
    }
    case "monitorGroup":
      if (kind === "shows") {
        const x = await arr<Any>(service, `/series/${id}`);
        const seasons = x.seasons.map((s: Any) => (s.seasonNumber === a.groupId ? { ...s, monitored: a.monitored } : s));
        await arr(service, `/series/${id}`, "PUT", { ...x, seasons });
        return done({ ok: true });
      }
      if (kind === "music") {
        await arr(service, "/album/monitor", "PUT", { albumIds: [a.groupId], monitored: a.monitored });
        return done({ ok: true });
      }
      throw new BadRequest("Movies have no groups");
    case "monitorEpisode":
      if (kind !== "shows") throw new BadRequest("Only shows have episodes");
      await arr(service, "/episode/monitor", "PUT", { episodeIds: [a.episodeId], monitored: a.monitored });
      return done({ ok: true });
    default:
      throw new BadRequest("Unknown action");
  }
}

export async function getSeason(seriesId: number, season: number): Promise<SeasonDetail> {
  const [series, episodes] = await Promise.all([
    arr<Any>("sonarr", `/series/${seriesId}`),
    arr<Any[]>("sonarr", `/episode?seriesId=${seriesId}&seasonNumber=${season}&includeEpisodeFile=true`),
  ]);
  const s = series.seasons?.find((x: Any) => x.seasonNumber === season);
  if (!s) throw new BadRequest("No such season");
  const now = Date.now();
  return {
    seriesId,
    seriesTitle: series.title,
    season,
    monitored: s.monitored,
    episodes: episodes
      .sort((a, b) => b.episodeNumber - a.episodeNumber)
      .map((e) => ({
        id: e.id,
        number: e.episodeNumber,
        title: e.title ?? "TBA",
        airDate: e.airDateUtc,
        aired: Boolean(e.airDateUtc) && new Date(e.airDateUtc).getTime() <= now,
        monitored: e.monitored,
        hasFile: e.hasFile,
        quality: e.episodeFile?.quality?.quality?.name,
        size: e.episodeFile?.size,
      })),
  };
}

/* ---------- Search & add ---------- */

const LOOKUP: Record<LibraryKind, string> = { shows: "/series/lookup", movies: "/movie/lookup", music: "/artist/lookup" };
const lookupKey = (kind: LibraryKind, x: Any) =>
  String(kind === "shows" ? x.tvdbId : kind === "movies" ? x.tmdbId : x.foreignArtistId);

export async function lookup(kind: LibraryKind, term: string): Promise<LookupResult[]> {
  const results = await arr<Any[]>(SERVICE[kind], `${LOOKUP[kind]}?term=${encodeURIComponent(term)}`, "GET", undefined, 30000);
  return results.slice(0, 25).map((x) => ({
    key: lookupKey(kind, x),
    title: x.title ?? x.artistName,
    year: x.year || undefined,
    overview: x.overview,
    poster: remoteImage(x.images, "poster") ?? x.remotePoster,
    libraryId: x.id || undefined,
    sub:
      kind === "shows" ? [x.network, x.seasonCount ? `${x.seasonCount} seasons` : undefined, x.ended ? "ended" : undefined].filter(Boolean).join(" · ")
      : kind === "movies" ? [x.studio, x.runtime ? `${x.runtime} min` : undefined].filter(Boolean).join(" · ")
      : [x.artistType, x.disambiguation].filter(Boolean).join(" · "),
  }));
}

function mostUsed(items: Any[], field: string): Any {
  const counts = new Map<Any, number>();
  for (const i of items) counts.set(i[field], (counts.get(i[field]) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export async function addOptions(kind: LibraryKind): Promise<AddOptions> {
  const service = SERVICE[kind];
  const [qp, roots, md, items] = await Promise.all([
    arr<Any[]>(service, "/qualityprofile"),
    arr<Any[]>(service, "/rootfolder"),
    kind === "music" ? arr<Any[]>(service, "/metadataprofile") : Promise.resolve(undefined),
    raw(kind).catch(() => []),
  ]);
  const usedRoot = mostUsed(items, "rootFolderPath");
  return {
    qualityProfiles: qp.map((p) => ({ id: p.id, name: p.name })),
    rootFolders: roots.map((r) => ({ path: r.path, freeSpace: r.freeSpace })),
    metadataProfiles: md?.map((p) => ({ id: p.id, name: p.name })),
    defaults: {
      qualityProfileId: mostUsed(items, "qualityProfileId") ?? qp[0]?.id,
      rootFolderPath: roots.some((r) => r.path === usedRoot) ? usedRoot : roots[0]?.path,
      metadataProfileId: md ? mostUsed(items, "metadataProfileId") ?? md[0]?.id : undefined,
    },
  };
}

export interface AddRequest {
  key: string;
  title: string;
  qualityProfileId: number;
  rootFolderPath: string;
  metadataProfileId?: number;
  /** shows: all | future | missing | none ; music: all | future | none */
  monitor: string;
  search: boolean;
}

export async function addItem(kind: LibraryKind, req: AddRequest) {
  const service = SERVICE[kind];
  const term = kind === "shows" ? `tvdb:${req.key}` : kind === "movies" ? `tmdb:${req.key}` : `lidarr:${req.key}`;
  const found = await arr<Any[]>(service, `${LOOKUP[kind]}?term=${encodeURIComponent(term)}`, "GET", undefined, 30000);
  const x = found.find((f) => lookupKey(kind, f) === req.key) ?? found[0];
  if (!x) throw new BadRequest(`Couldn't find "${req.title}" to add`);
  if (x.id) throw new BadRequest(`"${req.title}" is already in the library`);
  const common = { ...x, qualityProfileId: req.qualityProfileId, rootFolderPath: req.rootFolderPath, monitored: req.monitor !== "none" };
  let body: Any;
  if (kind === "shows") {
    body = { ...common, seasonFolder: true, addOptions: { monitor: req.monitor, searchForMissingEpisodes: req.search, searchForCutoffUnmetEpisodes: false } };
  } else if (kind === "movies") {
    body = { ...common, minimumAvailability: "released", addOptions: { monitor: req.monitor === "none" ? "none" : "movieOnly", searchForMovie: req.search } };
  } else {
    body = { ...common, metadataProfileId: req.metadataProfileId, addOptions: { monitor: req.monitor, searchForMissingAlbums: req.search } };
  }
  const added = await arr<Any>(service, ENTITY[kind], "POST", body, 30000);
  invalidate(`lib:${kind}`);
  return { id: added.id };
}
