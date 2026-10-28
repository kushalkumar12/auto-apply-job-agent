# Product Requirements Document (PRD)

**Product Name:** Skill2Role (AI-Powered Job Discovery, Tailoring & Application Platform)  
**Document Version:** 1.0.0  
**Status:** Approved & Verified (Stage 1 Complete)  
**Authors:** Senior Principal Software Engineer, Senior Product Manager, Lead Architect  

---

## 1. Product Overview & Vision

**Skill2Role** is an intelligent job discovery, career tailoring, and autonomous application platform that unifies real-time direct Applicant Tracking System (ATS) crawling with context-aware resume tailoring and automated submission workflows. 

Unlike legacy job boards that suffer from stale aggregations, sponsored listings, and ghost jobs, Skill2Role connects directly to enterprise ATS boards (Greenhouse, Ashby, Lever, RemoteOK, Remotive) and candidate-authorized portal sessions. It anchors job searches strictly on a candidate's verified primary competency, validates profile completeness before permitting discovery, and ensures 100% data provenance without fabricated particles, mock records, or synthetic events.

---

## 2. Problem Statement

1. **Job Board Decay & Ghost Postings:** Commercial aggregators index stale, closed, or fake job listings. Candidates waste hours applying to positions that are no longer active.
2. **Keyword Drift & Dilution:** When candidates list multiple secondary competencies (e.g., AWS, SQL, Kubernetes) alongside their core role (e.g., Java), standard search algorithms dilute the query, returning irrelevant DevOps or database administration roles.
3. **Generic Applications & Low ATS Conversion:** Candidates mass-apply with generic resumes that fail automated ATS parsing thresholds, resulting in $<2\%$ interview callback rates.
4. **Scraping Fragility & Account Bans:** Automated bots that bypass Cloudflare or forge authentication tokens frequently trigger IP blocks, CAPTCHA locks, and account terminations.
5. **Data Misattribution & Lack of Isolation:** Multi-profile systems frequently cross-contaminate candidate personas, attributing search queries or application history to the wrong persona.

---

## 3. Target Users & Personas

### 3.1 Primary Personas
- **The Senior Specialist (e.g. Kushal - Principal Java Architect):** 10+ years of enterprise experience. Needs strict primary skill anchoring (`Java`) with secondary synergy (`Spring Boot`, `AWS`, `Kafka`) without drifting into unrelated cloud or DBA listings.
- **The Active Career Advancer:** Managing multiple active candidate personas (e.g. "Lead Backend Engineer" vs "Staff Cloud Architect") targeting distinct market tiers simultaneously without data leakage.
- **The High-Velocity Applicant:** Needs automated, rate-limited, pre-flight supervised application submissions with customized resumes matching job-specific keywords.
- **The Agency Recruiter (Stage 5):** Career coach or placement agency managing pools of candidate personas with segregated audit trails.

---

## 4. Business Goals & Measurable Success Criteria

| Goal | Metric | Target | Verified Status |
| :--- | :--- | :--- | :--- |
| **Search Accuracy** | Primary Skill Anchor Retention | 100% of generated queries contain anchor | **Verified (Stage 1)** |
| **Profile Integrity** | Unauthenticated / Incomplete Access | 0% bypass through UI or direct API | **Verified (HTTP 403)** |
| **Discovery Freshness** | Direct ATS Crawl Latency | $< 5$ seconds from official company feeds | **Verified (Stage 1)** |
| **Export Completeness** | Dataset Completeness on Export | 100% of filtered records (bypassing 10-row page limit) | **Verified (Stage 1)** |
| **Data Safety** | Formula Injection Vulnerability | 0 unescaped executable prefixes in CSV | **Verified (Stage 1)** |
| **Test Quality** | Automated Test Pass Rate | 100% pass on core acceptance criteria | **Verified (61/61 Passed)** |

---

## 5. Functional Requirements (Stage-by-Stage Breakdown)

### 5.1 Stage 1: Foundation, Authentication, Profiles, and Explorer (Implemented & Verified)

#### FR-101: Account Registration & Authentication
- Support email/password registration with validation ($\ge 6$ character password, RFC email regex).
- Support Google authentication integration.
- Prevent duplicate account registration (HTTP 409 Conflict).
- Hash credentials securely; zero plaintext secret exposure.
- Issue signed JWT bearer tokens for stateless session management.

#### FR-102: Mandatory Profile Completion Gate
- Guard Explorer and downstream automation until 7 mandatory profile fields are valid:
  1. `fullName`: Legal or professional name ($\ge 2$ characters).
  2. `email`: Valid contact email.
  3. `primarySkill`: Core technical anchor (e.g., `Java`).
  4. `skillsList`: Minimum of 2 verified competencies.
  5. `selectedRoles`: Minimum of 1 target job title.
  6. `userLocation`: Geographic city or remote preference.
  7. `resume`: Uploaded document (`.pdf`, `.docx`, `.txt`) or parsed summary ($\ge 20$ chars).
- Direct API calls to `POST /api/discovery/start` without a complete profile must return **HTTP 403 Forbidden**.
- Frontend renders a theme-adaptive checklist modal displaying completed vs missing fields.

#### FR-103: Multi-Persona Candidate Profiles
- Allow a single login account to create and manage multiple candidate personas (`candidate_profiles`).
- Exactly one candidate persona may be active at any time.
- Persistent navbar indicator displays the **Candidate Persona Name**, strictly distinguished from the account username.
- Activating a profile automatically cancels in-flight search tasks to prevent cross-profile data leakage.

#### FR-104: Anchored Role Keyword Generation
- Generate role titles and search queries strictly anchored on `primarySkill`.
- Secondary skills synergize with the primary skill but must never displace it.
- Strict schema validation with deterministic fallback when external LLMs are unavailable.
- Interactive, editable keyword table with persistent storage.

