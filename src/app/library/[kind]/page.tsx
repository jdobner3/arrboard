"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/client";
import { KIND_LABEL, type LibraryItem, type LibraryKind } from "@/lib/types";
import { Empty, ErrorNote, Loading, Page, Poster, Progress, SearchBox, Segmented } from "@/components/ui";
import { PlusIcon } from "@/components/icons";

type Filter = "all" | "missing" | "unmonitored";
const PAGE = 60;

export default function LibraryList() {
  const { kind } = useParams<{ kind: LibraryKind }>();
  const router = useRouter();
  const { data, error, mutate, isLoading } = useApi<LibraryItem[]>(`/api/library/${kind}`);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("library-kind", kind);
    } catch {}
  }, [kind]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (i) =>
        (!term || i.title.toLowerCase().includes(term)) &&
        (filter === "all" || (filter === "missing" ? i.missing : !i.monitored)),
    );
  }, [data, q, filter]);

  // start back at the top of the list when the search or filter changes
  const view = `${kind}|${q}|${filter}`;
  const [lastView, setLastView] = useState(view);
  if (view !== lastView) {
    setLastView(view);
    setShown(PAGE);
  }

  // load more rows as the bottom comes into view
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length]);

  return (
    <Page
      title={KIND_LABEL[kind] ?? "Library"}
      action={
        <Link href={`/library/${kind}/add`} aria-label="Add" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--accent)] text-white active:opacity-80">
          <PlusIcon className="h-5 w-5" />
        </Link>
      }
    >
      <Segmented
        value={kind}
        onChange={(k) => router.replace(`/library/${k}`)}
        options={[{ value: "shows", label: "Shows" }, { value: "movies", label: "Movies" }, { value: "music", label: "Music" }]}
      />
      <SearchBox value={q} onChange={setQ} placeholder={`Filter ${data?.length.toLocaleString() ?? ""} ${KIND_LABEL[kind]?.toLowerCase() ?? ""}`} />
      <div className="flex gap-2">
        {(["all", "missing", "unmonitored"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 rounded-full px-3 text-sm font-medium capitalize ${filter === f ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--card)] text-[var(--muted)]"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {isLoading && !data && <Loading rows={8} />}
      {data && items.length === 0 && <Empty>Nothing matches.</Empty>}

      {items.length > 0 && (
        <div className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl bg-[var(--card)]">
          {items.slice(0, shown).map((i) => (
            <Link key={i.id} href={`/library/${kind}/${i.id}`} className="flex items-center gap-3 px-3 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_92px] active:bg-[var(--press)]">
              <Poster src={i.poster} alt="" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">
                  {i.title}
                  {i.year ? <span className="font-normal text-[var(--muted)]"> {i.year}</span> : null}
                </p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {!i.monitored && "Unmonitored · "}
                  {i.line}
                </p>
                {kind !== "movies" && <Progress percent={i.percent} tone={i.percent >= 100 ? "good" : i.monitored ? "warn" : "accent"} />}
              </div>
            </Link>
          ))}
        </div>
      )}
      <div ref={sentinel} />
    </Page>
  );
}
