from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Response
from typing import Optional, List
import json
import math
import time
from datetime import datetime, timedelta

try:
    from ..database import get_db
    from ..services.excel_service import generate_jobs_csv, parse_and_validate_import_file
except (ImportError, ValueError):
    from database import get_db
    from services.excel_service import generate_jobs_csv, parse_and_validate_import_file

router = APIRouter(tags=["Jobs"])

ROLE_KEYWORD_MAP = {
    "software engineering": ["software", "engineer", "developer"],
    "backend": ["backend", "microservices", "distributed", "api", "database", "java"],
    "full-stack": ["full stack", "fullstack", "react"],
    "frontend": ["frontend", "ui", "react", "next.js"],
    "devops": ["devops", "platform", "infrastructure", "kubernetes"],
    "sre": ["sre", "reliability", "observability"],
    "data engineering": ["data pipeline", "spark", "database"],
    "ml / ai": ["ai/ml", "machine learning", "pytorch"],
    "ai engineering": ["ai", "fastapi", "cuda"],
    "architecture": ["architect", "principal", "staff"],
    "database": ["database", "sql", "postgresql"]
}

def fetch_filtered_jobs(
    search: Optional[str] = None,
    company: Optional[str] = None,
    source: Optional[str] = None,
    workMode: Optional[str] = None,
    minAts: Optional[int] = None,
    profileDriven: bool = True,
    origin: Optional[str] = "all",
    dayOffset: Optional[int] = None,
    date: Optional[str] = None,
    primarySkill: Optional[str] = None,
    marked: Optional[bool] = None,
    limit: Optional[int] = None,
    offset: int = 0
):
    where_clauses = []
    params = []

    clean_day_offset = dayOffset if isinstance(dayOffset, int) else None
    clean_origin = origin if isinstance(origin, str) else "all"
    clean_marked = marked if isinstance(marked, bool) else None
    clean_profile_driven = profileDriven if isinstance(profileDriven, bool) else True

    # Filter by 5-day history offset (0 = Today, 1 = Yesterday, 2 = 2 days ago, etc.)
    if clean_day_offset is not None:
        today_base = datetime.now()
        target_date = today_base - timedelta(days=clean_day_offset)
        date_pattern = target_date.strftime("%d-%b-%y")
        where_clauses.append("dateTime LIKE ?")
        params.append(f"{date_pattern}%")
    elif date and isinstance(date, str):
        where_clauses.append("dateTime LIKE ?")
        params.append(f"{date}%")

    # Filter by Origin
    if clean_origin and clean_origin.lower() != "all":
        orig_clean = clean_origin.lower().strip()
        if orig_clean == "local":
            where_clauses.append("(source NOT LIKE '%Greenhouse%' AND source NOT LIKE '%Ashby%' AND source NOT LIKE '%Lever%' AND source NOT LIKE '%RemoteOK%' AND source NOT LIKE '%Remotive%')")
        elif orig_clean == "harvested":
            where_clauses.append("(source LIKE '%Greenhouse%' OR source LIKE '%Ashby%' OR source LIKE '%Lever%' OR source LIKE '%RemoteOK%' OR source LIKE '%Remotive%')")
        elif orig_clean in ["greenhouse", "ashby", "lever", "remoteok", "remotive"]:
            where_clauses.append("LOWER(source) LIKE ?")
            params.append(f"%{orig_clean}%")

    # 1. Load active Candidate Profile data for dynamic tailoring
    profile_data = {}
    active_profile_id = None
    with get_db() as conn:
        cur = conn.cursor()
        active_prof = cur.execute("SELECT id, data FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
        if active_prof and active_prof["data"]:
            active_profile_id = active_prof["id"]
            try:
                profile_data = json.loads(active_prof["data"])
            except Exception:
                profile_data = {}
        else:
            prof_row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
            if prof_row and prof_row["data"]:
                try:
                    profile_data = json.loads(prof_row["data"])
                except Exception:
                    profile_data = {}

    selected_roles = profile_data.get("selectedRoles", [])
    avoid_companies = [c.strip() for c in profile_data.get("avoidCompanies", []) if c.strip()]
    avoid_skills = [s.strip() for s in profile_data.get("avoidSkills", []) if s.strip()]
    avoid_sources = [s.strip() for s in profile_data.get("avoidSources", []) if s.strip()]
    work_formats = profile_data.get("workFormats", {})
    candidate_skills = profile_data.get("skillsList", [])

    user_skill_names = [
        s["name"].lower() if isinstance(s, dict) else str(s).lower()
        for s in candidate_skills
    ]

    # 2. Enforce Profile-driven Avoid Rules
    if clean_profile_driven:
        for ac in avoid_companies:
            where_clauses.append("LOWER(company) NOT LIKE ?")
            params.append(f"%{ac.lower()}%")

        for ask in avoid_skills:
            where_clauses.append("LOWER(skills) NOT LIKE ?")
            params.append(f"%{ask.lower()}%")

        for asrc in avoid_sources:
            where_clauses.append("LOWER(source) NOT LIKE ?")
            params.append(f"%{asrc.lower()}%")

        # 3. Enforce Work Format preferences from Profile
        if (not workMode or workMode == "All") and work_formats:
            allowed_modes = []
            if work_formats.get("remote"):
                allowed_modes.append("Remote")
            if work_formats.get("hybrid"):
                allowed_modes.append("Hybrid")
            if work_formats.get("onsite"):
                allowed_modes.append("On-site")

            if allowed_modes and len(allowed_modes) < 3:
                placeholders = ",".join(["?"] * len(allowed_modes))
                where_clauses.append(f"workMode IN ({placeholders})")
                params.extend(allowed_modes)

        # 4. Enforce Target Specializations from Profile
        if not search and not clean_marked and selected_roles:
            role_keywords = set()
            for sr in selected_roles:
                sr_clean = sr.lower()
                if sr_clean in ROLE_KEYWORD_MAP:
                    role_keywords.update(ROLE_KEYWORD_MAP[sr_clean])
                else:
                    role_keywords.add(sr_clean)

            if role_keywords:
                role_subclauses = []
                for kw in list(role_keywords)[:12]:
                    role_subclauses.append("LOWER(role) LIKE ?")
                    params.append(f"%{kw}%")
                where_clauses.append(f"({' OR '.join(role_subclauses)})")

    # 5. Direct User Filters from Explore UI
    if search and isinstance(search, str):
        where_clauses.append("(role LIKE ? OR company LIKE ? OR skills LIKE ? OR description LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if company and company != "All" and isinstance(company, str):
        where_clauses.append("company = ?")
        params.append(company)

    if source and source != "All" and isinstance(source, str):
        where_clauses.append("source = ?")
        params.append(source)

    if workMode and workMode != "All" and isinstance(workMode, str):
        where_clauses.append("workMode = ?")
        params.append(workMode)

    if minAts is not None and isinstance(minAts, (int, float)):
        where_clauses.append("atsScore >= ?")
        params.append(int(minAts))

    if clean_marked is not None:
        where_clauses.append("marked = ?")
        params.append(1 if clean_marked else 0)

    clean_prim = primarySkill if isinstance(primarySkill, str) else ""
    active_primary_skill = (clean_prim or profile_data.get("primarySkill") or "").strip()

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    with get_db() as conn:
        cur = conn.cursor()
        count_sql = f"SELECT COUNT(*) as total FROM jobs {where_sql}"
        count_row = cur.execute(count_sql, params).fetchone()
        total = count_row["total"] if count_row else 0

        pagination_clause = ""
        query_params = list(params)

        if active_primary_skill:
            prim_term = f"%{active_primary_skill.lower()}%"
            query_sql = f"""
                SELECT * FROM jobs
                {where_sql}
                ORDER BY 
                    (CASE 
                        WHEN LOWER(skills) LIKE ? OR LOWER(role) LIKE ? OR LOWER(description) LIKE ? THEN 1 
                        ELSE 0 
                    END) DESC,
                    atsScore DESC,
                    id ASC
            """
            query_params.extend([prim_term, prim_term, prim_term])
        else:
            query_sql = f"""
                SELECT * FROM jobs
                {where_sql}
                ORDER BY atsScore DESC, id ASC
            """

        if limit is not None:
            query_sql += " LIMIT ? OFFSET ?"
            query_params.extend([limit, offset])

        rows = cur.execute(query_sql, query_params).fetchall()

    formatted_jobs = []
    for r in rows:
        d = dict(r)
        d["applied"] = bool(d.get("applied", 0))
        d["marked"] = bool(d.get("marked", 0))
        try:
            d["skills"] = json.loads(d.get("skills") or "[]")
        except Exception:
            d["skills"] = []

        if user_skill_names and d["skills"]:
            job_skills = d["skills"]
            matches_count = sum(
                1 for js in job_skills
                if any(us in js.lower() or js.lower() in us for us in user_skill_names)
            )
            match_pct = min(98, max(76, round(72 + (matches_count / max(len(job_skills), 1)) * 26)))
            d["atsScore"] = match_pct
            d["matchedSkillsCount"] = matches_count

        primary_matched = False
        if active_primary_skill:
            ps_lower = active_primary_skill.lower()
            job_skills_lower = [str(s).lower() for s in d["skills"]]
            if any(ps_lower in js or js in ps_lower for js in job_skills_lower) or ps_lower in d.get("role", "").lower() or ps_lower in d.get("description", "").lower():
                primary_matched = True
                d["atsScore"] = min(98, max(88, d.get("atsScore", 76) + 12))

        d["primarySkill"] = active_primary_skill
        d["primarySkillMatched"] = primary_matched

        src_str = d.get("source", "")
        is_harvested = any(k in src_str for k in ["Greenhouse", "Ashby", "Lever", "RemoteOK", "Remotive"])
        d["isHarvested"] = is_harvested
        if "Greenhouse" in src_str:
            d["atsSource"] = "Greenhouse"
        elif "Ashby" in src_str:
            d["atsSource"] = "Ashby"
        elif "Lever" in src_str:
            d["atsSource"] = "Lever"
        elif "RemoteOK" in src_str:
            d["atsSource"] = "RemoteOK"
        elif "Remotive" in src_str:
            d["atsSource"] = "Remotive"
        else:
            d["atsSource"] = "Local"

        formatted_jobs.append(d)

    return total, formatted_jobs, selected_roles, active_primary_skill

@router.get("/jobs")
def get_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    company: Optional[str] = None,
    source: Optional[str] = None,
    workMode: Optional[str] = None,
    minAts: Optional[int] = None,
    profileDriven: bool = Query(True),
    origin: Optional[str] = Query("all"),
    dayOffset: Optional[int] = Query(None),
    date: Optional[str] = Query(None),
    primarySkill: Optional[str] = Query(None),
    marked: Optional[bool] = Query(None)
):
    offset = (page - 1) * limit
    total, formatted_jobs, selected_roles, active_primary_skill = fetch_filtered_jobs(
        search=search,
        company=company,
        source=source,
        workMode=workMode,
        minAts=minAts,
        profileDriven=profileDriven,
        origin=origin,
        dayOffset=dayOffset,
        date=date,
        primarySkill=primarySkill,
        marked=marked,
        limit=limit,
        offset=offset
    )

    return {
        "total": total,
        "page": page,
        "totalPages": math.ceil(total / limit) if total > 0 else 0,
        "profileDriven": profileDriven,
        "activeProfileRoles": selected_roles,
        "primarySkill": active_primary_skill,
        "jobs": formatted_jobs
    }

@router.get("/jobs/export")
def export_jobs(
    search: Optional[str] = None,
    company: Optional[str] = None,
    source: Optional[str] = None,
    workMode: Optional[str] = None,
    minAts: Optional[int] = None,
    profileDriven: bool = Query(True),
    origin: Optional[str] = Query("all"),
    dayOffset: Optional[int] = Query(None),
    date: Optional[str] = Query(None),
    primarySkill: Optional[str] = Query(None),
    marked: Optional[bool] = Query(None)
):
    """
    Exports the ENTIRE filtered dataset (bypassing the 10-row page limit)
    with CSV spreadsheet formula injection protection.
    """
    total, all_jobs, _, _ = fetch_filtered_jobs(
        search=search,
        company=company,
        source=source,
        workMode=workMode,
        minAts=minAts,
        profileDriven=profileDriven,
        origin=origin,
        dayOffset=dayOffset,
        date=date,
        primarySkill=primarySkill,
        marked=marked,
        limit=10000,  # Full export up to 10k records
        offset=0
    )

    csv_data = generate_jobs_csv(all_jobs)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"skill2role_jobs_{timestamp_str}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Exported-Count": str(len(all_jobs))
        }
    )

