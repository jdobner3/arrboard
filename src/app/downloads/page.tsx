"use client";

import { useState } from "react";
import { act, ago, useApi } from "@/lib/client";
import type { Downloads as D, QueueSlot } from "@/lib/types";
import { ActionButton, Card, Divided, Empty, ErrorNote, Loading, Page, Pill, Progress, SectionTitle } from "@/components/ui";
import { PauseIcon, PlayIcon, TrashIcon } from "@/components/icons";

export default function Downloads() {
  const { data, error, mutate } = useApi<D>("/api/downloads", { refreshInterval: 3000 });
  const run = async (body: unknown) => {
    await act("/api/downloads", body);
    await mutate();
  };

  return (
    <Page title="Downloads">
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={4} />}
      {data && (
        <>
          <Card className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">{data.paused ? "Paused" : data.queue.length ? data.speed : "Idle"}</p>
                <p className="text-sm text-[var(--muted)]">
                  {data.queue.length ? `${data.sizeleft} left · ${data.timeleft}` : "Queue empty"} · {data.diskFree}
                  {data.speedLimit && ` · limited to ${data.speedLimit}`}
                </p>
              </div>
              <ActionButton tone={data.paused ? "primary" : "plain"} done={data.paused ? "Resumed" : "Paused"} run={() => run({ action: data.paused ? "resumeAll" : "pauseAll" })}>
                {data.paused ? <><PlayIcon className="h-4 w-4" /> Resume</> : <><PauseIcon className="h-4 w-4" /> Pause</>}
              </ActionButton>
            </div>
            {!data.paused && (
              <div className="flex gap-2">
                {[30, 60, 180].map((m) => (
                  <ActionButton key={m} className="flex-1" done={`Paused for ${m < 60 ? `${m} min` : `${m / 60} h`}`} run={() => run({ action: "pauseFor", minutes: m })}>
                    Pause {m < 60 ? `${m}m` : `${m / 60}h`}
                  </ActionButton>
                ))}
              </div>
            )}
          </Card>

          <SectionTitle>Queue</SectionTitle>
          {data.queue.length === 0 ? (
            <Empty>Calm seas. Nothin’ downloadin’.</Empty>
          ) : (
            <Card>
              <Divided>
                {data.queue.map((s) => <QueueRow key={s.id} s={s} run={run} />)}
              </Divided>
            </Card>
          )}

          <SectionTitle>History</SectionTitle>
          {data.history.length === 0 ? (
            <Empty>The log book is empty.</Empty>
          ) : (
            <Card>
              <Divided>
                {data.history.map((h) => (
                  <div key={h.id} className="space-y-1.5 px-4 py-3">
                    <p className="break-all text-sm font-medium">{h.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <Pill tone={h.status === "Completed" ? "good" : h.status === "Failed" ? "bad" : "muted"}>{h.status}</Pill>
                      <span>{h.category}</span>
                      <span>{h.size}</span>
                      {h.completed > 0 && <span>{ago(h.completed)}</span>}
                    </div>
                    {h.fail && <p className="text-xs text-[var(--bad)]">{h.fail}</p>}
                    {h.status === "Failed" && (
                      <div className="flex gap-2 pt-1">
                        <ActionButton done="Retrying" run={() => run({ action: "retry", id: h.id })}>Retry</ActionButton>
                        <ActionButton confirm="Tap to delete" done="Deleted" run={() => run({ action: "deleteHistory", id: h.id })}>Delete</ActionButton>
                      </div>
                    )}
                  </div>
                ))}
              </Divided>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}

const PRIORITIES: [number, string][] = [[2, "Force"], [1, "High"], [0, "Normal"], [-1, "Low"]];

function QueueRow({ s, run }: { s: QueueSlot; run: (body: unknown) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const paused = s.status === "Paused";
  return (
    <div className="px-4 py-3">
      <button onClick={() => setOpen(!open)} className="w-full space-y-1.5 text-left">
        <p className="break-all text-sm font-medium">{s.name}</p>
        <Progress percent={s.percent} tone={paused ? "warn" : "accent"} />
        <div className="flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
          <span>{s.status}</span>
          <span>{s.percent}% of {s.size}</span>
          {!paused && <span>{s.timeleft}</span>}
          <span>{s.category}</span>
          {s.priority !== "Normal" && <span>{s.priority} priority</span>}
        </div>
      </button>
      {open && (
        <div className="space-y-2 pt-3">
          <div className="flex gap-2">
            <ActionButton className="flex-1" done={paused ? "Resumed" : "Paused"} run={() => run({ action: paused ? "resume" : "pause", id: s.id })}>
              {paused ? <><PlayIcon className="h-4 w-4" /> Resume</> : <><PauseIcon className="h-4 w-4" /> Pause</>}
            </ActionButton>
            <ActionButton className="flex-1" confirm="Tap to delete" done="Deleted" run={() => run({ action: "delete", id: s.id })}>
              <TrashIcon className="h-4 w-4" /> Delete
            </ActionButton>
          </div>
          <div className="flex gap-1.5">
            {PRIORITIES.map(([v, label]) => (
              <ActionButton
                key={v}
                className={`flex-1 px-1 text-xs ${s.priority === label ? "ring-2 ring-[var(--accent)]" : ""}`}
                done={`Priority: ${label}`}
                run={() => run({ action: "priority", id: s.id, value: v })}
              >
                {label}
              </ActionButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
