"use client";

import Link from "next/link";
import { useState } from "react";
import { act, useApi } from "@/lib/client";
import type { Overview } from "@/lib/types";
import { ActionButton, Card, Divided, ErrorNote, LinkRow, Loading, Page, Pill, Progress, SectionTitle } from "@/components/ui";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { Wordmark } from "@/components/Brand";

export default function Home() {
  const { data, error, mutate } = useApi<Overview>("/api/overview", { refreshInterval: 10000 });

  return (
    <Page title={<Wordmark />}>
      {!data && error && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={4} />}
      {data && (
        <>
          {data.errors.length > 0 && (
            <Card className="space-y-1 p-4 text-sm text-[var(--bad)]">
              {data.errors.map((e) => <p key={e}>{e}</p>)}
            </Card>
          )}

          <Downloads d={data.downloads} refresh={() => mutate()} />

          {data.issues.length > 0 && <Issues issues={data.issues} refresh={() => mutate()} />}

          <Card>
            <Divided>
              <LinkRow href="/requests" badge={data.requests?.pending ? <Pill tone="warn">{data.requests.pending} pending</Pill> : undefined}>
                <p className="font-medium">Requests</p>
                <p className="text-sm text-[var(--muted)]">
                  {data.requests ? `${data.requests.pending} waiting for approval · ${data.requests.processing} processing` : "Seerr unavailable"}
                </p>
              </LinkRow>
              <LinkRow href="/subtitles">
                <p className="font-medium">Missing subtitles</p>
                <p className="text-sm text-[var(--muted)]">
                  {data.subtitles ? `${data.subtitles.episodes.toLocaleString()} episodes · ${data.subtitles.movies.toLocaleString()} movies` : "Bazarr unavailable"}
                </p>
              </LinkRow>
            </Divided>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            {([["shows", "Shows"], ["movies", "Movies"], ["music", "Artists"]] as const).map(([k, label]) => (
              <Link key={k} href={`/library/${k}`} className="rounded-2xl bg-[var(--card)] p-3 active:bg-[var(--press)]">
                <p className="text-2xl font-bold">{data.counts[k]?.toLocaleString() ?? "—"}</p>
                <p className="text-sm text-[var(--muted)]">{label}</p>
              </Link>
            ))}
          </div>

          <Health items={data.health} />
        </>
      )}
    </Page>
  );
}

function Downloads({ d, refresh }: { d: Overview["downloads"]; refresh: () => void }) {
  if (!d) return <ErrorNote error="SABnzbd unavailable" />;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Link href="/downloads" className="min-w-0 flex-1">
          <p className="text-sm text-[var(--muted)]">Downloads</p>
          <p className="text-xl font-bold">
            {d.paused ? "Paused" : d.count ? d.speed : "Idle"}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {d.count ? `${d.count} in queue · ${d.timeleft} left` : "Queue empty"} · {d.diskFree}
          </p>
        </Link>
        <ActionButton
          tone={d.paused ? "primary" : "plain"}
          run={async () => {
            await act("/api/downloads", { action: d.paused ? "resumeAll" : "pauseAll" });
            refresh();
          }}
          done={d.paused ? "Resumed" : "Paused"}
        >
          {d.paused ? <><PlayIcon className="h-4 w-4" /> Resume</> : <><PauseIcon className="h-4 w-4" /> Pause</>}
        </ActionButton>
      </div>
      {d.top && (
        <div className="mt-3 space-y-1.5">
          <p className="truncate text-sm">{d.top.name}</p>
          <Progress percent={d.top.percent} />
        </div>
      )}
    </Card>
  );
}

function Issues({ issues, refresh }: { issues: Overview["issues"]; refresh: () => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? issues : issues.slice(0, 3);
  const byService = (["lidarr", "sonarr", "radarr"] as const)
    .map((s) => ({ service: s, ids: issues.filter((i) => i.service === s).map((i) => i.id) }))
    .filter((g) => g.ids.length > 1);
  const clear = async (service: string, ids: number[], blocklist: boolean) => {
    await act("/api/queue", { service, ids, blocklist });
    refresh();
  };
  return (
    <>
      <SectionTitle right={<Pill tone="warn">{issues.length}</Pill>}>Needs attention</SectionTitle>
      {byService.length > 0 && (
        <Card className="space-y-2 p-4">
          <p className="text-sm text-[var(--muted)]">
            Clear in bulk. This removes the downloads from SABnzbd too. Blocklisting also makes the app look for a different release.
          </p>
          {byService.map((g) => (
            <div key={g.service} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-sm font-medium capitalize">{g.service} · {g.ids.length}</span>
              <ActionButton confirm={`Remove ${g.ids.length}?`} done={`Removed ${g.ids.length}`} run={() => clear(g.service, g.ids, false)}>
                Remove all
              </ActionButton>
              <ActionButton confirm={`Blocklist ${g.ids.length}?`} done={`Blocklisted ${g.ids.length}, searching`} run={() => clear(g.service, g.ids, true)}>
                Blocklist all
              </ActionButton>
            </div>
          ))}
        </Card>
      )}
      <Card>
        <Divided>
          {shown.map((i) => (
            <div key={`${i.service}${i.id}`} className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <Pill tone="warn">{i.service}</Pill>
                <span className="text-xs text-[var(--muted)]">{i.state}</span>
              </div>
              <p className="break-all text-sm font-medium">{i.title}</p>
              {i.messages.slice(0, 3).map((m, n) => <p key={n} className="text-sm text-[var(--muted)]">{m}</p>)}
              {i.messages.length > 3 && <p className="text-xs text-[var(--muted)]">+{i.messages.length - 3} more</p>}
              <div className="flex gap-2 pt-1">
                <ActionButton
                  confirm="Tap to remove"
                  run={async () => {
                    await act("/api/queue", { service: i.service, ids: [i.id], blocklist: false });
                    refresh();
                  }}
                  done="Removed from queue"
                >
                  Remove
                </ActionButton>
                <ActionButton
                  confirm="Tap to blocklist"
                  run={async () => {
                    await act("/api/queue", { service: i.service, ids: [i.id], blocklist: true });
                    refresh();
                  }}
                  done="Blocklisted, searching again"
                >
                  Blocklist + search
                </ActionButton>
              </div>
            </div>
          ))}
        </Divided>
        {issues.length > shown.length && (
          <button onClick={() => setAll(true)} className="w-full border-t border-[var(--line)] py-3 text-sm font-semibold text-[var(--accent)]">
            Show all {issues.length}
          </button>
        )}
      </Card>
    </>
  );
}

function Health({ items }: { items: Overview["health"] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const errors = items.filter((h) => h.type === "error").length;
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex-1 font-medium">Health checks</span>
        <Pill tone={errors ? "bad" : "warn"}>{items.length} {items.length === 1 ? "notice" : "notices"}</Pill>
        <span className="text-sm text-[var(--accent)]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <Divided>
          {items.map((h, i) => (
            <div key={i} className="space-y-1 px-4 py-3">
              <div className="flex gap-2">
                <Pill tone={h.type === "error" ? "bad" : "warn"}>{h.service}</Pill>
              </div>
              <p className="text-sm text-[var(--muted)]">{h.message}</p>
            </div>
          ))}
        </Divided>
      )}
    </Card>
  );
}
