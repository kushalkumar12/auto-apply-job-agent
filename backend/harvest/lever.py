import httpx
from typing import List, Dict, Any, Optional
from .normalizer import strip_html_tags, extract_skills, detect_work_mode, parse_salary_text

LEVER_BASE_URL = "https://api.lever.co/v0/postings"

DEFAULT_LEVER_BOARDS = [
    {"board": "palantir", "company": "Palantir"},
    {"board": "kinsta", "company": "Kinsta"},
    {"board": "lever", "company": "Lever"},
    {"board": "spotify", "company": "Spotify"},
]

def fetch_lever_board(board: str, company_name: Optional[str] = None, timeout: float = 8.0) -> List[Dict[str, Any]]:
    """
    Fetches all postings from a Lever public job board in JSON mode.
    """
    company = company_name or board.capitalize()
    url = f"{LEVER_BASE_URL}/{board}?mode=json"
    headers = {"User-Agent": "ResumePorter-Harvester/2.0"}

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:Lever] Board '{board}' responded with {resp.status_code}")
                return []
            raw_postings = resp.json()
            if not isinstance(raw_postings, list):
                return []
    except Exception as e:
        print(f"[HARVEST:Lever] Error fetching board '{board}': {e}")
        return []

    results = []
    for p in raw_postings:
        title = p.get("text", "").strip()
        if not title:
            continue

        cats = p.get("categories") or {}
        location = cats.get("location") or ""
        wp_type = p.get("workplaceType") or ""
        desc_html = p.get("description") or ""
        clean_desc = strip_html_tags(desc_html)
        work_mode = detect_work_mode(clean_desc, location, wp_type)
        skills = extract_skills(f"{title} {clean_desc}")

        salary_range = p.get("salaryRange") or {}
        salary_str = parse_salary_text(
            "",
            salary_range.get("min"),
            salary_range.get("max"),
            salary_range.get("currency") or "$"
        )

        job_dict = {
            "role": title,
            "company": company,
            "logo": company.lower().replace(" ", ""),
            "source": f"Lever ({company})",
            "source_type": "lever",
            "external_id": str(p.get("id")),
            "url": p.get("hostedUrl") or f"https://jobs.lever.co/{board}/{p.get('id')}",
            "workMode": work_mode,
            "location": location or ("Remote" if work_mode == "Remote" else "United States"),
            "salary": salary_str,
            "description": clean_desc,
            "skills": skills,
            "atsScore": 87,
            "dateTime": "Direct ATS"
        }
        results.append(job_dict)

    return results
