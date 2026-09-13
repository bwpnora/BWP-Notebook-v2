# BWP-Notebook-v2 Sub-project 1: Foundation, Mapping, CI/CD & Baseline Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the BWP-Notebook-v2 repository from Plane CE `v1.4.2`, map its architecture with attribution to BWP Team, configure a GitHub Actions CI/CD pipeline, and deploy a collision-free baseline stack on remote server `192.168.3.168` on port 18080.

**Architecture:** Fork Plane CE `v1.4.2` with upstream tracking and git remotes configured for `https://github.com/bwpnora/BWP-Notebook-v2.git`. Introduce custom Docker Compose files that isolate database/cache/storage networks and route web traffic to port 18080 to dodge running containers on the remote Debian server. Create a GHCR-based GitHub Actions workflow modeled after `nora-device-mng-main`.

**Tech Stack:** Docker, Docker Compose, GitHub Actions (GHCR), Next.js, Django REST Framework, PostgreSQL 16, Redis, Python / Paramiko for remote validation.

**Spec:** [2026-09-13-plane-customization-design.md](file:///c:/Code/nora-notebook/docs/superpowers/specs/2026-09-13-plane-customization-design.md)

## Global Constraints

- Preserve all original Makeplane Inc. copyright notices, LICENSE, and COPYING files in compliance with AGPL-3.0.
- All new documentation, config files, customized scripts, and commit messages must include attribution: `Code & Architecture by BWP Engineering Team`.
- Server `192.168.3.168` has running services on ports 80, 3000, 5432-5434, and 3900-3903 that must NEVER be interrupted or collided with.
- The web application must be bound to port `18080`.
- Internal services (`plane-db`, `plane-redis`, `plane-minio`, `api`, `worker`) must NOT expose ports to host `0.0.0.0`.

---

### Task 1: Repository Initialization & Git Remotes Setup

**Files:**

- Create/Initialize: `.git` repository in `c:\Code\nora-notebook`
- Modify: `.gitignore` (ensure brief and local tools are preserved or tracked properly)

**Interfaces:**

- Consumes: Upstream repository `https://github.com/makeplane/plane.git` tag `v1.4.2`
- Produces: Git repository with remotes `origin` (`https://github.com/bwpnora/BWP-Notebook-v2.git`) and `upstream`, on branch `nora/main`.

- [ ] **Step 1: Clone Plane v1.4.2 repository into workspace**
      Clone Plane `v1.4.2` into temporary folder or directly fetch into `c:\Code\nora-notebook`:

```bash
git clone --branch v1.4.2 --depth 1 https://github.com/makeplane/plane.git .plane-temp
```

- [ ] **Step 2: Transfer Plane source files to current workspace**
      Move files from `.plane-temp` to `c:\Code\nora-notebook` without overwriting `brief/` and `docs/`:

```powershell
Get-ChildItem -Force -Path .plane-temp | Where-Object { $_.Name -notin @('.git', 'brief', 'docs') } | Move-Item -Destination . -Force
Remove-Item -Recurse -Force .plane-temp
```

- [ ] **Step 3: Initialize Git and configure remotes**
      Initialize git, check out branch `nora/main`, and set up remotes:

```bash
git init
git checkout -b nora/main
git remote add origin https://github.com/bwpnora/BWP-Notebook-v2.git
git remote add upstream https://github.com/makeplane/plane.git
```

- [ ] **Step 4: Verify git status and file integrity**
      Ensure Plane files (`apps/`, `packages/`, `docker-compose.yml`, `variables.env`) and local documentation (`brief/`, `docs/`) exist:

```bash
git status
```

- [ ] **Step 5: Create baseline commit**
      Stage files, verify AGPL license preservation, and commit:

```bash
git add .
git commit -m "chore(baseline): initialize BWP-Notebook-v2 from Plane CE v1.4.2"
```

---

### Task 2: Codebase Architecture Survey & Generate MAPPING.md

**Files:**

- Create: `MAPPING.md`
- Inspect: `apps/api/`, `apps/web/`, `packages/types/`, `packages/ui/`

**Interfaces:**

- Consumes: Plane monorepo structure
- Produces: `MAPPING.md` providing an authoritative lookup table connecting business requirements to specific source files and line ranges.

- [ ] **Step 1: Inspect Django models and endpoints in `apps/api`**
      Search and verify locations for Work Item / Issue models, State models, and Project models:

```powershell
Get-ChildItem -Recurse -Path apps/api -Filter "*issue*.py"
Get-ChildItem -Recurse -Path apps/api -Filter "*project*.py"
```

- [ ] **Step 2: Inspect Next.js frontend table view in `apps/web`**
      Locate the Spreadsheet / Table view components and store definitions:

```powershell
Get-ChildItem -Recurse -Path apps/web -Filter "*table*.tsx"
```

- [ ] **Step 3: Write MAPPING.md**
      Document the exact mapping from Plane technical entities to BWP-Notebook-v2 business terms, listing models, serializers, views, and components to be modified in subsequent phases:
      Create `MAPPING.md` with:
- Attribution: `Code & Architecture by BWP Engineering Team`
- Entity table (Workspace -> Công ty, Project -> Notebook, Work Item -> Công việc, etc.)
- Exact file paths in `apps/api` and `apps/web`
- Plan for hiding Cycles, Modules, and Pages in Phase 1

- [ ] **Step 4: Commit MAPPING.md**

```bash
git add MAPPING.md
git commit -m "docs: add architecture and domain mapping document"
```

---

### Task 3: CI/CD Pipeline Configuration (GHCR)

**Files:**

- Create: `.github/workflows/ci-cd.yml`

**Interfaces:**

- Consumes: Reference workflow from `nora-device-mng-main`
- Produces: Automated GitHub Actions pipeline building and publishing Docker images to `ghcr.io/bwpnora/bwp-notebook-v2` on push to `nora/main`

- [ ] **Step 1: Write `.github/workflows/ci-cd.yml`**
      Model the CI/CD pipeline after `C:\Code\nora-device-mng-main\nora-device-mng-main\.github\workflows\ci-cd.yml`:
- Trigger on push to `nora/main` and PRs to `nora/main`.
- Setup Docker Buildx.
- Authenticate against `ghcr.io`.
- Build and push Docker images with tags `latest` and `sha-${{ github.sha }}`.
- Attribution header: `Code & Architecture by BWP Engineering Team`.

- [ ] **Step 2: Validate YAML syntax**
      Verify `.github/workflows/ci-cd.yml` is syntactically correct:

```powershell
python -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml', 'r', encoding='utf-8')); print('YAML valid')"
```

- [ ] **Step 3: Commit CI/CD workflow**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: add GitHub Actions workflow for GHCR image publishing"
```

---

### Task 4: Collision-Free Docker Compose & Remote Environment Configuration

**Files:**

- Create: `docker-compose.prod.yml`
- Create: `variables.prod.env.example`
- Modify: `docker-compose.yml` (development fallback)

**Interfaces:**

- Consumes: Plane CE container configuration, Server inspection findings (free port 18080)
- Produces: Production Docker Compose file tailored for server `192.168.3.168`

- [ ] **Step 1: Write `variables.prod.env.example`**
      Configure environment variables:
- `WEB_PORT=18080`
- Database credentials and internal database host (`plane-db`)
- `SECRET_KEY` and session security
- MinIO internal endpoint

- [ ] **Step 2: Write `docker-compose.prod.yml`**
      Define services:
- `proxy`: Nginx listening on `${WEB_PORT:-18080}:80`, depends on `web` and `api`
- `web`: Next.js web app
- `api`: Django backend REST API
- `worker`: Celery background worker
- `beat-worker`: Celery periodic beat worker
- `plane-db`: Postgres 16 with internal volume `bwp_notebook_plane_pgdata`
- `plane-redis`: Redis with internal volume `bwp_notebook_plane_redis`
- `plane-minio`: MinIO with internal volume `bwp_notebook_plane_minio`
- Network: `bwp_notebook_net` (isolated bridge network)
- Memory limits: max 400MB for `api`, 300MB for `web`, 250MB for `plane-db`, 150MB for `worker`, 100MB for `plane-redis`.

- [ ] **Step 3: Verify no port conflict in Compose file**
      Ensure the ONLY port exposed to host is `18080:80`. Confirm no other service publishes host ports 5432, 5433, 5434, 3000, 3900-3903, 80, or 6379.

- [ ] **Step 4: Commit Docker configuration**

```bash
git add docker-compose.prod.yml variables.prod.env.example
git commit -m "feat(deploy): add production docker-compose with port 18080 collision avoidance"
```

---

### Task 5: Remote Server Baseline Deployment & Verification

**Files:**

- Create: `deploy.sh` (or remote deployment script via SSH/Paramiko)
- Target Server: `192.168.3.168` (Debian, user: `bwpleon`)

**Interfaces:**

- Consumes: Server credentials, `BWP-Notebook-v2.git` repository
- Produces: Live, functional Plane CE baseline running on `http://192.168.3.168:18080` with zero container collisions.

- [ ] **Step 1: Push baseline commit to GitHub**
      Push `nora/main` to `https://github.com/bwpnora/BWP-Notebook-v2.git`:

```bash
git push -u origin nora/main
```

- [ ] **Step 2: Deploy to remote server via SSH**
      Create directory `/home/bwpleon/bwp-notebook-v2` on server `192.168.3.168`, clone/pull `nora/main`, generate `variables.prod.env`, and start services via Docker Compose:

```bash
docker compose -f docker-compose.prod.yml up -d
```

- [ ] **Step 3: Run database migrations and verify services**
      Execute migrations inside the `api` container:

```bash
docker compose -f docker-compose.prod.yml exec -T api python manage.py migrate
```

- [ ] **Step 4: Verify running containers and zero port collisions**
      Check `docker ps` on server:
- Ensure existing containers (`nora-device-mng-*`, `bwp_notebook_postgres`) remain healthy and uninterrupted.
- Ensure new `bwp-notebook-v2` containers are Up and healthy.
- Test HTTP response:

```powershell
python -c "import urllib.request; res = urllib.request.urlopen('http://192.168.3.168:18080/'); print('HTTP Status:', res.getcode())"
```

- [ ] **Step 5: Document deployment status and update walkthrough**
      Update `walkthrough.md` with verification results, HTTP response codes, and running container table.
