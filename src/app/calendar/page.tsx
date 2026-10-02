"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { relativeDay, timeOf, useApi } from "@/lib/client";
import type { CalendarEntry, LibraryKind } from "@/lib/types";
import { Empty, ErrorNote, Loading, Page, Pill, Poster, SectionTitle, Segmented } from "@/components/ui";

type Show = "all" | LibraryKind;

export default function Calendar() {
  const [days, setDays] = useState(14);
  const [show, setShow] = useState<Show>("all");
  const { data, error, mutate } = useApi<{ entries: CalendarEntry[]; errors: string[] }>(`/api/calendar?days=${days}`);

  const byDay = useMemo(() => {
    const groups = new Map<string, CalendarEntry[]>();
    for (const e of data?.entries ?? []) {
      if (show !== "all" && e.kind !== show) continue;
      const day = new Date(e.date).toDateString();
      groups.set(day, [...(groups.get(day) ?? []), e]);
    }
    return [...groups.entries()];
  }, [data, show]);

  return (
    <Page title="Calendar">
      <Segmented
        value={show}
        onChange={setShow}
        options={[{ value: "all", label: "All" }, { value: "shows", label: "Shows" }, { value: "movies", label: "Movies" }, { value: "music", label: "Music" }]}
      />
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={6} />}
      {data?.errors.map((e) => <ErrorNote key={e} error={e} />)}
      {data && byDay.length === 0 && <Empty>Nothing scheduled.</Empty>}

      {byDay.map(([day, entries]) => (
        <div key={day} className="space-y-2">
          <SectionTitle>{relativeDay(entries[0].date)}</SectionTitle>
          <div className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl bg-[var(--card)]">
            {entries.map((e) => (
              <Link key={e.key} href={`/library/${e.kind}/${e.libraryId}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-[var(--press)]">
                <Poster src={e.poster} alt="" className="h-[60px] w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="truncate text-sm text-[var(--muted)]">{e.sub}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {e.kind === "shows" && <span className="text-xs text-[var(--muted)]">{timeOf(e.date)}</span>}
                  {e.hasFile ? <Pill tone="good">Have</Pill> : new Date(e.date) < new Date() ? <Pill tone="warn">Missing</Pill> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {data && days < 60 && (
        <button onClick={() => setDays(days === 14 ? 30 : 60)} className="w-full rounded-2xl bg-[var(--card)] py-3 text-sm font-semibold text-[var(--accent)]">
          Show {days === 14 ? 30 : 60} days
        </button>
      )}
    </Page>
  );
}
