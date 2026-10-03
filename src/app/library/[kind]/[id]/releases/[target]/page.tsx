"use client";

import { use, useEffect, useState } from "react";
import { act, useApi } from "@/lib/client";
import type { Release, ReleaseJob } from "@/lib/types";
import { ActionButton, Card, Divided, Empty, ErrorNote, Page, Pill, Spinner } from "@/components/ui";
import { DownloadIcon } from "@/components/icons";

const gb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.round(b / 1024 ** 2)} MB`);

export default function Releases({ params, searchParams }: PageProps<"/library/[kind]/[id]/releases/[target]">) {
  const { kind, id, target } = use(params);
  const query = use(searchParams);
  const label = typeof query.label === "string" ? query.label : undefined;
  const from = typeof query.from === "string" && query.from.startsWith("/library/") ? query.from : `/library/${kind}/${id}`;
  const [jobId, setJobId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // start (or rejoin) the search, then poll until it finishes
  useEffect(() => {
    let cancelled = false;
    act<ReleaseJob>(`/api/releases/${kind}`, { target })
      .then((j) => !cancelled && setJobId(j.id))
      .catch((e) => !cancelled && setStartError(e.message));
    return () => {
      cancelled = true;
    };
  }, [kind, target]);

  const { data: job, error } = useApi<ReleaseJob>(jobId ? `/api/releases/${kind}?job=${jobId}` : null, {
    refreshInterval: (j) => (j?.status === "running" ? 2000 : 0),
    revalidateOnFocus: false,
  });

  const running = !job || job.status === "running";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const elapsed = job ? Math.max(0, Math.round((now - new Date(job.startedAt).getTime()) / 1000)) : 0;

  const approved = job?.results.filter((r) => r.approved) ?? [];
  const rejected = job?.results.filter((r) => !r.approved) ?? [];

  return (
    <Page title="Pick a release" back={from}>
      {label && <p className="text-sm text-[var(--muted)]">{label}</p>}
      {startError && <ErrorNote error={startError} />}
      {error && <ErrorNote error={error} />}
      {job?.status === "error" && <ErrorNote error={job.error} />}

      {!startError && running && (
        <Card className="flex items-center gap-3 p-4">
          <Spinner />
          <div className="text-sm">
            <p className="font-medium">Searching indexers… {elapsed > 0 && `${elapsed}s`}</p>
            <p className="text-[var(--muted)]">This can take a minute or two. You can leave and come back; the search keeps going.</p>
          </div>
        </Card>
      )}

      {job?.status === "done" && (
        <>
          <p className="px-1 text-sm text-[var(--muted)]">
            {job.results.length} found · {approved.length} acceptable
          </p>
          {approved.length === 0 ? (
            <Empty>No release meets your quality profile. Rejected ones are below.</Empty>
          ) : (
            <Card>
              <Divided>
                {approved.map((r) => <ReleaseRow key={`${r.indexerId}${r.guid}`} r={r} kind={kind} />)}
              </Divided>
            </Card>
          )}
          {rejected.length > 0 && (
            <Card>
              <button onClick={() => setShowRejected(!showRejected)} className="flex min-h-12 w-full items-center px-4 text-left">
                <span className="flex-1 font-medium">Rejected ({rejected.length})</span>
                <span className="text-sm text-[var(--accent)]">{showRejected ? "Hide" : "Show"}</span>
              </button>
              {showRejected && (
                <div className="border-t border-[var(--line)]">
                  <Divided>
                    {rejected.map((r) => <ReleaseRow key={`${r.indexerId}${r.guid}`} r={r} kind={kind} />)}
                  </Divided>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </Page>
  );
}

function ReleaseRow({ r, kind }: { r: Release; kind: string }) {
  const [grabbed, setGrabbed] = useState(false);
  return (
    <div className="space-y-2 px-4 py-3">
      <p className="break-all text-sm font-medium leading-snug">{r.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={r.approved ? "accent" : "muted"}>{r.quality}</Pill>
        <Pill>{gb(r.size)}</Pill>
        <Pill>{r.age}</Pill>
        <Pill>{r.indexer}</Pill>
        {r.fullSeason && <Pill tone="accent">Season pack</Pill>}
        {r.score !== 0 && <Pill tone={r.score > 0 ? "good" : "bad"}>Score {r.score > 0 ? "+" : ""}{r.score}</Pill>}
        {r.seeders !== undefined && <Pill>{r.seeders} seeders</Pill>}
        {r.languages.map((l) => <Pill key={l} tone="warn">{l}</Pill>)}
      </div>
      {r.rejections.length > 0 && (
        <ul className="space-y-0.5 text-xs text-[var(--warn)]">
          {r.rejections.map((x, i) => <li key={i}>• {x}</li>)}
        </ul>
      )}
      <ActionButton
        tone={r.approved ? "primary" : "plain"}
        className="w-full"
        disabled={grabbed}
        confirm={r.approved ? undefined : "Tap again to grab anyway"}
        done="Sent to SABnzbd"
        run={async () => {
          await act(`/api/releases/${kind}/grab`, { guid: r.guid, indexerId: r.indexerId });
          setGrabbed(true);
        }}
      >
        <DownloadIcon className="h-4 w-4" /> {grabbed ? "Grabbed" : r.approved ? "Grab" : "Grab anyway"}
      </ActionButton>
    </div>
  );
}
