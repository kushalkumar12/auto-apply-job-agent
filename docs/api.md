# Skill2Role: Complete REST & Streaming API Specification

**API Version:** 2.0.0 (Stage 1 Implemented & Verified)  
**Base URL:** `http://localhost:5000/api`  
**Swagger Interactive Documentation:** `http://localhost:5000/docs`  
**OpenAPI JSON Specification:** `http://localhost:5000/openapi.json`  
**Protocol:** HTTP/1.1 with Server-Sent Events (SSE) streaming support  
**Last Verified:** October 2026  

---

## 1. Global API Conventions

### 1.1 Base URL & Content Types
All functional endpoints are nested under the `/api` prefix. Standard request and response bodies use `application/json; charset=utf-8` unless specified as `multipart/form-data` (file uploads) or `text/event-stream` (SSE).

### 1.2 Authentication Header
Endpoints requiring authentication accept a JSON Web Token (JWT) in the HTTP Authorization header:
```http
Authorization: Bearer <jwt_access_token>
```
For local single-user development or desktop usage, if the header is omitted, endpoints fall back to `user_id = 'default'` and `profile_id = 'default'`.

### 1.3 Standard Error Responses
All error responses adhere to standard HTTP status codes and provide a consistent JSON payload:
```json
{
  "detail": "Descriptive error message indicating the validation or execution failure."
}
```

---

## 2. Health & System Status

### 2.1 Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Purpose:** Verifies backend process availability, database connectivity, and SQLite WAL status.
- **Authentication:** None (Public)
- **Status Code:** `200 OK`
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
- **cURL Example:**
  ```bash
  curl -X GET http://localhost:5000/api/health
  ```

---

## 3. Authentication & Account Management

### 3.1 User Registration
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Purpose:** Registers a new candidate account, hashes passwords with PBKDF2-HMAC-SHA256, and creates a default profile persona.
- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "name": "Kushal Kumar",
    "email": "kushal@example.com",
    "password": "SecurePassword123!",
    "avatar": "avatar_1"
  }
  ```
- **Validation Rules:**
  - `email`: Valid email format, converted to lowercase, unique.
  - `password`: String, minimum 6 characters.
  - `name`: Non-empty string.
- **Success Response (`200 OK`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_94b30e01",
      "email": "kushal@example.com",
      "name": "Kushal Kumar",
      "avatar": "avatar_1"
    }
  }
  ```
- **Error Response (`400 Bad Request`):**
  ```json
  {
    "detail": "Email already registered"
  }
  ```

### 3.2 User Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Purpose:** Authenticates local credentials and issues a signed JWT token.
- **Request Body:**
  ```json
  {
    "email": "kushal@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (`200 OK`):** Returns JWT token and user profile object.
- **Error Response (`401 Unauthorized`):** Invalid credentials.

### 3.3 Google OAuth Mock / Sign-in
- **Method:** `POST`
- **Path:** `/api/auth/google`
- **Purpose:** Idempotent Google sign-in. Automatically registers new users if not previously registered.
- **Request Body:**
  ```json
  {
    "email": "user@gmail.com",
    "name": "User Name",
    "avatar": "avatar_3"
  }
  ```

### 3.4 Get Current User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (`200 OK`):**
  ```json
  {
    "id": "usr_94b30e01",
    "email": "kushal@example.com",
    "name": "Kushal Kumar",
    "avatar": "avatar_1",
    "created_at": 1729384800000
  }
  ```

### 3.5 Update Avatar
- **Method:** `POST`
- **Path:** `/api/auth/avatar`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{"avatar": "avatar_4"}`

---

## 4. Candidate Profiles & Personas

### 4.1 Get Active Profile Data (Legacy / Standard)
- **Method:** `GET`
- **Path:** `/api/profile`
- **Purpose:** Fetches the active candidate profile data covering all 8 functional sections.
- **Success Response (`200 OK`):**
  ```json
  {
    "general": {
      "fullName": "Kushal Kumar",
      "email": "kushal@example.com",
      "phone": "+91 9876543210",
      "city": "Bengaluru",
      "country": "India"
    },
    "skillsList": ["Python", "FastAPI", "React"],
    "primarySkill": "Python",
    "experiences": [],
    "educationList": [],
    "selectedRoles": ["Backend Engineer"],
    "selectedLevels": ["Senior"],
    "resume": null
  }
  ```

