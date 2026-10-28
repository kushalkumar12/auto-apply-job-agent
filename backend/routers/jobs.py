from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Response, Depends
from typing import Optional, List, Dict, Any
import json
import math
import time
from datetime import datetime, timedelta

from pydantic import BaseModel

try:
    from ..database import get_db
    from ..services.excel_service import generate_jobs_csv, generate_jobs_xlsx, parse_and_validate_import_file
    from ..services.submission_gate import evaluate_submission_gate
    from ..services.auth_service import get_current_user
except (ImportError, ValueError):
    from database import get_db
    from services.excel_service import generate_jobs_csv, generate_jobs_xlsx, parse_and_validate_import_file
    from services.submission_gate import evaluate_submission_gate
    from services.auth_service import get_current_user

router = APIRouter(tags=["Jobs"])

import re

ROLE_KEYWORD_MAP = {
    "software engineering": ["software", "engineer", "developer"],
    "software engineer": ["software", "engineer", "developer"],
    "backend": ["backend", "microservices", "distributed", "api", "database", "java"],
    "backend developer": ["backend", "microservices", "distributed", "api", "database", "java", "spring boot", "spring"],
    "full-stack": ["full stack", "fullstack", "react"],
    "full-stack developer": ["full stack", "fullstack", "react", "software"],
    "frontend": ["frontend", "ui", "react", "next.js"],
    "frontend developer": ["frontend", "ui", "react", "next.js"],
    "devops": ["devops", "platform", "infrastructure", "kubernetes"],
    "devops engineer": ["devops", "platform", "infrastructure", "kubernetes"],
    "cloud architect": ["cloud", "architect", "aws", "azure", "gcp"],
    "data engineer": ["data engineer", "data pipeline", "spark", "database"],
    "machine learning engineer": ["machine learning", "ml", "ai", "pytorch", "tensorflow"],
    "sre": ["sre", "reliability", "observability"],
    "site reliability engineer (sre)": ["sre", "reliability", "observability"],
    "solutions architect": ["solutions architect", "architect", "architecture"],
    "qa engineer": ["qa", "quality", "test", "automation"],
    "mobile developer": ["mobile", "android", "ios", "react native", "flutter"],
    "security engineer": ["security", "cybersecurity", "infosec"],
    "engineering manager": ["engineering manager", "lead", "director"]
}

def check_experience_fit(role: str, description: str, cand_exp: Optional[float]) -> Dict[str, Any]:
    """
    Evaluates candidate experience (years) against job requirements.
    """
    if cand_exp is None:
        return {"matches": True, "requiredText": "All Experience Levels", "status": "open", "candidateYears": None}

    cand_exp = float(cand_exp)
    desc = description or ""
    found = [int(m.group(1)) for m in re.finditer(r'(\d+)\+?\s*(?:-\s*(\d+))?\s*(?:years?|yrs?)\b', desc, re.IGNORECASE)]
    
    if found:
        min_req = min(found)
        max_req = max(found)
        req_text = f"{min_req}+ yrs" if min_req == max_req else f"{min_req}-{max_req} yrs"
        # Candidate qualifies if their experience is within 1.5 years of min requirement
        is_match = (cand_exp >= (min_req - 1.5))
        return {
            "matches": is_match,
            "requiredText": req_text,
            "candidateYears": cand_exp,
            "minRequired": min_req,
            "status": "qualified" if is_match else "underqualified"
        }

    # Seniority keyword fallback based on role title
    r_lower = (role or "").lower()
    if any(k in r_lower for k in ['lead', 'principal', 'staff', 'architect', 'director', 'manager', 'head']):
        is_match = cand_exp >= 4.0
        return {"matches": is_match, "requiredText": "4+ yrs (Lead/Staff)", "candidateYears": cand_exp, "status": "qualified" if is_match else "underqualified"}
    if 'senior' in r_lower or 'sr' in r_lower:
        is_match = cand_exp >= 2.0
        return {"matches": is_match, "requiredText": "2+ yrs (Senior)", "candidateYears": cand_exp, "status": "qualified" if is_match else "underqualified"}
    if any(k in r_lower for k in ['junior', 'intern', 'associate', 'trainee', 'fresher']):
        is_match = cand_exp <= 4.0
        return {"matches": is_match, "requiredText": "0-3 yrs (Junior/Entry)", "candidateYears": cand_exp, "status": "qualified" if is_match else "overqualified"}

    # Mid-level or general role
    return {"matches": True, "requiredText": "1+ yrs (Mid-level)", "candidateYears": cand_exp, "status": "qualified"}

