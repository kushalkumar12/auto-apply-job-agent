# Skill2Role: Implementation History & Evolution Log

**Document Version:** 2.0.0  
**Audit & Review Date:** October 21, 2026  
**Audited Repository State:** Commit working tree (`backend/`, `frontend/`, `docs/`)  
**Scope:** Chronological engineering history, architectural divergence reconciliation, and audit discoveries.

---

> [!NOTE]
> **Audit Historical Context:**  
> This record synthesizes Git commit logs, filesystem timestamps, active working tree changes, and architectural artifacts created during the initial ~2 weeks of platform development. Unverified historical claims are explicitly marked.

---

## 1. Chronological Evolution of the Platform

### Phase 0: Initial Inception & Prototype (Early October 2026)
- **Focus:** Basic job discovery concept and single-candidate resume parsing.
- **Artifacts:** Early monolithic prototype with hardcoded job lists, mock ATS connectors, and simple SQLite schema.
- **Legacy Footprint:** The single-row `profile` table (`id: 'default'`) persists in `backend/database.py` as backwards-compatibility scaffolding from this phase.

### Phase 1: Stage 1 Foundation, Explorer & Multi-Persona Architecture
- **Focus:** Decoupled client-server architecture, responsive radar visualization, multi-persona candidates, and robust data isolation.
- **Key Deliverables Completed:**
  1. **FastAPI Asynchronous Backend:** REST routing across `routers/jobs.py`, `routers/profile.py`, `routers/discovery.py`, `routers/automation.py`.
  2. **SQLite WAL Architecture:** Transition to Write-Ahead Logging (`WAL`), `NORMAL` synchronous mode, and 5000ms busy timeout.
  3. **7-Field Mandatory Profile Validation Gate:** Enforced in `services/profile_validator.py` and fronted by `MandatoryProfileGate.jsx`.
  4. **Multi-Persona Profiles:** Extended `candidate_profiles` table enabling users to switch between distinct career targets (e.g., Full Stack vs. DevOps).
  5. **Live ATS Scraping:** Built scrapers for unauthenticated public feeds: Greenhouse, Ashby, Lever, and RemoteOK.
  6. **Bidirectional Excel/CSV Data Engine:** Implemented streaming export with spreadsheet formula injection protection (`'=,+,-,@`) and XLSX bulk import.
  7. **Universal UI Token System:** Streamlined 2-theme engine (`default` and `minimal`) using pure CSS custom properties with universal input and action contrast (*Glass* and *Difference* removed to eliminate contrast failures and code maintenance overhead).

### Phase 2: Stage 2 Local RAG Pipeline Development (Mid-October 2026)
- **Focus:** Privacy-first, zero-external-vector-DB Retrieval-Augmented Generation for grounded resume tailoring and compliance enforcement.
- **Key Deliverables Implemented (Uncommitted Working Tree):**
  1. **SQLite FTS5 Full-Text Search:** Integrated `document_chunks_fts` virtual table for BM25 lexical chunk retrieval.
  2. **Local 384-Dimensional Vector Embeddings:** Built `embedding_service.py` using deterministic hash-based TF-IDF token projections stored as raw binary BLOBs (`FLOAT32` arrays) in `chunk_embeddings`.
  3. **Reciprocal Rank Fusion (RRF):** Implemented `hybrid_retriever.py` combining FTS5 lexical ranking with cosine vector similarity.
  4. **Career Fact Extraction:** Built regex-based extraction across 6 categories (skills, metrics, titles, companies, education, certifications).
  5. **Sentence-Level Factual Validator:** Implemented `factual_validator.py` using token overlap and token containment to detect ungrounded hallucinations in generated resumes.
  6. **Compliance Submission Gate:** Built `submission_gate.py` implementing a deterministic 6-check verification pipeline blocking unauthorized submissions.
  7. **Multi-Format Document Exporter:** Implemented `resume_exporter.py` outputting HTML, Markdown, Plain Text, DOCX, and JSON-LD schemas.
  8. **RAG Pipeline Test Suite:** Created `backend/test_rag_pipeline.py` covering all 12 core pipeline behaviors (100% passing).

---

## 2. Architectural Divergence & Documentation Reconciliation

During the repository-wide audit, significant contradictions between previous documentation and actual code were identified and reconciled:

| Component / Claim | Stated in Previous Docs | Observed in Codebase / Database | Evidence Location | Audit Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite 5 | **React 19.2.0, Vite 6/8** | `frontend/package.json` | Updated docs to reflect React 19.2.0 runtime. |
| **Database Job Volume** | 15,500 simulated jobs | **25 real seeded Indian tech jobs** | `backend/seed_india_jobs.py`, `jobs.db` | Corrected database docs. Confirmed 25 real records in Bangalore, Pune, Hyderabad, Remote. |
| **Password Hashing** | PBKDF2 with unique salts | **Static-salted SHA-256** | `backend/main.py:108-118` | Flagged as critical security defect `SEC-01` in `known-issues.md`. |
| **Auth Tokens** | Cryptographic HS256 JWT | **Plain string `tok_<user_id>`** | `backend/main.py:144, 219` | Flagged as critical security defect `SEC-02` in `known-issues.md`. |
| **Stage 2 Status** | "Planned / Awaiting Auth" | **Fully built in backend (uncommitted)** | `backend/services/*.py`, `routers/generation.py` | Documented Stage 2 RAG backend as built and verified. |
| **Job Submission** | Automated application submission active | **Simulation stub (no HTTP requests sent)** | `backend/routers/automation.py:93-118` | Corrected status. Live external submissions confirmed disabled. |
| **ATS Scoring Tool** | Dynamic AI analysis | **Hardcoded static mockup (94% / 92%)** | `frontend/src/components/ToolsView.jsx` | Flagged as technical debt `TOOL-01` in `known-issues.md`. |

---

## 3. Unverified Historical Details & Investigation Caveats

To ensure documentation integrity, the following historical details could not be independently verified from the repository evidence:
1. **Third-Party API Test Runs:** The repository contains references to Gemini and OpenAI API models in `SETTINGS_AI`, but historical API logs or past prompt outputs could not be verified since local execution logs are not preserved in Git.
2. **LinkedIn Guest Scraper Provenance:** `backend/harvest/linkedin_guest.py` references `beautifulsoup4`, which is missing from `requirements.txt`. It is uncertain whether this scraper ever ran successfully in a past virtual environment or was copied from an external prototype without dependency testing.
3. **Naukri Connector Historical Functionality:** `backend/harvest/naukri_connector.py` returns `[]` unconditionally. It is uncertain whether an earlier scraping routine was temporarily removed due to anti-bot blocks or if it was authored as a placeholder from day one.
