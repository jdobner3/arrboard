#!/usr/bin/env bash
# Ships the committed code to Homer, rebuilds the image and recreates the container.
# Run from the repo root on a machine with the `homer` SSH alias. Keys stay in /mnt/user/appdata/arrboard/arrboard.env.
set -euo pipefail
APP=/mnt/user/appdata/arrboard

ssh homer "mkdir -p $APP/src && find $APP/src -mindepth 1 -delete"
git archive --format=tar HEAD | ssh homer "tar -x -C $APP/src"
ssh homer "set -e
cd $APP/src
docker build -q -t arrboard:latest .
docker rm -f arrboard >/dev/null 2>&1 || true
docker run -d --name arrboard --restart unless-stopped -p 3080:3000 \
  --env-file $APP/arrboard.env \
  --label net.unraid.docker.webui='http://[IP]:[PORT:3080]/' \
  arrboard:latest >/dev/null
docker image prune -f >/dev/null
for i in \$(seq 1 30); do curl -sf -o /dev/null http://127.0.0.1:3080/manifest.webmanifest && break; sleep 1; done
echo \"arrboard running: \$(git -C . log -1 --format=%h 2>/dev/null || echo deployed)\"
curl -s -o /dev/null -w 'home %{http_code}\n' http://127.0.0.1:3080/"
