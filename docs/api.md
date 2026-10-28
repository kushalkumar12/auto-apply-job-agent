# Skill2Role: Complete REST & Streaming API Specification

**API Version:** 2.0.0 (Stage 1 & Stage 2 Verified)  
**Base URL:** `http://localhost:5000/api`  
**Swagger Interactive Documentation:** `http://localhost:5000/docs`  
**OpenAPI JSON Specification:** `http://localhost:5000/openapi.json`  
**Protocol:** HTTP/1.1 with Server-Sent Events (SSE) streaming support  
**Audit & Review Date:** October 21, 2026  
**Audited Repository State:** Commit working tree (`backend/main.py`, `backend/routers/*`)  

---

> [!WARNING]
> **Auth Router Duplication & Token Notice:**  
> The backend currently exposes two separate authentication routers: `/api/auth/*` (in `backend/main.py`) and `/api/login/*` (in `backend/routers/login.py`). Tokens are currently issued as plain strings formatted as `tok_<user_id>` rather than signed JWTs. Refactoring to a unified PBKDF2 + JWT architecture is scheduled for Phase 1 remediation.

---

## 1. Global API Conventions

### 1.1 Base URL & Content Types
All functional endpoints are nested under the `/api` prefix. Standard request and response bodies use `application/json; charset=utf-8` unless specified as `multipart/form-data` (file uploads) or `text/event-stream` (SSE).

### 1.2 Authentication Header
Endpoints requiring authentication accept a bearer token in the HTTP Authorization header:
```http
Authorization: Bearer <token>
```
If omitted during local development or desktop usage, endpoints fall back to `user_id = 'default'` and `profile_id = 'default'`.

### 1.3 Standard Error Responses
Standard HTTP error responses adhere to the following JSON schema:
```json
{
  "detail": "Descriptive error message indicating the validation or execution failure."
}
```

---

## 2. Health & Telemetry

### 2.1 Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Authentication:** None
- **Response Example:**
  ```json
  {
    "status": "ok",
    "app": "Resume Porter",
    "version": "2.0.0",
    "timestamp": 1729384800000,
    "db": "connected"
  }
  ```

---

## 3. Authentication & Account Management (`backend/routers/auth.py` & `services/auth_service.py`)

- **Register:** `POST /api/auth/register` (email, password, name, avatar) $\rightarrow$ `{ "token": "<signed_hs256_jwt>", "user": {...} }`
  - Hashes passwords with PBKDF2-HMAC-SHA256 (100,000 iterations, 16-byte random salt).
- **Login:** `POST /api/auth/login` (email, password) $\rightarrow$ `{ "token": "<signed_hs256_jwt>", "user": {...} }`
  - Verifies PBKDF2 hash or performs safe transparent upgrade for legacy SHA-256 credentials.
- **Google Identity Verification:** `POST /api/auth/google` (credential or id_token) $\rightarrow$ `{ "token": "<signed_hs256_jwt>", "user": {...} }`
  - Cryptographically verifies Google OAuth2 identity token signature, expiration, and verified email. Rejects raw emails.
- **Get Current User:** `GET /api/auth/me` (Header: `Authorization: Bearer <jwt>`) $\rightarrow$ `{ "user": { "id": "...", "email": "...", "name": "...", "avatar": "...", "authProvider": "..." } }`
  - Validates signature, 24h expiration, issuer (`skill2role`), and subject. Rejects forgeable `tok_<id>` plaintext strings with HTTP 401.
- **Update Avatar:** `PUT /api/auth/avatar` (Header: `Authorization: Bearer <jwt>`, Body: `{ "avatar": "avatar_1" }`) $\rightarrow$ `{ "success": true, "avatar": "..." }`
- **Forgot Password:** `POST /api/auth/forgot-password` (email) $\rightarrow$ `{ "success": true, "message": "..." }`

---

## 4. Candidate Profiles & Personas

- **Get Active Profile:** `GET /api/profile`
- **Update Active Profile:** `POST /api/profile` (JSON body)
- **7-Field Mandatory Gate Validation:** `GET /api/profiles/active/validation`
  - *Returns:* `{ "is_complete": true/false, "missing_fields": [], "completeness_score": 100 }`
- **List Personas:** `GET /api/profiles`
- **Create Persona:** `POST /api/profiles` (name, data)
- **Activate Persona:** `POST /api/profiles/{id}/activate`
- **Delete Persona:** `DELETE /api/profiles/{id}`
- **Generate Role Keywords:** `POST /api/profile/keywords/generate` (primarySkill, experience)
- **Upload Resume File:** `POST /api/profile/resume/upload` (multipart/form-data)

---

## 5. Jobs & Opportunities

- **Query Jobs (with Filters & Pagination):** `GET /api/jobs`
  - *Query Params:* `page`, `page_size`, `query`, `skill`, `platform`, `date_offset` (0–5), `bookmarked_only`, `applied_only`.
- **Export Jobs (CSV/Excel):** `GET /api/jobs/export?format=csv`
  - *Protection:* Prepends single quotes to dangerous formula characters (`'=,+,-,@`).
- **Import Jobs (Excel/CSV):** `POST /api/jobs/import` (multipart file upload)
- **Toggle Application Status:** `POST /api/jobs/{id}/apply`
- **Toggle Bookmark / Star:** `POST /api/jobs/{id}/mark`
- **5-Day Historical Analytics Summary:** `GET /api/jobs/history-summary`

---

## 6. Discovery Engine & Live Radar