@router.post("/jobs/import")
async def import_jobs(file: UploadFile = File(...)):
    """
    Asynchronously processes Excel or CSV uploads, validates schema/rows,
    deduplicates records, prevents formula injection, and classifies source as 'Excel Import'.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for import.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum permitted limit (10MB).")

    jobs_to_import, parse_errors = parse_and_validate_import_file(file_bytes, file.filename)
    if not jobs_to_import and parse_errors:
        raise HTTPException(status_code=400, detail=parse_errors[0])

    imported_count = 0
    skipped_count = 0
    date_str = datetime.now().strftime("%d-%b-%y %I:%M %p")

    with get_db() as conn:
        cur = conn.cursor()
        active_prof = cur.execute("SELECT id FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
        active_profile_id = active_prof["id"] if active_prof else None

        for job in jobs_to_import:
            # Deduplicate by URL or (role + company)
            dup = None
            if job.get("url"):
                dup = cur.execute("SELECT id FROM jobs WHERE url = ?", (job["url"],)).fetchone()
            if not dup and job.get("role") and job.get("company"):
                dup = cur.execute(
                    "SELECT id FROM jobs WHERE LOWER(role) = ? AND LOWER(company) = ?",
                    (job["role"].lower(), job["company"].lower())
                ).fetchone()

            if dup:
                skipped_count += 1
                continue

            now_ts = int(time.time() * 1000)
            logo_val = job.get("logo") or ""
            cur.execute("""
                INSERT INTO jobs (role, company, logo, location, workMode, atsScore, source, dateTime, description, skills, salary, url, applied, marked, profile_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
            """, (
                job["role"],
                job["company"],
                logo_val,
                job.get("location", "Remote"),
                job.get("workMode", "Remote"),
                job.get("atsScore", 85),
                "Excel Import",
                date_str,
                job.get("description", ""),
                job.get("skills", "[]"),
                job.get("salary", "Competitive"),
                job.get("url", ""),
                active_profile_id,
                now_ts
            ))
            imported_count += 1

        if imported_count > 0:
            act_id = f"act-{int(time.time() * 1000)}"
            cur.execute("""
                INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, created_at, profile_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                act_id,
                datetime.now().strftime("%I:%M %p").lower(),
                "Excel Import",
                "excel",
                f"Imported {imported_count} jobs from spreadsheet ({file.filename})",
                f"+{imported_count}",
                "completed",
                int(time.time() * 1000),
                active_profile_id
            ))

    return {
        "success": True,
        "filename": file.filename,
        "processed": len(jobs_to_import),
        "inserted": imported_count,
        "skipped": skipped_count,
        "importedCount": imported_count,
        "skippedCount": skipped_count,
        "errors": parse_errors
    }

