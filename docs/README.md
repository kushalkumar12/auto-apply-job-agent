# Skill2Role: AI-Powered Job Discovery, ATS Optimization & Automation

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.0-61dafb.svg)](https://react.dev/)
[![SQLite WAL](https://img.shields.io/badge/SQLite-WAL_Mode-003B57.svg)](https://www.sqlite.org/wal.html)
[![Verification Status](https://img.shields.io/badge/Stage%201-100%25%20Verified%20(61%2F61)-brightgreen.svg)](#verification-suite)

**Skill2Role** is an intelligent, high-concurrency desktop and web platform that continuously discovers career opportunities, scores candidate compatibility against Applicant Tracking Systems (ATS), crafts tailored application assets, and automates multi-platform job submissions.

---

## 1. Main Capabilities

- **Real-Time Discovery Radar:** Scrapes and normalizes opportunities directly from primary ATS APIs (**Greenhouse**, **Ashby**, **Lever**, **RemoteOK**, **Remotive**) without artificial placeholders or mock data.
- **7-Field Mandatory Profile Gate:** Prevents untargeted or spam submissions by strictly enforcing profile completeness (`fullName`, `email`, `phone`, `city`, `primarySkill`, `selectedRoles`, `resume`) before radar execution.
- **Multi-Persona Profiles:** Create, switch, and maintain isolated career personas (e.g., Staff Backend Engineer vs. AI Platform Lead) with distinct target keywords and tailored resumes.
- **5-Day Historical Analytics:** Track job ingestion velocity, average ATS match trends, and daily opportunity volume across 5-day historical snapshots.
- **Universal Import & Formula-Safe Export:** Bidirectional data migration supporting JSON, CSV, and XLSX formats with built-in CSV formula injection protection.
- **Adaptable Theming Engine:** 2 curated visual themes (`default` and `minimal`) across `dark` and `light` modes based on the 60–30–10–5 visual hierarchy with guaranteed high-contrast readability.

---

## 2. Technology Stack & Architecture

| Layer | Component | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Component-driven UI, Lucide icons, SSE event stream reader |
| **Styling** | Vanilla CSS (`--rp-*`) | Zero Tailwind dependencies; strict CSS custom property token system |
| **Backend API** | FastAPI, Uvicorn | Asynchronous Python REST backend operating at `http://localhost:5000` |
| **Storage Engine** | SQLite 3 (`WAL` Mode) | High-concurrency reads/writes via write-ahead logging at `backend/jobs.db` |
| **AI & MCP** | Multi-Provider Engine | Modular LLM connectors for OpenAI, Google Gemini, Anthropic Claude, and MCP tools |

---

## 3. Quick-Start Instructions

### Prerequisites
- **Python:** 3.10+ (Python 3.12 recommended)
- **Node.js:** 18.x or 20.x
- **Package Managers:** `pip` and `npm`

### Step 1: Clone & Navigate
```bash
git clone https://github.com/kushalkumar12/resume-porter.git
cd resume-porter
```

### Step 2: Set Up Backend
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*Backend runs on `http://127.0.0.1:5000`.*

### Step 3: Set Up Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend opens at `http://localhost:5173`.*

---

## 4. Verification Suite

Validate your environment and ensure all components function correctly:

```bash
# Run 61 automated backend integration tests
cd backend
python test_backend.py

# Verify frontend production build
cd ../frontend
npm run build
```

---

## 5. Complete Documentation Index (15 Files)

The Skill2Role repository includes comprehensive, cross-referenced documentation in the `docs/` folder:

1. [**Product Requirements Document (prd.md)**](file:///d:/JavaProjects/JobsOnly/docs/prd.md) — Product vision, user personas, functional requirements, and stage boundaries.
2. [**UI/UX Design Specification (design.md)**](file:///d:/JavaProjects/JobsOnly/docs/design.md) — Design tokens, 4 themes, 2 modes, modal architecture, and 60-30-10-5 color system.
3. [**System Architecture (architecture.md)**](file:///d:/JavaProjects/JobsOnly/docs/architecture.md) — Component diagrams, request lifecycles, SQLite WAL concurrency, and SSE streaming.
4. [**Database Specification (database.md)**](file:///d:/JavaProjects/JobsOnly/docs/database.md) — Full schema dictionary, ER diagram, migrations, indexes, and factory reset procedures.
5. [**API Reference (api.md)**](file:///d:/JavaProjects/JobsOnly/docs/api.md) — Complete endpoint reference covering all 12 routers, payloads, cURL examples, and status codes.
6. [**AI Agent Guide (agents.md)**](file:///d:/JavaProjects/JobsOnly/docs/agents.md) — Operating manual, behavioral rules, conventions, and verification loops for AI coding agents.
7. [**Project Entry Point (readme.md)**](file:///d:/JavaProjects/JobsOnly/docs/readme.md) — This document: overview, stack, quick-start, and documentation links.
8. [**Implementation Status (project-implementation.md)**](file:///d:/JavaProjects/JobsOnly/docs/project-implementation.md) — Task inventory, Stage 1 verification evidence, and pending backlog.
9. [**Setup & Initialization (setup-and-initialization.md)**](file:///d:/JavaProjects/JobsOnly/docs/setup-and-initialization.md) — Clean-slate setup guide across Windows, Linux, and macOS.
10. [**Future Roadmap (future-development.md)**](file:///d:/JavaProjects/JobsOnly/docs/future-development.md) — Deep dive into Stages 2 through 5, autonomous swarms, and scale.
11. [**Authentication & Security (authentication-and-security.md)**](file:///d:/JavaProjects/JobsOnly/docs/authentication-and-security.md) — Threat models, JWT/PBKDF2 security, CORS, CSV formula sanitization, and data privacy.
12. [**Model Context Protocol (mcp-connection.md)**](file:///d:/JavaProjects/JobsOnly/docs/mcp-connection.md) — MCP client/server architecture, tool discovery, and integration setup.
13. [**Integrations Inventory (integrations.md)**](file:///d:/JavaProjects/JobsOnly/docs/integrations.md) — Greenhouse, Ashby, Lever, RemoteOK, Remotive scrapers, and future connectors.
14. [**Testing & Quality Assurance (testing-and-qa.md)**](file:///d:/JavaProjects/JobsOnly/docs/testing-and-qa.md) — Test suites, CI/CD procedures, regression checklists, and performance benchmarks.
15. [**Debugging & Troubleshooting (debugging.md)**](file:///d:/JavaProjects/JobsOnly/docs/debugging.md) — Known issues, error codes, database recovery, and troubleshooting runbooks.
16. [**Job Profile Onboarding Fixes (job-profile-onboarding-fixes.md)**](file:///d:/JavaProjects/JobsOnly/docs/job-profile-onboarding-fixes.md) — Specification and architecture of the 4 onboarding and master profile synchronization fixes.

---

## 6. Stage-by-Stage Development Specifications (`docs/stages/`)

The detailed multi-stage engineering specifications are organized in [docs/stages/](file:///d:/JavaProjects/JobsOnly/docs/stages/):

- [**Master Roadmap: All Stages Consolidated**](file:///d:/JavaProjects/JobsOnly/docs/stages/master-roadmap-stage1-to-final.md)
- [**Stage 1: Foundation, Authentication, Profiles & Explorer**](file:///d:/JavaProjects/JobsOnly/docs/stages/stage-1-foundation-explorer.md) — *100% Implemented & Verified*
- [**Stage 2: Target Role Matching, ATS Optimization & Automation**](file:///d:/JavaProjects/JobsOnly/docs/stages/stage-2-ai-tailoring-autoapply.md) — *Awaiting Authorization*
- [**Stage 3: Application Lifecycle Tracking, Analytics Funnel & Interview Prep**](file:///d:/JavaProjects/JobsOnly/docs/stages/stage-3-tracking-analytics-interview.md) — *Planned*
- [**Stage 4: Autonomous Agent Swarms & MCP Ecosystem**](file:///d:/JavaProjects/JobsOnly/docs/stages/stage-4-autonomous-agents-mcp.md) — *Planned*
- [**Stage 5: Enterprise Recruiter Mode & Cloud Scale**](file:///d:/JavaProjects/JobsOnly/docs/stages/stage-5-enterprise-recruiter-scale.md) — *Planned*

---

## 7. Common Setup Problems

- **SQLite `database is locked`:**
  Occurs if another process holds an exclusive lock without WAL mode. Solution: Verify `PRAGMA journal_mode = WAL` and ensure `busy_timeout` is set to 5000ms.
- **Port Conflicts (Port 5000 or 5173 occupied):**
  Kill running processes or override the port:
  `python main.py --port 5050` or `npm run dev -- --port 5174`.
- **CORS Errors in Browser:**
  Ensure the backend is running at `http://127.0.0.1:5000` and Vite's proxy in `vite.config.js` is active.

---

## 7. Security & Vulnerability Reporting

Please do not report security vulnerabilities via public GitHub issues. Email security disclosures to `security@skill2role.internal`. All disclosures receive response within 48 hours.
