# Convenience targets for the packing-list-helper monorepo.
# Layout: apps/web (Next.js)  ·  apps/updater (deploy supervisor)  ·  deploy/ (infra).
# There is no JS monorepo tool — docker-compose + these targets orchestrate everything.
# Dev shares ONE env file (apps/web/.env): the app reads it directly, and the dev
# data-services compose is pointed at it via --env-file.

WEB := apps/web
COMPOSE_DEV := docker compose --env-file $(WEB)/.env -f deploy/compose.dev.yaml

.PHONY: help install dev db-up db-down migrate seed reset lint format test build deploy

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install web app dependencies (npm ci)
	npm --prefix $(WEB) ci

db-up: ## Start dev data services (Postgres, Redis, MinIO)
	$(COMPOSE_DEV) up -d

db-down: ## Stop dev data services (ARGS=-v to also wipe volumes)
	$(COMPOSE_DEV) down $(ARGS)

migrate: ## Apply Prisma migrations (dev)
	npm --prefix $(WEB) run db:migrate

seed: ## Seed the dev database
	npm --prefix $(WEB) run db:seed

reset: ## Reset the dev database (drop + re-migrate + seed)
	npm --prefix $(WEB) run db:reset

dev: db-up ## Start data services + the Next.js dev server
	npm --prefix $(WEB) run dev

lint: ## Lint the web app (oxlint)
	npm --prefix $(WEB) run lint

format: ## Format the web app (oxfmt)
	npm --prefix $(WEB) run format

test: ## Run the Playwright e2e suite
	npm --prefix $(WEB) run test:e2e

build: ## Production build of the web app
	npm --prefix $(WEB) run build

deploy: ## (NAS) build + (re)start the full prod stack incl. the updater
	deploy/bootstrap.sh
