# Skill2Role: Feature Inventory & Operational Verification Status

**Document Version:** 2.0.0  
**Audit & Review Date:** October 21, 2026  
**Audited Repository State:** Commit working tree (`backend/`, `frontend/`, `docs/`)  
**Scope:** Functional inventory of all implemented features, code locations, and operational verification results.

---

> [!NOTE]
> **Operational Status Key:**  
> - **Verified Working:** Tested and confirmed fully operational with real backend logic and persistence.  
> - **Partially Implemented / Mocked:** UI or backend exists, but contains simulated logic, hardcoded responses, or fallback mock traps.  
> - **Broken / Non-functional:** Feature is present in code but cannot execute successfully due to unhandled exceptions, missing dependencies, or empty return blocks.

---

## 1. Feature Inventory & Verification Matrix

| Feature | Primary Module | Frontend Location | Backend Endpoint / Service | Operational Status | Evidence & Failure Modes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Radar Orbit Visualization** | Explorer | `components/RadarOrbit.jsx` | `GET /api/discovery/stream` | **Verified Working** | Canvas 2D rotating radar smoothly renders detected jobs via SSE stream. |
| **Mandatory Profile Gate** | Profiles | `components/MandatoryProfileGate.jsx` | `GET /api/profiles/active/validation` | **Verified Working** | Blocks radar scan with HTTP 403 when 7 mandatory fields are incomplete. |
| **Multi-Persona Profiles** | Profiles | `components/PersonasModal.jsx` | `GET /api/profiles`, `POST /api/profiles/{id}/activate` | **Verified Working** | Creates, switches, and isolates distinct candidate profiles. |
| **5-Day Historical Trajectory** | Jobs | `components/HistoryDropdown.jsx` | `GET /api/jobs/history-summary` | **Verified Working** | Aggregates daily job counts and average ATS scores for last 5 days. |
| **Job Bookmarking & Apply Status**| Jobs | `components/JobList.jsx` | `POST /api/jobs/{id}/mark`, `POST /api/jobs/{id}/apply` | **Verified Working** | Toggles persistence cleanly in SQLite `jobs` table. |
| **Spreadsheet Export & Formula Guard** | Export | `components/JobList.jsx` | `GET /api/jobs/export` | **Verified Working** | Streams CSV/Excel. Neutralizes formula injection characters (`'=,+,-,@`). |
| **XLSX Bulk Job Import** | Import | `components/ImportModal.jsx` | `POST /api/jobs/import` | **Verified Working** | Parses uploaded spreadsheet files and inserts rows into `jobs`. |
| **Public ATS Harvesters** | Discovery | `components/ExploreView.jsx` | `backend/harvest/greenhouse.py`, `ashby.py`, `lever.py`, `remote_boards.py` | **Verified Working** | Successfully fetches public unauthenticated job postings. |
| **Local RAG Career Fact Extraction** | Generation | `components/GenerationView.jsx` | `services/career_facts_service.py` | **Verified Working** | Extracts 6 categories of career facts from raw resume text. |
| **384-Dim Token Hash Embeddings** | Generation | N/A (Internal Service) | `services/embedding_service.py` | **Verified Working** | Generates deterministic vector embeddings stored as SQLite BLOBs. |
| **Hybrid RRF Retrieval** | Generation | N/A (Internal Service) | `services/hybrid_retriever.py` | **Verified Working** | Blends SQLite FTS5 lexical ranking with cosine vector similarity. |
| **Sentence-Level Factual Validator** | Generation | `components/GenerationView.jsx` | `services/factual_validator.py` | **Verified Working** | Passed 10/10 test vectors. Flags ungrounded bullet claims. |
| **Compliance Submission Gate** | Generation | `components/GenerationView.jsx` | `services/submission_gate.py` | **Verified Working** | Passed 6/6 test vectors. Blocks unverified or hallucinated drafts. |
| **Multi-Format Resume Exporter** | Generation | `components/GenerationView.jsx` | `services/resume_exporter.py` | **Verified Working** | Verified schemas for HTML, Markdown, Plain Text, DOCX, JSON-LD. |
| **Streamlined 2-Theme System** | UI/UX | `components/Navbar.jsx`, `styles/` | Pure CSS tokens (`tokens/colors.css`) | **Verified Working** | Dynamic theme switching across Default and Minimal themes with universal WCAG AAA contrast in Light & Dark modes. |
| **User Sign-in & Registration** | Auth | `components/AuthView.jsx`, `components/AuthModal.jsx` | `POST /api/auth/register`, `POST /api/auth/login` | **Verified Hardened** | Full-stack auth gate. PBKDF2-HMAC-SHA256 (100k iters), signed HS256 JWTs, protected router dependencies. |
| **Generation Studio UI** | Generation | `components/GenerationView.jsx` | `POST /api/generation/tailor` | **Partially Implemented** | Backend pipeline is 100% verified, but UI contains fallback mock traps in `api.js`. |
| **Auto-Apply Automation Queue** | Automation | `components/AutomationView.jsx` | `POST /api/automation/run` | **Partially Implemented / Mocked** | Backend worker is a simulation stub (`routers/automation.py:93`). Frontend inflates metrics on error. |
| **ATS Score Checker Tool** | Tools | `components/ToolsView.jsx` | None (Client-side mock) | **Mocked / Hardcoded** | Displays hardcoded static 94% score without running backend analysis. |
| **JD Keyword Analyzer Tool** | Tools | `components/ToolsView.jsx` | None (Client-side mock) | **Mocked / Hardcoded** | Displays hardcoded static 92% match without analyzing uploaded JD. |
| **Naukri Job Connector** | Discovery | `components/ExploreView.jsx` | `backend/harvest/naukri_connector.py` | **Broken / Non-functional** | Line 67 returns `[]` unconditionally while health check reports "online". |
| **LinkedIn Guest Harvester** | Discovery | `components/ExploreView.jsx` | `backend/harvest/linkedin_guest.py` | **Broken / Non-functional** | Crashes on missing `beautifulsoup4` dependency in `requirements.txt`. |
| **Google OAuth Sign-in** | Auth | `components/AuthModal.jsx` | `POST /api/auth/google` | **Verified Hardened** | Cryptographically validates Google ID tokens via `google.oauth2.id_token.verify_oauth2_token()`. Rejects raw emails. |