### 4.2 Save / Update Active Profile
- **Method:** `POST`
- **Path:** `/api/profile`
- **Purpose:** Replaces the data for the active profile, automatically synchronizes `candidate_profiles` and legacy `profile` tables, and evaluates the 7 mandatory completeness fields.
- **Request Body:** Complete candidate profile JSON.
- **Success Response (`200 OK`):** Returns saved profile payload with updated timestamp.

### 4.3 Validate Mandatory Profile Gate
- **Method:** `GET`
- **Path:** `/api/profiles/active/validation`
- **Purpose:** Checks candidate profile against the 7 mandatory fields required before discovery or auto-apply can run.
- **Success Response (`200 OK`):**
  ```json
  {
    "isComplete": true,
    "missingFields": [],
    "percentage": 100,
    "profileName": "Backend Specialist",
    "activeProfileId": "prof_9b8c12a"
  }
  ```
  *When incomplete:*
  ```json
  {
    "isComplete": false,
    "missingFields": ["phone", "primarySkill", "resume"],
    "percentage": 57,
    "profileName": "Backend Specialist",
    "activeProfileId": "prof_9b8c12a"
  }
  ```

### 4.4 List Personas
- **Method:** `GET`
- **Path:** `/api/profiles`
- **Purpose:** Returns all candidate personas owned by the current user.
- **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": "default",
      "name": "Backend Python Persona",
      "is_active": 1,
      "is_complete": 1,
      "updated_at": 1729384800000
    },
    {
      "id": "prof_arch_02",
      "name": "Cloud Architect Persona",
      "is_active": 0,
      "is_complete": 0,
      "updated_at": 1729381200000
    }
  ]
  ```

### 4.5 Create New Persona
- **Method:** `POST`
- **Path:** `/api/profiles`
- **Request Body:**
  ```json
  {
    "name": "AI Engineer Persona",
    "data": { ... }
  }
  ```

### 4.6 Activate Persona
- **Method:** `POST`
- **Path:** `/api/profiles/{profile_id}/activate`
- **Purpose:** Sets the specified persona as `is_active = 1` and resets all other user personas to `0`. Updates Explorer radar target filters immediately.

### 4.7 Delete Persona
- **Method:** `DELETE`
- **Path:** `/api/profiles/{profile_id}`
- **Validation:** Cannot delete the only remaining active profile.

### 4.8 Generate Role Keywords via AI
- **Method:** `POST`
- **Path:** `/api/profile/keywords/generate`
- **Purpose:** Uses configured LLM (OpenAI, Gemini, Claude) or high-precision deterministic fallback to expand role titles into weighted search keywords.
- **Request Body:**
  ```json
  {
    "primarySkill": "Python",
    "skillsList": ["FastAPI", "Docker", "PostgreSQL"],
    "selectedRoles": ["Backend Engineer"]
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "keywords": [
      { "keyword": "FastAPI", "weight": 95, "category": "Framework" },
      { "keyword": "AsyncIO", "weight": 90, "category": "Core" },
      { "keyword": "PostgreSQL", "weight": 85, "category": "Database" }
    ],
    "source": "LLM / Deterministic Generator"
  }
  ```

### 4.9 Upload Resume Document
- **Method:** `POST`
- **Path:** `/api/profile/resume`
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (PDF, DOCX, TXT - max 10MB)
- **Success Response (`200 OK`):** Extracts text content, calculates skills, and updates active profile resume metadata.

---

## 5. Jobs & Opportunities

### 5.1 Query Jobs (Radar & Grid Feed)
- **Method:** `GET`
- **Path:** `/api/jobs`
- **Query Parameters:**
  - `search` *(string, optional)*: Filter across role, company, skills, or description.
  - `company` *(string, optional)*: Exact or substring company match.
  - `source` *(string, optional)*: Greenhouse, Ashby, Lever, RemoteOK, etc.
  - `workMode` *(string, optional)*: Remote, Hybrid, On-Site.
  - `minAts` *(integer, optional)*: Minimum ATS match score (0-100).
  - `dayOffset` *(integer, optional)*: 5-day historical offset (0 = Today, 1 = Yesterday, 2 = 2d ago...).
  - `marked` *(boolean, optional)*: Filter bookmarked/starred jobs.
  - `applied` *(integer, optional)*: 0 = Unapplied, 1 = Applied.
  - `limit` *(integer, default 50)*: Number of jobs to return.
  - `offset` *(integer, default 0)*: Pagination offset.
- **Success Response (`200 OK`):**
  ```json
  {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "jobs": [
      {
        "id": 101,
        "role": "Staff Backend Engineer",
        "company": "Vercel",
        "logo": "vercel",
        "source": "Ashby",
        "workMode": "Remote",
        "atsScore": 94,
        "dateTime": "19-Oct-26",
        "location": "Remote, Global",
        "salary": "$170,000 - $210,000",
        "description": "Building edge computing runtime...",
        "skills": ["Python", "FastAPI", "Go", "Docker"],
        "applied": 0,
        "marked": 1,
        "url": "https://jobs.ashbyhq.com/vercel/101",
        "profile_id": "default"
      }
    ]
  }
  ```

### 5.2 Export Jobs
- **Method:** `GET`
- **Path:** `/api/jobs/export`
- **Query Parameters:**
  - `format` *(string, default "csv")*: `"csv"`, `"xlsx"`, `"json"`.
  - All standard filter query parameters from `/api/jobs` apply.
- **Security Protections:** CSV output applies formula injection sanitization (prefixes `=, +, -, @` with `'`).
- **Response Headers:** `Content-Disposition: attachment; filename="skill2role_jobs_export_YYYYMMDD.csv"`