@router.get("/jobs/history-summary")
def get_history_summary():
    """
    Returns 5 days of history (Today + previous 4 days) as required by Stage 1.
    """
    today_base = datetime.now()
    summary = []
    labels = ["Today", "Yesterday", "2 Days Ago", "3 Days Ago", "4 Days Ago"]
    with get_db() as conn:
        cur = conn.cursor()
        for offset in range(5):
            target_date = today_base - timedelta(days=offset)
            date_pattern = target_date.strftime("%d-%b-%y")
            cnt = cur.execute("SELECT COUNT(*) as c FROM jobs WHERE dateTime LIKE ?", (f"{date_pattern}%",)).fetchone()["c"]
            summary.append({
                "dayOffset": offset,
                "datePattern": date_pattern,
                "formattedDate": target_date.strftime("%b %d, %Y"),
                "label": labels[offset],
                "count": cnt,
                "isLive": (offset == 0)
            })
    return {"history": summary}

@router.get("/jobs/{job_id}")
def get_job(job_id: int):
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")

        d = dict(row)
        d["applied"] = bool(d.get("applied", 0))
        d["marked"] = bool(d.get("marked", 0))
        try:
            d["skills"] = json.loads(d.get("skills") or "[]")
        except Exception:
            d["skills"] = []
        return d

