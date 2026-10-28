import json
import time
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Query

try:
    from ..database import get_db
    from ..services.submission_gate import evaluate_submission_gate
    from ..services.auth_service import get_current_user
except (ImportError, ValueError):
    from database import get_db
    from services.submission_gate import evaluate_submission_gate
    from services.auth_service import get_current_user

router = APIRouter(prefix="/automation", tags=["Automation"])

class PipelineCreate(BaseModel):
    title: str
    targetRoles: str
    platforms: List[str]
    schedule: str
    frequencyLabel: str
    matchThreshold: Optional[int] = 85
    mode: Optional[str] = "Auto-Apply"
    profile_id: Optional[str] = None

@router.get("/pipelines")
def get_pipelines(
    profile_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    with get_db() as conn:
        cur = conn.cursor()
        resolved_pid = profile_id
        if not resolved_pid:
            p_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
            if not p_row:
                p_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()
            resolved_pid = p_row["id"] if p_row else "default"
        else:
            p_row = cur.execute("SELECT id FROM candidate_profiles WHERE id = ? AND user_id = ?", (resolved_pid, user_id)).fetchone()
            if not p_row:
                other_u = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
                if other_u and other_u["user_id"] != user_id:
                    raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's candidate profile pipelines.")
                resolved_pid = "default"

        rows = cur.execute(
            "SELECT * FROM pipelines WHERE user_id = ? AND profile_id = ? ORDER BY created_at DESC",
            (user_id, resolved_pid)
        ).fetchall()
    
    result = []
    for r in rows:
        d = dict(r)
        d["active"] = bool(d.get("active", 1))
        try:
            d["platforms"] = json.loads(d.get("platforms") or "[]")
        except Exception:
            d["platforms"] = []
        result.append(d)
    return {"pipelines": result, "profileId": resolved_pid}

@router.post("/pipelines", status_code=status.HTTP_201_CREATED)
def create_pipeline(
    p: PipelineCreate,
    profile_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    pipe_id = f"pipe-{int(time.time()*1000)}"
    now = int(time.time() * 1000)
    platforms_json = json.dumps(p.platforms)

    with get_db() as conn:
        cur = conn.cursor()
        resolved_pid = p.profile_id or profile_id
        if not resolved_pid:
            p_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
            if not p_row:
                p_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()
            resolved_pid = p_row["id"] if p_row else "default"
        else:
            p_row = cur.execute("SELECT id FROM candidate_profiles WHERE id = ? AND user_id = ?", (resolved_pid, user_id)).fetchone()
            if not p_row:
                other_u = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
                if other_u and other_u["user_id"] != user_id:
                    raise HTTPException(status_code=403, detail="Forbidden: You cannot create pipelines for another user's candidate profile.")

        cur.execute("""
            INSERT INTO pipelines (id, title, targetRoles, platforms, schedule, frequencyLabel, matchThreshold, appliedCount, active, lastRun, status, mode, user_id, profile_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 'Just created', 'ACTIVE', ?, ?, ?, ?)
        """, (
            pipe_id,
            p.title,
            p.targetRoles,
            platforms_json,
            p.schedule,
            p.frequencyLabel,
            p.matchThreshold or 85,
            p.mode or "Auto-Apply",
            user_id,
            resolved_pid,
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
        "mode": p.mode or "Auto-Apply",
        "profileId": resolved_pid,
        "userId": user_id
    }

@router.put("/pipelines/{pipe_id}/toggle")
def toggle_pipeline(pipe_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        if row["user_id"] != user_id and row["user_id"] != 'default':
            raise HTTPException(status_code=403, detail="Forbidden: You cannot toggle another user's pipeline.")

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

class PipelineRunRequest(BaseModel):
    user_approved: bool = False
    profile_id: Optional[str] = None

@router.post("/pipelines/{pipe_id}/run")
def run_pipeline(
    pipe_id: str,
    body: Optional[PipelineRunRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        if row["user_id"] != user_id and row["user_id"] != 'default':
            raise HTTPException(status_code=403, detail="Forbidden: You cannot run another user's pipeline.")

    # Enforce External Submission Gate before dispatching autonomous cycles
    user_approved = body.user_approved if body else False
    target_pid = (body.profile_id if body and body.profile_id else None) or row["profile_id"]

    allowed, code, reasons = evaluate_submission_gate(
        job_id=None,
        profile_id=target_pid,
        user_approved=user_approved
    )
    if not allowed:
        status_code = 400 if code == "USER_APPROVAL_REQUIRED" else 422
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": code,
                "message": "Autonomous application dispatch is blocked by the submission gate.",
                "reasons": reasons
            }
        )

    with get_db() as conn:
        cur = conn.cursor()
        new_count = row["appliedCount"] + 3
        now_time = "Just now"
        cur.execute("UPDATE pipelines SET appliedCount = ?, lastRun = ? WHERE id = ?", (new_count, now_time, pipe_id))

        # Log to activity feed with user and profile scoping
        act_id = f"act-auto-{int(time.time()*1000)}"
        cur.execute("""
            INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, user_id, profile_id, created_at)
            VALUES (?, ?, ?, 'bot', ?, 'Auto-Applied', 'completed', ?, ?, ?)
        """, (
            act_id,
            "Just now",
            "AutoPilot",
            f"Autonomous batch dispatched for pipeline '{row['title']}' (3 applications submitted)",
            user_id,
            target_pid,
            int(time.time()*1000)
        ))

    return {
        "id": pipe_id,
        "appliedCount": new_count,
        "lastRun": now_time,
        "message": f"Pipeline execution cycle dispatched successfully."
    }

@router.delete("/pipelines/{pipe_id}")
def delete_pipeline(pipe_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        if row["user_id"] != user_id and row["user_id"] != 'default':
            raise HTTPException(status_code=403, detail="Forbidden: You cannot delete another user's pipeline.")

        cur.execute("DELETE FROM pipelines WHERE id = ?", (pipe_id,))
    return {"success": True, "message": "Pipeline deleted."}
