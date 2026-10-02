"use client";

import { useState } from "react";
import { act, useApi } from "@/lib/client";
import type { Indexer } from "@/lib/types";
import { ActionButton, Card, Divided, Empty, ErrorNote, Loading, Page, Pill, Toggle } from "@/components/ui";

type TestResult = { id: number; ok: boolean; message?: string };

export default function Indexers() {
  const { data, error, mutate } = useApi<Indexer[]>("/api/indexers");
  const [results, setResults] = useState<Record<number, TestResult>>({});

  const test = async (id?: number) => {
    const r = await act<TestResult[]>("/api/indexers", { action: "test", id });
    setResults((prev) => ({ ...prev, ...Object.fromEntries(r.map((x) => [x.id, x])) }));
    await mutate();
    const failed = r.filter((x) => !x.ok).length;
    if (failed) throw new Error(`${failed} of ${r.length} failed`);
  };

  return (
    <Page title="Indexers" back="/more">
      {error && !data && <ErrorNote error={error} retry={() => mutate()} />}
      {!data && !error && <Loading rows={3} />}
      {data && data.length === 0 && <Empty>No indexers in Prowlarr.</Empty>}
      {data && data.length > 0 && (
        <>
          <ActionButton tone="primary" className="w-full" done="All indexers passed" run={() => test()}>Test all</ActionButton>
          <Card>
            <Divided>
              {data.map((i) => {
                const r = results[i.id];
                return (
                  <div key={i.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Toggle label={`Enable ${i.name}`} on={i.enable} onChange={async (v) => { await act("/api/indexers", { action: "enable", id: i.id, enable: v }); mutate(); }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{i.name}</p>
                        <p className="text-xs text-[var(--muted)]">{i.protocol} · priority {i.priority}</p>
                      </div>
                      <ActionButton done={`${i.name} passed`} run={() => test(i.id)}>Test</ActionButton>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {i.failing ? (
                        <Pill tone="bad">Failing{i.failing.until ? ` · disabled until ${new Date(i.failing.until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</Pill>
                      ) : (
                        <Pill tone={i.enable ? "good" : "muted"}>{i.enable ? "Healthy" : "Disabled"}</Pill>
                      )}
                      {r && <Pill tone={r.ok ? "good" : "bad"}>{r.ok ? "Test passed" : "Test failed"}</Pill>}
                    </div>
                    {r?.message && <p className="text-xs text-[var(--bad)]">{r.message}</p>}
                  </div>
                );
              })}
            </Divided>
          </Card>
        </>
      )}
    </Page>
  );
}
