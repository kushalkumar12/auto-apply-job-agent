import httpx
from typing import List, Dict, Any, Optional
from .normalizer import strip_html_tags, extract_skills, detect_work_mode

# Curated list of verified Workday instances with major Indian tech development centers
# Each entry defines:
#   company: Display name
#   cxs_url: Direct JSON CXS endpoint
#   base_url: Canonical web portal prefix for job deep-links
DEFAULT_WORKDAY_BOARDS = [
    {
        "company": "Adobe",
        "cxs_url": "https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs",
        "base_url": "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced",
        "location_hint": "India"
    },
    {
        "company": "Salesforce",
        "cxs_url": "https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/External_Career_Site/jobs",
        "base_url": "https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site",
        "location_hint": "India"
    },
    {
        "company": "Nvidia",
        "cxs_url": "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs",
        "base_url": "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite",
        "location_hint": "India"
    },
    {
        "company": "Target India",
        "cxs_url": "https://target.wd5.myworkdayjobs.com/wday/cxs/target/targetcareers/jobs",
        "base_url": "https://target.wd5.myworkdayjobs.com/en-US/targetcareers",
        "location_hint": "India"
    },
    {
        "company": "HP",
        "cxs_url": "https://hp.wd5.myworkdayjobs.com/wday/cxs/hp/ExternalCareerSite/jobs",
        "base_url": "https://hp.wd5.myworkdayjobs.com/en-US/ExternalCareerSite",
        "location_hint": "India"
    },
    {
        "company": "PwC India",
        "cxs_url": "https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/Global_Experienced_Careers/jobs",
        "base_url": "https://pwc.wd3.myworkdayjobs.com/en-US/Global_Experienced_Careers",
        "location_hint": "India"
    },
    {
        "company": "Intel",
        "cxs_url": "https://intel.wd1.myworkdayjobs.com/wday/cxs/intel/External/jobs",
        "base_url": "https://intel.wd1.myworkdayjobs.com/en-US/External",
        "location_hint": "India"
    },
    {
        "company": "Mastercard",
        "cxs_url": "https://mastercard.wd1.myworkdayjobs.com/wday/cxs/mastercard/CorporateCareers/jobs",
        "base_url": "https://mastercard.wd1.myworkdayjobs.com/en-US/CorporateCareers",
        "location_hint": "India"
    }
]

def fetch_workday_board(
    company_name: str,
    cxs_url: str,
    base_url: str,
    search_text: str = "India",
    limit: int = 25,
    timeout: float = 8.0
) -> List[Dict[str, Any]]:
    """
    Fetches real-time open positions from an enterprise Workday CXS public API.
    Normalizes each posting with direct application links, skill extraction, and work mode detection.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": base_url
    }

    payload = {
        "appliedFacets": {},
        "limit": limit,
        "offset": 0,
        "searchText": search_text
    }

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.post(cxs_url, json=payload, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:Workday] {company_name} returned HTTP {resp.status_code}")
                return []
            data = resp.json()
            postings = data.get("jobPostings", [])
    except Exception as e:
        print(f"[HARVEST:Workday] Error fetching {company_name}: {e}")
        return []

    results = []
    for item in postings:
        title = item.get("title", "").strip()
        if not title:
            continue

        external_path = item.get("externalPath", "")
        # Build canonical deep-link URL
        if external_path.startswith("http"):
            job_url = external_path
        else:
            job_url = f"{base_url}{external_path}"

        raw_location = item.get("locationsText", "") or "India"
        posted_on = item.get("postedOn", "")
        bullets = item.get("bulletFields", [])
        extra_text = " ".join(bullets) if bullets else ""

        full_text = f"{title} {raw_location} {extra_text}"
        skills = extract_skills(full_text)
        work_mode = detect_work_mode(full_text, raw_location)

        job_dict = {
            "role": title,
            "company": company_name,
            "logo": company_name.lower().replace(" ", ""),
            "source": f"Workday ({company_name})",
            "source_type": "workday",
            "external_id": external_path,
            "url": job_url,
            "workMode": work_mode,
            "location": raw_location,
            "salary": "Enterprise Standard",
            "description": f"{title} at {company_name}. Location: {raw_location}. Posted: {posted_on}",
            "skills": skills,
            "atsScore": 92,
            "dateTime": posted_on or "Direct Enterprise ATS"
        }
        results.append(job_dict)

    return results