#### FR-105: Explorer Entry Point ("Resume Stream")
- Search initiates **only** when the candidate explicitly clicks the "Resume Stream" button below the Radar.
- Truthful state badges: `Idle · Profile Ready`, `Collecting...`, `Paused`, `Profile Incomplete`.
- Prevent accidental duplicate concurrent runs per profile.

#### FR-106: Search Scope & Truthful Platform Status
- Live crawling of direct ATS endpoints: Greenhouse, Ashby, Lever, RemoteOK, Remotive.
- Truthful reporting of LinkedIn and Indeed as `auth_required` with platform access limitations documented. Safe fallback to direct company career portals.

#### FR-107: Real-Time Radar & Verifiable Discovery Feed
- Hardware-accelerated Canvas Radar orbit displaying real database-backed discoveries.
- Real company logos (SVG) or neutral lettermarks; zero fake particles or mock events.
- Synchronization across Radar, Activity Feed, and Job List.

#### FR-108: Daily Partitioning & 5-Day Historical Archive
- Default view reflects current calendar day (Today).
- Dropdown selector allows browsing Today (0), Yesterday (1), 2 Days Ago (2), 3 Days Ago (3), and 4 Days Ago (4).
- Radar remains strictly present-only when browsing historical dates.

#### FR-109: Complete Excel Export
- Exports 100% of filtered records, fixing any legacy 10-row page caps.
- Sanitizes formula injection prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending `'`.
- Includes UTF-8 BOM (`\ufeff`) for Microsoft Excel encoding compatibility.

#### FR-110: Safe Excel Import
- Uploads `.csv` or `.xlsx` files up to 10MB with schema validation.
- Deduplicates incoming rows against existing URLs and `role + company`.
- Tags imported records as `source: "Excel Import"`, ensuring they never appear as newly discovered live Radar events.

---

### 5.2 Stage 2: Target Role Matching, ATS Optimization, and Application Automation (Planned)
- **FR-201: AI Generation Studio:** Synthesis of tailored resumes, customized cover letters, and outreach InMails.
- **FR-202: Deep ATS Matcher:** Algorithmic scoring ($0–100\%$) and missing keyword identification.
- **FR-203: Automation Pipelines:** Configurable submission pipelines with daily limits, match threshold guards, and supervised pre-flight review.
- **FR-204: User-Authorized Browser Sessions:** Encrypted Playwright browser profile persistence for legal portal interactions.

### 5.3 Stage 3: Lifecycle Tracking, Analytics Funnel & Interview Prep (Planned)
- **FR-301: Interactive Kanban Board:** Stages: `Saved` $\to$ `Applied` $\to$ `Screening` $\to$ `Technical` $\to$ `Offer` $\to$ `Archived`.
- **FR-302: Interview Intelligence Copilot:** Role-specific technical Q&A, STAR behavioral drills, and system design drills.
- **FR-303: Conversion Funnel Analytics:** Quantitative tracking of callback rates, response velocity, and skill ROI.

### 5.4 Stage 4: Autonomous Agent Swarms & MCP Ecosystem (Planned)
- **FR-401: Model Context Protocol (MCP):** Tool connectivity for compensation benchmarks, company research, and web tools.
- **FR-402: Autonomous Email Parser:** OAuth/IMAP background listener detecting application receipts, interview invites, and rejections.
- **FR-403: Multi-Agent Swarm:** Scout, Tailor, Apply, and Follow-Up cooperating agents.

### 5.5 Stage 5: Multi-Tenant Recruiter Mode & Enterprise Scale (Planned)
- **FR-501: Agency / Recruiter Roster:** Managing pools of candidate personas with Role-Based Access Control (RBAC).
- **FR-502: Distributed Worker Queues:** Celery/Temporal workers with proxy rotation.
- **FR-503: Enterprise Security & Compliance:** AES-256 storage, GDPR deletion endpoints, and exportable audit logs.

---

## 6. Non-Functional Requirements (NFR)

1. **Performance:**
   - Database read latency $< 15\text{ms}$ under SQLite WAL mode.
   - Frontend initial bundle size $< 400\text{kB}$ gzip with code splitting (`React.lazy`).
   - Radar Canvas rendering at 60–120 FPS with zero DOM thrashing.
2. **Reliability & Resilience:**
   - Per-source error isolation: Failure of one ATS feed (e.g. Lever) does not fail the discovery run.
   - Deterministic offline fallbacks for all AI endpoints.
3. **Security & Privacy:**
   - Passwords hashed with PBKDF2/SHA-256.
   - Complete formula injection protection in all spreadsheet operations.
   - No sensitive tokens, cookies, or personal credentials logged.
4. **Usability & Accessibility:**
   - 100% theme tokenized styling across 2 curated themes (`default`, `minimal`) in both Dark and Light modes with guaranteed input and button contrast.
   - WCAG 2.1 AA compliant contrast ratios across all active states.
   - Keyboard accessible navigation with visible focus rings.

---

## 7. Assumptions, Dependencies & Constraints

- **Python Runtime:** Python 3.12+ with standard libraries (`urllib`, `hashlib`, `sqlite3`).
- **Node Runtime:** Node.js 18+ with Vite 8 and React 18.
- **Database Engine:** SQLite 3 with Write-Ahead Logging (`WAL`) enabled.
- **Platform Limitations:** LinkedIn and Indeed enforce anti-bot controls (Cloudflare Turnstile, mandatory authwalls). Unauthenticated automated scraping is strictly forbidden; authenticated browser persistence or official APIs are required.
