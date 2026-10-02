# Arrboard

A phone-first web app for running the media apps on Homer (Unraid): Sonarr, Radarr, Lidarr, Seerr, SABnzbd, Prowlarr and Bazarr. Built for the iPhone 15 Pro Max (430×932) and installable to the home screen.

## How it works

- Next.js (App Router) app. The server side holds every API key and talks to the apps over the LAN; the browser only ever calls Arrboard's own `/api/*` routes.
- Posters are relayed through `/api/image/...` from each app's `mediacover` API, so they load from Homer instead of the public artwork sites.
- There is no login in the app itself. **Only publish it behind Cloudflare Access** (or keep it LAN/Tailscale only).

## Screens

| Tab | What it does |
|---|---|
| Home | Download status with pause/resume, stuck imports (remove or blocklist + search), requests and subtitle counts, library counts, health checks |
| Library | Shows / Movies / Music: filter, missing/unmonitored views, detail with monitor toggles and searches, search & add |
| Calendar | Upcoming episodes, movie releases and albums (14/30/60 days) |
| Downloads | SABnzbd queue: pause all or for 30m/1h/3h, per-item pause/delete/priority, history with retry |
| More | Requests (approve/decline), Subtitles (Bazarr wanted, search one or all), Indexers (Prowlarr test, enable/disable) |

## Develop

```bash
cp example.env .env.local   # fill in the keys
npm install
npm run dev
```

## Deploy (Docker on Homer)

```bash
docker build -t arrboard .
docker run -d --name arrboard --restart unless-stopped -p 3080:3000 --env-file arrboard.env arrboard
```

`arrboard.env` holds the same variables as `example.env`.