@router.post("/jobs/{job_id}/toggle-marker")
def toggle_job_marker(job_id: int):
    with get_db() as conn:
        cur = conn.cursor()
        job = cur.execute("SELECT id, marked FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        current_marked = job["marked"] if "marked" in job.keys() else 0
        new_marked = 0 if current_marked else 1
        cur.execute("UPDATE jobs SET marked = ? WHERE id = ?", (new_marked, job_id))

    return {
        "success": True,
        "jobId": job_id,
        "marked": bool(new_marked),
        "message": "Job marked" if new_marked == 1 else "Job unmarked"
    }

@router.post("/jobs/{job_id}/apply")
def toggle_job_application(job_id: int):
    with get_db() as conn:
        cur = conn.cursor()
        job = cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        new_applied = 0 if job["applied"] else 1
        cur.execute("UPDATE jobs SET applied = ? WHERE id = ?", (new_applied, job_id))

        if new_applied == 1:
            act_id = f"act-{int(time.time() * 1000)}"
            time_str = datetime.now().strftime("%I:%M %p").lower()
            cur.execute("""
                INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                act_id,
                time_str,
                job["company"],
                job["logo"],
                f"Submitted application for {job['role']} at {job['company']}",
                "Applied",
                "completed",
                int(time.time() * 1000)
            ))

    return {
        "success": True,
        "jobId": job_id,
        "applied": bool(new_applied),
        "message": f"Applied to {job['company']}!" if new_applied == 1 else "Application withdrawn."
    }

