import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure backend package can be imported regardless of execution working directory
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Support relative or absolute imports
try:
    from .database import init_db, get_db
    from .services.auth_service import get_current_user
    from .routers import (
        health,
        jobs,
        discovery,
        activities,
        profile,
        analytics,
        auth,
        settings,
        feedback,
        automation,
        generation,
        harvest,
        login
    )
except ImportError:
    from database import init_db, get_db
    from services.auth_service import get_current_user
    from routers import (
        health,
        jobs,
        discovery,
        activities,
        profile,
        analytics,
        auth,
        settings,
        feedback,
        automation,
        generation,
        harvest,
        login
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence: schema verification
    print("[INFO] Initializing Resume Porter Python Backend...")
    init_db()
    with get_db() as conn:
        cnt = conn.execute("SELECT COUNT(*) as cnt FROM jobs").fetchone()["cnt"]
        print(f"[OK] SQLite WAL Database verified: {cnt:,} jobs active.")
    yield
    print("[INFO] Resume Porter Backend shutdown complete.")

app = FastAPI(
    title="Resume Porter Backend API",
    description="High-concurrency Python/FastAPI backend powering the Resume Porter Job Search, AI ATS Matching, and Discovery Engine.",
    version="2.0.0",
    lifespan=lifespan
)

# Robust CORS Configuration to ensure seamless frontend UI/UX synchronization
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Public API Router (Open for health telemetry and authentication)
public_api_router = APIRouter(prefix="/api")
public_api_router.include_router(health.router)
public_api_router.include_router(auth.router)
public_api_router.include_router(auth.admin_router)

# 2. Protected API Router (100% Enforced JWT Authentication & Authorization)
protected_api_router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])
protected_api_router.include_router(jobs.router)
protected_api_router.include_router(discovery.router)
protected_api_router.include_router(activities.router)
protected_api_router.include_router(profile.router)
protected_api_router.include_router(analytics.router)
protected_api_router.include_router(settings.router)
protected_api_router.include_router(feedback.router)
protected_api_router.include_router(automation.router)
protected_api_router.include_router(generation.router)
protected_api_router.include_router(harvest.router)
protected_api_router.include_router(login.router)

app.include_router(public_api_router)
app.include_router(protected_api_router)
app.include_router(auth.admin_router)  # Direct /admin/users route for ASVS PRIV-01

@app.get("/")
def root():
    return {
        "service": "Resume Porter Python Backend",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "message": "Backend engine online and synchronized with UI/UX."
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[STARTUP] Starting FastAPI server on http://{host}:{port} (auto-reload enabled)")
    uvicorn.run("main:app", host=host, port=port, reload=True)
