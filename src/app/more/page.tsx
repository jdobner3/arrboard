import { Card, Divided, LinkRow, Page } from "@/components/ui";

const LINKS = [
  { href: "/requests", title: "Requests", sub: "Approve or decline Seerr requests" },
  { href: "/subtitles", title: "Subtitles", sub: "Missing subtitles in Bazarr" },
  { href: "/indexers", title: "Indexers", sub: "Prowlarr status and tests" },
];

export default function More() {
  return (
    <Page title="More">
      <Card>
        <Divided>
          {LINKS.map((l) => (
            <LinkRow key={l.href} href={l.href}>
              <p className="font-medium">{l.title}</p>
              <p className="text-sm text-[var(--muted)]">{l.sub}</p>
            </LinkRow>
          ))}
        </Divided>
      </Card>
    </Page>
  );
}
