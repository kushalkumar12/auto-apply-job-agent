import time
from fastapi import APIRouter, HTTPException, status

try:
    from ..database import get_db
    from ..models import FeedbackCreate
except (ImportError, ValueError):
    from database import get_db
    from models import FeedbackCreate

router = APIRouter(tags=["Feedback"])

@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(ticket: FeedbackCreate):
    if not ticket.message or not ticket.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty.")

    ticket_id = f"tkt_{int(time.time() * 1000)}"
    now = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO feedback_tickets (id, category, rating, message, user_email, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'open', ?)
        """, (
            ticket_id,
            ticket.category or "General",
            ticket.rating if ticket.rating is not None else 5,
            ticket.message.strip(),
            ticket.email or "",
            now
        ))

    return {
        "success": True,
        "ticketId": ticket_id,
        "message": "Your feedback and issue ticket has been registered."
    }

@router.get("/feedback/tickets")
def get_feedback_tickets():
    with get_db() as conn:
        cur = conn.cursor()
        rows = cur.execute("SELECT * FROM feedback_tickets ORDER BY created_at DESC LIMIT 20").fetchall()
    return {"tickets": [dict(r) for r in rows]}
