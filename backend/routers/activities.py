import time
from datetime import datetime
from fastapi import APIRouter, status

try:
    from ..database import get_db
    from ..models import ActivityCreate
except (ImportError, ValueError):
    from database import get_db
    from models import ActivityCreate

router = APIRouter(tags=["Activities"])

@router.get("/activities")
def get_activities():
    with get_db() as conn:
        cur = conn.cursor()
        rows = cur.execute("SELECT * FROM activities ORDER BY created_at DESC LIMIT 50").fetchall()
    activities = [dict(r) for r in rows]
    return {
        "total": len(activities),
        "activities": activities
    }

@router.post("/activities", status_code=status.HTTP_201_CREATED)
def create_activity(activity: ActivityCreate):
    act_id = f"act-{int(time.time() * 1000)}"
    time_str = datetime.now().strftime("%I:%M %p").lower()
    now = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            act_id,
            time_str,
            activity.platform or "System",
            activity.iconType or "bot",
            activity.text or "Activity logged",
            activity.countBadge or "Logged",
            "completed",
            now
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
def clear_activities():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM activities")
    return {"success": True, "message": "All activities cleared."}
