import time
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

from .greenhouse import fetch_greenhouse_board, DEFAULT_GREENHOUSE_BOARDS
from .ashby import fetch_ashby_board, DEFAULT_ASHBY_BOARDS
from .lever import fetch_lever_board, DEFAULT_LEVER_BOARDS
from .remote_boards import fetch_remoteok, fetch_remotive
from .workday import fetch_workday_board, DEFAULT_WORKDAY_BOARDS
from .smartrecruiters import fetch_smartrecruiters_board, DEFAULT_SMARTRECRUITERS_BOARDS

HARVEST_SOURCES = [
    {
        "id": "workday",
        "name": "Workday Enterprise ATS (India & Global)",
        "description": "Direct Workday CXS enterprise portals (Adobe, Salesforce, Nvidia, Target India, HP, PwC India, Intel, Mastercard)",
        "default_boards": [b["company"] for b in DEFAULT_WORKDAY_BOARDS]
    },
    {
        "id": "smartrecruiters",
        "name": "SmartRecruiters Enterprise (India Hubs)",
        "description": "Enterprise recruiting portal (Bosch Group India, SGS India, Colliers, Avery Dennison)",
        "default_boards": [b["company"] for b in DEFAULT_SMARTRECRUITERS_BOARDS]
    },
    {
        "id": "greenhouse",
        "name": "Greenhouse Direct ATS",
        "description": "Public enterprise candidate boards (InMobi, Stripe, MongoDB, Elastic, Datadog, Airbnb, Figma)",
        "default_boards": [b["company"] for b in DEFAULT_GREENHOUSE_BOARDS]
    },
    {
        "id": "ashby",
        "name": "Ashby HQ Direct ATS",
        "description": "Next-gen tech company job boards (Linear, Notion, Ramp, Perplexity)",
        "default_boards": [b["company"] for b in DEFAULT_ASHBY_BOARDS]
    },
    {
        "id": "lever",
        "name": "Lever Postings ATS",
        "description": "Clean structured ATS postings (Palantir, Automattic, Kinsta)",
        "default_boards": [b["company"] for b in DEFAULT_LEVER_BOARDS]
    },
    {
        "id": "remoteok",
        "name": "RemoteOK Developer Feed",
        "description": "Global verified remote tech jobs with developer tags",
        "default_boards": ["Remote Worldwide"]
    },
    {
        "id": "remotive",
        "name": "Remotive Tech Jobs",
        "description": "Hand-picked developer and tech company remote listings",
        "default_boards": ["Remote Global"]
    }
]

LAST_HARVEST_TIMESTAMP = 0

def upsert_harvested_job(conn, job: Dict[str, Any], user_skills: List[str], profile_id: Optional[str] = None) -> bool:
    """
    Inserts or updates a job into the SQLite database.
    Computes ATS score dynamically against candidate's profile skills.
    Preserves profile attribution and proper date timestamps.
    Returns True if inserted, False if updated.
    """
    cur = conn.cursor()
    role = job["role"]
    company = job["company"]
    
    # Calculate candidate ATS score
    job_skills = job.get("skills", [])
    if user_skills and job_skills:
        matches_count = sum(
            1 for js in job_skills
            if any(us in js.lower() or js.lower() in us for us in user_skills)
        )
        ats_score = min(98, max(76, round(72 + (matches_count / max(len(job_skills), 1)) * 26)))
    else:
        ats_score = job.get("atsScore", 85)

    existing = cur.execute(
        "SELECT id FROM jobs WHERE LOWER(role) = LOWER(?) AND LOWER(company) = LOWER(?)",
        (role, company)
    ).fetchone()

    skills_json = json.dumps(job_skills)
    now_ts = int(time.time() * 1000)
    current_date_str = datetime.now().strftime("%d-%b-%y %I:%M %p")
    raw_date = job.get("dateTime")
    date_val = current_date_str if (not raw_date or raw_date == "Direct ATS") else raw_date

    url = job.get("url", "")

    if existing:
        cur.execute("""
            UPDATE jobs
            SET source = ?, workMode = ?, atsScore = ?, location = ?,
                salary = ?, description = ?, skills = ?, dateTime = ?, url = ?, profile_id = COALESCE(profile_id, ?)
            WHERE id = ?
        """, (
            job["source"], job["workMode"], ats_score, job["location"],
            job["salary"], job["description"], skills_json, date_val, url,
            profile_id, existing["id"]
        ))
        return False
    else:
        cur.execute("""
            INSERT INTO jobs (
                role, company, logo, source, workMode, atsScore,
                dateTime, location, salary, description, skills, applied, created_at, url, profile_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        """, (
            role, company, job.get("logo", ""), job["source"], job["workMode"], ats_score,
            date_val, job["location"], job.get("salary", "Competitive"), job.get("description", ""),
            skills_json, now_ts, url, profile_id
        ))
        return True

