"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, DownloadIcon, HomeIcon, LibraryIcon, MoreIcon } from "./icons";

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/library", label: "Library", icon: LibraryIcon, match: (p: string) => p.startsWith("/library") },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, match: (p: string) => p.startsWith("/calendar") },
  { href: "/downloads", label: "Downloads", icon: DownloadIcon, match: (p: string) => p.startsWith("/downloads") },
  { href: "/more", label: "More", icon: MoreIcon, match: (p: string) => ["/more", "/requests", "/indexers", "/subtitles"].some((x) => p.startsWith(x)) },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--bg)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-xl">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
