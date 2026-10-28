import httpx
from typing import List, Dict, Any, Optional
from .normalizer import strip_html_tags, extract_skills, detect_work_mode

# Curated list of verified SmartRecruiters companies hiring in India
DEFAULT_SMARTRECRUITERS_BOARDS = [
    {
        "company": "Bosch Group",
        "identifier": "BoschGroup",
        "country": "in"
    },
    {
        "company": "SGS India",
        "identifier": "SGS",
        "country": "in"
    },
    {
        "company": "Colliers India",
        "identifier": "Colliers",
        "country": "in"
    },
    {
        "company": "Avery Dennison",
        "identifier": "AveryDennison",
        "country": "in"
    }
]

SMARTRECRUITERS_API_BASE = "https://api.smartrecruiters.com/v1/companies"

def fetch_smartrecruiters_board(
    company_name: str,
    identifier: str,
    country: str = "in",
    limit: int = 25,
    timeout: float = 8.0
) -> List[Dict[str, Any]]:
    """
    Fetches real-time open positions from the public SmartRecruiters REST API.
    Filters by country (default 'in' for India) and normalizes postings.
    """
    url = f"{SMARTRECRUITERS_API_BASE}/{identifier}/postings"
    params = {"limit": limit}
    if country:
        params["country"] = country

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:SmartRecruiters] {company_name} ({identifier}) HTTP {resp.status_code}")
                return []
            data = resp.json()
            postings = data.get("content", [])
    except Exception as e:
        print(f"[HARVEST:SmartRecruiters] Error fetching {company_name}: {e}")
        return []

    results = []
    for item in postings:
        title = item.get("name", "").strip()
        if not title:
            continue

        job_id = item.get("id", "")
        # Public posting deep-link
        job_url = f"https://jobs.smartrecruiters.com/{identifier}/{job_id}"

        loc_obj = item.get("location", {})
        city = loc_obj.get("city", "")
        country_code = loc_obj.get("country", "").upper()
        full_location = loc_obj.get("fullLocation") or f"{city}, {country_code}"
        if not city and not full_location:
            full_location = "India"

        # Department / function
        dept_name = item.get("function", {}).get("label", "") or item.get("industry", {}).get("label", "")
        desc = f"{title} at {company_name}. Department: {dept_name}. Location: {full_location}"

        full_text = f"{title} {dept_name} {full_location}"
        skills = extract_skills(full_text)
        work_mode = "Remote" if loc_obj.get("remote") else detect_work_mode(full_text, full_location)

        job_dict = {
            "role": title,
            "company": company_name,
            "logo": identifier.lower(),
            "source": f"SmartRecruiters ({company_name})",
            "source_type": "smartrecruiters",
            "external_id": str(job_id),
            "url": job_url,
            "workMode": work_mode,
            "location": full_location,
            "salary": "Market Rate",
            "description": desc,
            "skills": skills,
            "atsScore": 90,
            "dateTime": "Direct ATS"
        }
        results.append(job_dict)

    return results
