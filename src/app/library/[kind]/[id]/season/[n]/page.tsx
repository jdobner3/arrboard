"use client";

import Link from "next/link";
import { use } from "react";
import { act, releasesHref, useApi } from "@/lib/client";
import type { SeasonDetail } from "@/lib/types";
import { ActionButton, Card, Divided, Empty, ErrorNote, Loading, Page, Pill, Toggle } from "@/components/ui";
import { DownloadIcon, SearchIcon } from "@/components/icons";

export default function Season({ params }: PageProps<"/library/[kind]/[id]/season/[n]">) {
  const { kind, id, n } = use(params);
  const here = `/library/${kind}/${id}/season/${n}`;
  const actionUrl = `/api/library/${kind}/${id}`;
  const { data, error, mutate } = useApi<SeasonDetail>(`/api/library/${kind}/${id}/season/${n}`);
  const name = n === "0" ? "Specials" : `Season ${n}`;

  const have = data?.episodes.filter((e) => e.hasFile).length ?? 0;

  return (
    <Page title={name} back={`/library/${kind}/${id}`}>
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={6} />}
      {data && (
        <>
          <div className="-mt-2 flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm text-[var(--muted)]">
              {data.seriesTitle} · {have}/{data.episodes.length} on disk
            </p>
            <Toggle
              label={`Monitor ${name}`}
              on={data.monitored}
              onChange={async (v) => { await act(actionUrl, { action: "monitorGroup", groupId: data.season, monitored: v }); await mutate(); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton done={`Searching ${name}`} run={() => act(actionUrl, { action: "searchGroup", groupId: data.season })}>
              <SearchIcon className="h-4 w-4" /> Auto search
            </ActionButton>
            <Link
              href={releasesHref(kind, id, `season-${id}-${n}`, `${data.seriesTitle} · ${name}`, here)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--press)] px-3.5 text-sm font-semibold active:scale-[0.97]"
            >
              <DownloadIcon className="h-4 w-4" /> Pick release
            </Link>
          </div>

          {data.episodes.length === 0 ? (
            <Empty>No episodes listed yet.</Empty>
          ) : (
            <Card>
              <Divided>
                {data.episodes.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-3">
                    <Toggle
                      label={`Monitor episode ${e.number}`}
                      on={e.monitored}
                      onChange={async (v) => { await act(actionUrl, { action: "monitorEpisode", episodeId: e.id, monitored: v }); await mutate(); }}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">
                        <span className="text-[var(--muted)]">{e.number}.</span> {e.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
                        {e.hasFile ? (
                          <Pill tone="good">{e.quality ?? "On disk"}</Pill>
                        ) : e.aired ? (
                          <Pill tone={e.monitored ? "warn" : "muted"}>Missing</Pill>
                        ) : (
                          <Pill>Not aired</Pill>
                        )}
                        {e.airDate && <span>{new Date(e.airDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                      </div>
                    </div>
                    <ActionButton className="w-10 px-0" done={`Searching episode ${e.number}`} run={() => act(actionUrl, { action: "searchEpisode", episodeId: e.id })}>
                      <SearchIcon className="h-4 w-4" aria-label={`Auto search episode ${e.number}`} />
                    </ActionButton>
                    <Link
                      href={releasesHref(kind, id, `episode-${e.id}`, `${data.seriesTitle} · S${String(data.season).padStart(2, "0")}E${String(e.number).padStart(2, "0")} · ${e.title}`, here)}
                      aria-label={`Pick a release for episode ${e.number}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--press)] active:scale-[0.97]"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </Divided>
            </Card>
          )}
          <p className="px-1 text-xs text-[var(--muted)]">
            <SearchIcon className="inline h-3 w-3" /> lets Sonarr pick the best release. <DownloadIcon className="inline h-3 w-3" /> shows every release so you choose.
          </p>
        </>
      )}
    </Page>
  );
}
