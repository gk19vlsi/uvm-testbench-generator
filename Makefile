.PHONY: help install dev build test lint format clean docker-up docker-down

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	npm install

dev: ## Start development servers (frontend + backend)
	npm run dev

dev-backend: ## Start backend development server
	npm run dev:backend

dev-frontend: ## Start frontend development server
	npm run dev:frontend

build: ## Build all workspaces
	npm run build

test: ## Run all tests
	npm run test

test-backend: ## Run backend tests
	npm run test:backend

test-frontend: ## Run frontend tests
	npm run test:frontend

test-coverage: ## Run tests with coverage
	npm run test -- --coverage

lint: ## Lint all workspaces
	npm run lint

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

type-check: ## Type check all workspaces
	npm run type-check

clean: ## Clean build artifacts and node_modules
	rm -rf node_modules
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist frontend/build
	rm -rf packages/*/node_modules packages/*/dist

docker-up: ## Start Docker Compose services
	docker-compose up -d

docker-down: ## Stop Docker Compose services
	docker-compose down

docker-logs: ## View Docker Compose logs
	docker-compose logs -f

docker-rebuild: ## Rebuild and restart Docker services
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
