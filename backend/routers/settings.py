import json
import time
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends

try:
    from ..database import get_db
    from ..models import AiSettingsUpdate, FactoryResetRequest, MenuItem, MenuSettingsUpdate, ResetUserDataRequest
    from ..services.auth_service import get_current_user, reset_user_data_cascade
except (ImportError, ValueError):
    from database import get_db
    from models import AiSettingsUpdate, FactoryResetRequest, MenuItem, MenuSettingsUpdate, ResetUserDataRequest
    from services.auth_service import get_current_user, reset_user_data_cascade

router = APIRouter(prefix="/settings", tags=["Settings"])

def mask_key(key: str, prefix_len: int = 7, suffix_len: int = 4) -> str:
    if not key:
        return ""
    if len(key) <= prefix_len + suffix_len:
        return key[:3] + "..." + key[-2:] if len(key) > 5 else "••••••"
    return f"{key[:prefix_len]}...{key[-suffix_len:]}"

@router.get("/ai")
def get_ai_settings():
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM settings_ai WHERE id = 'default'").fetchone()

    if not row:
        return {
            "openai_key": "",
            "openai_model": "gpt-4o",
            "gemini_key": "",
            "gemini_model": "gemini-1.5-pro",
            "claude_key": "",
            "claude_model": "claude-3-5-sonnet",
            "mcp_servers": []
        }

    try:
        mcp_servers = json.loads(row["mcp_servers"] or "[]")
    except Exception:
        mcp_servers = []

    return {
        "openai_key": mask_key(row["openai_key"], 7, 4),
        "openai_model": row["openai_model"] or "gpt-4o",
        "gemini_key": mask_key(row["gemini_key"], 6, 4),
        "gemini_model": row["gemini_model"] or "gemini-1.5-pro",
        "claude_key": mask_key(row["claude_key"], 7, 4),
        "claude_model": row["claude_model"] or "claude-3-5-sonnet",
        "mcp_servers": mcp_servers
    }

@router.put("/ai")
def update_ai_settings(settings: AiSettingsUpdate):
    with get_db() as conn:
        cur = conn.cursor()
        current = cur.execute("SELECT * FROM settings_ai WHERE id = 'default'").fetchone()

        current_openai = current["openai_key"] if current and current["openai_key"] else ""
        current_gemini = current["gemini_key"] if current and current["gemini_key"] else ""
        current_claude = current["claude_key"] if current and current["claude_key"] else ""
        current_mcp = current["mcp_servers"] if current and current["mcp_servers"] else "[]"

        final_openai = settings.openai_key if (settings.openai_key and "..." not in settings.openai_key) else current_openai
        final_gemini = settings.gemini_key if (settings.gemini_key and "..." not in settings.gemini_key) else current_gemini
        final_claude = settings.claude_key if (settings.claude_key and "..." not in settings.claude_key) else current_claude
        final_mcp = json.dumps(settings.mcp_servers) if settings.mcp_servers is not None else current_mcp

        now = int(time.time() * 1000)

        cur.execute("""
            INSERT INTO settings_ai (id, openai_key, openai_model, gemini_key, gemini_model, claude_key, claude_model, mcp_servers, updated_at)
            VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                openai_key = excluded.openai_key,
                openai_model = excluded.openai_model,
                gemini_key = excluded.gemini_key,
                gemini_model = excluded.gemini_model,
                claude_key = excluded.claude_key,
                claude_model = excluded.claude_model,
                mcp_servers = excluded.mcp_servers,
                updated_at = excluded.updated_at
        """, (
            final_openai,
            settings.openai_model or "gpt-4o",
            final_gemini,
            settings.gemini_model or "gemini-1.5-pro",
            final_claude,
            settings.claude_model or "claude-3-5-sonnet",
            final_mcp,
            now
        ))

    return {"success": True, "message": "AI and MCP settings saved."}