def sync_harvest(
    providers: Optional[List[str]] = None,
    limit_per_source: int = 40
) -> Dict[str, Any]:
    """
    Executes a comprehensive harvest across selected ATS providers,
    upserting jobs directly into SQLite and preserving local search indexing.
    Prioritizes Indian enterprise portals and locations.
    """
    global LAST_HARVEST_TIMESTAMP
    start_time = time.time()
    active_providers = providers or ["workday", "smartrecruiters", "greenhouse", "ashby", "lever", "remoteok", "remotive"]

    harvested_jobs = []

    # 1. Load active user profile skills for real-time ATS scoring
    user_skills = []
    with get_db() as conn:
        cur = conn.cursor()
        p_row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
        if p_row and p_row["data"]:
            try:
                p_data = json.loads(p_row["data"])
                for s in p_data.get("skillsList", []):
                    name = s["name"] if isinstance(s, dict) else str(s)
                    user_skills.append(name.lower())
            except Exception:
                pass

    from concurrent.futures import ThreadPoolExecutor, as_completed

    tasks = []
    with ThreadPoolExecutor(max_workers=12) as executor:
        # 2. Crawl Workday Enterprise Boards (Targeting India hubs)
        if "workday" in active_providers:
            for b in DEFAULT_WORKDAY_BOARDS:
                tasks.append(executor.submit(
                    fetch_workday_board,
                    b["company"],
                    b["cxs_url"],
                    b["base_url"],
                    "India",
                    limit_per_source,
                    8.0
                ))

        # 3. Crawl SmartRecruiters Boards (Targeting India hubs)
        if "smartrecruiters" in active_providers:
            for b in DEFAULT_SMARTRECRUITERS_BOARDS:
                tasks.append(executor.submit(
                    fetch_smartrecruiters_board,
                    b["company"],
                    b["identifier"],
                    b.get("country", "in"),
                    limit_per_source,
                    8.0
                ))

        # 4. Crawl Greenhouse Boards
        if "greenhouse" in active_providers:
            for b in DEFAULT_GREENHOUSE_BOARDS:
                tasks.append(executor.submit(fetch_greenhouse_board, b["board"], b["company"], 5.0))

        # 5. Crawl Ashby Boards
        if "ashby" in active_providers:
            for b in DEFAULT_ASHBY_BOARDS:
                tasks.append(executor.submit(fetch_ashby_board, b["board"], b["company"], 5.0))

        # 6. Crawl Lever Boards
        if "lever" in active_providers:
            for b in DEFAULT_LEVER_BOARDS:
                tasks.append(executor.submit(fetch_lever_board, b["board"], b["company"], 5.0))

        # 7. Crawl RemoteOK
        if "remoteok" in active_providers:
            tasks.append(executor.submit(fetch_remoteok, limit_per_source, 5.0))

        # 8. Crawl Remotive
        if "remotive" in active_providers:
            tasks.append(executor.submit(fetch_remotive, limit_per_source, 5.0))

        for future in as_completed(tasks):
            try:
                jobs = future.result()
                if jobs:
                    harvested_jobs.extend(jobs[:limit_per_source])
            except Exception as e:
                print(f"[HARVEST:WorkerError] {e}")

    # 7. Upsert into Database with transaction safety
    total_inserted = 0
    total_updated = 0
    with get_db() as conn:
        for j in harvested_jobs:
            try:
                was_inserted = upsert_harvested_job(conn, j, user_skills)
                if was_inserted:
                    total_inserted += 1
                else:
                    total_updated += 1
            except Exception as e:
                print(f"[HARVEST:UpsertError] {e}")

    LAST_HARVEST_TIMESTAMP = int(time.time() * 1000)
    duration = round(time.time() - start_time, 2)

    return {
        "success": True,
        "totalHarvested": len(harvested_jobs),
        "totalInserted": total_inserted,
        "totalUpdated": total_updated,
        "durationSeconds": duration,
        "activeProviders": active_providers,
        "timestamp": LAST_HARVEST_TIMESTAMP
    }

def get_harvest_status() -> Dict[str, Any]:
    """Returns database counts of harvested jobs vs local jobs."""
    with get_db() as conn:
        cur = conn.cursor()
        total_jobs = cur.execute("SELECT COUNT(*) as cnt FROM jobs").fetchone()["cnt"]
        harvested_cnt = cur.execute(
            "SELECT COUNT(*) as cnt FROM jobs WHERE source LIKE '%Workday%' OR source LIKE '%SmartRecruiters%' OR source LIKE '%Greenhouse%' OR source LIKE '%Ashby%' OR source LIKE '%Lever%' OR source LIKE '%RemoteOK%' OR source LIKE '%Remotive%'"
        ).fetchone()["cnt"]
        local_cnt = total_jobs - harvested_cnt

        sources_breakdown = {}
        rows = cur.execute("""
            SELECT 
                CASE 
                    WHEN source LIKE '%Workday%' THEN 'Workday'
                    WHEN source LIKE '%SmartRecruiters%' THEN 'SmartRecruiters'
                    WHEN source LIKE '%Greenhouse%' THEN 'Greenhouse'
                    WHEN source LIKE '%Ashby%' THEN 'Ashby'
                    WHEN source LIKE '%Lever%' THEN 'Lever'
                    WHEN source LIKE '%RemoteOK%' THEN 'RemoteOK'
                    WHEN source LIKE '%Remotive%' THEN 'Remotive'
                    ELSE 'Local Database'
                END as src_group,
                COUNT(*) as count
            FROM jobs
            GROUP BY src_group
        """).fetchall()
        for r in rows:
            sources_breakdown[r["src_group"]] = r["count"]

    return {
        "totalJobs": total_jobs,
        "localJobs": local_cnt,
        "harvestedJobs": harvested_cnt,
        "breakdown": sources_breakdown,
        "availableProviders": HARVEST_SOURCES,
        "lastHarvestTimestamp": LAST_HARVEST_TIMESTAMP
    }