---

## 2. Detailed Module Breakdown & Behavior Analysis

### 2.1 Job Discovery & Radar Engine
- **Implementation:** `frontend/src/components/RadarOrbit.jsx`, `backend/routers/discovery.py`, `backend/harvest/`.
- **Status:** **Verified Working.**
- **Details:** The radar uses an HTML5 Canvas drawing loop synchronized with an SSE stream (`/api/discovery/stream`). Incoming jobs trigger pulsing orbital blips and real-time activity feed notifications.
- **Caveat:** The radar connector status screen displays green for Naukri even though the Naukri connector returns zero results.

### 2.2 Candidate Profiles & Mandatory Validation Gate
- **Implementation:** `frontend/src/components/ProfileView.jsx`, `components/MandatoryProfileGate.jsx`, `backend/routers/profile.py`, `backend/services/profile_validator.py`.
- **Status:** **Verified Working.**
- **Details:** Candidates must complete seven core fields before triggering radar scans:
  1. `name` (Candidate Full Name)
  2. `email` (Valid email string)
  3. `primarySkill` (Primary technical domain)
  4. `location` (Target city or remote preference)
  5. `bio` (Professional summary)
  6. `experience` (Structured work history)
  7. `skills` (List of verified competencies)
- **Failure Behavior:** If any field is empty or missing, `GET /api/profiles/active/validation` returns HTTP 403 Forbidden with a checklist of missing fields, triggering the modal overlay.

### 2.3 Stage 2 RAG Tailoring & Submission Gate
- **Implementation:** `backend/routers/generation.py`, `backend/services/*.py`.
- **Status:** **Backend 100% Verified Working; Frontend Integration Incomplete.**
- **Details:** The local SQLite RAG pipeline performs hybrid retrieval (RRF) between lexical FTS5 matches and 384-dimensional token-hash vector embeddings. Generation uses strict prompt templates injecting verified career facts. Sentence-level validation flags ungrounded claims, and the submission gate blocks drafts that have unverified skills or high hallucination scores.
- **Frontend Caveat:** `frontend/src/services/api.js` catches errors and returns mock tailored documents, preventing users from seeing real validation errors.

### 2.4 Auto-Apply Automation Queue
- **Implementation:** `frontend/src/components/AutomationView.jsx`, `backend/routers/automation.py`.
- **Status:** **Partially Implemented / Simulation Stub.**
- **Details:** The automation queue displays active pipelines and run triggers. However, the backend worker (`routers/automation.py:93-118`) executes an asynchronous `sleep()` loop and records simulated applications without submitting HTTP forms or launching headless browser sessions.
- **Defect:** `AutomationView.jsx` line 74 increments `appliedCount` by 1 on server errors, and line 68 increments by 3 on mock completions, misrepresenting actual activity.

### 2.5 Career Tools View
- **Implementation:** `frontend/src/components/ToolsView.jsx`.
- **Status:** **Mocked / Hardcoded.**
- **Details:** The tools tab displays an "ATS Resume Checker" and a "JD Match Analyzer". Both tools render pre-configured static percentages (94% ATS readiness, 92% JD keyword match) with fixed suggestions. No API requests are sent to the backend.