DEFAULT_MENU_ITEMS = [
    {"id": "explore", "label": "Explore", "description": "Job Discovery Radar & Live ATS Feed", "enabled": True},
    {"id": "generation", "label": "Generation", "description": "AI Resume & Cover Letter Studio", "enabled": True},
    {"id": "automation", "label": "Automation", "description": "Autonomous Application Pipelines", "enabled": True},
    {"id": "profile", "label": "Job Profile", "description": "Candidate Identity & ATS Resume Data", "enabled": True},
    {"id": "analytics", "label": "Analytics", "description": "Application Metrics & Conversion Rates", "enabled": True},
    {"id": "tools", "label": "Tools", "description": "MCP Integrations & ATS Diagnostic Utilities", "enabled": True}
]

@router.get("/menu")
def get_menu_settings():
    """
    Retrieves the ordered navigation menu items and their enabled/disabled states.
    Reconciles missing items with the canonical default list so all tabs remain manageable.
    """
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM settings_menu WHERE id = 'default'").fetchone()

    if not row or not row["items"]:
        return {"items": DEFAULT_MENU_ITEMS}

    try:
        raw_items = json.loads(row["items"] or "[]")
        standard_map = {item["id"]: item for item in DEFAULT_MENU_ITEMS}
        merged_items = []
        seen_ids = set()

        for item in raw_items:
            item_id = item.get("id")
            if item_id in standard_map and item_id not in seen_ids:
                label = item.get("label") or standard_map[item_id]["label"]
                if item_id == "profile" and label == "Profile":
                    label = "Job Profile"
                merged_items.append({
                    "id": item_id,
                    "label": label,
                    "description": item.get("description") or standard_map[item_id]["description"],
                    "enabled": bool(item.get("enabled", True))
                })
                seen_ids.add(item_id)

        for std in DEFAULT_MENU_ITEMS:
            if std["id"] not in seen_ids:
                merged_items.append(std)

        return {"items": merged_items}
    except Exception:
        return {"items": DEFAULT_MENU_ITEMS}

@router.put("/menu")
def update_menu_settings(body: MenuSettingsUpdate):
    """
    Updates the reordered application menu items and their enabled/disabled states.
    Validates that at least one menu item remains enabled for accessibility.
    """
    if not body.items:
        raise HTTPException(status_code=400, detail="Menu items list cannot be empty.")

    has_enabled = any(item.enabled for item in body.items)
    if not has_enabled:
        raise HTTPException(
            status_code=400,
            detail="At least one menu item must remain enabled to ensure application accessibility."
        )

    standard_map = {item["id"]: item for item in DEFAULT_MENU_ITEMS}
    cleaned_items = []
    seen_ids = set()

    for item in body.items:
        if item.id in standard_map and item.id not in seen_ids:
            label = item.label or standard_map[item.id]["label"]
            if item.id == "profile" and label == "Profile":
                label = "Job Profile"
            cleaned_items.append({
                "id": item.id,
                "label": label,
                "description": item.description or standard_map[item.id]["description"],
                "enabled": bool(item.enabled)
            })
            seen_ids.add(item.id)

    # Append any omitted canonical items disabled
    for std in DEFAULT_MENU_ITEMS:
        if std["id"] not in seen_ids:
            cleaned_items.append({**std, "enabled": False})

    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO settings_menu (id, items, updated_at)
            VALUES ('default', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                items = excluded.items,
                updated_at = excluded.updated_at
        """, (json.dumps(cleaned_items), now))

    return {
        "success": True,
        "message": "Application menu configuration saved successfully.",
        "items": cleaned_items
    }

@router.post("/menu/reset")
def reset_menu_settings():
    """
    Resets the navigation menu layout back to factory default ordering and enables all items.
    """
    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO settings_menu (id, items, updated_at)
            VALUES ('default', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                items = excluded.items,
                updated_at = excluded.updated_at
        """, (json.dumps(DEFAULT_MENU_ITEMS), now))

    return {
        "success": True,
        "message": "Navigation menu reset to factory default layout.",
        "items": DEFAULT_MENU_ITEMS
    }

BLANK_PROFILE = {
    "avatar": "avatar_1",
    "selectedRoles": [],
    "selectedLevels": [],
    "primarySkill": "",
    "skillsList": [],
    "workFormats": {"remote": True, "hybrid": True, "onsite": True},
    "userLocation": "",
    "desiredLocations": [],
    "avoidCompanies": [],
    "avoidSkills": [],
    "avoidSources": [],
    "summary": "",
    "experiences": [],
    "educationList": [],
    "resume": None,
    "resumeAiMap": None,
    "contactLinks": [],
    "general": {
        "fullName": "",
        "email": "",
        "phone": "",
        "location": "",
        "links": ""
    },
    "screeningAnswers": [],
    "languages": []
}

