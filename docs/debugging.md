# Skill2Role: Practical Debugging & Troubleshooting Runbook

**Document Purpose:** Field-tested engineering runbook, diagnostic commands, known project-specific error signatures, root-cause analyses, and safe recovery procedures for developers and AI coding agents.  
**System Version:** 2.0.0 (Stage 1 Implemented & Verified)  
**Last Updated:** October 2026  

---

## 1. Quick Diagnostic Triage Table

| Symptom / Error Signature | Probable Root Cause | Immediate Diagnostic Command | Verified Solution |
| :--- | :--- | :--- | :--- |
| `sqlite3.OperationalError: database is locked` | SQLite process concurrency lock or WAL checkpoint block. | `Get-Process python` | Verify `PRAGMA busy_timeout = 5000;` and ensure connections use `with get_db():`. |
| `HTTP 403: Mandatory profile incomplete` | Attempted to start radar discovery without 7 complete fields. | `curl http://localhost:5000/api/profiles/active/validation` | Populate missing fields (`fullName`, `email`, `phone`, `city`, `primarySkill`, `selectedRoles`, `resume`). |
| `CORS Error: No 'Access-Control-Allow-Origin' header` | Frontend requesting wrong port or backend server not running. | `Test-NetConnection -Port 5000` | Ensure backend is active at `http://127.0.0.1:5000` and Vite proxy in `vite.config.js` is active. |
| `EventSource / SSE Connection Refused` | Server-Sent Events stream disconnected or blocked by proxy. | `curl -N http://localhost:5000/api/discovery/stream` | Verify FastAPI lifespan is running; check browser devtools Network tab for `text/event-stream`. |
| `Port 5000 or 5173 Already in Use` | Zombie Python or Node process running in the background. | `netstat -ano \| findstr :5000` | Terminate dangling PID: `taskkill /F /PID <PID>` (Windows) or `kill -9 <PID>` (Linux/macOS). |

---

## 2. Database Issues & Recovery Procedures

### 2.1 SQLite WAL Concurrency & Lock Resolution
- **Symptom:** API requests throw `sqlite3.OperationalError: database is locked` or hang for 5 seconds before failing.
- **Root Cause:** A long-running write transaction (e.g. bulk CSV import or crawler ingestion) held the database write lock without releasing it, or `WAL` mode was disabled.
- **Diagnostic Procedure:**
  1. Inspect whether WAL mode is active:
     ```bash
     sqlite3 backend/jobs.db "PRAGMA journal_mode;"
     ```
     *Output must be:* `wal`. If `delete`, execute: `PRAGMA journal_mode = WAL;`.
  2. Check for lingering lock files:
     ```powershell
     Get-ChildItem backend/jobs.db*
     ```
     Ensure `jobs.db-wal` and `jobs.db-shm` are present and accessible.
- **Recovery Procedure:**
  If the process is permanently hung, stop the backend server and perform a manual WAL checkpoint:
  ```bash
  sqlite3 backend/jobs.db "PRAGMA wal_checkpoint(TRUNCATE);"
  ```

### 2.2 Corrupted Database File or Migration Lock
- **Symptom:** `sqlite3.DatabaseError: file is not a database` or startup crash in `init_db()`.
- **Safe Recovery (Without Data Loss if Backed Up):**
  ```bash
  # Check integrity
  sqlite3 backend/jobs.db "PRAGMA integrity_check;"
  ```
- **Pristine Reset (Clean Slate):**
  If working in development and seeking a completely clean slate:
  ```powershell
  cd backend
  Remove-Item jobs.db, jobs.db-wal, jobs.db-shm -Force -ErrorAction SilentlyContinue
  python -c "from database import init_db; init_db(); print('Database recreated cleanly.')"
  ```

---

## 3. Profile Validation & Radar Gate Debugging