- **Connector Health & Status:** `GET /api/discovery/connectors`
  - *Platforms:* Greenhouse, Ashby, Lever, RemoteOK, Naukri, LinkedIn.
- **Start Radar Scan:** `POST /api/discovery/start`
  - *Validation:* Returns HTTP 403 Forbidden if candidate profile fails 7-field gate.
- **Stop Radar Scan:** `POST /api/discovery/stop`
- **Live SSE Discovery Stream:** `GET /api/discovery/stream`
  - *Media Type:* `text/event-stream`
  - *Events:* `heartbeat`, `scanning_status`, `job_discovered`, `scan_complete`.

---

## 7. Stage 2 Generation Studio & Local RAG Endpoints (`routers/generation.py`)

### 7.1 Ingest Candidate Resume
- **Method:** `POST`
- **Path:** `/api/generation/ingest`
- **Purpose:** Parses resume text, extracts 6 categories of career facts, creates text chunks, computes 384-dim TF-IDF embeddings, and populates SQLite FTS5 index.
- **Request Body:**
  ```json
  {
    "profile_id": "prof_123",
    "resume_text": "Experienced Backend Engineer with 5 years building distributed Python microservices..."
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "facts_extracted": 18,
    "chunks_created": 4,
    "embeddings_generated": 4
  }
  ```

### 7.2 Analyze Job Description
- **Method:** `POST`
- **Path:** `/api/generation/analyze-job`
- **Purpose:** Extracts core technical competencies, years of experience, and requirement keywords from a job posting.
- **Request Body:**
  ```json
  {
    "job_id": 101,
    "description": "Looking for a Staff Python Architect with deep Kubernetes and SQLite expertise..."
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "job_id": 101,
    "required_skills": ["Python", "Kubernetes", "SQLite"],
    "experience_years": 8,
    "key_responsibilities": ["Architect microservices", "Lead database optimization"]
  }
  ```

### 7.3 Hybrid RRF Retrieval
- **Method:** `POST`
- **Path:** `/api/generation/retrieve`
- **Purpose:** Executes Reciprocal Rank Fusion blending SQLite FTS5 lexical matching with vector cosine similarity.
- **Request Body:**
  ```json
  {
    "profile_id": "prof_123",
    "query": "Kubernetes cluster management and container orchestration",
    "top_k": 5
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "chunks": [
      {
        "chunk_id": "chk_01",
        "score": 0.892,
        "text": "Managed production Kubernetes clusters across 3 multi-zone AWS environments..."
      }
    ]
  }
  ```

### 7.4 Grounded Generation
- **Method:** `POST`
- **Path:** `/api/generation/generate`
- **Purpose:** Generates a grounded cover letter or tailored resume using Gemini / fallback LLM with strict factual constraints.
- **Request Body:**
  ```json
  {
    "job_id": 101,
    "profile_id": "prof_123",
    "doc_type": "cover_letter",
    "tone": "confident_professional"
  }
  ```

### 7.5 Sentence Factual Validation
- **Method:** `POST`
- **Path:** `/api/generation/validate`
- **Purpose:** Validates draft bullet points against extracted career facts using token overlap and containment.
- **Request Body:**
  ```json
  {
    "profile_id": "prof_123",
    "draft_text": "Led engineering team of 50 engineers at Google."
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "is_valid": false,
    "hallucination_score": 0.85,
    "unsupported_sentences": [
      "Led engineering team of 50 engineers at Google."
    ],
    "explanation": "Claimed company 'Google' and team size '50' not found in verified career facts."
  }
  ```

### 7.6 Full End-to-End Tailoring
- **Method:** `POST`
- **Path:** `/api/generation/tailor`
- **Purpose:** Ingests JD, retrieves relevant resume facts, generates aligned bullets, runs factual validation, and saves draft in `tailored_resumes`.

### 7.7 Multi-Format Export
- **Method:** `POST`
- **Path:** `/api/generation/export`
- **Request Body:**
  ```json
  {
    "resume_id": "tailor_456",
    "format": "html"
  }
  ```
- **Supported Formats:** `html`, `markdown`, `plain_text`, `docx`, `json_ld`.

### 7.8 Compliance Submission Gate Check
- **Method:** `POST`
- **Path:** `/api/generation/gate-check`
- **Purpose:** Executes 6-stage deterministic compliance check before permitting any application submission.
- **Request Body:**
  ```json
  {
    "job_id": 101,
    "resume_id": "tailor_456",
    "user_approved": true
  }
  ```
- **Responses:**
  - *Success (`200 OK`):* `{ "approved": true, "compliance_token": "cmp_tok_..." }`
  - *Blocked (`422 Unprocessable Entity`):* `{ "approved": false, "reason": "Draft contains unverified skills: [Rust]" }`

---

## 8. Automation Pipelines (Auto-Apply)

- **List Pipelines:** `GET /api/automation/pipelines`
- **Toggle Pipeline:** `POST /api/automation/pipelines/{id}/toggle`
- **Trigger Pipeline Run:** `POST /api/automation/run` *(Currently executes simulation loop; live external submission disabled)*

---

## 9. Settings & Administration

- **Get AI & Model Config:** `GET /api/settings/ai`
- **Update AI & Model Config:** `POST /api/settings/ai`
- **Get Menu Layout:** `GET /api/settings/menu`
- **Update Menu Layout:** `POST /api/settings/menu`
- **Factory Reset Application:** `POST /api/settings/factory-reset` (requires `{ "projectName": "Skill2Role" }`)
- **Submit Feedback Ticket:** `POST /api/feedback`
