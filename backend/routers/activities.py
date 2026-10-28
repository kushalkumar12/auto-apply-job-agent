import time
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, status

try:
    from ..database import get_db
    from ..models import ActivityCreate
    from ..services.auth_service import get_current_user
except (ImportError, ValueError):
    from database import get_db
    from models import ActivityCreate
    from services.auth_service import get_current_user

router = APIRouter(tags=["Activities"])

@router.get("/activities")
def get_activities(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = current_user.get("id") if current_user else None
    if not user_id:
        return {"total": 0, "activities": []}

    with get_db() as conn:
        cur = conn.cursor()
        rows = cur.execute(
            "SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        ).fetchall()
    activities = [dict(r) for r in rows]
    return {
        "total": len(activities),
        "activities": activities
    }

@router.post("/activities", status_code=status.HTTP_201_CREATED)
def create_activity(activity: ActivityCreate, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    act_id = f"act-{int(time.time() * 1000)}"
    time_str = datetime.now().strftime("%I:%M %p").lower()
    now = int(time.time() * 1000)
    user_id = current_user.get("id") if current_user else "default"

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, created_at, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            act_id,
            time_str,
            activity.platform or "System",
            activity.iconType or "bot",
            activity.text or "Activity logged",
            activity.countBadge or "Logged",
            "completed",
            now,
            user_id
        ))

    return {
        "id": act_id,
        "time": time_str,
        "platform": activity.platform or "System",
        "iconType": activity.iconType or "bot",
        "text": activity.text or "Activity logged",
        "countBadge": activity.countBadge or "Logged",
        "status": "completed"
    }

@router.delete("/activities")
def clear_activities(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = current_user.get("id") if current_user else None
    with get_db() as conn:
        cur = conn.cursor()
        if user_id:
            cur.execute("DELETE FROM activities WHERE user_id = ?", (user_id,))
        else:
            cur.execute("DELETE FROM activities WHERE user_id = 'default'")
    return {"success": True, "message": "Activities cleared."}