### 3.1 Understanding the 403 Forbidden Gate
- **Symptom:** Clicking **Start Radar** displays an alert: `Mandatory profile requirements incomplete.`
- **Underlying Logic:** In [backend/routers/discovery.py](file:///d:/JavaProjects/JobsOnly/backend/routers/discovery.py), `start_discovery()` calls `validate_candidate_profile(profile_data)`.
- **Diagnostic Command:**
  ```bash
  curl -s http://localhost:5000/api/profiles/active/validation | jq .
  ```
- **Example Response:**
  ```json
  {
    "isComplete": false,
    "missingFields": ["phone", "resume"],
    "percentage": 71
  }
  ```
- **Resolution:**
  1. Open the **Profile** tab in the UI (`#profile`).
  2. Enter the missing contact telephone number.
  3. Upload a PDF/DOCX resume file or type resume text into the text area.
  4. Click **Save Profile**.
  5. Rerun the validation endpoint. When `isComplete: true`, the Radar scan immediately unlocks.

---

## 4. Discovery Engine & Scraper Failures

### 4.1 ATS Scraper Connection Timeouts
- **Symptom:** Radar orbit animates but returns 0 jobs from Greenhouse or Ashby.
- **Root Cause:** External ATS board endpoint (e.g. `boards-api.greenhouse.io`) is experiencing transient latency or blocking automated User-Agents.
- **Diagnostics:**
  Test direct connectivity from the host terminal:
  ```bash
  curl -I https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true
  curl -I https://api.ashbyhq.com/posting-api/job-board/vercel
  ```
  Check status codes:
  - `200 OK`: Board is responsive; issue is internal parsing.
  - `404 Not Found`: Target company changed its board slug. Remove or update in `DEFAULT_GREENHOUSE_BOARDS`.
  - `429 Too Many Requests`: Rate-limited by the host ATS. Harvester will automatically back off.

---

## 5. Frontend & UI Debugging

### 5.1 CSS Custom Property Token Glitches
- **Symptom:** Elements render with unstyled white backgrounds or missing borders when toggling themes.
- **Diagnostic:** Inspect the element in Chrome/Edge DevTools (F12). Check if the CSS rule references an ad-hoc color (e.g. `#fff` or `bg-slate-900`) instead of `var(--rp-bg-card)` or `var(--rp-text-primary)`.
- **Rule:** Never use Tailwind classes or hardcoded hex colors. Verify against [frontend/src/index.css](file:///d:/JavaProjects/JobsOnly/frontend/src/index.css).

### 5.2 Server-Sent Events (SSE) Stream Drops
- **Symptom:** Radar sweep freezes mid-rotation and live status ceases updating.
- **Root Cause:** Browser closed the EventSource connection due to inactivity or sleep mode.
- **Resolution:** Frontend `RadarOrbit.jsx` includes auto-reconnect logic with exponential backoff:
  ```javascript
  const es = new EventSource('/api/discovery/stream');
  es.onerror = () => {
    es.close();
    setTimeout(reconnect, 2000);
  };
  ```

---

## 6. Process Management & Port Conflicts

### 6.1 Finding and Killing Zombie Processes on Windows
```powershell
# Find process holding port 5000
netstat -ano | findstr :5000
# Example output: TCP  127.0.0.1:5000  0.0.0.0:0  LISTENING  14280

# Kill process by PID
taskkill /F /PID 14280

# Find process holding Vite port 5173
netstat -ano | findstr :5173
taskkill /F /PID <PID>
```

### 6.2 Linux / macOS Port Resolution
```bash
# Identify process on port 5000
lsof -i :5000
kill -9 <PID>

# Identify process on port 5173
lsof -i :5173
kill -9 <PID>
```

---

## 7. Escalation & Bug Reporting Workflow

When a bug cannot be resolved via standard runbook steps:
1. Capture the exact traceback from the backend terminal stdout.
2. Note the active Candidate Persona and request payload.
3. Submit a ticket via the in-app feedback dialog or `POST /api/feedback`:
   ```bash
   curl -X POST http://localhost:5000/api/feedback \
     -H "Content-Type: application/json" \
     -d '{
       "category": "Bug Report",
       "rating": 1,
       "message": "Detailed traceback or unexpected behavior description...",
       "email": "dev@skill2role.internal"
     }'
   ```
4. Check the `feedback_tickets` table in SQLite for recorded diagnostics.
