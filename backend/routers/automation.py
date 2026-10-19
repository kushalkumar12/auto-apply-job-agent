import json
import time
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

router = APIRouter(prefix="/automation", tags=["Automation"])

class PipelineCreate(BaseModel):
    title: str
    targetRoles: str
    platforms: List[str]
    schedule: str
    frequencyLabel: str
    matchThreshold: Optional[int] = 85
    mode: Optional[str] = "Auto-Apply"

@router.get("/pipelines")
def get_pipelines():
    with get_db() as conn:
        cur = conn.cursor()
        rows = cur.execute("SELECT * FROM pipelines ORDER BY created_at DESC").fetchall()
    
    result = []
    for r in rows:
        d = dict(r)
        d["active"] = bool(d.get("active", 1))
        try:
            d["platforms"] = json.loads(d.get("platforms") or "[]")
        except Exception:
            d["platforms"] = []
        result.append(d)
    return {"pipelines": result}

@router.post("/pipelines", status_code=status.HTTP_201_CREATED)
def create_pipeline(p: PipelineCreate):
    pipe_id = f"pipe-{int(time.time()*1000)}"
    now = int(time.time() * 1000)
    platforms_json = json.dumps(p.platforms)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO pipelines (id, title, targetRoles, platforms, schedule, frequencyLabel, matchThreshold, appliedCount, active, lastRun, status, mode, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 'Just created', 'ACTIVE', ?, ?)
        """, (
            pipe_id,
            p.title,
            p.targetRoles,
            platforms_json,
            p.schedule,
            p.frequencyLabel,
            p.matchThreshold or 85,
            p.mode or "Auto-Apply",
            now
        ))

    return {
        "id": pipe_id,
        "title": p.title,
        "targetRoles": p.targetRoles,
        "platforms": p.platforms,
        "schedule": p.schedule,
        "frequencyLabel": p.frequencyLabel,
        "matchThreshold": p.matchThreshold or 85,
        "appliedCount": 0,
        "active": True,
        "lastRun": "Just created",
        "status": "ACTIVE",
        "mode": p.mode or "Auto-Apply"
    }

@router.put("/pipelines/{pipe_id}/toggle")
def toggle_pipeline(pipe_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        current_active = bool(row["active"])
        new_active = 0 if current_active else 1
        new_status = "ACTIVE" if new_active == 1 else "PAUSED"

        cur.execute("UPDATE pipelines SET active = ?, status = ? WHERE id = ?", (new_active, new_status, pipe_id))

    return {
        "id": pipe_id,
        "active": bool(new_active),
        "status": new_status,
        "message": f"Pipeline {new_status.lower()} successfully."
    }

@router.post("/pipelines/{pipe_id}/run")
def run_pipeline(pipe_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        new_count = row["appliedCount"] + 3
        now_time = "Just now"
        cur.execute("UPDATE pipelines SET appliedCount = ?, lastRun = ? WHERE id = ?", (new_count, now_time, pipe_id))

        # Log to activity feed
        act_id = f"act-auto-{int(time.time()*1000)}"
        cur.execute("""
            INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, created_at)
            VALUES (?, ?, ?, 'bot', ?, 'Auto-Applied', 'completed', ?)
        """, (
            act_id,
            "Just now",
            "AutoPilot",
            f"Autonomous batch dispatched for pipeline '{row['title']}' (3 applications submitted)",
            int(time.time()*1000)
        ))

    return {
        "id": pipe_id,
        "appliedCount": new_count,
        "lastRun": now_time,
        "message": f"Pipeline execution cycle dispatched successfully."
    }

@router.delete("/pipelines/{pipe_id}")
def delete_pipeline(pipe_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM pipelines WHERE id = ?", (pipe_id,))
    return {"success": True, "message": "Pipeline deleted."}
