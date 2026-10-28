import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from .normalizer import strip_html_tags, extract_skills, detect_work_mode, parse_salary_text

GREENHOUSE_BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

# Curated list of high-reputation companies using Greenhouse public boards
DEFAULT_GREENHOUSE_BOARDS = [
    {"board": "inmobi", "company": "InMobi"},
    {"board": "stripe", "company": "Stripe"},
    {"board": "mongodb", "company": "MongoDB"},
    {"board": "elastic", "company": "Elastic"},
    {"board": "datadog", "company": "Datadog"},
    {"board": "airbnb", "company": "Airbnb"},
    {"board": "figma", "company": "Figma"},
    {"board": "cloudflare", "company": "Cloudflare"},
    {"board": "gitlab", "company": "GitLab"},
    {"board": "pinterest", "company": "Pinterest"},
    {"board": "reddit", "company": "Reddit"},
    {"board": "discord", "company": "Discord"},
    {"board": "scaleai", "company": "Scale AI"},
    {"board": "lyft", "company": "Lyft"},
    {"board": "robinhood", "company": "Robinhood"},
    {"board": "instacart", "company": "Instacart"},
    {"board": "gusto", "company": "Gusto"},
]

def fetch_greenhouse_board(board: str, company_name: Optional[str] = None, timeout: float = 8.0) -> List[Dict[str, Any]]:
    """
    Fetches all postings from a Greenhouse public job board.
    Extracts inline content, cleans HTML, detects workMode, extracts skills,
    and returns list of normalized job dicts.
    """
    company = company_name or board.capitalize()
    url = f"{GREENHOUSE_BASE_URL}/{board}/jobs?content=true"
    headers = {"User-Agent": "ResumePorter-Harvester/2.0"}
    
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:Greenhouse] Board '{board}' responded with {resp.status_code}")
                return []
            data = resp.json()
            raw_jobs = data.get("jobs", [])
    except Exception as e:
        print(f"[HARVEST:Greenhouse] Error fetching board '{board}': {e}")
        return []

    results = []
    for rj in raw_jobs:
        title = rj.get("title", "").strip()
        if not title:
            continue
        
        raw_location = ""
        loc_obj = rj.get("location")
        if isinstance(loc_obj, dict):
            raw_location = loc_obj.get("name", "")
        elif isinstance(loc_obj, str):
            raw_location = loc_obj

        raw_content = rj.get("content", "")
        clean_desc = strip_html_tags(raw_content)
        skills = extract_skills(f"{title} {clean_desc}")
        work_mode = detect_work_mode(clean_desc, raw_location)
        salary_str = parse_salary_text("", None, None)

        job_dict = {
            "role": title,
            "company": company,
            "logo": company.lower().replace(" ", ""),
            "source": f"Greenhouse ({company})",
            "source_type": "greenhouse",
            "external_id": str(rj.get("id")),
            "url": rj.get("absolute_url") or f"https://boards.greenhouse.io/{board}/jobs/{rj.get('id')}",
            "workMode": work_mode,
            "location": raw_location or ("Remote" if work_mode == "Remote" else "United States"),
            "salary": salary_str,
            "description": clean_desc,
            "skills": skills,
            "atsScore": 88,
            "dateTime": "Direct ATS"
        }
        results.append(job_dict)

    return results