@router.post("/reset-profile")
def reset_profile_data():
    """
    Deletes the candidate profile data and resets it to a blank template for this profile only.
    """
    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO profile (id, data, updated_at)
            VALUES ('default', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                updated_at = excluded.updated_at
        """, (json.dumps(BLANK_PROFILE), now))

        cur.execute("""
            UPDATE candidate_profiles
            SET data = ?, is_complete = 0, updated_at = ?
            WHERE is_active = 1 OR id = 'default'
        """, (json.dumps(BLANK_PROFILE), now))

    # Clean uploaded resume files if any
    upload_dir = Path(__file__).resolve().parent.parent / "uploads" / "resumes"
    if upload_dir.exists():
        for f in upload_dir.glob("*"):
            try:
                if f.is_file():
                    f.unlink()
            except Exception:
                pass

    return {
        "success": True, 
        "message": "Candidate Profile data has been completely deleted.",
        "profile": BLANK_PROFILE
    }

@router.post("/reset-user-data")
def reset_user_data_endpoint(
    body: Optional[ResetUserDataRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Safely resets candidate profile, resumes, documents, tailored CVs,
    pipelines, bookmarks, explorer runs, and activity feed for the authenticated user.
    CRITICAL: The user account, password, credentials, and active sessions
    are PRESERVED. The user remains logged in.
    """
    token_val = (body.confirmToken if body and body.confirmToken else "reset").strip().lower()
    allowed = ["reset", "skill2role", "resumeporter", "jobsonly", "confirm", "clear"]
    if not any(t in token_val for t in allowed):
        raise HTTPException(
            status_code=400,
            detail="Verification failed. Please type 'reset' or 'skill2role' to confirm."
        )

    with get_db() as conn:
        cur = conn.cursor()
        res = reset_user_data_cascade(cur, current_user["id"])
        return res

@router.post("/factory-reset")
def factory_reset_entire_data(body: FactoryResetRequest):
    """
    Performs complete factory reset of the entire application.
    Truncates entire DB and flushes every little thing.
    Accepts 'JobsOnly' or 'resume-porter' (case-insensitive).
    """
    input_clean = body.projectName.strip().lower().replace(" ", "").replace("-", "").replace("_", "")
    allowed_tokens = ["skill2role", "resumeporter", "jobsonly", "kushalkumar12/resumeporter", "reset", "porter", "skill"]
    
    matched = any(token in input_clean for token in allowed_tokens) or any(input_clean == token for token in allowed_tokens)
    if not matched:
        raise HTTPException(
            status_code=400, 
            detail=f"Verification failed. You typed '{body.projectName}'. Please type 'skill2role' or 'JobsOnly'."
        )

    with get_db() as conn:
        cur = conn.cursor()
        
        # 1. Truncate entire jobs table
        cur.execute("DELETE FROM jobs")
        
        # 2. Flush all activities
        cur.execute("DELETE FROM activities")
        
        # 3. Flush all pipelines
        cur.execute("DELETE FROM pipelines")
        
        # 4. Flush profile table
        cur.execute("DELETE FROM profile")
        
        # 5. Flush feedback tickets
        cur.execute("DELETE FROM feedback_tickets")
        
        # 6. Flush AI settings
        cur.execute("DELETE FROM settings_ai")

        # 7. Flush users
        cur.execute("DELETE FROM users")

        # 8. Flush search logs
        cur.execute("DELETE FROM search_logs")

        # 9. Flush menu settings
        cur.execute("DELETE FROM settings_menu")

    # 8. Clean all uploaded resumes
    upload_dir = Path(__file__).resolve().parent.parent / "uploads" / "resumes"
    if upload_dir.exists():
        for f in upload_dir.glob("*"):
            try:
                if f.is_file():
                    f.unlink()
            except Exception:
                pass

    return {
        "success": True,
        "message": "Entire database truncated and application flushed to a clean slate."
    }

