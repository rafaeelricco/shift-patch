.DEFAULT_GOAL := help

.PHONY: help install dev lint typecheck test db-up e2e build start check clean

help: ## Show this help
	@awk -F ':.*## ' '/^[a-z-]+:.*## / {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies from pnpm-lock.yaml
	@pnpm install --frozen-lockfile

dev: ## Start the Next.js development server
	@pnpm run dev

lint: ## Run ESLint
	@pnpm run lint

build: ## Type-check and build for production
	@pnpm run build

start: ## Serve an existing production build
	@pnpm start

typecheck: ## Generate route types and run tsc
	@pnpm run typecheck

test: ## Run the test suite
	@pnpm run test

db-up: ## Start a disposable Postgres for E2E on port 5433
	@docker run --rm -d --name shiftpatch-e2e -p 5433:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=shiftpatch_e2e postgres:17

e2e: ## Run Playwright against the disposable database (make db-up first; ARGS=tests/e2e/nurse to scope)
	@E2E_DATABASE_URL=postgres://postgres@localhost:5433/shiftpatch_e2e E2E_JWT_SECRET=$${E2E_JWT_SECRET:-$$(openssl rand -hex 32)} pnpm test:e2e $(ARGS)

check: lint typecheck test build ## Run every local quality gate

clean: ## Remove Next.js output and incremental TypeScript state
	@rm -rf .next tsconfig.tsbuildinfo
