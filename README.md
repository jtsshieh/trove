# closet

A self-hosted closet / outfit / trip-packing app, deployed to a Synology NAS.

## Repository layout

This is a directory monorepo — one git repo, multiple self-contained deployables,
orchestrated by docker-compose. There is no JS monorepo tool; each app builds from
its own directory with its own Dockerfile.

```
apps/
  web/        Next.js app (the product). Own package.json, Prisma, Dockerfile.
  updater/    Zero-dependency Docker-socket supervisor that drives one-click
              in-app updates (git pull → compose build → migrate → restart).
  ml/         (future) Python image-processing service.
deploy/       All infra, separated from app code:
  compose.dev.yaml      dev data services (Postgres, Redis, MinIO)
  compose.prod.yaml     full prod stack (app, migrate, updater, edge, data)
  Caddyfile  edge/      LAN edge: TLS for closet.local + mDNS
  bootstrap.sh          first-time / manual deploy on the NAS
  .env.production.example
  certs/                NAS-only TLS cert/key (git-ignored)
Makefile      convenience targets (see `make help`)
```

## Local development

The app runs locally (`apps/web`); its data services run in Docker. Dev uses a
single env file at `apps/web/.env` — the app reads it directly, and the dev compose
file is pointed at the same file.

```bash
cp apps/web/.env.example apps/web/.env   # then fill in secrets:
#   POSTGRES_PASSWORD -> openssl rand -hex 24   (also set it inside DATABASE_URL)
#   JWT_SECRET        -> openssl rand -base64 48

make install        # npm ci in apps/web
make db-up          # start Postgres + Redis + MinIO
make migrate        # apply Prisma migrations
make dev            # data services + Next.js dev server
```

Open <http://localhost:3000/sign-in>. Stop data services with `make db-down`
(`make db-down ARGS=-v` also wipes the volumes). Run `make help` for all targets.

Equivalent raw commands (no make):

```bash
docker compose --env-file apps/web/.env -f deploy/compose.dev.yaml up -d
npm --prefix apps/web run db:migrate
npm --prefix apps/web run dev
```

## Production (Synology NAS)

The prod stack lives in `deploy/compose.prod.yaml`. `edge` (Caddy + Avahi) is the
only LAN-facing container; everything else is on an internal network. The `updater`
holds the Docker socket and a bind-mount of the repo so it can self-update.

First-time / manual deploy on the NAS:

```bash
cd "$REPO_DIR"
git pull --ff-only
cp deploy/.env.production.example deploy/.env   # fill in, place TLS pair in deploy/certs/
deploy/bootstrap.sh        # build + start the whole stack (or: make deploy)
```

Thereafter, update from **Admin → System → Check for updates** in the app.

> **Note:** changes that move `deploy/` or the updater itself cannot ship via the
> in-app updater (it never recreates its own container). Apply those once with
> `deploy/bootstrap.sh` on the NAS; in-app updates resume afterward. The compose
> project name (`closet`) is fixed so named volumes — and your data —
> survive across deploys.
