"use client";

import { useState } from "react";
import { act, useApi } from "@/lib/client";
import type { WantedSub } from "@/lib/types";
import { ActionButton, Card, Divided, Empty, ErrorNote, Loading, Page, Segmented } from "@/components/ui";
import { SearchIcon } from "@/components/icons";

type Kind = "episodes" | "movies";

export default function Subtitles() {
  const [kind, setKind] = useState<Kind>("episodes");
  const [page, setPage] = useState(1);
  const { data, error, mutate } = useApi<{ items: WantedSub[]; total: number }>(`/api/subtitles?kind=${kind}&page=${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / 30)) : 1;

  return (
    <Page title="Subtitles" back="/more">
      <Segmented value={kind} onChange={(k) => { setKind(k); setPage(1); }} options={[{ value: "episodes", label: "Episodes" }, { value: "movies", label: "Movies" }]} />
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={5} />}
      {data && (
        <>
          <ActionButton
            tone="primary"
            className="w-full"
            done="Bazarr is searching in the background"
            run={() => act("/api/subtitles", { action: "searchAll", kind })}
          >
            <SearchIcon className="h-4 w-4" /> Search all {data.total.toLocaleString()} missing
          </ActionButton>
          {data.items.length === 0 ? (
            <Empty>Every subtitle accounted for.</Empty>
          ) : (
            <Card>
              <Divided>
                {data.items.map((w) => (
                  <div key={w.key} className="space-y-2 px-4 py-3">
                    <div>
                      <p className="font-medium">{w.title}</p>
                      {w.sub && <p className="text-sm text-[var(--muted)]">{w.sub}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {w.missing.map((m) => {
                        const label = `${m.name}${m.forced ? " (forced)" : ""}${m.hi ? " (HI)" : ""}`;
                        return (
                          <ActionButton
                            key={label}
                            className="text-xs"
                            done={`Searched ${label}`}
                            run={async () => {
                              const ids = w.kind === "episode" ? { kind: "episode", seriesId: w.seriesId, episodeId: w.episodeId } : { kind: "movie", radarrId: w.radarrId };
                              await act("/api/subtitles", { action: "search", ...ids, language: m.code, forced: m.forced, hi: m.hi });
                              await mutate();
                            }}
                          >
                            <SearchIcon className="h-3.5 w-3.5" /> {label}
                          </ActionButton>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </Divided>
            </Card>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-10 rounded-xl bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-40">Previous</button>
              <span className="text-sm text-[var(--muted)]">Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="h-10 rounded-xl bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
