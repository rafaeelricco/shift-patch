.DEFAULT_GOAL := help

.PHONY: help install dev lint build start check clean

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

check: lint build ## Run ESLint and the production build

clean: ## Remove Next.js output and incremental TypeScript state
	@rm -rf .next tsconfig.tsbuildinfo
