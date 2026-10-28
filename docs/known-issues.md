# Skill2Role: Known Defects, Security Vulnerabilities & Technical Debt

**Document Version:** 2.0.0  
**Audit & Review Date:** October 21, 2026  
**Audited Repository State:** Commit working tree (`backend/`, `frontend/`, `docs/`)  
**Auditor:** Senior Principal Software Architect, Security Engineer & QA Lead  
**Scope:** Exhaustive catalog of confirmed defects, architectural vulnerabilities, and technical debt identified during the baseline audit.

---

## 1. Summary Severity Distribution

```text
Critical Severity (P0): 4 issues  ──► Immediate blocker for any public deployment
High Severity     (P1): 5 issues  ──► Functional breaks or data falsification
Medium Severity   (P2): 6 issues  ──► Performance bottlenecks, tool stubs, scraper failures
Low Severity      (P3): 3 issues  ──► Code hygiene, documentation drift, cosmetic inconsistencies
```

---

## 2. Critical Severity Vulnerabilities (P0)

### `SEC-01`: Insecure Static-Salted SHA-256 Password Hashing [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [backend/services/auth_service.py](file:///d:/JavaProjects/JobsOnly/backend/services/auth_service.py), [backend/routers/auth.py](file:///d:/JavaProjects/JobsOnly/backend/routers/auth.py)
- **Description:** Previously, passwords were hashed using a single static salt and single round of SHA-256.
- **Resolution & Verification:**
  - Implemented `hash_password()` using `hashlib.pbkdf2_hmac` with SHA-256, 100,000 iterations, and a unique 16-byte random salt (`os.urandom(16)`).
  - Storage format: `pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>`.
  - Built transparent, safe migration for legacy static-salted SHA-256 accounts upon login without invalidating existing credentials.
  - Verified by 15 regression tests in [backend/test_auth_security.py](file:///d:/JavaProjects/JobsOnly/backend/test_auth_security.py).

### `SEC-02`: Forgeable Plaintext Bearer Tokens [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [backend/services/auth_service.py](file:///d:/JavaProjects/JobsOnly/backend/services/auth_service.py), [backend/routers/auth.py](file:///d:/JavaProjects/JobsOnly/backend/routers/auth.py)
- **Description:** Previously, authentication tokens were issued as unverified plaintext strings formatted as `tok_<user_id>`.
- **Resolution & Verification:**
  - Replaced forgeable strings with cryptographically signed `HS256` JSON Web Tokens (PyJWT) with 24-hour expiration (`exp`), subject (`sub`), email, and issuer (`iss: "skill2role"`).
  - Implemented `get_current_user` dependency validating signature, expiration, and user existence in SQLite.
  - Explicitly rejects forgeable `tok_<id>` plaintext tokens with HTTP 401.
  - Protected endpoints (`GET /api/auth/me`, `PUT /api/auth/avatar`) now enforce JWT verification.
  - Frontend `apiFetch` automatically injects Bearer token and dispatches session-expired events upon HTTP 401.

### `SEC-03`: Unverified Google OAuth Mock Endpoint [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [backend/routers/auth.py](file:///d:/JavaProjects/JobsOnly/backend/routers/auth.py), [backend/services/auth_service.py](file:///d:/JavaProjects/JobsOnly/backend/services/auth_service.py), [frontend/src/components/AuthModal.jsx](file:///d:/JavaProjects/JobsOnly/frontend/src/components/AuthModal.jsx)
- **Description:** Previously, `/api/auth/google` accepted raw email payloads without verifying Google identity tokens.
- **Resolution & Verification:**
  - Replaced raw email acceptance with cryptographic verification using `google.oauth2.id_token.verify_oauth2_token()`.
  - Raw email attempts without token are rejected with HTTP 400.
  - Frontend `AuthModal.jsx` disables simulation and clearly guides users until a production Google Client ID is configured.
  - Tested invalid, expired, and valid mock identity tokens in regression tests.

### `SEC-04`: Missing Authorization Dependency & Unauthenticated Application Bypass [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [backend/main.py](file:///d:/JavaProjects/JobsOnly/backend/main.py), [frontend/src/App.jsx](file:///d:/JavaProjects/JobsOnly/frontend/src/App.jsx), [frontend/src/components/AuthView.jsx](file:///d:/JavaProjects/JobsOnly/frontend/src/components/AuthView.jsx), [frontend/src/services/api.js](file:///d:/JavaProjects/JobsOnly/frontend/src/services/api.js)
- **Description:** 
  1. Backend business endpoints (`/api/jobs`, `/api/profile`, `/api/discovery`, `/api/automation`, `/api/generation`, etc.) lacked router-level authorization dependencies, permitting anonymous HTTP requests to read and modify application state.
  2. Frontend initialized user state with a fallback guest object (`{ id: 'usr_guest', name: 'Guest User' }`), rendering the full navigation shell and views even when unauthenticated.
- **Resolution & Verification:**
  - Segregated backend routers in `backend/main.py` into `public_api_router` (`/api/health`, `/api/auth/*`) and `protected_api_router` with `dependencies=[Depends(get_current_user)]`, locking 100% of business endpoints behind valid JWT token validation (HTTP 401 on unauthenticated calls).
  - Eliminated `usr_guest` default in `frontend/src/App.jsx`, initializing `currentUser` strictly to `null` if no valid token exists in `localStorage`.
  - Created `frontend/src/components/AuthView.jsx` and `AuthView.css`, providing an unbypassable full-screen Sign In / Registration gate with modern enterprise design.
  - Blocked `loadBackendData()` when unauthenticated, and ensured session expiration (HTTP 401) immediately evicts the user back to `AuthView`.
  - Verified across 105 automated tests (43 unit tests + 62 integration tests) and 0-error Vite production build.



### `TEST-01`: Destructive Backend Test Suite [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [backend/test_backend.py](file:///d:/JavaProjects/JobsOnly/backend/test_backend.py), [backend/database.py](file:///d:/JavaProjects/JobsOnly/backend/database.py)
- **Description:** `test_backend.py` previously executed `test_factory_reset()` against the live database, risking wiping active development data.
- **Resolution & Verification:**
  - Implemented `SKILL2ROLE_DB_PATH` environment variable override in `database.py`.
  - Added `assert_test_database()` safety assertion that aborts immediately if a destructive operation targets `jobs.db`.
  - Updated `test_backend.py` to create and tear down an ephemeral `test_jobs_acceptance.db`, executing via `TestClient(app)` in 2.3s (61/61 checks passed).
  - Created regression suite [backend/test_database_isolation.py](file:///d:/JavaProjects/JobsOnly/backend/test_database_isolation.py) (6/6 checks passed). Active `jobs.db` verified completely unmodified.

---

## 3. High Severity Defects (P1)

### `API-01`: Silent False-Positive Mock Handlers in Frontend API Client [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [frontend/src/services/api.js](file:///d:/JavaProjects/JobsOnly/frontend/src/services/api.js), [frontend/src/App.jsx](file:///d:/JavaProjects/JobsOnly/frontend/src/App.jsx)
- **Description:** `api.js` previously converted HTTP 400/422 and network rejections into `{ success: true, ... }` mock fallbacks, masking real server errors.
- **Resolution & Verification:**
  - Refactored `apiFetch` in `api.js` to parse JSON error bodies on HTTP failure and attach `err.status`, `err.data`, and `err.message`.
  - Removed false success catch blocks in `applyJob`, `toggleJobMarker`, and `updateAvatar`.
  - Removed duplicate method declarations in `apiService` (`getExportJobsUrl`, `updateAvatar`, `getGenerationJobs`, `generateTailoredResume`).
  - Updated `handleApply` in `App.jsx` to verify backend confirmation before updating state; displays structured submission gate rejection toasts on 400/422.
  - Verified with automated suite [backend/test_objective1_status_correctness.py](file:///d:/JavaProjects/JobsOnly/backend/test_objective1_status_correctness.py) (5/5 checks passed).

### `AUTO-01`: Fake Metric Inflation in Automation Queue [RESOLVED]
- **Status:** **RESOLVED (Phase 1 Verified)**
- **Location:** [frontend/src/components/AutomationView.jsx](file:///d:/JavaProjects/JobsOnly/frontend/src/components/AutomationView.jsx)
- **Description:** In `AutomationView.jsx`, line 74 incremented `appliedCount` on catch error, and line 68 added 3 on mock completions.
- **Resolution & Verification:**
  - Removed erroneous error-catch and mock increments.
  - Bound `appliedCount` updates strictly to server confirmation responses (`res.appliedCount`).
  - Added explicit `[BLOCKED: <CODE>]` log levels and toast notifications with reasons from the submission gate.
  - Handled batch execution via `Promise.allSettled`, cleanly separating succeeded from blocked pipelines.
  - Verified via [backend/test_objective1_status_correctness.py](file:///d:/JavaProjects/JobsOnly/backend/test_objective1_status_correctness.py) (5/5 checks passed).

### `AUTO-02`: Auto-Apply Worker Is a Simulation Stub
- **Location:** [backend/routers/automation.py:93-118](file:///d:/JavaProjects/JobsOnly/backend/routers/automation.py#L93-L118)
- **Description:** The auto-apply worker executes an `asyncio.sleep()` loop and records simulated applications without submitting HTTP forms or launching headless browser sessions.
- **Impact:** Zero real job applications are submitted to any ATS or platform.
- **Remediation:** Implement headless browser automation (Playwright/Puppeteer) or authenticated API form fillers with strict human-in-the-loop review.

### `HARV-01`: Broken Naukri Platform Connector
- **Location:** [backend/harvest/naukri_connector.py:67](file:///d:/JavaProjects/JobsOnly/backend/harvest/naukri_connector.py#L67)
- **Description:** The extraction method returns an empty list `[]` unconditionally, while `check_health()` reports `status: "online"`.
- **Impact:** Misleads users into believing Naukri is being actively scanned when zero jobs are harvested.
- **Remediation:** Implement a real scraping or RSS feed routine, or set `status: "disabled"` and remove from active radar scanning.

### `HARV-02`: Missing `beautifulsoup4` Dependency for LinkedIn Scraper
- **Location:** [backend/harvest/linkedin_guest.py](file:///d:/JavaProjects/JobsOnly/backend/harvest/linkedin_guest.py), [backend/requirements.txt](file:///d:/JavaProjects/JobsOnly/backend/requirements.txt)
- **Description:** `linkedin_guest.py` imports `bs4.BeautifulSoup`, but `beautifulsoup4` is not listed in `backend/requirements.txt`.
- **Impact:** Invoking the LinkedIn scraper in a clean environment crashes with `ModuleNotFoundError: No module named 'bs4'`.
- **Remediation:** Add `beautifulsoup4>=4.12.0` to `backend/requirements.txt`.

---

## 4. Medium Severity Defects & Technical Debt (P2)

### `TOOL-01`: Hardcoded Static Mockups in Career Tools
- **Location:** [frontend/src/components/ToolsView.jsx:45-120](file:///d:/JavaProjects/JobsOnly/frontend/src/components/ToolsView.jsx#L45-L120)
- **Description:** The ATS Readiness Tool and JD Analyzer display static pre-rendered percentages (94% and 92%) without calling backend services.
- **Remediation:** Connect the Tools view to `POST /api/generation/analyze-job` and the factual validation engine.

### `PERF-01`: In-Memory Pagination Bottleneck
- **Location:** [backend/routers/jobs.py:53-102](file:///d:/JavaProjects/JobsOnly/backend/routers/jobs.py#L53-L102)
- **Description:** The jobs query executes `cursor.fetchall()` into a Python list before applying pagination slices:
  ```python
  all_jobs = cursor.fetchall()
  paginated = all_jobs[offset : offset + page_size]
  ```
- **Impact:** Scales poorly as the database grows, causing memory bloat and latency spikes.
- **Remediation:** Push `LIMIT` and `OFFSET` directly into the SQL query with a separate `COUNT(*)` query.

### `API-02`: Duplicate & Divergent Auth Routers
- **Location:** [backend/main.py](file:///d:/JavaProjects/JobsOnly/backend/main.py) vs [backend/routers/login.py](file:///d:/JavaProjects/JobsOnly/backend/routers/login.py)
- **Description:** The backend has two competing authentication systems: `/api/auth/*` and `/api/login/*`. `frontend/src/services/api.js` has redundant wrapper functions pointing to both.
- **Remediation:** Consolidate all authentication into `backend/routers/auth.py` and deprecate `/api/login/*`.

### `RAG-01`: Career Facts Skill Regex Parenthesis Splitting Bug
- **Location:** [backend/services/career_facts_service.py:112-125](file:///d:/JavaProjects/JobsOnly/backend/services/career_facts_service.py#L112-L125)
- **Description:** The regex splitting comma-separated skills naively splits inside parentheses, turning `"AWS (ECS, RDS, S3)"` into fragmented facts `["AWS (ECS"`, `"RDS"`, `"S3)"]`.
- **Remediation:** Update the tokenizer to respect nested parentheses before splitting.

### `PROF-01`: Hardcoded Company List in Experience Parser
- **Location:** [backend/routers/profile.py:350-380](file:///d:/JavaProjects/JobsOnly/backend/routers/profile.py#L350-L380)
- **Description:** Resume parsing uses a hardcoded company name array to extract work history. Experience from companies not in the list is dropped or misclassified.
- **Remediation:** Use generalized regex heuristics or local NER (Named Entity Recognition) to identify company entities.

### `RAG-02`: Uncommitted Stage 2 Source Code in Git
- **Location:** `backend/services/*.py`, `backend/routers/generation.py`, `backend/test_rag_pipeline.py`
- **Description:** Over 12 Stage 2 files implementing the local RAG pipeline are currently untracked in Git.
- **Remediation:** Stage and commit all verified Stage 2 RAG modules into Git source control.

---

## 5. Low Severity Hygiene & Drift (P3)

### `UI-01`: Inconsistent Job Count Reporting
- **Location:** `frontend/src/components/Navbar.jsx`, `JobList.jsx`, `ActivityFeed.jsx`
- **Description:** The navbar displays total seeded jobs (25), but the activity feed reflects session-discovered jobs (0–10), confusing users about the total number of accessible opportunities.
- **Remediation:** Align terminology between "Total Stored Jobs" and "Current Session Discoveries".

### `DOC-01`: Documentation Drift Regarding React & Job Volume
- **Location:** Older documents in `docs/`
- **Description:** Documents claimed React 18, Vite 5, and 15,500 simulated jobs. The actual implementation uses React 19.2, Vite 6/8, and 25 Indian tech jobs.
- **Remediation:** Fully reconciled in updated 2.0.0 documentation set.

### `LINT-01`: 104 Frontend Static Analysis Warnings
- **Location:** Various files in `frontend/src/`
- **Description:** Oxlint reports 104 hygiene warnings for unused imports and variables.
- **Remediation:** Run automated code cleanup and remove unused declarations.
