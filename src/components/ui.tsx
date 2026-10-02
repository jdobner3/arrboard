"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BackIcon, ChevronIcon } from "./icons";

/* ---------- Page shell ---------- */

export function Page({ title, back, action, children }: { title: string; back?: boolean | string; action?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-[var(--bg)]/90 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
        {back && (
          <button
            aria-label="Back"
            onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
            className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-[var(--accent)] active:bg-[var(--card)]"
          >
            <BackIcon />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">{title}</h1>
        {action}
      </header>
      <main className="space-y-4 px-4 pb-6">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-[var(--card)] ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{children}</h2>
      {right}
    </div>
  );
}

/** A tappable row with an optional chevron, used for navigation lists. */
export function LinkRow({ href, children, badge }: { href: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 px-4 py-3 active:bg-[var(--press)]">
      <div className="min-w-0 flex-1">{children}</div>
      {badge}
      <ChevronIcon className="h-5 w-5 shrink-0 text-[var(--muted)]" />
    </Link>
  );
}

export function Divided({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-[var(--line)]">{children}</div>;
}

/* ---------- Bits ---------- */

export function Poster({ src, alt, className = "h-[72px] w-12" }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`${className} shrink-0 rounded-md bg-[var(--press)]`} aria-hidden />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-md bg-[var(--press)] object-cover`} />;
}

export function Progress({ percent, tone = "accent" }: { percent: number; tone?: "accent" | "good" | "warn" }) {
  const color = tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--accent)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--press)]">
      <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: color }} />
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "good" | "warn" | "bad" | "accent" }) {
  const colors = {
    muted: "bg-[var(--press)] text-[var(--muted)]",
    good: "bg-[var(--good)]/15 text-[var(--good)]",
    warn: "bg-[var(--warn)]/15 text-[var(--warn)]",
    bad: "bg-[var(--bad)]/15 text-[var(--bad)]",
    accent: "bg-[var(--accent)]/15 text-[var(--accent)]",
  };
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[tone]}`}>{children}</span>;
}

type BtnTone = "primary" | "plain" | "danger";
const btnTone: Record<BtnTone, string> = {
  primary: "bg-[var(--accent)] text-white",
  plain: "bg-[var(--press)] text-[var(--fg)]",
  danger: "bg-[var(--bad)]/15 text-[var(--bad)]",
};

/** Runs an async action, shows a spinner while busy, and reports the result as a toast. */
export function ActionButton({
  run, children, tone = "plain", done, className = "", confirm, disabled,
}: {
  run: () => Promise<unknown>;
  children: ReactNode;
  tone?: BtnTone;
  done?: string;
  className?: string;
  /** label shown on the first tap; a second tap within 4s runs the action */
  confirm?: string;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    if (confirm && !armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    setBusy(true);
    try {
      await run();
      if (done) toast(done);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 ${armed ? btnTone.danger : btnTone[tone]} ${className}`}
    >
      {busy ? <Spinner /> : armed ? confirm : children}
    </button>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Working" />;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-[var(--card)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 flex-1 rounded-lg text-sm font-semibold transition ${o.value === value ? "bg-[var(--press)] text-[var(--fg)] shadow-sm" : "text-[var(--muted)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => Promise<unknown>; label: string }) {
  const toast = useToast();
  // shows the new position right away, then falls back to the server's value once the change lands (or fails)
  const [pending, setPending] = useState<boolean | null>(null);
  const value = pending ?? on;
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={pending !== null}
      onClick={async () => {
        setPending(!value);
        try {
          await onChange(!value);
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't change that", "error");
        } finally {
          setPending(null);
        }
      }}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? "bg-[var(--good)]" : "bg-[var(--press)]"} disabled:opacity-60`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function SearchBox({ value, onChange, placeholder, autoFocus, onSubmit }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onSubmit?: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
        onSubmit?.();
      }}
    >
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl bg-[var(--card)] px-4 text-base outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--accent)]"
      />
    </form>
  );
}

/* ---------- States ---------- */

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-[var(--card)]" />
      ))}
    </div>
  );
}

export function ErrorNote({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Card className="flex items-center gap-3 p-4 text-sm">
      <span className="flex-1 text-[var(--bad)]">{error instanceof Error ? error.message : String(error)}</span>
      {retry && <button onClick={retry} className="font-semibold text-[var(--accent)]">Retry</button>}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-6 text-center text-sm text-[var(--muted)]">{children}</p>;
}

/* ---------- Toasts ---------- */

type Toast = { id: number; text: string; kind: "ok" | "error" };
const ToastCtx = createContext<(text: string, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 2500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`max-w-md rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.kind === "error" ? "bg-[var(--bad)] text-white" : "bg-[var(--fg)] text-[var(--bg)]"}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
