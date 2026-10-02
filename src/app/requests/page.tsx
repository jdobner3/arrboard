"use client";

import { useState } from "react";
import { act, ago, useApi } from "@/lib/client";
import type { RequestItem } from "@/lib/types";
import { ActionButton, Card, Empty, ErrorNote, Loading, Page, Pill, Poster, Segmented } from "@/components/ui";
import { CheckIcon, XIcon } from "@/components/icons";

type Filter = "pending" | "processing" | "available" | "all";
type Res = { results: RequestItem[]; pages: number; total: number };

const MEDIA_STATUS: Record<number, [string, "muted" | "good" | "warn" | "bad" | "accent"]> = {
  2: ["Pending", "warn"],
  3: ["Processing", "accent"],
  4: ["Partly available", "accent"],
  5: ["Available", "good"],
  6: ["Blocklisted", "bad"],
  7: ["Deleted", "bad"],
};

export default function Requests() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [page, setPage] = useState(1);
  const { data, error, mutate } = useApi<Res>(`/api/requests?filter=${filter}&page=${page}`);

  const run = async (id: number, action: "approve" | "decline") => {
    await act("/api/requests", { id, action });
    await mutate();
  };

  return (
    <Page title="Requests" back="/more">
      <Segmented
        value={filter}
        onChange={(f) => { setFilter(f); setPage(1); }}
        options={[{ value: "pending", label: "Pending" }, { value: "processing", label: "Processing" }, { value: "available", label: "Done" }, { value: "all", label: "All" }]}
      />
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={5} />}
      {data && data.results.length === 0 && <Empty>{filter === "pending" ? "Nothing waiting for approval." : "No requests."}</Empty>}

      <div className="space-y-2">
        {data?.results.map((r) => {
          const status = r.status === 1 ? (["Needs approval", "warn"] as const) : r.status === 3 ? (["Declined", "bad"] as const) : MEDIA_STATUS[r.mediaStatus] ?? ["Approved", "muted"];
          return (
            <Card key={r.id} className="flex gap-3 p-3">
              <Poster src={r.poster} alt="" className="h-24 w-16" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-medium">
                  {r.title}
                  {r.year && <span className="font-normal text-[var(--muted)]"> {r.year}</span>}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {r.type === "tv" ? `TV${r.seasons?.length ? ` · ${r.seasons.length === 1 ? `Season ${r.seasons[0]}` : `${r.seasons.length} seasons`}` : ""}` : "Movie"} · {r.requestedBy} · {ago(r.createdAt)}
                </p>
                <Pill tone={status[1]}>{status[0]}</Pill>
                {r.status === 1 && (
                  <div className="flex gap-2 pt-1">
                    <ActionButton tone="primary" className="flex-1" done="Approved" run={() => run(r.id, "approve")}>
                      <CheckIcon className="h-4 w-4" /> Approve
                    </ActionButton>
                    <ActionButton className="flex-1" confirm="Tap to decline" done="Declined" run={() => run(r.id, "decline")}>
                      <XIcon className="h-4 w-4" /> Decline
                    </ActionButton>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-10 rounded-xl bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-40">Newer</button>
          <span className="text-sm text-[var(--muted)]">Page {page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="h-10 rounded-xl bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-40">Older</button>
        </div>
      )}
    </Page>
  );
}
