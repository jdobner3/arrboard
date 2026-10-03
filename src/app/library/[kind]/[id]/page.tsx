"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { act, releasesHref, useApi } from "@/lib/client";
import { KIND_LABEL, type DetailGroup, type LibraryDetail, type LibraryKind } from "@/lib/types";
import { ActionButton, Card, Divided, ErrorNote, Loading, Page, Poster, Progress, SectionTitle, Toggle } from "@/components/ui";
import { ChevronIcon, DownloadIcon, SearchIcon } from "@/components/icons";

export default function Detail() {
  const { kind, id } = useParams<{ kind: LibraryKind; id: string }>();
  const url = `/api/library/${kind}/${id}`;
  const { data, error, mutate } = useApi<LibraryDetail>(url);
  const [expanded, setExpanded] = useState(false);
  const [fullOverview, setFullOverview] = useState(false);

  const groups = data?.groups ?? [];
  const visible = expanded ? groups : groups.slice(0, 12);

  return (
    <Page title={data?.title ?? KIND_LABEL[kind]} back={`/library/${kind}`}>
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={3} />}
      {data && (
        <>
          <div className="relative -mx-4 -mt-2 overflow-hidden">
            {data.fanart && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.fanart} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-[1px]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] to-transparent" />
            <div className="relative flex items-end gap-4 px-4 pb-2 pt-6">
              <Poster src={data.poster} alt={data.title} className="h-40 w-[106px] shadow-lg" />
              <div className="min-w-0 space-y-2 pb-1">
                {data.year ? <p className="text-sm text-[var(--muted)]">{data.year}</p> : null}
                <div className="flex items-center gap-2">
                  <Toggle label="Monitored" on={data.monitored} onChange={async (v) => { await act(url, { action: "monitor", monitored: v }); mutate(); }} />
                  <span className="text-sm">{data.monitored ? "Monitored" : "Unmonitored"}</span>
                </div>
              </div>
            </div>
          </div>

          {kind === "movies" ? (
            <div className="grid grid-cols-2 gap-2">
              <ActionButton tone="primary" done="Search started" run={() => act(url, { action: "search" })}>
                <SearchIcon className="h-4 w-4" /> Auto search
              </ActionButton>
              <Link
                href={releasesHref(kind, id, `movie-${id}`, `${data.title}${data.year ? ` (${data.year})` : ""}`, `/library/${kind}/${id}`)}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--press)] px-3.5 text-sm font-semibold active:scale-[0.97]"
              >
                <DownloadIcon className="h-4 w-4" /> Pick release
              </Link>
            </div>
          ) : (
            <ActionButton tone="primary" className="w-full" done="Search started" run={() => act(url, { action: "search" })}>
              <SearchIcon className="h-4 w-4" />
              {kind === "shows" ? "Search all monitored episodes" : "Search all monitored albums"}
            </ActionButton>
          )}

          {data.overview && (
            <button onClick={() => setFullOverview(!fullOverview)} className="block w-full text-left">
              <p className={`text-sm leading-relaxed text-[var(--muted)] ${fullOverview ? "" : "line-clamp-4"}`}>{data.overview}</p>
              {!fullOverview && data.overview.length > 240 && <span className="text-sm font-semibold text-[var(--accent)]">More</span>}
            </button>
          )}

          <Card>
            <Divided>
              {data.facts.map(([k, v]) => (
                <div key={k} className="flex gap-4 px-4 py-2.5 text-sm">
                  <span className="w-28 shrink-0 text-[var(--muted)]">{k}</span>
                  <span className="min-w-0 flex-1 break-words">{v}</span>
                </div>
              ))}
            </Divided>
          </Card>

          {groups.length > 0 && (
            <>
              <SectionTitle>{data.groupLabel}</SectionTitle>
              <Card>
                <Divided>
                  {visible.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                      <Toggle
                        label={`Monitor ${g.title}`}
                        on={g.monitored}
                        onChange={async (v) => { await act(url, { action: "monitorGroup", groupId: g.id, monitored: v }); mutate(); }}
                      />
                      {kind === "shows" ? (
                        // a season opens its episode list, where searching and release picking live
                        <Link href={`/library/${kind}/${id}/season/${g.id}`} className="flex min-w-0 flex-1 items-center gap-2 active:opacity-70">
                          <GroupText g={g} unit="episodes" />
                          <ChevronIcon className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                        </Link>
                      ) : (
                        <>
                          <GroupText g={g} unit="tracks" />
                          <ActionButton className="w-10 px-0" done={`Searching ${g.title}`} run={() => act(url, { action: "searchGroup", groupId: g.id })}>
                            <SearchIcon className="h-4 w-4" aria-label={`Auto search ${g.title}`} />
                          </ActionButton>
                          <Link
                            href={releasesHref(kind, id, `album-${g.id}`, `${data.title} · ${g.title}`, `/library/${kind}/${id}`)}
                            aria-label={`Pick a release for ${g.title}`}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--press)] active:scale-[0.97]"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </Link>
                        </>
                      )}
                    </div>
                  ))}
                </Divided>
                {groups.length > visible.length && (
                  <button onClick={() => setExpanded(true)} className="w-full border-t border-[var(--line)] py-3 text-sm font-semibold text-[var(--accent)]">
                    Show all {groups.length}
                  </button>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}

function GroupText({ g, unit }: { g: DetailGroup; unit: string }) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="truncate font-medium">{g.title}</p>
      <p className="truncate text-xs text-[var(--muted)]">
        {g.have}/{g.total} {unit}
        {g.sub ? ` · ${g.sub}` : ""}
      </p>
      <Progress percent={g.total ? (g.have / g.total) * 100 : 0} tone={g.total && g.have >= g.total ? "good" : "warn"} />
    </div>
  );
}
