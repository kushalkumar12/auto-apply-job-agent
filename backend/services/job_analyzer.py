"""
Job Requirement Analyzer Service for Skill2Role RAG System.
Extracts structured technical competencies, seniority levels, and core responsibilities
from job postings in SQLite jobs.db with persistent caching in job_requirements table.
"""

import re
import json
import time
from typing import Dict, Any, List, Optional

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

SENIORITY_PATTERNS = [
    (r"\b(principal|staff|lead|architect|director|head of)\b", "Lead"),
    (r"\b(senior|sr\.?|iii|level 3)\b", "Senior"),
    (r"\b(mid|ii|intermediate)\b", "Mid"),
    (r"\b(junior|jr\.?|associate|entry|intern)\b", "Junior")
]

EXP_YEARS_REGEX = re.compile(r"(\d+(?:\.\d+)?)\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?)(?:\s*of\s*experience)?", re.IGNORECASE)

KNOWN_TECH_CATALOG = [
    "java", "spring boot", "spring cloud", "kafka", "aws", "docker", "kubernetes",
    "python", "microservices", "sql", "postgresql", "mysql", "redis", "mongodb",
    "rest api", "graphql", "grpc", "ci/cd", "git", "terraform", "linux", "elasticsearch",
    "react", "typescript", "javascript", "golang", "c++", "c#"
]

def analyze_job(job_row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyzes job title, skills, and description into structured requirements.
    """
    role = job_row.get("role", "")
    description = job_row.get("description", "")
    skills_raw = job_row.get("skills", "")

    # 1. Parse base skills
    skills_list = []
    if skills_raw:
        try:
            parsed_s = json.loads(skills_raw)
            if isinstance(parsed_s, list):
                skills_list = [s.strip() for s in parsed_s if s.strip()]
        except Exception:
            skills_list = [s.strip() for s in re.split(r"[,|•]+", skills_raw) if s.strip()]

    # Also detect tech keywords from description
    desc_lower = description.lower()
    discovered_tech = []
    for tech in KNOWN_TECH_CATALOG:
        if re.search(rf"\b{re.escape(tech)}\b", desc_lower) and tech not in [s.lower() for s in skills_list]:
            discovered_tech.append(tech.title())

    # Split into required vs preferred
    required_skills = skills_list[:5] if skills_list else discovered_tech[:4]
    preferred_skills = skills_list[5:] if len(skills_list) > 5 else discovered_tech[4:8]

    # 2. Determine Seniority Level
    full_text = f"{role} {description}".lower()
    seniority = "Mid"
    for pat, label in SENIORITY_PATTERNS:
        if re.search(pat, full_text):
            seniority = label
            break

    # 3. Determine Required Years of Experience
    exp_matches = EXP_YEARS_REGEX.findall(full_text)
    if exp_matches:
        try:
            exp_years = float(exp_matches[0])
        except Exception:
            exp_years = 4.0
    else:
        # Fallback by seniority
        exp_years = 8.0 if seniority == "Lead" else (5.0 if seniority == "Senior" else 3.0)

    # 4. Extract Key Responsibilities from Description
    bullet_lines = []
    for line in description.splitlines():
        clean = line.strip()
        if clean.startswith(("-", "•", "*", "–")) or len(clean) > 30:
            clean_b = re.sub(r"^[\s•\-\*–]+", "", clean).strip()
            if len(clean_b) > 20 and len(clean_b) < 200:
                bullet_lines.append(clean_b)

    if not bullet_lines:
        bullet_lines = [
            f"Design and develop scalable services for {job_row.get('company', 'the engineering team')}.",
            "Collaborate with cross-functional teams to build reliable distributed systems.",
            "Write robust unit and integration tests to maintain high software quality."
        ]

    return {
        "job_id": job_row["id"],
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "seniority_level": seniority,
        "experience_years": exp_years,
        "responsibilities": bullet_lines[:6],
        "raw_keywords": list(set([s.lower() for s in (required_skills + preferred_skills + discovered_tech)]))
    }

def get_or_analyze_job_requirements(job_id: int) -> Dict[str, Any]:
    """
    Retrieves cached job requirements from job_requirements table or analyzes and caches them.
    """
    with get_db() as conn:
        cur = conn.cursor()
        cached = cur.execute("SELECT * FROM job_requirements WHERE job_id = ?", (job_id,)).fetchone()
        if cached:
            return {
                "job_id": cached["job_id"],
                "required_skills": json.loads(cached["required_skills"]),
                "preferred_skills": json.loads(cached["preferred_skills"]),
                "seniority_level": cached["seniority_level"],
                "experience_years": cached["experience_years"],
                "responsibilities": json.loads(cached["responsibilities"]),
                "raw_keywords": json.loads(cached["raw_keywords"])
            }

        job = cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise ValueError(f"Job with id {job_id} not found in database.")

        analyzed = analyze_job(dict(job))
        now = int(time.time() * 1000)

        cur.execute("""
            INSERT OR REPLACE INTO job_requirements (job_id, required_skills, preferred_skills, seniority_level, experience_years, responsibilities, raw_keywords, analyzed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            analyzed["job_id"],
            json.dumps(analyzed["required_skills"]),
            json.dumps(analyzed["preferred_skills"]),
            analyzed["seniority_level"],
            analyzed["experience_years"],
            json.dumps(analyzed["responsibilities"]),
            json.dumps(analyzed["raw_keywords"]),
            now
        ))

        return analyzed
