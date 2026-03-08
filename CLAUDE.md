# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SocialPredict is an open-source prediction market engine. It has a **Go backend** (Gorilla Mux, GORM, PostgreSQL) and a **React frontend** (Vite, Tailwind CSS), deployed via Docker Compose with three environment tiers: development, localhost, and production.

## Build & Run Commands

### Local Development (Docker)

```bash
./SocialPredict install    # Interactive setup - choose Dev/Localhost/Prod
./SocialPredict up         # Start all containers
./SocialPredict down       # Stop and remove containers
./SocialPredict exec       # Shell into a container
./SocialPredict backup     # Database backup
```

Default credentials after install: `admin` / `password`

### Backend (Go)

```bash
cd backend
go build ./...                                           # Build
go test ./...                                            # Run all tests
JWT_SIGNING_KEY="test-key" go test ./...                 # Tests requiring JWT
go test ./handlers/markets/...                           # Single package
go test -run TestFunctionName ./handlers/markets/...     # Single test
go test -v ./...                                         # Verbose
```

The backend requires `JWT_SIGNING_KEY` env var for auth-related tests. CI sets this automatically.

### Frontend (React/Vite)

```bash
cd frontend
npm install          # Install dependencies
npm run start        # Dev server (Vite, port 5173)
npm run build        # Production build
npm run serve        # Preview production build
```

Requires Node >= 21.0.0.

## Architecture

### Backend (`backend/`)

Go REST API serving on port 8080. All routes prefixed with `/v0/`.

- **`main.go`** — Entry point: loads env (`.env.dev`), connects to DB with retries, runs migrations, seeds admin user + homepage content, starts server
- **`server/`** — Gorilla Mux router setup, route definitions, CORS config
- **`handlers/`** — HTTP handlers organized by domain: `users/`, `markets/`, `bets/`, `homepage/`. Business logic and math calculations live in `handlers/math/`
- **`models/`** — GORM models: `User`, `Market`, `Bet`, `HomepageContent`. Test helpers in `models/modelstesting/`
- **`middleware/`** — JWT auth validation (`ValidateTokenAndGetUser`), login handler, admin authorization
- **`security/`** — Centralized `SecurityService` combining: input sanitization (bluemonday), validation (go-playground/validator), rate limiting, security headers
- **`migration/`** — Custom registry-based migration system tracking state in `schema_migrations` table. Individual migrations in `migration/migrations/`
- **`seed/`** — Seeds admin user (from `ADMIN_PASSWORD` env) and homepage content
- **`setup/`** — Loads `setup.yaml` (embedded) containing economics config: initial balances, bet fees, market creation costs, probability settings
- **`util/`** — DB connection (`postgres.go`), env loading (`getenv.go`)
- **`errors/`** — Standardized HTTP error responses

**Handler pattern**: Check method → init SecurityService → authenticate via middleware → decode request → validate → sanitize → DB operation → JSON response.

### Frontend (`frontend/src/`)

React 18 SPA with React Router v5, styled with Tailwind CSS.

- **`helpers/AppRoutes.jsx`** — Route definitions with role-based access (public, authenticated, admin). Forces password change redirect when `mustChangePassword` flag is set
- **`helpers/AuthContent.jsx`** — React Context for auth state (token, username, usertype). Persists to localStorage
- **`pages/`** — Page components: `home/`, `markets/`, `marketDetails/`, `create/`, `profile/`, `admin/`, `user/`, `stats/`
- **`components/`** — 70+ reusable components organized by type: `buttons/`, `charts/`, `tables/`, `tabs/`, `modals/`, `layouts/`, `inputs/`, `sidebar/`
- **`hooks/`** — Custom data-fetching hooks: `useMarketDetails`, `useUserData`, `usePortfolio`, `useMarketLabels`
- **`api/`** — API functions using native `fetch` (not axios): `marketsApi.js`
- **`utils/`** — Label mapping (custom YES/NO labels), status mapping, chart formatting
- **`config.js`** — API URL from `window.__ENV__` with localhost fallback

**State management**: React Context for auth only; custom hooks with `useState`/`useEffect` for data fetching. No Redux or similar.

### Docker & Deployment (`docker/`, `scripts/`, `data/`)

Three deployment environments controlled by `APP_ENV` in `.env`:

| Environment | Compose File | Images | Features |
|---|---|---|---|
| `development` | `docker-compose-dev.yaml` | Built locally | Hot reload (Air for Go, Vite for React), volume mounts |
| `localhost` | `docker-compose-local.yaml` | Pulled from GHCR | Nginx reverse proxy, pre-built images |
| `production` | `docker-compose-prod.yaml` | Pulled from GHCR | Traefik with Let's Encrypt SSL, separate internal/external networks |

- **`docker/backend/`** — Multi-stage Dockerfile (Go build → Alpine runtime). Dev Dockerfile uses `air` hot reload
- **`docker/frontend/`** — Multi-stage Dockerfile (Node build → Nginx runtime). Runtime env var injection via `entrypoint.sh`
- **`data/nginx/`** — Nginx reverse proxy configs routing `/api/*` → backend, `/` → frontend
- **`data/traefik/`** — Traefik config template with HTTP→HTTPS redirect and ACME
- **`scripts/lib/arch.sh`** — ARM64/Apple Silicon detection and platform emulation handling

### CI/CD (`.github/workflows/`)

- **`backend.yml`** — Runs Go tests on PRs; smoke test builds and starts server
- **`docker.yml`** — Builds and pushes Docker images to GHCR on GitHub release
- **`deploy-to-staging.yml`** — Triggers Ansible deploy on PR merge to main
- **`deploy-to-production.yml`** — Triggers Ansible deploy after successful Docker build

## Key Conventions

- **Branch per change**: Every bug fix or feature must be implemented in a new branch — never commit directly to main. **Create and checkout the new branch FIRST**, before any brainstorming, planning, or implementation work begins
- **Branch naming**: `feature/`, `fix/`, `refactor/`, or `doc/` prefix followed by description
- **Never delete branches**: Do not delete branches with `git branch -d` or `git branch -D`. Branches should be preserved for history
- **Rebase over merge**: ALWAYS use `git rebase` instead of `git merge` to integrate changes and keep a linear history. When suggesting commands to the user, always suggest rebase — never merge
- **Stateless design**: Prefer ledger-based transactions; derive state from transaction history
- **Integer amounts**: Use integers for financial values, not floats (accounting convention)
- **Public/private separation**: Separate response types for public vs authenticated data
- **Server-side time**: Never trust client timestamps; validate on server
- **32-bit compatibility**: Check for platform compatibility (Convention CONV-32BIT-001)
- **Model extraction functions**: Should live in the `models` package (Convention 20250619)
- **Economics config**: `backend/setup/setup.yaml` — global, set before deployment; controls initial balances, bet costs, market creation costs
