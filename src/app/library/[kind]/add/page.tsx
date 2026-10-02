"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { act, useApi } from "@/lib/client";
import { type AddOptions, type LibraryKind, type LookupResult } from "@/lib/types";
import { ActionButton, Card, Empty, ErrorNote, Loading, Page, Pill, Poster, SearchBox } from "@/components/ui";

const MONITOR: Record<LibraryKind, { value: string; label: string }[]> = {
  shows: [
    { value: "all", label: "All episodes" },
    { value: "future", label: "Future episodes only" },
    { value: "missing", label: "Missing episodes" },
    { value: "firstSeason", label: "First season" },
    { value: "lastSeason", label: "Latest season" },
    { value: "none", label: "Don't monitor" },
  ],
  movies: [
    { value: "movieOnly", label: "Monitor" },
    { value: "none", label: "Don't monitor" },
  ],
  music: [
    { value: "all", label: "All albums" },
    { value: "future", label: "Future albums only" },
    { value: "latest", label: "Latest album" },
    { value: "none", label: "Don't monitor" },
  ],
};

export default function Add() {
  const { kind } = useParams<{ kind: LibraryKind }>();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const results = useApi<LookupResult[]>(term ? `/api/add/${kind}?term=${encodeURIComponent(term)}` : null, { revalidateOnFocus: false });
  const options = useApi<AddOptions>(`/api/add/${kind}`, { revalidateOnFocus: false });

  // search as you type, after a short pause
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 500);
    return () => clearTimeout(t);
  }, [q]);

  const noun = kind === "shows" ? "a show" : kind === "movies" ? "a movie" : "an artist";

  return (
    <Page title={kind === "shows" ? "Add show" : kind === "movies" ? "Add movie" : "Add artist"} back={`/library/${kind}`}>
      <SearchBox value={q} onChange={setQ} placeholder={`Search for ${noun}`} autoFocus onSubmit={() => setTerm(q.trim())} />

      {results.error && <ErrorNote error={results.error} retry={() => results.mutate()} />}
      {term && results.isLoading && <Loading rows={5} />}
      {term && results.data?.length === 0 && <Empty>No results for “{term}”.</Empty>}

      <div className="space-y-2">
        {results.data?.map((r) => (
          <Card key={r.key} className="overflow-hidden">
            <button onClick={() => setOpen(open === r.key ? null : r.key)} className="flex w-full gap-3 p-3 text-left active:bg-[var(--press)]">
              <Poster src={r.poster} alt="" className="h-24 w-16" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-medium">
                    {r.title}
                    {r.year ? <span className="font-normal text-[var(--muted)]"> {r.year}</span> : null}
                  </p>
                  {r.libraryId && <Pill tone="good">In library</Pill>}
                </div>
                {r.sub && <p className="truncate text-xs text-[var(--muted)]">{r.sub}</p>}
                {r.overview && <p className="line-clamp-2 text-sm text-[var(--muted)]">{r.overview}</p>}
              </div>
            </button>
            {open === r.key &&
              (r.libraryId ? (
                <div className="border-t border-[var(--line)] p-3">
                  <Link href={`/library/${kind}/${r.libraryId}`} className="font-semibold text-[var(--accent)]">Open in library</Link>
                </div>
              ) : options.data ? (
                <AddForm kind={kind} item={r} options={options.data} />
              ) : options.error ? (
                <div className="p-3"><ErrorNote error={options.error} /></div>
              ) : (
                <div className="p-3"><Loading rows={1} /></div>
              ))}
          </Card>
        ))}
      </div>
    </Page>
  );
}

function AddForm({ kind, item, options }: { kind: LibraryKind; item: LookupResult; options: AddOptions }) {
  const router = useRouter();
  const [quality, setQuality] = useState(options.defaults.qualityProfileId ?? options.qualityProfiles[0]?.id);
  const [root, setRoot] = useState(options.defaults.rootFolderPath ?? options.rootFolders[0]?.path);
  const [metadata, setMetadata] = useState(options.defaults.metadataProfileId);
  const [monitor, setMonitor] = useState(MONITOR[kind][0].value);
  const [search, setSearch] = useState(true);

  return (
    <div className="space-y-3 border-t border-[var(--line)] p-3">
      <Select label="Quality" value={String(quality)} onChange={(v) => setQuality(Number(v))} options={options.qualityProfiles.map((p) => ({ value: String(p.id), label: p.name }))} />
      {options.rootFolders.length > 1 && (
        <Select label="Folder" value={root ?? ""} onChange={setRoot} options={options.rootFolders.map((r) => ({ value: r.path, label: r.path }))} />
      )}
      {options.metadataProfiles && (
        <Select label="Releases" value={String(metadata)} onChange={(v) => setMetadata(Number(v))} options={options.metadataProfiles.map((p) => ({ value: String(p.id), label: p.name }))} />
      )}
      <Select label="Monitor" value={monitor} onChange={setMonitor} options={MONITOR[kind]} />
      <label className="flex min-h-10 items-center gap-3 text-sm">
        <input type="checkbox" checked={search} onChange={(e) => setSearch(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        Start searching right away
      </label>
      <ActionButton
        tone="primary"
        className="w-full"
        done={`Added ${item.title}`}
        run={async () => {
          const { id } = await act<{ id: number }>(`/api/add/${kind}`, {
            key: item.key, title: item.title, qualityProfileId: quality, rootFolderPath: root, metadataProfileId: metadata, monitor, search,
          });
          router.push(`/library/${kind}/${id}`);
        }}
      >
        Add {item.title}
      </ActionButton>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 text-[var(--muted)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl bg-[var(--press)] px-3 text-[var(--fg)] outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
