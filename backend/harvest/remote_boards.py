import httpx
from typing import List, Dict, Any
from .normalizer import strip_html_tags, extract_skills, parse_salary_text

def fetch_remoteok(limit: int = 50, timeout: float = 8.0) -> List[Dict[str, Any]]:
    """
    Fetches real-time remote tech jobs from RemoteOK developer API.
    """
    url = "https://remoteok.com/api"
    headers = {"User-Agent": "ResumePorter-Harvester/2.0 (Contact: team@resumeporter.ai)"}

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:RemoteOK] Responded with status {resp.status_code}")
                return []
            data = resp.json()
            if not isinstance(data, list):
                return []
    except Exception as e:
        print(f"[HARVEST:RemoteOK] Error fetching jobs: {e}")
        return []

    results = []
    # Note: first item in remoteok feed is a disclaimer without an ID
    for item in data:
        if not isinstance(item, dict) or not item.get("id") or not item.get("position"):
            continue
        company = (item.get("company") or "Tech Corp").strip()
        title = item.get("position", "").strip()
        tags = item.get("tags") or []
        clean_desc = strip_html_tags(item.get("description", ""))

        skills = extract_skills(f"{title} {' '.join(tags)} {clean_desc}")
        # Append tags as skills if not already present
        for t in tags[:4]:
            cap_t = t.title()
            if cap_t not in skills:
                skills.append(cap_t)

        loc = item.get("location") or "Worldwide (Remote)"
        salary_str = parse_salary_text(item.get("salary", ""))

        job_dict = {
            "role": title,
            "company": company,
            "logo": company.lower().replace(" ", ""),
            "source": f"RemoteOK ({company})",
            "source_type": "remoteok",
            "external_id": str(item.get("id")),
            "url": item.get("url") or f"https://remoteok.com/remote-jobs/{item.get('id')}",
            "workMode": "Remote",
            "location": loc,
            "salary": salary_str,
            "description": clean_desc,
            "skills": skills[:8],
            "atsScore": 89,
            "dateTime": "Direct ATS"
        }
        results.append(job_dict)
        if len(results) >= limit:
            break

    return results

def fetch_remotive(limit: int = 50, timeout: float = 8.0) -> List[Dict[str, Any]]:
    """
    Fetches real-time remote tech jobs from Remotive public API.
    """
    url = f"https://remotive.com/api/remote-jobs?limit={limit}"
    headers = {"User-Agent": "ResumePorter-Harvester/2.0"}

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"[HARVEST:Remotive] Responded with status {resp.status_code}")
                return []
            data = resp.json()
            jobs_list = data.get("jobs", [])
    except Exception as e:
        print(f"[HARVEST:Remotive] Error fetching jobs: {e}")
        return []

    results = []
    for item in jobs_list:
        title = item.get("title", "").strip()
        company = (item.get("company_name") or "Tech Corp").strip()
        if not title:
            continue

        clean_desc = strip_html_tags(item.get("description", ""))
        tags = item.get("tags") or []
        skills = extract_skills(f"{title} {' '.join(tags)} {clean_desc}")
        loc = item.get("candidate_required_location") or "Remote Anywhere"
        salary_str = parse_salary_text(item.get("salary", ""))

        job_dict = {
            "role": title,
            "company": company,
            "logo": company.lower().replace(" ", ""),
            "source": f"Remotive ({company})",
            "source_type": "remotive",
            "external_id": str(item.get("id")),
            "url": item.get("url") or "https://remotive.com",
            "workMode": "Remote",
            "location": loc,
            "salary": salary_str,
            "description": clean_desc,
            "skills": skills[:8],
            "atsScore": 88,
            "dateTime": "Direct ATS"
        }
        results.append(job_dict)

    return results
