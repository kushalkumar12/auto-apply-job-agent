# Skill2Role: Clean Environment Setup & Initialization Guide

**Document Purpose:** Complete, step-by-step instructions for provisioning, configuring, and verifying the Skill2Role development, testing, and production environments from a completely clean machine.  
**Verified Platform Compatibility:** Windows 10/11 (PowerShell), Ubuntu 22.04/24.04 LTS, macOS Sonoma (ARM/Intel)  
**Last Verified:** October 2026  

---

## 1. System Prerequisites & Verified Runtime Matrix

Ensure the following runtimes and developer tools are installed on your host machine before proceeding:

| Runtime / Tool | Minimum Version | Verified Version | Purpose | Installation Check Command |
| :--- | :---: | :---: | :--- | :--- |
| **Python** | 3.10+ | 3.12.3 | Backend API, crawlers, and database | `python --version` or `python3 --version` |
| **Node.js** | 18.x+ | 20.12.0+ | Frontend build toolchain & dev server | `node -v` |
| **npm** | 9.x+ | 10.5.0+ | Frontend package dependency manager | `npm -v` |
| **Git** | 2.30+ | 2.44.0+ | Source code version control | `git --version` |
| **SQLite** | 3.35+ | 3.45.1 | Embedded WAL database engine | `sqlite3 --version` |

---

## 2. Repository Cloning & Directory Preparation

```bash
# Clone the canonical repository
git clone https://github.com/kushalkumar12/resume-porter.git
cd resume-porter
```

Directory structure layout:
```text
resume-porter/
├── backend/          # Python FastAPI application root
├── frontend/         # React / Vite application root
├── docs/             # Technical and product documentation suite
└── README.md         # Repository entry point
```

---

## 3. Backend Environment Setup (FastAPI & SQLite)

### 3.1 Virtual Environment Provisioning
Isolate Python dependencies within a dedicated virtual environment.

**On Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```
*(If execution policy errors occur, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

**On Linux / macOS (Bash / Zsh):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 3.2 Dependency Installation
Install verified Python packages:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Verified `requirements.txt` contents:
- `fastapi>=0.115.0`
- `uvicorn[standard]>=0.30.0`
- `pydantic>=2.9.0`
- `python-multipart>=0.0.9`
- `pypdf>=5.0.0`

### 3.3 Database Auto-Initialization
Skill2Role does not require manual SQL migration scripts or external server instances. When the FastAPI application boots, the lifespan hook in `backend/main.py` calls `init_db()` in `backend/database.py`, automatically creating:
- SQLite database file at `backend/jobs.db`
- Write-Ahead Log files (`jobs.db-wal` and `jobs.db-shm`)
- All 10 schema tables and performance indexes
- Baseline singleton records (`settings_ai`, `settings_menu`, `candidate_profiles:default`)

To initialize without starting the web server, run:
```bash
python -c "from database import init_db; init_db(); print('Database initialized successfully!')"
```

---

## 4. Frontend Environment Setup (React & Vite)

Open a separate terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 4.1 Development Server Configuration
The frontend communicates with the backend via the Vite reverse proxy configured in `frontend/vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});
```

---

## 5. Running the Application

### 5.1 Local Development Mode
Start both services in separate terminal tabs or processes:

**Terminal 1 (Backend API):**
```bash
cd backend
# Ensure virtual environment is active
python main.py
```
- **Console Output:**
  ```text
  [INFO] Initializing Resume Porter Python Backend...
  [OK] SQLite WAL Database verified: 0 jobs active.
  INFO: Uvicorn running on http://127.0.0.1:5000 (Press CTRL+C to quit)
  ```
- **Interactive Swagger Docs:** `http://localhost:5000/docs`
- **Health Check Endpoint:** `http://localhost:5000/api/health`

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm run dev
```
- **Console Output:**
  ```text
  VITE v8.3.0 ready in 180 ms
  ➜  Local:   http://localhost:5173/
  ```
- Open `http://localhost:5173` in your web browser.

---

## 6. Environment Variables & Secret Configuration

By default, Skill2Role runs in a fully autonomous local mode without requiring mandatory external API keys. Deterministic fallbacks generate role keywords, calculate ATS match scores, and parse resume data.

To enable live LLM tailoring (OpenAI, Gemini, Claude) or remote MCP servers:

### 6.1 UI-Based Secret Storage (Recommended)
Navigate to **Settings > AI Engine** in the web application (`http://localhost:5173/#settings`):
- **OpenAI Key:** Enter key formatted as `sk-proj-...`
- **Google Gemini Key:** Enter key formatted as `AIzaSy...`
- **Anthropic Claude Key:** Enter key formatted as `sk-ant-...`
- **MCP Servers:** Paste server JSON configuration array.

*Security Notice: Keys entered via the UI are stored locally in the user's SQLite database (`settings_ai` table) on their host machine and are never transmitted to external telemetry servers.*

### 6.2 Optional Environment Variables
You can optionally define environment overrides in `backend/.env`:
```ini
# Optional Port & Host Overrides
HOST=127.0.0.1
PORT=5000
DEBUG=false

# Optional JWT Signing Key (defaults to secure generated internal key)
JWT_SECRET_KEY=your-custom-secure-hex-key-here
```

---

## 7. Verification & Health Checks

Perform these verification checks immediately after setup to ensure system integrity:

### 7.1 Backend Automated Verification
Run the 61-test acceptance suite:
```bash
cd backend
python test_backend.py
```
**Expected Output:**
```text
============================================================
TOTAL CHECKS: 61 | PASSED: 61 | FAILED: 0
[SUCCESS] ALL ACCEPTANCE CHECKS PASSED WITH 100% SUCCESS RATE!
============================================================
```

### 7.2 Frontend Production Bundle Check
Ensure the production build compiles with zero bundle or syntax defects:
```bash
cd frontend
npm run build
```
**Expected Output:**
```text
vite v8.3.0 building for production...
✓ 45 modules transformed.
dist/index.html                   0.85 kB
dist/assets/index-xxxx.css       32.40 kB │ gzip: 6.80 kB
dist/assets/index-xxxx.js       184.20 kB │ gzip: 58.10 kB
✓ built in 1.24s
```

---

## 8. Reset, Clean Slate & Teardown

If you ever wish to restore the application to a pristine blank state:

### 8.1 In-App Factory Reset
1. Navigate to `http://localhost:5173/#settings`.
2. Scroll to the **Danger Zone** section.
3. Type the project confirmation string: `Skill2Role`.
4. Click **Execute Complete Factory Reset**.
5. All jobs, runs, activities, and non-default personas are wiped, and the SQLite file is vacuumed.

### 8.2 Hard Filesystem Reset
To delete all local databases and recreate from scratch:
```bash
# Stop backend and frontend processes (Ctrl+C)
cd backend
rm jobs.db jobs.db-wal jobs.db-shm 2> /dev/null || del jobs.db*
python -c "from database import init_db; init_db()"
```
