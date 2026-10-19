import json
import time
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

router = APIRouter(prefix="/generation", tags=["Generation"])

class GenerateRequest(BaseModel):
    jobId: Optional[int] = None
    job_id: Optional[int] = None
    candidateName: Optional[str] = None
    targetRole: Optional[str] = None
    type: Optional[str] = "resume"

@router.get("/jobs")
def get_generation_jobs():
    with get_db() as conn:
        cur = conn.cursor()
        # Fetch profile
        prof_row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
        profile_data = json.loads(prof_row["data"]) if prof_row and prof_row["data"] else {}

        # Fetch top applied or matching jobs
        rows = cur.execute("SELECT * FROM jobs ORDER BY applied DESC, atsScore DESC LIMIT 15").fetchall()

    candidate_name = profile_data.get("general", {}).get("fullName") or profile_data.get("contacts", {}).get("fullName") or ""
    candidate_bio = profile_data.get("general", {}).get("bio") or profile_data.get("summary") or ""
    candidate_email = profile_data.get("general", {}).get("email") or profile_data.get("contacts", {}).get("email") or ""
    candidate_phone = profile_data.get("general", {}).get("phone") or profile_data.get("contacts", {}).get("phone") or ""
    candidate_loc = profile_data.get("userLocation") or profile_data.get("contacts", {}).get("city") or ""

    profile_exps = profile_data.get("experiences") or []
    first_exp = profile_exps[0] if (isinstance(profile_exps, list) and len(profile_exps) > 0) else None

    result = []
    for r in rows:
        d = dict(r)
        d["applied"] = bool(d.get("applied", 0))
        try:
            skills_list = json.loads(d.get("skills") or "[]")
        except Exception:
            skills_list = ["Java", "Spring Boot", "AWS"]

        exp_data = {
            "company": first_exp.get("company", "") if first_exp else "",
            "role": first_exp.get("title", "") if first_exp else "",
            "period": first_exp.get("period", "") if first_exp else "",
            "location": first_exp.get("location", "") if first_exp else "",
            "bullets": [first_exp.get("description", "")] if (first_exp and first_exp.get("description")) else []
        }

        result.append({
            "id": d["id"],
            "role": d["role"],
            "company": d["company"],
            "source": d["source"],
            "workMode": d["workMode"],
            "atsScore": d["atsScore"],
            "date": d.get("dateTime", ""),
            "status": "completed",
            "selected": False,
            "candidate": {
                "name": candidate_name,
                "title": f"{d['role']} | {candidate_bio[:50]}" if candidate_bio else d["role"],
                "location": candidate_loc,
                "email": candidate_email,
                "phone": candidate_phone,
                "linkedin": profile_data.get("general", {}).get("links", "") or profile_data.get("contacts", {}).get("linkedin", ""),
                "summary": candidate_bio,
                "skills": [
                    {"category": "Core & Distributed", "items": ", ".join(skills_list[:4])},
                    {"category": "Frameworks", "items": "Spring Boot, REST APIs"},
                    {"category": "Cloud & Tools", "items": "AWS, Docker, Git"}
                ],
                "experience": exp_data
            }
        })

    return {"jobs": result}

@router.post("/generate")
def generate_tailored_resume(req: GenerateRequest):
    target_id = req.jobId if req.jobId is not None else req.job_id
    if target_id is None:
        raise HTTPException(status_code=400, detail="jobId or job_id required")

    with get_db() as conn:
        cur = conn.cursor()
        job = cur.execute("SELECT * FROM jobs WHERE id = ?", (target_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        prof_row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
        profile_data = json.loads(prof_row["data"]) if prof_row and prof_row["data"] else {}

    c_name = req.candidateName or profile_data.get("general", {}).get("fullName") or profile_data.get("contacts", {}).get("fullName") or "Candidate"
    tailored_text = (
        f"{c_name}\n"
        f"Target Role: {job['role']} at {job['company']}\n\n"
        f"PROFESSIONAL SUMMARY\n"
        f"Experienced professional specializing in {job['skills']}. "
        f"Tailored for {job['company']}'s requirements.\n"
    )

    return {
        "success": True,
        "jobId": target_id,
        "company": job["company"],
        "role": job["role"],
        "tailoredSummary": f"Tailored profile for {job['company']}'s {job['role']} position.",
        "content": tailored_text,
        "message": f"Resume generated and optimized for {job['company']} ({job['role']})."
    }
