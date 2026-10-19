from fastapi import APIRouter
from datetime import datetime

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    with get_db() as conn:
        cur = conn.cursor()
        job_cnt = cur.execute("SELECT COUNT(*) as cnt FROM jobs").fetchone()["cnt"]
        company_cnt = cur.execute("SELECT COUNT(DISTINCT company) as cnt FROM jobs").fetchone()["cnt"]
        act_cnt = cur.execute("SELECT COUNT(*) as cnt FROM activities").fetchone()["cnt"]

    return {
        "status": "ok",
        "service": "Resume Porter Python FastAPI Backend",
        "database": "SQLite (WAL Mode)",
        "totalJobsInDb": job_cnt,
        "distinctCompanies": company_cnt,
        "activitiesCount": act_cnt,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
