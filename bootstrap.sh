#!/bin/sh
# First-time deploy + manual escape hatch. Run this once on the NAS to stand the
# stack up. Day-to-day updates are one-click from the app's System page; use this
# again only to recover, or to update the `updater` service itself (the in-app
# flow intentionally never recreates the updater).
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
	echo "Missing .env — copy .env.production.example to .env and fill it in first." >&2
	exit 1
fi

git pull --ff-only
docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d
docker image prune -f