INDIAN_CITIES_AND_TERMS = [
    "india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "bombay",
    "delhi", "new delhi", "noida", "gurgaon", "gurugram", "chennai", "madras",
    "kolkata", "calcutta", "ahmedabad", "jaipur", "kochi", "cochin", "thiruvananthapuram",
    "trivandrum", "chandigarh", "indore"
]

FOREIGN_RESTRICTIONS = [
    "united states", "usa", "u.s.", "u.s.a.", "us only", "north america", 
    "canada", "united kingdom", "uk only", "europe", "emea", "latam", 
    "germany", "france", "australia", "netherlands", "sweden", "switzerland",
    "singapore", "brazil", "mexico", "san francisco", "new york", "london",
    "toronto", "seattle", "austin", "chicago", "boston", "foster city", "denver"
]

def check_location_fit(
    job_location: str, 
    job_workmode: str, 
    cand_locs: List[str], 
    allow_remote: bool = True,
    global_opportunities: bool = False
) -> Dict[str, Any]:
    """
    Strictly checks whether job location matches candidate's given target locations.
    Prevents out-of-India Hybrid/On-site jobs and foreign-restricted remote jobs from matching Indian candidates
    unless global_opportunities is explicitly enabled.
    """
    if not cand_locs:
        return {"matches": True, "matchedLoc": job_location or "Worldwide"}
    
    j_loc_lower = (job_location or "").lower()
    j_mode_lower = (job_workmode or "").lower()

    if global_opportunities:
        if j_mode_lower == "remote" or any(r in j_loc_lower for r in ["remote", "worldwide", "global", "anywhere"]):
            return {"matches": True, "matchedLoc": "Global / Remote"}

    # Check if candidate is targeting India or Indian cities
    cand_is_india = any(
        any(it in cl.lower() for it in INDIAN_CITIES_AND_TERMS)
        for cl in cand_locs
    )

    if cand_is_india and not global_opportunities:
        is_job_in_india = any(it in j_loc_lower for it in INDIAN_CITIES_AND_TERMS)

        # 1. Hybrid and On-site jobs MUST be physically located in India!
        if j_mode_lower in ["hybrid", "on-site", "onsite"]:
            if not is_job_in_india:
                return {"matches": False, "matchedLoc": job_location}

        # 2. Remote jobs must NOT be restricted to foreign countries (e.g. US Only, North America)
        if any(r in j_loc_lower for r in ["remote", "worldwide", "global", "anywhere"]) or j_mode_lower == "remote":
            is_foreign_restricted = any(f in j_loc_lower for f in FOREIGN_RESTRICTIONS)
            if is_foreign_restricted and not is_job_in_india:
                return {"matches": False, "matchedLoc": job_location}

    matched_term = None

    for cl in cand_locs:
        cl_clean = cl.lower().strip()
        if not cl_clean:
            continue
        parts = [p.strip() for p in cl_clean.replace('-', ' ').split(',') if p.strip()]
        for p in parts:
            if len(p) >= 3 and p in j_loc_lower:
                matched_term = cl
                break
        if "bengaluru" in cl_clean and "bangalore" in j_loc_lower:
            matched_term = cl
            break
        if "bangalore" in cl_clean and "bengaluru" in j_loc_lower:
            matched_term = cl
            break
        if "gurgaon" in cl_clean and "gurugram" in j_loc_lower:
            matched_term = cl
            break
        if "gurugram" in cl_clean and "gurgaon" in j_loc_lower:
            matched_term = cl
            break
        if matched_term:
            break

    # If candidate is in India and job is anywhere in India
    if cand_is_india and not matched_term:
        if any(it in j_loc_lower for it in INDIAN_CITIES_AND_TERMS):
            matched_term = "India"

    # Truly global remote matching (Worldwide Remote)
    if not matched_term and allow_remote:
        is_global_remote = any(r in j_loc_lower for r in ["worldwide", "global", "anywhere", "remote, global", "worldwide (remote)"])
        is_foreign = any(f in j_loc_lower for f in FOREIGN_RESTRICTIONS)
        if is_global_remote and not is_foreign:
            matched_term = "Worldwide Remote"

    return {
        "matches": bool(matched_term),
        "matchedLoc": matched_term or job_location
    }

