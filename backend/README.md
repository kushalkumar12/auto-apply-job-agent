# Resume Porter: Python FastAPI Backend

High-concurrency, asynchronous Python backend powering **Resume Porter** (`JobsOnly`), featuring 15,500+ indexed job listings, Server-Sent Events (SSE) live discovery streaming, ATS scoring metrics, activity feed logging, and user authentication.

---

## 🛠️ Technology Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Modeling & Validation**: [Pydantic v2](https://docs.pydantic.dev/)
- **Database**: SQLite 3 with Write-Ahead Logging (`WAL` mode) and busy timeout resilience
- **Streaming**: Native Server-Sent Events (`StreamingResponse` / `text/event-stream`)
- **Security**: SHA-256 password salting, secret API key masking, and prepared SQL queries

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
# Direct Python execution:
python main.py

# Or via Uvicorn CLI:
python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```
The server will boot on `http://127.0.0.1:5000`.

### 3. Interactive API Documentation
- **Swagger UI**: [http://127.0.0.1:5000/docs](http://127.0.0.1:5000/docs)
- **ReDoc**: [http://127.0.0.1:5000/redoc](http://127.0.0.1:5000/redoc)

### 4. Run Automated Test Suite
```bash
python test_backend.py
```

---

## 📡 API Endpoints Specification

### 1. Health & Status
- `GET /api/health`: Health status, active records, and database telemetry.

### 2. Jobs Discovery & Applications
- `GET /api/jobs`: Server-paginated query supporting search, company, source, workMode, and minAts filtering across 15,500+ records.
- `GET /api/jobs/{id}`: Detailed job metadata with parsed competencies.
- `POST /api/jobs/{id}/apply`: Toggles application state and auto-logs activity to the live feed.

### 3. Radar Discovery Engine
- `GET /api/discovery/stats`: Overall scanning stats and top enterprise companies.
- `GET /api/discovery/stream`: Server-Sent Events (SSE) broadcasting real-time job discoveries.
- `GET /api/companies`: Aggregated company directory with job volume.

### 4. Live Activities
- `GET /api/activities`: Recent 50 autonomous activities and applications.
- `POST /api/activities`: Log autonomous or manual user event.
- `DELETE /api/activities`: Clear activity history.

### 5. Profile & Preferences
- `GET /api/profile`: User candidate profile, target roles, and location preferences.
- `PUT /api/profile`: Deep merge and atomic profile persistence.

### 6. Analytics & Intelligence
- `GET /api/analytics`: ATS scores, application volume, and platform interview conversion rates.

### 7. Authentication Suite
- `POST /api/auth/login`: Email/password verification.
- `POST /api/auth/register`: User creation and token issuance.
- `POST /api/auth/google`: Quick Google OAuth simulation.
- `POST /api/auth/forgot-password`: Anti-enumeration password reset dispatch.
- `GET /api/auth/me`: Current session hydration.
- `PUT /api/auth/avatar`: Avatar identifier update.

### 8. AI & MCP Integrations
- `GET /api/settings/ai`: Masked API keys for OpenAI, Gemini, Claude, and registered MCP servers.
- `PUT /api/settings/ai`: Update credentials and tool endpoints.

### 9. Feedback & Support
- `POST /api/feedback`: Submit feedback or issue ticket.
- `GET /api/feedback/tickets`: List recent submitted tickets.
