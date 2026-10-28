"""
External-Submission Gate for Skill2Role System.
Enforces strict pre-submission verification across all channels:
1. Direct application API (POST /jobs/{id}/apply)
2. Autonomous pipeline runs (POST /automation/pipelines/{id}/run)
3. Background workers & queued jobs
4. Browser automation sessions

Guarantees:
- Submission is strictly blocked unless the candidate profile is complete and verified.
- Submission is strictly blocked if the master resume or contact details contain placeholder/synthetic data.
- Submission is strictly blocked if the target job lacks a verified tailored resume.
- Submission requires explicit, mandatory user approval.
- No external application can ever be submitted silently or accidentally.
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

try:
    from ..database import get_db
    from .resume_exporter import detect_placeholder_contact_info
except (ImportError, ValueError):
    from database import get_db
    from services.resume_exporter import detect_placeholder_contact_info

# Strict environment safety switch
EXTERNAL_SUBMISSIONS_ENABLED = os.environ.get("SKILL2ROLE_ENABLE_EXTERNAL_SUBMISSIONS", "false").lower() in ("true", "1", "yes")

def evaluate_submission_gate(
    job_id: Optional[int] = None,
    profile_id: Optional[str] = None,
    user_approved: bool = False,
    user_id: Optional[str] = None
) -> Tuple[bool, str, List[str]]:
    """
    Evaluates all security, verification, and human approval gates before allowing an external job application.
    Returns: (allowed: bool, status_code_label: str, reasons: List[str])
    """
    reasons = []

    # 1. USER APPROVAL GATE
    if not user_approved:
        reasons.append("Mandatory User Approval: Explicit user review and confirmation is required before any application can be submitted externally.")
        return False, "USER_APPROVAL_REQUIRED", reasons

    # 2. PROFILE & CONTACT DATA INTEGRITY
    with get_db() as conn:
        cur = conn.cursor()

        # Resolve candidate profile
        if profile_id:
            prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE id = ?", (profile_id,)).fetchone()
        elif user_id:
            prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE user_id = ? AND is_active = 1 LIMIT 1", (user_id,)).fetchone()
            if not prof_row:
                prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()
            if not prof_row:
                prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
            if not prof_row:
                prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE id = 'default'").fetchone()
        else:
            prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
            if not prof_row:
                prof_row = cur.execute("SELECT * FROM candidate_profiles WHERE id = 'default'").fetchone()

        if not prof_row:
            reasons.append("No active candidate profile found in database.")
            return False, "SUBMISSION_GATE_BLOCKED", reasons

        try:
            p_data = json.loads(prof_row["data"]) if prof_row["data"] else {}
        except Exception:
            p_data = {}

        # Check profile completion
        if not bool(prof_row["is_complete"]):
            reasons.append("Candidate profile is incomplete. All mandatory profile fields must be completed.")

        # Check contact details for placeholder / synthetic data
        contact_check_dict = {
            "candidate_name": p_data.get("general", {}).get("fullName") or p_data.get("contacts", {}).get("fullName") or p_data.get("fullName", ""),
            "contact_info": {
                "email": p_data.get("general", {}).get("email") or p_data.get("contacts", {}).get("email") or p_data.get("email", ""),
                "phone": p_data.get("general", {}).get("phone") or p_data.get("contacts", {}).get("phone") or p_data.get("phone", ""),
                "linkedin": p_data.get("general", {}).get("links") or p_data.get("contacts", {}).get("linkedIn") or ""
            }
        }
        placeholders = detect_placeholder_contact_info(contact_check_dict)
        if placeholders:
            for ph in placeholders:
                reasons.append(f"Synthetic contact information detected: {ph}")

        # Check if email or phone is missing
        c_email = contact_check_dict["contact_info"]["email"]
        c_phone = contact_check_dict["contact_info"]["phone"]
        if not c_email:
            reasons.append("Missing required contact email address.")
        if not c_phone:
            reasons.append("Missing required contact phone number.")

        # 3. MASTER RESUME VERIFICATION
        doc_row = cur.execute("""
            SELECT * FROM career_documents
            WHERE profile_id = ? AND document_type = 'master_resume' AND processing_status = 'indexed'
            ORDER BY created_at DESC LIMIT 1
        """, (prof_row["id"],)).fetchone()

        if not doc_row:
            reasons.append("No verified master resume found. User must upload their genuine master resume.")
        else:
            doc_path = Path(doc_row["storage_path"])
            if not doc_path.exists() or doc_path.stat().st_size == 0:
                reasons.append(f"Master resume file is missing from storage disk: '{doc_row['original_filename']}'.")

        # 4. TARGET JOB & TAILORED RESUME VERIFICATION
        if job_id is not None:
            job_row = cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if not job_row:
                reasons.append(f"Target job opportunity #{job_id} not found in database.")
            else:
                tailored_res = cur.execute("""
                    SELECT * FROM tailored_resumes
                    WHERE job_id = ? AND profile_id = ?
                    ORDER BY created_at DESC LIMIT 1
                """, (job_id, prof_row["id"])).fetchone()

                if not tailored_res:
                    reasons.append(f"No tailored resume generated for job #{job_id} at {job_row['company']}. Tailored resume must be synthesized and verified before applying.")
                elif tailored_res["validation_status"] != "verified":
                    v_report = json.loads(tailored_res["validation_report"]) if tailored_res["validation_report"] else {}
                    flags = v_report.get("flags", [])
                    flags_str = "; ".join(flags[:3]) if flags else "Validation issues flagged"
                    reasons.append(f"Tailored resume for job #{job_id} is in '{tailored_res['validation_status']}' status ({flags_str}). Flagged claims must be reviewed and resolved before submission.")

        # 5. GLOBAL SAFETY KILL-SWITCH
        if not EXTERNAL_SUBMISSIONS_ENABLED:
            reasons.append("External submission engine is locked in AUDIT/SAFETY MODE. Real-world outbound network submissions are disabled.")

    if reasons:
        return False, "SUBMISSION_GATE_BLOCKED", reasons

    return True, "SUBMISSION_GATE_PASSED", []