def check_primary_skills_fit(role: str, job_skills: List[str], description: str, cand_primary_skills: List[str]) -> Dict[str, Any]:
    """
    Strictly checks whether any of candidate's 5 Primary Skills match the job.
    """
    if not cand_primary_skills:
        return {"matches": True, "matchedSkills": []}

    matched_skills = []
    job_skills_lower = [str(s).lower() for s in job_skills]
    role_lower = (role or "").lower()
    desc_lower = (description or "").lower()

    for ps in cand_primary_skills:
        ps_lower = ps.lower().strip()
        if not ps_lower:
            continue
        if any(ps_lower in js or js in ps_lower for js in job_skills_lower):
            matched_skills.append(ps)
        elif ps_lower in role_lower:
            matched_skills.append(ps)
        elif ps_lower in desc_lower:
            matched_skills.append(ps)

    return {
        "matches": len(matched_skills) > 0,
        "matchedSkills": matched_skills
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
    offset: int = 0,
    user_id: Optional[str] = None,
    profile_id: Optional[str] = None
):
    where_clauses = []
    params = []

    from fastapi.params import Query as QueryParam
    clean_profile_id = profile_id if not isinstance(profile_id, QueryParam) else None
    clean_day_offset = dayOffset if isinstance(dayOffset, int) else None
    clean_origin = origin if (isinstance(origin, str) and not isinstance(origin, QueryParam)) else "all"
    clean_marked = marked if isinstance(marked, bool) else None
    clean_profile_driven = profileDriven if isinstance(profileDriven, bool) else True

    # Filter by 5-day history offset (0 = Today, 1 = Yesterday, 2 = 2 days ago, etc.)
    if clean_day_offset is not None:
        today_base = datetime.now()
        target_date = today_base - timedelta(days=clean_day_offset)
        date_pattern = target_date.strftime("%d-%b-%y")
        where_clauses.append("dateTime LIKE ?")
        params.append(f"{date_pattern}%")
    elif date and isinstance(date, str) and not isinstance(date, QueryParam):
        where_clauses.append("dateTime LIKE ?")
        params.append(f"{date}%")

    # Filter by Origin
    if clean_origin and clean_origin.lower() != "all":
        orig_clean = clean_origin.lower().strip()
        if orig_clean == "local":
            where_clauses.append("(source NOT LIKE '%Greenhouse%' AND source NOT LIKE '%Ashby%' AND source NOT LIKE '%Lever%' AND source NOT LIKE '%RemoteOK%' AND source NOT LIKE '%Remotive%' AND source NOT LIKE '%Workday%' AND source NOT LIKE '%SmartRecruiters%')")
        elif orig_clean == "harvested":
            where_clauses.append("(source LIKE '%Greenhouse%' OR source LIKE '%Ashby%' OR source LIKE '%Lever%' OR source LIKE '%RemoteOK%' OR source LIKE '%Remotive%' OR source LIKE '%Workday%' OR source LIKE '%SmartRecruiters%')")
        elif orig_clean in ["greenhouse", "ashby", "lever", "remoteok", "remotive", "workday", "smartrecruiters"]:
            where_clauses.append("LOWER(source) LIKE ?")
            params.append(f"%{orig_clean}%")

    # 1. Load active Candidate Profile data for dynamic tailoring (scoped strictly per profile)
    profile_data = {}
    active_profile_id = clean_profile_id
    with get_db() as conn:
        cur = conn.cursor()
        active_prof = None
        if clean_profile_id:
            if user_id:
                active_prof = cur.execute(
                    "SELECT id, data FROM candidate_profiles WHERE id = ? AND user_id = ?",
                    (clean_profile_id, user_id)
                ).fetchone()
                if not active_prof:
                    other_u = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (profile_id,)).fetchone()
                    if other_u and other_u["user_id"] != user_id:
                        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's candidate profile.")
            else:
                active_prof = cur.execute("SELECT id, data FROM candidate_profiles WHERE id = ?", (profile_id,)).fetchone()

        if not active_prof and user_id:
            active_prof = cur.execute("SELECT id, data FROM candidate_profiles WHERE user_id = ? AND is_active = 1 LIMIT 1", (user_id,)).fetchone()
            if not active_prof:
                active_prof = cur.execute("SELECT id, data FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()

        if not active_prof:
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

    selected_roles = profile_data.get("preferredRoles") or profile_data.get("selectedRoles", [])
    if isinstance(selected_roles, str):
        selected_roles = [selected_roles]
    avoid_companies = [c.strip() for c in profile_data.get("avoidCompanies", []) if c.strip()]
    avoid_skills = [s.strip() for s in profile_data.get("avoidSkills", []) if s.strip()]
    avoid_sources = [s.strip() for s in profile_data.get("avoidSources", []) if s.strip()]
    avoid_roles = [r.strip() for r in profile_data.get("avoidRoles", []) if r.strip()]
    avoid_locations = [l.strip() for l in (profile_data.get("avoidLocations") or profile_data.get("avoidCities") or []) if l.strip()]
    work_formats = profile_data.get("workFormats", {})
    pref_work_modes = profile_data.get("preferredWorkModes", [])
    global_opportunities = bool(profile_data.get("globalOpportunities", False))
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

        for ar in avoid_roles:
            where_clauses.append("LOWER(role) NOT LIKE ?")
            params.append(f"%{ar.lower()}%")

        for al in avoid_locations:
            where_clauses.append("LOWER(location) NOT LIKE ?")
            params.append(f"%{al.lower()}%")

        # 3. Enforce Work Format preferences from Profile
        if (not workMode or workMode == "All"):
            allowed_modes = []
            if pref_work_modes and isinstance(pref_work_modes, list):
                for pm in pref_work_modes:
                    pm_lower = str(pm).lower()
                    if "remote" in pm_lower and "Remote" not in allowed_modes:
                        allowed_modes.append("Remote")
                    elif "hybrid" in pm_lower and "Hybrid" not in allowed_modes:
                        allowed_modes.append("Hybrid")
                    elif ("onsite" in pm_lower or "on-site" in pm_lower) and "On-site" not in allowed_modes:
                        allowed_modes.append("On-site")
            elif work_formats and isinstance(work_formats, dict):
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
        if not search and not clean_marked and not company and selected_roles:
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
        # Support both direct company match and source match (e.g. Workday (Target India) or Target India)
        where_clauses.append("(company = ? OR company LIKE ? OR source LIKE ?)")
        params.extend([company, f"%{company}%", f"%{company}%"])

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
        if clean_marked:
            if user_id and active_profile_id:
                where_clauses.append("id IN (SELECT job_id FROM job_bookmarks WHERE user_id = ? AND profile_id = ?)")
                params.extend([user_id, active_profile_id])
            elif user_id:
                where_clauses.append("id IN (SELECT job_id FROM job_bookmarks WHERE user_id = ?)")
                params.append(user_id)
            else:
                where_clauses.append("marked = 1")
        else:
            if user_id and active_profile_id:
                where_clauses.append("id NOT IN (SELECT job_id FROM job_bookmarks WHERE user_id = ? AND profile_id = ?)")
                params.extend([user_id, active_profile_id])
            elif user_id:
                where_clauses.append("id NOT IN (SELECT job_id FROM job_bookmarks WHERE user_id = ?)")
                params.append(user_id)
            else:
                where_clauses.append("marked = 0")

    # Extract candidate's 5 Primary Skills
    cand_primary_skills = profile_data.get("primarySkills") or []
    if not isinstance(cand_primary_skills, list) or len(cand_primary_skills) == 0:
        cand_primary_skills = [profile_data.get("primarySkill")] if profile_data.get("primarySkill") else []
    cand_primary_skills = [str(s).strip() for s in cand_primary_skills if str(s).strip()][:5]
    clean_prim = primarySkill if isinstance(primarySkill, str) else ""
    if clean_prim and clean_prim not in cand_primary_skills:
        cand_primary_skills.insert(0, clean_prim)
    active_primary_skill = cand_primary_skills[0] if cand_primary_skills else ""

    # Extract Experience Years
    exp_years_raw = profile_data.get("experienceYears")
    if exp_years_raw is None:
        exp_years_raw = profile_data.get("general", {}).get("experienceYears")
    cand_exp = float(exp_years_raw) if (exp_years_raw is not None and str(exp_years_raw).strip() != "") else None

    # Extract Location Preferences
    user_loc = (profile_data.get("userLocation") or profile_data.get("general", {}).get("city") or "").strip()
    cand_country = (profile_data.get("general", {}).get("country") or "").strip()
    desired_locs = profile_data.get("preferredLocations") or profile_data.get("desiredLocations") or []
    cand_locs = [user_loc] if user_loc else []
    if cand_country and cand_country.lower() not in [c.lower() for c in cand_locs]:
        cand_locs.append(cand_country)
    if isinstance(desired_locs, list):
        for dl in desired_locs:
            if str(dl).strip() and str(dl).strip().lower() not in [c.lower() for c in cand_locs]:
                cand_locs.append(str(dl).strip())
    if not cand_locs:
        cand_locs.append("India")

    allow_remote = work_formats.get("remote", True) if isinstance(work_formats, dict) else True

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    with get_db() as conn:
        cur = conn.cursor()
        user_bookmarks = set()
        if user_id and active_profile_id:
            bm_rows = cur.execute(
                "SELECT job_id FROM job_bookmarks WHERE user_id = ? AND profile_id = ?",
                (user_id, active_profile_id)
            ).fetchall()
            user_bookmarks = {bm["job_id"] for bm in bm_rows}
        elif user_id:
            bm_rows = cur.execute("SELECT job_id FROM job_bookmarks WHERE user_id = ?", (user_id,)).fetchall()
            user_bookmarks = {bm["job_id"] for bm in bm_rows}

        query_sql = f"""
            SELECT * FROM jobs
            {where_sql}
            ORDER BY atsScore DESC, created_at DESC, id DESC
        """
        raw_rows = cur.execute(query_sql, params).fetchall()

    qualified_jobs = []
    for r in raw_rows:
        d = dict(r)
        d["applied"] = bool(d.get("applied", 0))
        d["marked"] = d["id"] in user_bookmarks if user_id else bool(d.get("marked", 0))
        try:
            d["skills"] = json.loads(d.get("skills") or "[]")
        except Exception:
            d["skills"] = []

        # 1. Primary Skills Fit (Check across 5 Primary Skills)
        skills_fit = check_primary_skills_fit(d.get("role", ""), d["skills"], d.get("description", ""), cand_primary_skills)

        # 2. Experience Fit (Years of experience)
        exp_fit = check_experience_fit(d.get("role", ""), d.get("description", ""), cand_exp)

        # 3. Location Fit (Tracking based on given location & work mode)
        loc_fit = check_location_fit(d.get("location", ""), d.get("workMode", ""), cand_locs, allow_remote, global_opportunities=global_opportunities)

        # In strict profile-driven mode, require skills and location criteria to match if configured
        # When candidate explicitly clicks a company filter in the UI, prioritize that company's jobs
        if clean_profile_driven and not search and not clean_marked and not company:
            if cand_primary_skills and not skills_fit["matches"]:
                continue
            if cand_exp is not None and not exp_fit["matches"]:
                # If experience is strictly underqualified by more than 2 years, filter out
                if exp_fit.get("status") == "underqualified" and exp_fit.get("minRequired", 0) > (cand_exp + 2):
                    continue
            if cand_locs and not loc_fit["matches"]:
                continue

        # Dynamic ATS Compatibility Score based on skills + experience + location
        base_score = d.get("atsScore", 80)
        if user_skill_names and d["skills"]:
            job_skills = d["skills"]
            matches_count = sum(
                1 for js in job_skills
                if any(us in js.lower() or js.lower() in us for us in user_skill_names)
            )
            base_score = min(98, max(76, round(72 + (matches_count / max(len(job_skills), 1)) * 26)))
            d["matchedSkillsCount"] = matches_count

        # Score boosts for 3-way strict alignment
        bonus = 0
        if skills_fit["matches"]:
            bonus += min(12, len(skills_fit["matchedSkills"]) * 4)
        if exp_fit.get("status") == "qualified":
            bonus += 4
        if loc_fit["matches"]:
            bonus += 4
        
        d["atsScore"] = min(98, max(76, base_score + bonus))
        d["primarySkill"] = active_primary_skill
        d["primarySkills"] = cand_primary_skills
        d["matchedPrimarySkills"] = skills_fit["matchedSkills"]
        d["primarySkillMatched"] = skills_fit["matches"]
        d["experienceFit"] = exp_fit
        d["locationFit"] = loc_fit
        d["locationMatched"] = loc_fit["matches"]

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

        qualified_jobs.append(d)

    # Sort qualified jobs: Primary Skills Matched -> Exact Location Matched -> ATS Score -> Latest (created_at DESC, id DESC)
    qualified_jobs.sort(
        key=lambda j: (
            1 if j.get("primarySkillMatched") else 0,
            1 if j.get("locationMatched") else 0,
            j.get("atsScore", 0),
            j.get("created_at", 0),
            j.get("id", 0)
        ),
        reverse=True
    )

    total = len(qualified_jobs)
    paginated_jobs = qualified_jobs[offset : offset + limit] if limit is not None else qualified_jobs

    return total, paginated_jobs, selected_roles, active_primary_skill

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
    marked: Optional[bool] = Query(None),
    profile_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    offset = (page - 1) * limit
    user_id = current_user.get("id") if current_user else None
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
        offset=offset,
        user_id=user_id,
        profile_id=profile_id
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
    marked: Optional[bool] = Query(None),
    format: Optional[str] = Query(None),
    profile_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Exports the ENTIRE filtered dataset (bypassing the 10-row page limit)
    in native Microsoft Excel (.xlsx) or CSV format with formula injection protection.
    """
    user_id = current_user.get("id") if current_user else None
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
        offset=0,
        user_id=user_id,
        profile_id=profile_id
    )

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    fmt = (format or "csv").lower().strip()

    if fmt == "csv":
        csv_data = generate_jobs_csv(all_jobs)
        filename = f"skill2role_jobs_{timestamp_str}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Exported-Count": str(len(all_jobs)),
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    else:
        xlsx_bytes = generate_jobs_xlsx(all_jobs)
        filename = f"skill2role_jobs_{timestamp_str}.xlsx"
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Exported-Count": str(len(all_jobs)),
                "Access-Control-Expose-Headers": "Content-Disposition"
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
def toggle_job_marker(
    job_id: int,
    profile_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    user_id = current_user.get("id") if current_user else "default"
    now_ts = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        job = cur.execute("SELECT id, marked FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        resolved_pid = profile_id
        if not resolved_pid:
            p_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
            if not p_row:
                p_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()
            resolved_pid = p_row["id"] if p_row else "default"
        else:
            p_row = cur.execute("SELECT id FROM candidate_profiles WHERE id = ? AND user_id = ?", (resolved_pid, user_id)).fetchone()
            if not p_row and user_id != "default":
                other_u = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
                if other_u and other_u["user_id"] != user_id:
                    raise HTTPException(status_code=403, detail="Forbidden: You cannot bookmark jobs for another user's candidate profile.")

        existing_bm = cur.execute(
            "SELECT 1 FROM job_bookmarks WHERE user_id = ? AND profile_id = ? AND job_id = ?",
            (user_id, resolved_pid, job_id)
        ).fetchone()

        if existing_bm:
            cur.execute(
                "DELETE FROM job_bookmarks WHERE user_id = ? AND profile_id = ? AND job_id = ?",
                (user_id, resolved_pid, job_id)
            )
            new_marked = 0
        else:
            cur.execute(
                "INSERT OR REPLACE INTO job_bookmarks (user_id, profile_id, job_id, created_at) VALUES (?, ?, ?, ?)",
                (user_id, resolved_pid, job_id, now_ts)
            )
            new_marked = 1

        cur.execute("UPDATE jobs SET marked = ? WHERE id = ?", (new_marked, job_id))

    return {
        "success": True,
        "jobId": job_id,
        "profileId": resolved_pid,
        "marked": bool(new_marked),
        "message": "Job marked" if new_marked == 1 else "Job unmarked"
    }

class JobApplyRequest(BaseModel):
    user_approved: bool = False
    profile_id: Optional[str] = None

@router.post("/jobs/{job_id}/apply")
def toggle_job_application(
    job_id: int,
    body: Optional[JobApplyRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    with get_db() as conn:
        cur = conn.cursor()
        job = cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        is_currently_applied = bool(job["applied"])

        # If attempting to apply (transition from 0 -> 1)
        if not is_currently_applied:
            user_approved = body.user_approved if body else False
            profile_id = body.profile_id if body else None
            user_id = current_user.get("id") if current_user else None

            # Enforce External Submission Gate
            allowed, code, reasons = evaluate_submission_gate(
                job_id=job_id,
                profile_id=profile_id,
                user_approved=user_approved,
                user_id=user_id
            )
            if not allowed:
                status_code = 400 if code == "USER_APPROVAL_REQUIRED" else 422
                raise HTTPException(
                    status_code=status_code,
                    detail={
                        "error": code,
                        "message": "External job application is blocked by the submission gate.",
                        "reasons": reasons
                    }
                )
            new_applied = 1
        else:
            # User is withdrawing the application (always allowed)
            new_applied = 0

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

