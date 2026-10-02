// Shapes shared by the API routes and the screens.

export type LibraryKind = "shows" | "movies" | "music";

export const KIND_LABEL: Record<LibraryKind, string> = { shows: "Shows", movies: "Movies", music: "Music" };

export interface LibraryItem {
  id: number;
  title: string;
  sortTitle: string;
  year?: number;
  poster?: string;
  monitored: boolean;
  /** e.g. "3 seasons · 28/30 eps" */
  line: string;
  /** 0–100, how much of the monitored content is on disk */
  percent: number;
  /** true when monitored and something is missing */
  missing: boolean;
  added: string;
}

export interface DetailGroup {
  id: number;
  title: string;
  sub?: string;
  monitored: boolean;
  have: number;
  total: number;
}

export interface LibraryDetail {
  kind: LibraryKind;
  id: number;
  title: string;
  year?: number;
  overview?: string;
  poster?: string;
  fanart?: string;
  monitored: boolean;
  facts: [string, string][];
  groupLabel?: string;
  groups: DetailGroup[];
}

export interface LookupResult {
  /** tvdbId / tmdbId / foreignArtistId, used to add */
  key: string;
  title: string;
  year?: number;
  overview?: string;
  poster?: string;
  /** set when it's already in the library */
  libraryId?: number;
  sub?: string;
}

export interface AddOptions {
  qualityProfiles: { id: number; name: string }[];
  rootFolders: { path: string; freeSpace?: number }[];
  metadataProfiles?: { id: number; name: string }[];
  defaults: { qualityProfileId?: number; rootFolderPath?: string; metadataProfileId?: number };
}

export interface CalendarEntry {
  key: string;
  kind: LibraryKind;
  libraryId: number;
  date: string;
  title: string;
  sub: string;
  hasFile: boolean;
  poster?: string;
}

export interface QueueSlot {
  id: string;
  name: string;
  status: string;
  percent: number;
  size: string;
  left: string;
  timeleft: string;
  priority: string;
  category: string;
}

export interface HistorySlot {
  id: string;
  name: string;
  status: string;
  size: string;
  completed: number;
  category: string;
  fail?: string;
}

export interface Downloads {
  paused: boolean;
  status: string;
  speed: string;
  timeleft: string;
  sizeleft: string;
  diskFree: string;
  speedLimit: string;
  queue: QueueSlot[];
  history: HistorySlot[];
}

export interface ImportIssue {
  service: "sonarr" | "radarr" | "lidarr";
  id: number;
  title: string;
  messages: string[];
  state: string;
}

export interface HealthItem {
  service: string;
  type: string;
  message: string;
}

export interface Overview {
  downloads: Pick<Downloads, "paused" | "status" | "speed" | "timeleft" | "diskFree"> & { count: number; top?: QueueSlot } | null;
  issues: ImportIssue[];
  health: HealthItem[];
  requests: { pending: number; processing: number } | null;
  subtitles: { episodes: number; movies: number } | null;
  counts: { shows?: number; movies?: number; music?: number };
  errors: string[];
}

export interface RequestItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  year?: string;
  poster?: string;
  status: number;
  mediaStatus: number;
  requestedBy: string;
  createdAt: string;
  seasons?: number[];
}

export interface Indexer {
  id: number;
  name: string;
  protocol: string;
  enable: boolean;
  priority: number;
  failing?: { until?: string; since?: string };
}

export interface WantedSub {
  key: string;
  kind: "episode" | "movie";
  title: string;
  sub?: string;
  seriesId?: number;
  episodeId?: number;
  radarrId?: number;
  missing: { code: string; name: string; forced: boolean; hi: boolean }[];
}