### 5.3 Import Jobs
- **Method:** `POST`
- **Path:** `/api/jobs/import`
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (`.csv`, `.xlsx`, `.json`)
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "totalRead": 15,
    "imported": 15,
    "skippedDuplicates": 0,
    "errors": []
  }
  ```

### 5.4 Toggle Job Application Status
- **Method:** `POST`
- **Path:** `/api/jobs/{id}/apply`
- **Purpose:** Marks job as applied (`applied = 1`), updates timestamp, and appends an entry to the `activities` audit log.
- **Success Response (`200 OK`):** `{"success": true, "jobId": 101, "applied": 1}`

### 5.5 Toggle Job Bookmark / Star
- **Method:** `POST`
- **Path:** `/api/jobs/{id}/mark`
- **Purpose:** Toggles marked state (`marked = 0` or `1`).
- **Success Response (`200 OK`):** `{"success": true, "jobId": 101, "marked": 1}`

### 5.6 5-Day Historical Summary
- **Method:** `GET`
- **Path:** `/api/jobs/history-summary`
- **Purpose:** Aggregates job counts and average ATS scores for the last 5 days to populate the Explorer historical trajectory chart.
- **Success Response (`200 OK`):**
  ```json
  [
    { "dayOffset": 0, "date": "19-Oct-26", "label": "Today", "total": 42, "avgAts": 88 },
    { "dayOffset": 1, "date": "18-Oct-26", "label": "Yesterday", "total": 35, "avgAts": 84 },
    { "dayOffset": 2, "date": "17-Oct-26", "label": "2d ago", "total": 29, "avgAts": 81 },
    { "dayOffset": 3, "date": "16-Oct-26", "label": "3d ago", "total": 51, "avgAts": 89 },
    { "dayOffset": 4, "date": "15-Oct-26", "label": "4d ago", "total": 18, "avgAts": 79 }
  ]
  ```

---

## 6. Discovery Engine & Live Radar

### 6.1 Discovery Statistics
- **Method:** `GET`
- **Path:** `/api/discovery/stats`
- **Purpose:** Summary counts of active connectors, total discovered jobs, average ATS score, and exclusions filtered out.

### 6.2 ATS Platform Connector Health
- **Method:** `GET`
- **Path:** `/api/discovery/connectors`
- **Purpose:** Returns the operational status and latency of supported scrapers.
- **Success Response (`200 OK`):**
  ```json
  [
    { "name": "Greenhouse", "type": "ATS API", "status": "online", "jobsAvailable": 120 },
    { "name": "Ashby", "type": "ATS API", "status": "online", "jobsAvailable": 85 },
    { "name": "Lever", "type": "ATS API", "status": "online", "jobsAvailable": 64 },
    { "name": "RemoteOK", "type": "Job Board", "status": "online", "jobsAvailable": 92 },
    { "name": "Remotive", "type": "Job Board", "status": "online", "jobsAvailable": 45 },
    { "name": "LinkedIn", "type": "Auth Required", "status": "standby", "note": "Requires Session Cookie in Stage 2" },
    { "name": "Indeed", "type": "Auth Required", "status": "standby", "note": "Requires Cloudflare Bypass in Stage 2" }
  ]
  ```

### 6.3 Start Discovery Radar Scan
- **Method:** `POST`
- **Path:** `/api/discovery/start`
- **Request Body:** `{"profileId": "default"}`
- **Validation Rules:**
  - Active profile must satisfy the 7 mandatory fields.
  - If incomplete, returns `400 Bad Request` with `{"detail": "Profile incomplete. Missing: [phone, resume]"}`.
- **Success Response (`200 OK`):**
  ```json
  {
    "status": "started",
    "runId": "run_1729385000_a1b2",
    "message": "Discovery radar initiated."
  }
  ```

### 6.4 Stop Discovery Radar Scan
- **Method:** `POST`
- **Path:** `/api/discovery/stop`
- **Success Response (`200 OK`):**
  ```json
  {
    "status": "stopped",
    "message": "Discovery process cancelled."
  }
  ```

### 6.5 Live Server-Sent Events (SSE) Stream
- **Method:** `GET`
- **Path:** `/api/discovery/stream`
- **Response Type:** `text/event-stream`
- **Payload Format:**
  ```text
  data: {"type": "sweep", "angle": 145, "status": "Scanning Ashby board for OpenAI..."}

  data: {"type": "job_found", "job": {"id": 102, "role": "Backend Engineer", "company": "OpenAI", "atsScore": 92}}

  data: {"type": "complete", "totalDiscovered": 18, "totalRetained": 12}
  ```

---

## 7. Harvest Scrapers & Sync

### 7.1 Harvest Scraper Status
- **Method:** `GET`
- **Path:** `/api/harvest/status`
- **Returns:** Last harvest time, total cached jobs, and next scheduled harvest.

### 7.2 Manual Harvest Sync
- **Method:** `POST`
- **Path:** `/api/harvest/sync`
- **Purpose:** Triggers on-demand crawl across Greenhouse, Ashby, Lever, RemoteOK, and Remotive feeds.

---

## 8. Dashboard Activities

### 8.1 List Activities
- **Method:** `GET`
- **Path:** `/api/activities`
- **Response:**
  ```json
  {
    "total": 3,
    "activities": [
      {
        "id": "act-1729384800",
        "time": "11:20 am",
        "platform": "Greenhouse",
        "iconType": "radar",
        "text": "Radar scan discovered 12 matching roles",
        "countBadge": "+12",
        "status": "completed"
      }
    ]
  }
  ```

### 8.2 Log Activity
- **Method:** `POST`
- **Path:** `/api/activities`
- **Request Body:**
  ```json
  {
    "platform": "Ashby",
    "iconType": "check",
    "text": "Application submitted for Senior Backend Engineer",
    "countBadge": "Success"
  }
  ```

### 8.3 Clear Activities
- **Method:** `DELETE`
- **Path:** `/api/activities`

---

## 9. Automation Pipelines (Stage 2 Precursor)

### 9.1 List Pipelines
- **Method:** `GET`
- **Path:** `/api/automation/pipelines`

### 9.2 Toggle Pipeline Active State
- **Method:** `POST`
- **Path:** `/api/automation/pipelines/{id}/toggle`
- **Response:** `{"success": true, "id": "pipe_01", "active": 1}`

### 9.3 Trigger Pipeline Immediate Run
- **Method:** `POST`
- **Path:** `/api/automation/pipelines/{id}/run`

---

## 10. AI Generation Studio & Tools

### 10.1 List Tailorable Jobs
- **Method:** `GET`
- **Path:** `/api/generation/jobs`
- **Returns:** Top candidate jobs with high ATS match eligible for cover letter and resume tailoring.

### 10.2 Generate Tailored Document
- **Method:** `POST`
- **Path:** `/api/generation/generate`
- **Request Body:**
  ```json
  {
    "jobId": 101,
    "docType": "cover_letter",
    "tone": "confident_professional"
  }
  ```
- **Response:**
  ```json
  {
    "jobId": 101,
    "docType": "cover_letter",
    "content": "Dear Hiring Team at Vercel,\n\nI am writing to express my enthusiasm for the Staff Backend Engineer role...",
    "source": "LLM Engine"
  }
  ```

---

## 11. Analytics & Conversion Funnel

### 11.1 Get System Analytics
- **Method:** `GET`
- **Path:** `/api/analytics`
- **Returns:** Discovered job counts, applied counts, interview rate, platform distribution, and historical progression.

---

## 12. Settings & System Administration

### 12.1 Get AI / MCP Settings
- **Method:** `GET`
- **Path:** `/api/settings/ai`
- **Response Example:**
  ```json
  {
    "openai_key": "sk-proj-****",
    "openai_model": "gpt-4o",
    "gemini_key": "AIzaSy****",
    "gemini_model": "gemini-1.5-pro",
    "claude_key": "",
    "claude_model": "claude-3-5-sonnet",
    "mcp_servers": []
  }
  ```

### 12.2 Update AI / MCP Settings
- **Method:** `POST`
- **Path:** `/api/settings/ai`
- **Request Body:** Partial or complete `AiSettingsUpdate` object.

### 12.3 Get Menu Navigation Layout
- **Method:** `GET`
- **Path:** `/api/settings/menu`
- **Response:** Ordered list of tabs with `id`, `label`, and `enabled` boolean flags.

### 12.4 Update Menu Navigation Layout
- **Method:** `POST`
- **Path:** `/api/settings/menu`
- **Request Body:**
  ```json
  {
    "items": [
      { "id": "explore", "label": "Explore", "enabled": true },
      { "id": "generation", "label": "Generation", "enabled": true },
      { "id": "automation", "label": "Automation", "enabled": false },
      { "id": "profile", "label": "Profile", "enabled": true },
      { "id": "analytics", "label": "Analytics", "enabled": true },
      { "id": "tools", "label": "Tools", "enabled": true }
    ]
  }
  ```

### 12.5 Factory Reset Application
- **Method:** `POST`
- **Path:** `/api/settings/factory-reset`
- **Request Body:**
  ```json
  {
    "projectName": "Skill2Role"
  }
  ```
- **Validation:** `projectName` must match `"Skill2Role"` or `"JobsOnly"`.
- **Side Effect:** Deletes all jobs, activities, pipelines, feedback tickets, explorer runs, and users. Performs SQLite `VACUUM`.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Database wiped clean: 0 jobs, 0 activities, 0 pipelines."
  }
  ```

---

## 13. Feedback & Bug Reporting

### 13.1 Submit Feedback Ticket
- **Method:** `POST`
- **Path:** `/api/feedback`
- **Request Body:**
  ```json
  {
    "category": "Bug Report",
    "rating": 5,
    "message": "Discovery radar worked smoothly with Greenhouse API.",
    "email": "kushal@example.com"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "ticketId": "fb_1729386000_1234"
  }
  ```
