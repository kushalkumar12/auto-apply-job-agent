# Skill2Role: Testing & Quality Assurance Strategy

**Document Purpose:** Comprehensive testing methodology, automated test suites, manual verification checklists, regression procedures, and CI/CD quality gates.  
**System Version:** 2.0.0 (Stage 1 Implemented & Verified)  
**Verified Pass Rate:** 100% (61 / 61 Automated Tests Passed)  
**Last Verified:** October 2026  

---

## 1. Quality Assurance Philosophy & Test Pyramid

Skill2Role enforces an evidence-based Quality Assurance methodology:
- **Zero Simulated Passes:** Tests must execute against real running application processes and active SQLite databases.
- **Contract Integrity:** Frontend models and backend Pydantic schemas must maintain strict field and type alignment.
- **Security by Default:** Negative failure paths, malformed inputs, formula injections, and unauthorized actions must be actively tested alongside happy paths.

```text
               ▲
              / \
             /E2E\             (Browser Subagent Visual Audits)
            /-----\
           / Integ \           (backend/test_backend.py - 61 Checks)
          /---------\
         / Unit/Build\         (Vite build, Oxlint, Pydantic Schema Tests)
        /-------------\
```

---

## 2. Automated Test Suites & Verified Results

### 2.1 Backend Acceptance Suite (`backend/test_backend.py`)
The primary backend test suite executes 61 end-to-end integration and API acceptance checks using Python's standard `urllib` to guarantee zero third-party testing framework dependencies.

**Command:**
```powershell
cd d:\JavaProjects\JobsOnly\backend
python test_backend.py
```

**Verification Breakdown (61 / 61 Passed):**
1. **Health & Telemetry (3 Checks):** Verifies `/api/health`, service metadata, and database connection.
2. **Registration & Authentication (6 Checks):** Validates password length constraints ($\ge 6$), email regex parsing, password hashing, duplicate account rejection (409), and JWT token issuance.
3. **Mandatory Profile Completion Gate (9 Checks):** Verifies profile reset, detection of missing fields, rejection of `/api/discovery/start` with HTTP 403 when incomplete, full 7-field submission, and authorization of discovery scan once complete.
4. **Candidate Personas & Multi-Profile Isolation (8 Checks):** Verifies persona creation, persona listing, active persona switching, and radar query scope isolation.
5. **AI Keyword Expansion & Deterministic Fallback (4 Checks):** Verifies `/api/profile/keywords/generate` with high-confidence weighted keyword generation.
6. **Jobs Filtering, History & Status (14 Checks):** Verifies 5-day historical offset filtering, primary skill queries, full-text search, bookmarking (`/mark`), and application toggle (`/apply`).
7. **Universal Import/Export & Formula Protection (11 Checks):** Verifies CSV export, formula injection sanitization (`'=,+,-,@`), multipart file upload, and Excel/JSON parsing.
8. **Settings, AI Configuration & Factory Reset (6 Checks):** Verifies AI model selection updates, navigation menu reordering, and complete factory reset.

---

### 2.2 Frontend Build & Static Analysis

**Production Compilation Check:**
```powershell
cd d:\JavaProjects\JobsOnly\frontend
npm run build
```
- **Tooling:** Vite 8.x + React 19 / `@vitejs/plugin-react`
- **Output:** Clean bundle in 1.24s with zero syntax or unresolved import errors.

**Static Code Linter:**
```powershell
cd d:\JavaProjects\JobsOnly\frontend
npm run lint
```
- **Tooling:** Oxlint (High-speed Rust-based JavaScript/JSX linter)

---

## 3. Manual QA Scenarios & Multi-Theme Visual Matrix

Every UI change must undergo visual validation across all 4 themes and both lighting modes:

| Theme | Dark Mode | Light Mode | Criteria |
| :--- | :---: | :---: | :--- |
| **Default** | Verified | Verified | High contrast, teal accent (`--rp-accent-teal`), deep card backgrounds (`#111827`). |
| **Glass** | Verified | Verified | Translucent glassmorphism cards (`backdrop-filter: blur(16px)`), cyan highlights. |
| **Minimal** | Verified | Verified | Monochrome contrast, crisp 1px borders, subtle hover elevations. |
| **Difference** | Verified | Verified | High-contrast neon aesthetics, distinct inverted surfaces. |

### Visual Checklist:
- [x] Universal Modal: Backdrop blur active, modal centered, ESC key closes modal, body scroll locked while open.
- [x] Radar Orbit: Scanning sweep rotates smoothly, pulsing nodes reflect active status.
- [x] 5-Day Trajectory Bar: Bars scale proportionally without overflowing container.
- [x] Profile Completeness Pill: Updates dynamically as mandatory fields are typed.

---

## 4. Regression Checklist (Pre-Release)

Execute this regression checklist prior to tagging any release or transitioning between stages:

```markdown
### 1. Database & Persistence
- [ ] SQLite WAL files (`jobs.db-wal`, `jobs.db-shm`) commit cleanly.
- [ ] Database recovery functions after abrupt server termination.
- [ ] Factory reset restores database size and zeroes all entity tables.

### 2. Security & Gate Enforcement
- [ ] Starting discovery with an incomplete profile returns HTTP 403.
- [ ] Exporting jobs containing `=SUM(A1:A10)` escapes the formula as `'=SUM(...)`.
- [ ] Passing invalid JWT tokens to `/api/auth/me` returns HTTP 401.

### 3. Navigation & State
- [ ] Reordering navigation tabs in Settings persists across page reloads.
- [ ] Switching active persona switches job listings and radar scope immediately.
- [ ] Starred jobs (`marked = 1`) persist when filters are applied.
```

---

## 5. Recommended CI/CD Pipeline Configuration

```yaml
name: Skill2Role CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install Dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Start Backend in Background
        run: |
          cd backend
          python main.py &
          sleep 3
      - name: Run Backend Acceptance Test Suite
        run: |
          cd backend
          python test_backend.py

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install npm packages
        run: |
          cd frontend
          npm ci
      - name: Run Linter
        run: |
          cd frontend
          npm run lint
      - name: Compile Production Bundle
        run: |
          cd frontend
          npm run build
```
