import httpx
from typing import List, Dict, Any, Optional
from .normalizer import strip_html_tags, extract_skills, detect_work_mode, parse_salary_text

ASHBY_BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"

# Curated list of high-reputation companies using Ashby public boards
DEFAULT_ASHBY_BOARDS = [
    {"board": "linear", "company": "Linear"},
    {"board": "notion", "company": "Notion"},
    {"board": "ramp", "company": "Ramp"},
    {"board": "perplexity", "company": "Perplexity"},
    {"board": "elevenlabs", "company": "ElevenLabs"},
    {"board": "modal", "company": "Modal"},
    {"board": "supabase", "company": "Supabase"},
    {"board": "dust", "company": "Dust"},
    {"board": "cursor", "company": "Cursor"},
    {"board": "sentry", "company": "Sentry"},
    {"board": "replit", "company": "Replit"},
]

def fetch_ashby_board(board: str, company_name: Optional[str] = None, timeout: float = 8.0) -> List[Dict[str, Any]]:
    """
    Fetches all postings from an Ashby public job board.
    Includes compensation, workplaceType, and full HTML description.
    """
    company = company_name or board.capitalize()
    url = f"{ASHBY_BASE_URL}/{board}?includeCompensation=true"
    headers = {"User-Agent": "ResumePorter-Harvester/2.0"}

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:Ashby] Board '{board}' responded with {resp.status_code}")
                return []
            data = resp.json()
            raw_jobs = data.get("jobs", [])
    except Exception as e:
        print(f"[HARVEST:Ashby] Error fetching board '{board}': {e}")
        return []

    results = []
    for rj in raw_jobs:
        title = rj.get("title", "").strip()
        if not title:
            continue

        location = rj.get("location") or ""
        wp_type = rj.get("workplaceType") or ("Remote" if rj.get("isRemote") else "")
        desc_html = rj.get("descriptionHtml") or ""
        clean_desc = strip_html_tags(desc_html)
        work_mode = detect_work_mode(clean_desc, location, wp_type)
        skills = extract_skills(f"{title} {clean_desc}")

        # Check structured compensation if present
        comp = rj.get("compensation") or {}
        salary_str = parse_salary_text(
            "",
            comp.get("minSalary") or comp.get("minCompensation"),
            comp.get("maxSalary") or comp.get("maxCompensation"),
            comp.get("currencySymbol") or "$"
        )

        job_dict = {
            "role": title,
            "company": company,
            "logo": company.lower().replace(" ", ""),
            "source": f"Ashby ({company})",
            "source_type": "ashby",
            "external_id": str(rj.get("id")),
            "url": rj.get("jobUrl") or f"https://jobs.ashbyhq.com/{board}/{rj.get('id')}",
            "workMode": work_mode,
            "location": location or ("Remote" if work_mode == "Remote" else "United States"),
            "salary": salary_str,
            "description": clean_desc,
            "skills": skills,
            "atsScore": 90,
            "dateTime": "Direct ATS"
        }
        results.append(job_dict)

    return results
