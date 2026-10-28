import json
import time
import io
import re
import zipfile
import uuid
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Depends

import os
from pathlib import Path
from fastapi.responses import FileResponse, PlainTextResponse, Response

try:
    from ..database import get_db
    from ..models import (
        KeywordsGenerateRequest, 
        KeywordsUpdateRequest
    )
    from ..services.profile_validator import validate_candidate_profile, MANDATORY_FIELD_DEFINITIONS
    from ..services.keyword_generator import generate_keywords_for_profile
    from ..services.auth_service import get_current_user
except (ImportError, ValueError):
    from database import get_db
    from models import (
        KeywordsGenerateRequest, 
        KeywordsUpdateRequest
    )
    from services.profile_validator import validate_candidate_profile, MANDATORY_FIELD_DEFINITIONS
    from services.keyword_generator import generate_keywords_for_profile
    from services.auth_service import get_current_user

RESUME_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "resumes"
RESUME_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(tags=["Profile"])

# Common Tech Skills Taxonomy
KNOWN_SKILLS = [
    ("Java", "java"), ("Spring Boot", "spring"), ("Spring", "spring"), 
    ("Microservices", None), ("Kafka", None), ("Redis", "redis"), 
    ("PostgreSQL", "database"), ("SQL", "database"), ("MySQL", "database"), 
    ("Oracle", "database"), ("MongoDB", "database"), ("Hibernate", None), 
    ("JPA", None), ("REST APIs", None), ("REST", None), ("GraphQL", None),
    ("AWS", "cloud"), ("Docker", "docker"), ("Kubernetes", "k8s"), 
    ("Git", "git"), ("CI/CD", None), ("Jenkins", None), ("Terraform", None),
    ("Python", None), ("React", "react"), ("Node.js", None), ("TypeScript", None), 
    ("JavaScript", None), ("Linux", None), ("JUnit", None), ("Mockito", None),
    ("OAuth", None), ("JWT", None), ("Distributed Systems", None), ("API Design", None)
]

KNOWN_ROLES = [
    "Software Engineering", "Backend", "Full-Stack", "Frontend", "DevOps", 
    "Cloud Architecture", "Data Engineering", "Machine Learning", "Mobile Development",
    "Systems Engineering", "SRE", "Security"
]

def deep_merge(dict1: dict, dict2: dict) -> dict:
    result = dict(dict1)
    # Certain field dictionaries represent direct user state (e.g. screeningAnswers, workFormats)
    # and should be overwritten completely if provided in dict2 rather than endlessly unioned.
    REPLACE_ENTIRELY_KEYS = {"screeningAnswers", "workFormats"}
    for key, value in dict2.items():
        if key in REPLACE_ENTIRELY_KEYS:
            result[key] = value
        elif key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extracts raw text from PDF, DOCX, TXT, or JSON files."""
    name_lower = filename.lower()
    
    # 1. Plain Text / Markdown / JSON
    if name_lower.endswith(('.txt', '.md', '.json', '.rtf')):
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            return file_bytes.decode('latin-1', errors='ignore')

    # 2. PDF Extraction using pypdf
    if name_lower.endswith('.pdf'):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_pages.append(extracted)
            return "\n".join(text_pages)
        except Exception as e:
            print(f"[PDF Extract Warning] {e}")
            # Fallback text scan
            return file_bytes.decode('latin-1', errors='ignore')

    # 3. DOCX Extraction via standard zipfile / XML (no external docx dep required)
    if name_lower.endswith('.docx'):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                xml_content = z.read('word/document.xml').decode('utf-8')
                # Remove XML tags cleanly
                text = re.sub(r'<w:p[^>]*>', '\n', xml_content)
                text = re.sub(r'<[^>]+>', '', text)
                return text
        except Exception as e:
            print(f"[DOCX Extract Warning] {e}")
            return file_bytes.decode('latin-1', errors='ignore')

    return file_bytes.decode('utf-8', errors='ignore')

def parse_resume_content(raw_text: str) -> Dict[str, Any]:
    """Parses raw resume text and automatically extracts structured profile data."""
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    full_text_lower = raw_text.lower()

    # 1. Name Detection (First 1-4 lines, excluding common non-name headers)
    name = ""
    for line in lines[:5]:
        cleaned = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        words = cleaned.split()
        if 2 <= len(words) <= 4 and not any(kw in cleaned.lower() for kw in ['resume', 'curriculum', 'vitae', 'page', 'email', 'phone', 'contact']):
            name = cleaned.title()
            break

    # 2. Email Detection
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
    email = email_match.group(0) if email_match else ""

    # 3. Phone Detection
    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[\s-]?\d{10}|\b\d{10}\b', raw_text)
    phone = phone_match.group(0) if phone_match else ""

    # 4. Links Detection
    links = []
    linkedin_match = re.search(r'https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+', raw_text, re.IGNORECASE)
    if linkedin_match:
        links.append(linkedin_match.group(0))
    github_match = re.search(r'https?://(?:www\.)?github\.com/[a-zA-Z0-9_-]+', raw_text, re.IGNORECASE)
    if github_match:
        links.append(github_match.group(0))
    if not links:
        links = []

    # 5. Location Detection
    detected_location = ""
    common_cities = ["Hyderabad", "Bengaluru", "Bangalore", "Mumbai", "Pune", "Delhi", "Noida", "Gurugram", "Chennai", "Remote", "London", "New York", "San Francisco"]
    for city in common_cities:
        if city.lower() in full_text_lower:
            detected_location = f"{city}, India" if city in ["Hyderabad", "Bengaluru", "Bangalore", "Mumbai", "Pune", "Delhi", "Noida", "Gurugram", "Chennai"] else city
            break

    # 6. Skills Extraction
    extracted_skills = []
    for skill_name, icon in KNOWN_SKILLS:
        pattern = r'\b' + re.escape(skill_name.lower()) + r'\b'
        if re.search(pattern, full_text_lower):
            extracted_skills.append({"name": skill_name.lower(), "icon": icon})

    # 7. Roles & Seniority Detection
    detected_roles = []
    if "backend" in full_text_lower or "java" in full_text_lower:
        detected_roles.append("Backend")
        detected_roles.append("Software Engineering")
    if "full stack" in full_text_lower or "full-stack" in full_text_lower:
        detected_roles.append("Full-Stack")
    if "devops" in full_text_lower or "cloud" in full_text_lower:
        detected_roles.append("DevOps")
    if "frontend" in full_text_lower or "react" in full_text_lower:
        detected_roles.append("Frontend")

    detected_levels = []
    if any(kw in full_text_lower for kw in ["senior", "sr.", "lead", "architect", "staff", "principal"]):
        detected_levels.append("Senior")
    if any(kw in full_text_lower for kw in ["middle", "mid", "associate", "developer", "engineer"]):
        detected_levels.append("Middle")

    # 8. Summary / Headline Extraction
    summary = ""
    summary_match = re.search(r'(?:summary|profile|about me|objective)[:\s\n]+([^\n]+(?:\n[^\n]+){1,4})', raw_text, re.IGNORECASE)
    if summary_match:
        summary = summary_match.group(1).strip()
    if not summary or len(summary) < 20:
        if extracted_skills:
            summary = f"{name} - {detected_roles[0] if detected_roles else 'Software'} Engineer specializing in {', '.join([s['name'] for s in extracted_skills[:4]])}."
        elif name:
            summary = f"{name} - Software Engineering Professional."
        else:
            summary = ""

    # 9. Professional Experience Extraction
    experiences = []
    exp_section = re.search(r'(?:experience|employment|work history)[:\s\n]+(.*?)(?:education|skills|certifications|projects|$)', raw_text, re.IGNORECASE | re.DOTALL)
    if exp_section:
        exp_text = exp_section.group(1).strip()
        exp_lines = [l.strip() for l in exp_text.split('\n') if l.strip()]
        if exp_lines:
            company = ""
            title = ""
            period = ""
            bullets = []

            for l in exp_lines[:10]:
                if any(yr in l for yr in ["2020", "2021", "2022", "2023", "2024", "2025", "2026", "present"]):
                    period = l
                elif any(co in l.lower() for co in ["technologies", "solutions", "systems", "corp", "inc", "llp", "ltd", "google", "microsoft"]):
                    company = l
                elif any(r in l.lower() for r in ["engineer", "developer", "architect", "lead"]):
                    title = l
                elif l.startswith(('•', '-', '*', '—')):
                    bullets.append(l.lstrip('•-*— ').strip())
            
            if company or title:
                experiences.append({
                    "title": title or "Software Engineer",
                    "company": company or "Organization",
                    "location": detected_location,
                    "period": period,
                    "description": " ".join(bullets) if bullets else ""
                })

    # 10. Education Extraction
    education_list = []
    edu_section = re.search(r'(?:education|academic)[:\s\n]+(.*?)(?:skills|experience|certifications|projects|$)', raw_text, re.IGNORECASE | re.DOTALL)
    if edu_section:
        edu_text = edu_section.group(1).strip()
        edu_lines = [l.strip() for l in edu_text.split('\n') if l.strip()]
        degree = ""
        institution = ""
        period = ""

        for l in edu_lines[:6]:
            if any(d in l.lower() for d in ["bachelor", "master", "b.tech", "b.e", "m.s", "computer science", "engineering"]):
                degree = l
            elif any(u in l.lower() for u in ["university", "institute", "college", "school"]):
                institution = l
            elif any(yr in l for yr in ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]):
                period = l

        if degree or institution:
            education_list.append({
                "degree": degree or "Degree",
                "institution": institution or "Institution",
                "period": period,
                "grade": ""
            })

    return {
        "fullName": name,
        "email": email,
        "phone": phone,
        "location": detected_location,
        "links": "\n".join(links),
        "summary": summary,
        "skillsList": extracted_skills,
        "selectedRoles": list(set(detected_roles)),
        "selectedLevels": list(set(detected_levels)),
        "experiences": experiences,
        "educationList": education_list
    }

def parse_resume_ai_template(raw_text: str) -> Dict[str, Any]:
    """
    Parses resume using structured JSON template matching the field provenance diagram.
    Extracts: Personal Identity, Contact Information, Professional Summary,
    Technical Skills, Professional Experience, Education, Optional/Additional,
    Document Structure, and Provenance Mapping (source snippets + confidence).
    """
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    text_lower = raw_text.lower()
    base_parse = parse_resume_content(raw_text)

    # 1. Personal Identity
    name = base_parse.get("fullName", "")
    title = ""
    for l in lines[:6]:
        if any(w in l.lower() for w in ["engineer", "developer", "architect", "lead", "full stack"]):
            title = l.strip()
            break

    years_exp = ""
    y_match = re.search(r'(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)', raw_text, re.IGNORECASE)
    if y_match:
        years_exp = f"{y_match.group(1)} Years"

    extracted_skills_names = [s["name"] for s in base_parse.get("skillsList", [])]
    spec = ", ".join(extracted_skills_names[:4]) if extracted_skills_names else ""
    tagline = ", ".join(extracted_skills_names[:6]) if extracted_skills_names else ""

    personal_identity = {
        "fullName": name,
        "professionalTitle": title,
        "yearsOfExperience": years_exp,
        "keySpecialization": spec,
        "technologyStackTagline": tagline
    }

    # 2. Contact Information
    email = base_parse.get("email", "")
    phone = base_parse.get("phone", "")
    loc = base_parse.get("location", "")
    
    linkedin = ""
    github = ""
    other_links = []
    for link in base_parse.get("links", "").split("\n"):
        if "linkedin" in link.lower(): linkedin = link
        elif "github" in link.lower(): github = link
        elif link.strip(): other_links.append(link.strip())

    contact_info = {
        "location": loc,
        "email": email,
        "phone": phone,
        "linkedIn": linkedin,
        "gitHub": github,
        "otherLinks": other_links
    }

    # 3. Professional Summary
    summary_text = base_parse.get("summary", "")
    summary_obj = {
        "overallExperience": summary_text,
        "domainExpertise": "",
        "keyTechnicalStrengths": extracted_skills_names[:4],
        "notableAchievements": "",
        "careerObjective": ""
    }

    # 4. Technical Skills
    known_taxonomy = {
        "programmingLanguages": ["Java", "SQL", "JavaScript", "Python", "TypeScript", "C++", "Go", "C#", "Ruby", "PHP", "Kotlin", "Swift"],
        "frameworksAndLibraries": ["Spring Boot", "Spring MVC", "Spring Data JPA", "Hibernate", "React", "Node.js", "Express", "Next.js", "Django", "FastAPI"],
        "securityAndAuthentication": ["JWT Authentication", "Spring Security", "Distributed Locking", "OAuth2", "SSO"],
        "databasesAndDataProcessing": ["PostgreSQL", "Apache Kafka", "Redis", "MySQL", "Oracle", "MongoDB", "Elasticsearch", "Cassandra", "DynamoDB"],
        "cloudAndDevOps": ["AWS", "Docker", "Kubernetes", "Jenkins", "Terraform", "Azure", "GCP", "CI/CD"],
        "testingAndTooling": ["JUnit", "Mockito", "Postman", "Swagger", "Git", "Maven", "Gradle"],
        "aiToolsAndOthers": ["Claude", "Copilot", "ChatGPT", "Gemini", "DeepSeek", "Prompt Engineering"]
    }
    tech_skills = {}
    for category, candidates in known_taxonomy.items():
        found = [c for c in candidates if re.search(r'\b' + re.escape(c.lower()) + r'\b', text_lower)]
        if found:
            tech_skills[category] = found

    # 5. Professional Experience
    experiences_list = []
    raw_exps = base_parse.get("experiences", [])
    if raw_exps:
        for idx, exp in enumerate(raw_exps):
            experiences_list.append({
                "jobTitle": exp.get("title", ""),
                "companyName": exp.get("company", ""),
                "location": exp.get("location", loc),
                "employmentDates": exp.get("period", ""),
                "projectNameAndDescription": "",
                "responsibilities": [exp.get("description", "")] if exp.get("description") else [],
                "technologiesUsed": [],
                "keyAchievements": "",
                "quantifiableImpact": "",
                "productionOwnership": ""
            })

    # 6. Education
    edu_list = []
    raw_edu = base_parse.get("educationList", [])
    if raw_edu:
        for edu in raw_edu:
            edu_list.append({
                "degree": edu.get("degree", ""),
                "institutionName": edu.get("institution", ""),
                "startDate": "",
                "endDate": edu.get("period", ""),
                "academicResults": edu.get("grade", "")
            })

    # 7. Optional / Additional
    optional_additional = {
        "projects": [],
        "certifications": [],
        "achievementsAndAwards": [],
        "volunteerExperience": [],
        "publications": [],
        "languages": [],
        "interests": [],
        "references": []
    }

    # 8. Document Structure
    bullet_count = raw_text.count("•") + raw_text.count("- ") + raw_text.count("* ")
    doc_structure = {
        "sectionHeadings": ["Personal Identity", "Contact Information", "Professional Summary", "Technical Skills", "Professional Experience", "Education"],
        "bulletPointsCount": bullet_count,
        "dateFormat": "Month Year",
        "hyperlinks": len(contact_info["otherLinks"]) + (1 if linkedin else 0) + (1 if github else 0),
        "visualDividers": True,
        "consistentFormatting": True
    }

    # 9. Provenance Map (Where each piece of data was extracted from)
    provenance_map = {
        "fullName": { "section": "Personal Identity", "label": "Full Name", "snippet": name, "confidence": 0.99 if name else 0.0 },
        "professionalTitle": { "section": "Personal Identity", "label": "Professional Title", "snippet": title[:65], "confidence": 0.96 if title else 0.0 },
        "yearsOfExperience": { "section": "Personal Identity", "label": "Years of Experience", "snippet": years_exp, "confidence": 0.94 if years_exp else 0.0 },
        "keySpecialization": { "section": "Personal Identity", "label": "Key Specialization", "snippet": spec, "confidence": 0.95 if spec else 0.0 },
        "contactLocation": { "section": "Contact Information", "label": "Location", "snippet": loc, "confidence": 0.98 if loc else 0.0 },
        "email": { "section": "Contact Information", "label": "Email Address", "snippet": email, "confidence": 1.0 if email else 0.0 },
        "phone": { "section": "Contact Information", "label": "Phone Number", "snippet": phone, "confidence": 1.0 if phone else 0.0 },
        "linkedIn": { "section": "Contact Information", "label": "LinkedIn Profile", "snippet": linkedin, "confidence": 0.99 if linkedin else 0.0 },
        "gitHub": { "section": "Contact Information", "label": "GitHub Profile", "snippet": github, "confidence": 0.99 if github else 0.0 },
        "summary": { "section": "Professional Summary", "label": "Professional Summary", "snippet": (summary_text[:120] + "...") if len(summary_text) > 120 else summary_text, "confidence": 0.96 if summary_text else 0.0 },
        "technicalSkills": { "section": "Technical Skills", "label": "Skills Categories", "snippet": ", ".join(extracted_skills_names[:6]), "confidence": 0.98 if extracted_skills_names else 0.0 },
        "experience": { "section": "Professional Experience", "label": "Work Experience", "snippet": f"{experiences_list[0]['jobTitle']} at {experiences_list[0]['companyName']}" if experiences_list else "", "confidence": 0.97 if experiences_list else 0.0 },
        "education": { "section": "Education", "label": "Degree & University", "snippet": f"{edu_list[0]['degree']} · {edu_list[0]['institutionName']}" if edu_list else "", "confidence": 0.97 if edu_list else 0.0 }
    }

    return {
        "personalIdentity": personal_identity,
        "contactInformation": contact_info,
        "professionalSummary": summary_obj,
        "technicalSkills": tech_skills,
        "professionalExperience": experiences_list,
        "education": edu_list,
        "optionalAdditional": optional_additional,
        "documentStructure": doc_structure,
        "provenanceMap": provenance_map
    }

def get_or_create_active_candidate_profile(cur, user_id: Optional[str] = None, user_name: str = "", user_email: str = "") -> dict:
    """Retrieves or creates the currently active candidate profile for the specified user."""
    if user_id:
        row = cur.execute(
            "SELECT * FROM candidate_profiles WHERE user_id = ? AND is_active = 1 LIMIT 1",
            (user_id,)
        ).fetchone()
        if not row:
            row = cur.execute(
                "SELECT * FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
                (user_id,)
            ).fetchone()
            if row:
                cur.execute("UPDATE candidate_profiles SET is_active = 1 WHERE id = ?", (row["id"],))
        if not row:
            now = int(time.time() * 1000)
            prof_id = f"prof_{now}_{uuid.uuid4().hex[:6]}"
            prof_name = f"{user_name}'s Profile" if user_name else "Default Profile"
            clean_data = {
                "general": {"fullName": user_name, "email": user_email, "phone": "", "city": "", "bio": "", "links": ""},
                "contacts": {"fullName": user_name, "email": user_email},
                "avatar": "avatar_1",
                "primarySkill": "",
                "experienceYears": 0,
                "skillsList": [],
                "experiences": [],
                "educationList": [],
                "userLocation": "",
                "desiredLocations": [],
                "selectedRoles": [],
                "resume": None
            }
            cur.execute("""
                INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES (?, ?, ?, 1, 0, ?, ?, ?)
            """, (prof_id, user_id, prof_name, json.dumps(clean_data), now, now))
            row = cur.execute("SELECT * FROM candidate_profiles WHERE id = ?", (prof_id,)).fetchone()
        return row

    # Global fallback if user_id is None (e.g., initial system migration)
    row = cur.execute("SELECT * FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
    if not row:
        row = cur.execute("SELECT * FROM candidate_profiles ORDER BY created_at ASC LIMIT 1").fetchone()
    if not row:
        def_p = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
        data_str = def_p["data"] if def_p and def_p["data"] else "{}"
        now = int(time.time() * 1000)
        cur.execute("""
            INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
            VALUES ('default', 'default', 'Default Profile', 1, 0, ?, ?, ?)
        """, (data_str, now, now))
        row = cur.execute("SELECT * FROM candidate_profiles WHERE id = 'default'").fetchone()
    return row

def resolve_user_profile(
    cur, 
    user_id: str, 
    profile_id: Optional[str] = None, 
    user_name: str = "", 
    user_email: str = ""
) -> dict:
    if profile_id and profile_id != "default":
        row = cur.execute(
            "SELECT * FROM candidate_profiles WHERE id = ? AND user_id = ?",
            (profile_id, user_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidate profile not found.")
        return row
    return get_or_create_active_candidate_profile(cur, user_id=user_id, user_name=user_name, user_email=user_email)

@router.get("/profile")
def get_profile(
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(
            cur, 
            user_id=current_user["id"], 
            profile_id=profile_id,
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        if not active_row or not active_row["data"]:
            return {}
        try:
            data = json.loads(active_row["data"])
            data["_profileId"] = active_row["id"]
            data["_profileName"] = active_row["name"]
            data["_isComplete"] = bool(active_row["is_complete"])
            return data
        except Exception:
            return {}

@router.put("/profile")
def update_profile(
    profile_data: Dict[str, Any] = Body(...),
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(
            cur, 
            user_id=current_user["id"], 
            profile_id=profile_id,
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        existing = {}
        if active_row and active_row["data"]:
            try:
                existing = json.loads(active_row["data"])
            except Exception:
                existing = {}

        merged = deep_merge(existing, profile_data)

        # Enforce maximum 5 primary skills
        if isinstance(merged.get("primarySkills"), list):
            merged["primarySkills"] = [str(s).strip() for s in merged["primarySkills"] if str(s).strip()][:5]
            if merged["primarySkills"]:
                merged["primarySkill"] = merged["primarySkills"][0]

        # Sync Name fields
        first_name = (merged.get("firstName") if merged.get("firstName") is not None else merged.get("general", {}).get("firstName") or "").strip()
        last_name = (merged.get("lastName") if merged.get("lastName") is not None else merged.get("general", {}).get("lastName") or "").strip()
        full_n = f"{first_name} {last_name}".strip() if (first_name or last_name) else ""
        merged["firstName"] = first_name
        merged["lastName"] = last_name
        merged["fullName"] = full_n
        merged.setdefault("general", {})["fullName"] = full_n
        merged.setdefault("general", {})["firstName"] = first_name
        merged.setdefault("general", {})["lastName"] = last_name
        merged.setdefault("contacts", {})["fullName"] = full_n

        # Sync Preferred Roles
        if merged.get("preferredRoles"):
            merged["selectedRoles"] = merged["preferredRoles"]

        # Sync Preferred Locations
        if merged.get("preferredLocations"):
            merged["desiredLocations"] = merged["preferredLocations"]
            if len(merged["preferredLocations"]) > 0:
                merged["userLocation"] = merged["preferredLocations"][0]
                merged.setdefault("general", {})["city"] = merged["preferredLocations"][0]

        # Sync Preferred Work Modes
        if merged.get("preferredWorkModes") and isinstance(merged["preferredWorkModes"], list) and len(merged["preferredWorkModes"]) > 0:
            modes_lower = [str(m).lower() for m in merged["preferredWorkModes"]]
            merged["workFormats"] = {
                "onsite": any("onsite" in m or "on-site" in m for m in modes_lower),
                "hybrid": any("hybrid" in m for m in modes_lower),
                "remote": any("remote" in m for m in modes_lower)
            }
        elif merged.get("workFormats") and isinstance(merged["workFormats"], dict) and any(merged["workFormats"].values()):
            merged["preferredWorkModes"] = [k.capitalize() for k, v in merged["workFormats"].items() if v]
        else:
            merged["preferredWorkModes"] = ["Hybrid", "Remote"]
            merged["workFormats"] = {"onsite": False, "hybrid": True, "remote": True}

        # Sync Additional Skills into skillsList
        all_skills = list(merged.get("primarySkills") or [])
        for add_s in (merged.get("additionalSkills") or []):
            if str(add_s).strip() and str(add_s).strip() not in all_skills:
                all_skills.append(str(add_s).strip())
        if all_skills and not merged.get("skillsList"):
            merged["skillsList"] = [{"name": s} for s in all_skills]

        # Sync Professional Summary and Experience Years
        if merged.get("professionalSummary"):
            merged["summary"] = merged["professionalSummary"]
            merged.setdefault("general", {})["bio"] = merged["professionalSummary"]
        if merged.get("totalExperienceYears") is not None:
            merged["experienceYears"] = merged["totalExperienceYears"]
            merged.setdefault("general", {})["experienceYears"] = merged["totalExperienceYears"]
        if merged.get("experienceYears") is not None:
            merged["totalExperienceYears"] = merged["experienceYears"]
            merged.setdefault("general", {})["experienceYears"] = merged["experienceYears"]

        # Sync Education
        if merged.get("education") and not merged.get("educationList"):
            merged["educationList"] = merged["education"]

        is_complete, missing, field_status = validate_candidate_profile(merged)
        merged_json = json.dumps(merged)

        # Update candidate profile strictly scoped to this user
        cur.execute("""
            UPDATE candidate_profiles
            SET data = ?, is_complete = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (merged_json, 1 if is_complete else 0, now, active_row["id"], current_user["id"]))

        # Sync avatar to users table if provided
        avatar = merged.get("avatar") or merged.get("profilePicture")
        if avatar and isinstance(avatar, str) and not avatar.startswith("data:"):
            cur.execute("UPDATE users SET avatar = ? WHERE id = ?", (avatar, current_user["id"]))

    merged["_profileId"] = active_row["id"]
    merged["_profileName"] = active_row["name"]
    merged["_isComplete"] = is_complete

    return {
        "success": True,
        "profile": merged,
        "isComplete": is_complete,
        "missingFields": missing,
        "fieldStatus": field_status,
        "message": "Profile saved successfully."
    }

# ---------------------------------------------------------------------------
# Single-Profile Architecture (Multi-Profile Feature Removed)
# ---------------------------------------------------------------------------
@router.get("/profiles")
def list_candidate_profiles(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return the candidate profile for the current user (single profile architecture)."""
    with get_db() as conn:
        cur = conn.cursor()
        row = get_or_create_active_candidate_profile(
            cur, 
            user_id=current_user["id"], 
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        data_dict = {}
        try:
            data_dict = json.loads(row["data"]) if row["data"] else {}
        except Exception:
            pass
        is_comp, missing, _ = validate_candidate_profile(data_dict)
        return {
            "profiles": [{
                "id": row["id"],
                "userId": row["user_id"],
                "name": row["name"],
                "isActive": True,
                "isComplete": is_comp,
                "missingFields": missing,
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"]
            }]
        }

@router.post("/profiles", status_code=400)
def create_candidate_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Multi-profile creation is disabled. Each account maintains a single candidate profile."""
    raise HTTPException(
        status_code=400,
        detail="Multi-profile feature is disabled. Each account maintains a single candidate profile."
    )

@router.get("/profiles/{profile_id}")
def get_candidate_profile_by_id(
    profile_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute(
            "SELECT * FROM candidate_profiles WHERE id = ? AND user_id = ?",
            (profile_id, current_user["id"])
        ).fetchone()
        if not row and profile_id == "default":
            row = cur.execute(
                "SELECT * FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
                (current_user["id"],)
            ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidate profile not found.")
        data = json.loads(row["data"]) if row["data"] else {}
        is_comp, missing, field_status = validate_candidate_profile(data)
        return {
            "id": row["id"],
            "name": row["name"],
            "isActive": True,
            "isComplete": is_comp,
            "missingFields": missing,
            "fieldStatus": field_status,
            "data": data
        }


# ---------------------------------------------------------------------------
# Mandatory Profile Completion Gate (Requirement 2)
# ---------------------------------------------------------------------------
@router.get("/profiles/active/validation")
def get_active_profile_validation(current_user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        active_row = get_or_create_active_candidate_profile(
            cur, 
            user_id=current_user["id"], 
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        data = json.loads(active_row["data"]) if active_row and active_row["data"] else {}
        is_comp, missing, field_status = validate_candidate_profile(data)

        # Evaluate candidate data authenticity & verification blockers
        blockers = []
        email = data.get("general", {}).get("email") or data.get("contacts", {}).get("email") or ""
        phone = data.get("general", {}).get("phone") or data.get("contacts", {}).get("phone") or ""
        
        if not email or "@example." in email.lower() or "@test." in email.lower():
            blockers.append("Genuine contact email required (placeholder '@example.com' detected).")
        if not phone or "9876543210" in phone or "1234567890" in phone:
            blockers.append("Genuine contact phone number required (placeholder '+91 9876543210' detected).")

        doc_row = cur.execute("""
            SELECT * FROM career_documents
            WHERE user_id = ? AND profile_id = ? AND document_type = 'master_resume' AND processing_status = 'indexed'
            ORDER BY created_at DESC LIMIT 1
        """, (current_user["id"], active_row["id"])).fetchone()

        if not doc_row:
            blockers.append("User must upload genuine master resume (PDF or DOCX).")

        is_verified = bool(is_comp and len(blockers) == 0)
        ver_status = "verified" if is_verified else "unverified_synthetic_data"

    return {
        "profileId": active_row["id"],
        "profileName": active_row["name"],
        "isComplete": is_comp,
        "isVerified": is_verified,
        "verificationStatus": ver_status,
        "submissionReady": is_verified,
        "verificationBlockers": blockers,
        "missingFields": missing,
        "fieldStatus": field_status,
        "mandatoryDefinitions": MANDATORY_FIELD_DEFINITIONS
    }

# ---------------------------------------------------------------------------
# AI-Generated Role and Search Keywords (Requirement 4)
# ---------------------------------------------------------------------------
@router.post("/profile/keywords/generate")
def generate_role_keywords(
    body: Optional[KeywordsGenerateRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    with get_db() as conn:
        cur = conn.cursor()
        active_row = get_or_create_active_candidate_profile(
            cur, 
            user_id=current_user["id"], 
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        data = json.loads(active_row["data"]) if active_row and active_row["data"] else {}

        ai_row = cur.execute("SELECT * FROM settings_ai WHERE id = 'default'").fetchone()
        ai_settings = dict(ai_row) if ai_row else None

        if body and body.primarySkill:
            data["primarySkill"] = body.primarySkill
        if body and body.skillsList:
            data["skillsList"] = [{"name": s} for s in body.skillsList]
        if body and body.selectedRoles:
            data["selectedRoles"] = body.selectedRoles

        result = generate_keywords_for_profile(data, ai_settings)

        data["generatedKeywords"] = result["keywords"]
        data["keywordsSource"] = result["source"]
        data["keywordsGeneratedAt"] = result["generatedAt"]
        now = int(time.time() * 1000)

        cur.execute("UPDATE candidate_profiles SET data = ?, updated_at = ? WHERE id = ? AND user_id = ?", (json.dumps(data), now, active_row["id"], current_user["id"]))

    return result

@router.get("/profile/keywords")
def get_role_keywords(current_user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        active_row = get_or_create_active_candidate_profile(
            cur, 
            user_id=current_user["id"], 
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        data = json.loads(active_row["data"]) if active_row and active_row["data"] else {}
        keywords = data.get("generatedKeywords") or []
        return {
            "profileId": active_row["id"],
            "profileName": active_row["name"],
            "primarySkill": data.get("primarySkill", ""),
            "source": data.get("keywordsSource", "none"),
            "generatedAt": data.get("keywordsGeneratedAt", 0),
            "keywords": keywords
        }

@router.put("/profile/keywords")
def save_role_keywords(
    body: KeywordsUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        active_row = get_or_create_active_candidate_profile(
            cur, 
            user_id=current_user["id"], 
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        data = json.loads(active_row["data"]) if active_row and active_row["data"] else {}
        data["generatedKeywords"] = body.keywords
        data["keywordsGeneratedAt"] = now

        cur.execute("UPDATE candidate_profiles SET data = ?, updated_at = ? WHERE id = ? AND user_id = ?", (json.dumps(data), now, active_row["id"], current_user["id"]))

    return {"success": True, "count": len(body.keywords), "keywords": body.keywords, "message": "Role keywords saved successfully."}

@router.post("/profile/roles/generate")
def generate_roles_with_llm(
    payload: Optional[Dict[str, Any]] = Body(None),
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generates 5-10 tailored target role names based on candidate skills, experience,
    location, and resume context using configured low-tier LLM (e.g. Gemini 2.5 Flash).
    Validates and deduplicates against existing roles in DB, saving new roles to the profile.
    """
    now = int(time.time() * 1000)
    target_prof_id = profile_id or (payload and payload.get("profileId"))
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(
            cur,
            user_id=current_user["id"],
            profile_id=target_prof_id,
            user_name=current_user.get("name", ""),
            user_email=current_user.get("email", "")
        )
        if not active_row:
            active_row = get_or_create_active_candidate_profile(cur, user_id=current_user["id"])
        data = json.loads(active_row["data"]) if active_row and active_row["data"] else {}

        ai_row = cur.execute("SELECT * FROM settings_ai WHERE id = 'default'").fetchone()
        ai_settings = dict(ai_row) if ai_row else {}

    # Extract candidate skills
    skills_raw = (payload and payload.get("skills")) or data.get("primarySkills") or data.get("skillsList") or []
    skills_list = []
    if isinstance(skills_raw, list):
        for s in skills_raw:
            if isinstance(s, dict):
                skills_list.append(s.get("name", ""))
            elif isinstance(s, str):
                skills_list.append(s)
    elif isinstance(skills_raw, str):
        skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]

    if not skills_list:
        skills_list = ["Software Engineering", "Full-Stack Development"]
    skills_str = ", ".join(skills_list[:8])

    # Extract experience years
    exp = (payload and payload.get("experience")) or data.get("experienceYears") or data.get("totalExperienceYears") or 3

    # Extract location
    loc = (payload and payload.get("location")) or data.get("userLocation") or data.get("city") or (data.get("preferredLocations") and data.get("preferredLocations")[0]) or "Remote / Hybrid"

    # Context & Bio
    resume = data.get("resume") or {}
    context_str = (payload and payload.get("context")) or data.get("bio") or data.get("summary") or resume.get("rawText", "")[:400] or "Experienced software engineer"

    # Existing roles to exclude (from payload or database profile)
    raw_existing = (payload and payload.get("existingRoles")) or data.get("preferredRoles") or data.get("selectedRoles") or []
    existing_roles = [str(r).strip() for r in raw_existing if str(r).strip()]
    
    # Enforce strict 10 roles maximum limit
    if len(existing_roles) >= 10:
        return {
            "success": True,
            "newRoles": [],
            "allRoles": existing_roles[:10],
            "countAdded": 0,
            "totalCount": 10,
            "modelUsed": "gemini-2.5-flash",
            "message": "Maximum limit of 10 target roles has already been reached."
        }

    slots_needed = max(1, min(10 - len(existing_roles), 10))
    slots_instruction = f"between {min(3, slots_needed)} and {slots_needed}" if slots_needed >= 4 else f"strictly {slots_needed}"
    existing_roles_str = ", ".join(existing_roles) if existing_roles else "None (first-time generation)"

    # Check configured API key
    gemini_key = (ai_settings.get("gemini_key") or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    openai_key = (ai_settings.get("openai_key") or "").strip() or os.environ.get("OPENAI_API_KEY", "").strip()

    if not gemini_key and not openai_key:
        raise HTTPException(
            status_code=400,
            detail="No AI API key configured. Please configure your Gemini API Key in Settings to generate roles."
        )

    model_used = "gemini-2.5-flash"
    raw_response_text = ""

    prompt = (
        f"You are an expert technical talent recruiter. Generate a JSON array of {slots_instruction} market-standard job role titles for this candidate:\n"
        f"- SKILLS: {skills_str}\n"
        f"- EXPERIENCE: {exp} years\n"
        f"- LOCATION: {loc}\n"
        f"- BACKGROUND CONTEXT: {context_str[:250]}\n"
        f"- EXISTING TARGET ROLES (MUST EXCLUDE): {existing_roles_str}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Generate {slots_instruction} relevant, industry-recognized target role titles.\n"
        f"2. Every role title must directly match their skills and experience level.\n"
        f"3. STRICT DEDUPLICATION: You MUST NOT repeat, duplicate, or slightly rephrase any of the existing roles listed above. Ensure all generated roles are 100% unique and distinct.\n"
        f"4. Output STRICTLY a valid JSON array of strings: [\"Role 1\", \"Role 2\", ...].\n"
        f"5. No explanations, no markdown tags, no markdown codeblocks, only the JSON array."
    )

    if gemini_key:
        try:
            from google import genai
            from google.genai import types
            gemini_model = ai_settings.get("gemini_model") or "gemini-2.5-flash"
            if "1.5" in gemini_model:
                gemini_model = "gemini-2.5-flash"
            model_used = gemini_model
            client = genai.Client(api_key=gemini_key)
            
            gen_config_kwargs = {
                "max_output_tokens": 1500,
                "temperature": 0.2
            }
            try:
                gen_config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
            except Exception:
                pass

            resp = client.models.generate_content(
                model=gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(**gen_config_kwargs)
            )
            raw_response_text = resp.text or ""
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Gemini role generation failed: {str(e)}")
    elif openai_key:
        try:
            import urllib.request
            model_used = "gpt-4o-mini"
            req_data = json.dumps({
                "model": model_used,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
                "temperature": 0.2
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=req_data,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {openai_key}"}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                body = json.loads(response.read().decode("utf-8"))
                raw_response_text = body["choices"][0]["message"]["content"]
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"OpenAI role generation failed: {str(e)}")

    # Parse JSON array from raw response
    parsed_roles = []
    clean_text = raw_response_text.strip()
    if "```" in clean_text:
        clean_text = re.sub(r'```(?:json)?', '', clean_text).strip('` \n')
    m = re.search(r'\[.*\]', clean_text, re.DOTALL)
    if m:
        try:
            parsed_roles = json.loads(m.group(0))
        except Exception:
            parsed_roles = []

    # Resilient fallback: extract all quoted strings inside the response
    if not parsed_roles or not isinstance(parsed_roles, list):
        quoted = re.findall(r'"([^"\\]+)"', clean_text)
        if len(quoted) >= 2:
            parsed_roles = quoted

    if not parsed_roles:
        lines = [re.sub(r'^[0-9\.\-\*\s]+', '', line).strip(' ",\'') for line in clean_text.split('\n')]
        parsed_roles = [l for l in lines if len(l) > 2 and not l.startswith('[') and not l.startswith(']')]

    # Canonical helper to detect duplicates regardless of punctuation, case, or hyphens
    def to_canonical_key(role_str: str) -> str:
        return re.sub(r'[^a-z0-9]', '', str(role_str).lower().strip())

    # Server-Side Robust Validation & Deduplication:
    # 1. Fetch freshest state directly from DB to prevent race conditions
    with get_db() as conn:
        cur = conn.cursor()
        fresh_profile_row = cur.execute("SELECT data FROM candidate_profiles WHERE id = ?", (active_row["id"],)).fetchone()
        fresh_data = json.loads(fresh_profile_row["data"]) if fresh_profile_row and fresh_profile_row["data"] else data

    db_existing_roles = fresh_data.get("preferredRoles") or fresh_data.get("selectedRoles") or []
    all_known_existing = list(dict.fromkeys(existing_roles + [str(r).strip() for r in db_existing_roles if str(r).strip()]))
    
    seen_canonical = {to_canonical_key(r) for r in all_known_existing if to_canonical_key(r)}
    new_roles = []

    for r in parsed_roles:
        # Clean up formatting: strip numbering, bullet marks, quotes, brackets
        clean_r = re.sub(r'^[0-9\.\-\*\•\—\s]+', '', str(r)).strip(' "\'[],')
        clean_r = re.sub(r'\s+', ' ', clean_r)
        
        # Validation checks
        if not clean_r or len(clean_r) < 3 or len(clean_r) > 60:
            continue
        if any(token in clean_r.lower() for token in ['```', 'http:', 'https:', '{', '}', '<', '>']):
            continue
        
        c_key = to_canonical_key(clean_r)
        if c_key and c_key not in seen_canonical:
            seen_canonical.add(c_key)
            new_roles.append(clean_r)

    # Save to candidate profile in database (capped at maximum 10 roles)
    remaining_db_slots = max(0, 10 - len(all_known_existing))
    new_roles = new_roles[:remaining_db_slots]
    updated_roles = (all_known_existing + new_roles)[:10]
    fresh_data["preferredRoles"] = updated_roles
    fresh_data["selectedRoles"] = updated_roles

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE candidate_profiles 
            SET data = ?, updated_at = ? 
            WHERE id = ? AND user_id = ?
        """, (json.dumps(fresh_data), now, active_row["id"], current_user["id"]))

    return {
        "success": True,
        "newRoles": new_roles,
        "allRoles": updated_roles,
        "countAdded": len(new_roles),
        "totalCount": len(updated_roles),
        "modelUsed": model_used,
        "message": f"Successfully generated and added {len(new_roles)} target roles."
    }

@router.post("/profile/resume")
async def upload_resume(
    file: UploadFile = File(...),
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uploads a CV/Resume (PDF, DOCX, TXT), automatically parses candidate details,
    saves the file locally for viewing/downloading, and fills profile fields automatically.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty resume file uploaded.")

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Resume file size exceeds maximum permitted limit (10MB).")

    fname_lower = (file.filename or "").lower()
    if not fname_lower.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a PDF resume (.pdf).")

    now = int(time.time() * 1000)
    safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename or "resume.pdf")
    stored_filename = f"resume_{current_user['id']}_{now}_{safe_name}"
    disk_path = RESUME_UPLOAD_DIR / stored_filename
    with open(disk_path, "wb") as f:
        f.write(file_bytes)

    # 1. Extract raw text from file
    raw_text = extract_text_from_file(file_bytes, file.filename)
    
    # 2. Parse candidate fields & generate AI JSON template extraction
    parsed = parse_resume_content(raw_text)
    ai_template_data = parse_resume_ai_template(raw_text)

    file_size_kb = f"{max(1, round(len(file_bytes) / 1024))} KB"

    resume_metadata = {
        "fileName": file.filename,
        "fileSize": file_size_kb,
        "uploadedAt": now,
        "fileType": file.content_type or "application/octet-stream",
        "storedFile": stored_filename,
        "rawText": raw_text[:12000],
        "aiExtraction": ai_template_data
    }

    # 3. Save to active candidate profile in database
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(
            cur, 
            user_id=current_user["id"], 
            profile_id=profile_id,
            user_name=current_user.get("name", ""), 
            user_email=current_user.get("email", "")
        )
        existing = {}
        if active_row and active_row["data"]:
            try:
                existing = json.loads(active_row["data"])
            except Exception:
                existing = {}

        # Merge extracted parsed data into profile
        existing["resume"] = resume_metadata
        existing["resumeAiMap"] = ai_template_data
        existing["summary"] = parsed["summary"]
        existing["skillsList"] = parsed["skillsList"]
        existing["selectedRoles"] = parsed["selectedRoles"]
        existing["selectedLevels"] = parsed["selectedLevels"]
        existing["experiences"] = parsed["experiences"]
        existing["educationList"] = parsed["educationList"]
        existing["userLocation"] = parsed["location"]
        
        general = existing.get("general", {})
        general["fullName"] = parsed["fullName"] or current_user.get("name", "")
        general["email"] = parsed["email"] or current_user.get("email", "")
        general["phone"] = parsed["phone"]
        general["city"] = parsed["location"]
        general["links"] = parsed["links"]
        general["bio"] = parsed["summary"]
        existing["general"] = general

        is_comp, _, _ = validate_candidate_profile(existing)
        merged_json = json.dumps(existing)

        cur.execute("""
            UPDATE candidate_profiles
            SET data = ?, is_complete = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (merged_json, 1 if is_comp else 0, now, active_row["id"], current_user["id"]))

        # Also register in career_documents for RAG pipeline indexing
        import hashlib
        c_hash = hashlib.sha256(file_bytes).hexdigest()
        doc_id = f"doc_{now}"
        cur.execute("""
            INSERT OR REPLACE INTO career_documents (
                id, user_id, profile_id, document_type, original_filename,
                storage_path, file_size, content_hash, document_version,
                processing_status, created_at, updated_at
            ) VALUES (?, ?, ?, 'master_resume', ?, ?, ?, ?, 1, 'indexed', ?, ?)
        """, (doc_id, current_user["id"], active_row["id"], file.filename, str(disk_path), len(file_bytes), c_hash, now, now))

        # Store binary PDF directly in SQLite DB as BLOB
        res_file_id = f"res_{now}_{current_user['id']}"
        cur.execute("""
            INSERT OR REPLACE INTO resume_files (
                id, user_id, profile_id, file_name, file_bytes, file_size, content_type, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res_file_id,
            current_user["id"],
            active_row["id"],
            file.filename,
            file_bytes,
            len(file_bytes),
            "application/pdf",
            now,
            now
        ))

    return {
        "success": True,
        "resume": resume_metadata,
        "resumeFileName": file.filename,
        "profile": existing,
        "parsed": parsed,
        "aiExtraction": ai_template_data,
        "message": f"Resume '{file.filename}' parsed and saved with AI JSON template."
    }

@router.get("/profile/resume/view")
def view_resume(
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns the uploaded resume file to view inline in browser or modal.
    Retrieves directly from SQLite DB (resume_files BLOB) with filesystem fallback.
    """
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(cur, user_id=current_user["id"], profile_id=profile_id)
        if not active_row or not active_row["data"]:
            raise HTTPException(status_code=404, detail="No resume uploaded yet.")
        data = json.loads(active_row["data"])
        resume = data.get("resume")
        if not resume:
            raise HTTPException(status_code=404, detail="No resume on profile.")

        # 1. Primary Source: SQLite resume_files table (BLOB)
        cur.execute("""
            SELECT file_bytes, file_name, content_type 
            FROM resume_files 
            WHERE user_id = ? AND profile_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (current_user["id"], active_row["id"]))
        res_row = cur.fetchone()
        if res_row and res_row["file_bytes"]:
            safe_name = res_row["file_name"] or resume.get("fileName", "resume.pdf")
            return Response(
                content=res_row["file_bytes"],
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{safe_name}"',
                    "Content-Type": "application/pdf",
                    "X-Content-Type-Options": "nosniff"
                }
            )

        # 2. Secondary Fallback: Disk storage
        stored = resume.get("storedFile")
        if stored:
            file_path = RESUME_UPLOAD_DIR / stored
            if file_path.exists():
                is_pdf = file_path.suffix.lower() == ".pdf"
                media_type = "application/pdf" if is_pdf else resume.get("fileType", "application/octet-stream")
                safe_name = resume.get("fileName", "resume.pdf")
                return FileResponse(
                    path=str(file_path),
                    media_type=media_type,
                    content_disposition_type="inline",
                    filename=safe_name,
                    headers={
                        "Content-Disposition": f'inline; filename="{safe_name}"',
                        "Content-Type": "application/pdf",
                        "X-Content-Type-Options": "nosniff"
                    }
                )

        raw_text = resume.get("rawText", "")
        if raw_text:
            return PlainTextResponse(content=raw_text)

        raise HTTPException(status_code=404, detail="Resume file not found in database or on disk.")

@router.get("/profile/resume/download")
def download_resume(
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Triggers download of the uploaded resume file.
    Retrieves directly from SQLite DB (resume_files BLOB) with filesystem fallback.
    """
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(cur, user_id=current_user["id"], profile_id=profile_id)
        if not active_row or not active_row["data"]:
            raise HTTPException(status_code=404, detail="No resume uploaded yet.")
        data = json.loads(active_row["data"])
        resume = data.get("resume")
        if not resume:
            raise HTTPException(status_code=404, detail="No resume on profile.")

        # 1. Primary Source: SQLite resume_files table (BLOB)
        cur.execute("""
            SELECT file_bytes, file_name, content_type 
            FROM resume_files 
            WHERE user_id = ? AND profile_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (current_user["id"], active_row["id"]))
        res_row = cur.fetchone()
        if res_row and res_row["file_bytes"]:
            safe_name = res_row["file_name"] or resume.get("fileName", "resume.pdf")
            return Response(
                content=res_row["file_bytes"],
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{safe_name}"',
                    "Content-Type": "application/pdf"
                }
            )

        # 2. Secondary Fallback: Disk storage
        stored = resume.get("storedFile")
        if stored:
            file_path = RESUME_UPLOAD_DIR / stored
            if file_path.exists():
                return FileResponse(
                    path=str(file_path),
                    filename=resume.get("fileName", "resume.pdf"),
                    content_disposition_type="attachment"
                )

        raise HTTPException(status_code=404, detail="Resume file not found in database or on disk.")

@router.get("/profile/resume/content")
def get_resume_content(
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns structured text and parse info for in-app preview modal.
    """
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(cur, user_id=current_user["id"], profile_id=profile_id)
        if not active_row or not active_row["data"]:
            return {"hasResume": False}
        data = json.loads(active_row["data"])
        resume = data.get("resume")
        if not resume:
            return {"hasResume": False}

        raw_text = resume.get("rawText", "")
        stored = resume.get("storedFile")
        if stored:
            p = RESUME_UPLOAD_DIR / stored
            if p.exists() and not raw_text:
                try:
                    with open(p, "rb") as f:
                        raw_text = extract_text_from_file(f.read(), resume.get("fileName", ""))
                except Exception:
                    pass

        return {
            "hasResume": True,
            "metadata": resume,
            "rawText": raw_text,
            "skills": data.get("skillsList", []),
            "roles": data.get("selectedRoles", []),
            "experiences": data.get("experiences", []),
            "education": data.get("educationList", [])
        }

@router.get("/profile/resume/map")
def get_resume_map(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the comprehensive AI/NLP JSON extraction map and field provenance mapping.
    """
    with get_db() as conn:
        cur = conn.cursor()
        active_row = get_or_create_active_candidate_profile(cur, user_id=current_user["id"])
        if not active_row or not active_row["data"]:
            return {"hasResume": False, "aiExtraction": None}
        data = json.loads(active_row["data"])
        resume = data.get("resume")
        if not resume:
            return {"hasResume": False, "aiExtraction": None}

        ai_map = data.get("resumeAiMap") or resume.get("aiExtraction")
        if not ai_map:
            raw_text = resume.get("rawText", "")
            stored = resume.get("storedFile")
            if stored and not raw_text:
                p = RESUME_UPLOAD_DIR / stored
                if p.exists():
                    try:
                        with open(p, "rb") as f:
                            raw_text = extract_text_from_file(f.read(), resume.get("fileName", ""))
                    except Exception:
                        pass
            ai_map = parse_resume_ai_template(raw_text or "")
            try:
                data["resumeAiMap"] = ai_map
                cur.execute("UPDATE candidate_profiles SET data = ? WHERE id = ? AND user_id = ?", (json.dumps(data), active_row["id"], current_user["id"]))
            except Exception:
                pass

        return {
            "hasResume": True,
            "fileName": resume.get("fileName", "Resume"),
            "fileSize": resume.get("fileSize", ""),
            "uploadedAt": resume.get("uploadedAt"),
            "rawText": resume.get("rawText", ""),
            "aiExtraction": ai_map
        }

@router.post("/profile/resume/apply-ai-map")
def apply_ai_map(
    custom_map: Optional[Dict[str, Any]] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Applies the structured AI JSON extraction template directly into the live profile.
    """
    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        active_row = get_or_create_active_candidate_profile(cur, user_id=current_user["id"])
        if not active_row or not active_row["data"]:
            raise HTTPException(status_code=400, detail="Profile not found.")
        existing = json.loads(active_row["data"])

        ai_data = custom_map or existing.get("resumeAiMap")
        if not ai_data:
            resume = existing.get("resume", {})
            raw_text = resume.get("rawText", "")
            if raw_text:
                ai_data = parse_resume_ai_template(raw_text)

        if not ai_data:
            raise HTTPException(status_code=400, detail="No AI extraction available to apply.")

        # 1. Update personal & contacts
        pers = ai_data.get("personalIdentity", {})
        contact = ai_data.get("contactInformation", {})
        gen = existing.get("general", {})
        if pers.get("fullName"): gen["fullName"] = pers["fullName"]
        if contact.get("email"): gen["email"] = contact["email"]
        if contact.get("phone"): gen["phone"] = contact["phone"]
        if contact.get("location"): 
            gen["city"] = contact["location"]
            existing["userLocation"] = contact["location"]
        
        all_links = []
        c_links = []
        if contact.get("linkedIn"): 
            all_links.append(contact["linkedIn"])
            c_links.append({"id": "link-1", "label": "LinkedIn", "url": contact["linkedIn"]})
        if contact.get("gitHub"): 
            all_links.append(contact["gitHub"])
            c_links.append({"id": "link-2", "label": "GitHub", "url": contact["gitHub"]})
        for idx, o in enumerate(contact.get("otherLinks", [])):
            all_links.append(o)
            c_links.append({"id": f"link-{idx+3}", "label": "Portfolio / Website", "url": o})

        if all_links: gen["links"] = "\n".join(all_links)
        if c_links: existing["contactLinks"] = c_links
        existing["general"] = gen

        # 2. Update summary
        prof_sum = ai_data.get("professionalSummary", {})
        if prof_sum.get("overallExperience"):
            existing["summary"] = prof_sum["overallExperience"]
            gen["bio"] = prof_sum["overallExperience"]

        # 3. Update technical skills
        skills_obj = ai_data.get("technicalSkills", {})
        combined_skills = []
        for cat in skills_obj:
            for sk in skills_obj[cat]:
                icon = "spring" if "spring" in sk.lower() else "database" if any(d in sk.lower() for d in ["sql", "data", "postgres", "redis", "kafka"]) else "cloud" if "aws" in sk.lower() else "docker" if "docker" in sk.lower() else "git" if "git" in sk.lower() else "react" if "react" in sk.lower() else None
                combined_skills.append({"name": sk.lower(), "icon": icon})
        if combined_skills:
            existing["skillsList"] = combined_skills

        # 4. Update experiences
        exp_list = ai_data.get("professionalExperience", [])
        if exp_list:
            converted_exps = []
            for e in exp_list:
                converted_exps.append({
                    "title": e.get("jobTitle", "Software Engineer"),
                    "company": e.get("companyName", "Tech Corp"),
                    "location": e.get("location", existing.get("userLocation", "Hyderabad, India")),
                    "period": e.get("employmentDates", "2023 – Present"),
                    "description": " ".join(e.get("responsibilities", [])) or e.get("keyAchievements", "")
                })
            existing["experiences"] = converted_exps

        # 5. Update education
        edu_list = ai_data.get("education", [])
        if edu_list:
            converted_edus = []
            for ed in edu_list:
                dates = f"{ed.get('startDate', '2017')} – {ed.get('endDate', '2021')}"
                converted_edus.append({
                    "degree": ed.get("degree", "Bachelor of Technology"),
                    "institution": ed.get("institutionName", "University"),
                    "period": dates,
                    "grade": ed.get("academicResults", "First Class")
                })
            existing["educationList"] = converted_edus

        # 6. Update languages if optionalAdditional has them
        opt = ai_data.get("optionalAdditional", {})
        if opt.get("languages"):
            langs = []
            for idx, l in enumerate(opt["languages"]):
                parts = l.split("(")
                name_l = parts[0].strip()
                prof_l = parts[1].replace(")", "").strip() if len(parts) > 1 else "Full Professional"
                langs.append({"id": f"lang-{idx+1}", "language": name_l, "proficiency": prof_l})
            existing["languages"] = langs

        existing["resumeAiMap"] = ai_data
        merged_json = json.dumps(existing)

        cur.execute("""
            UPDATE candidate_profiles
            SET data = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (merged_json, now, active_row["id"], current_user["id"]))

    return {
        "success": True,
        "profile": existing,
        "message": "AI extraction applied to profile fields successfully."
    }

@router.delete("/profile/resume")
def delete_resume(
    profile_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes the current uploaded resume metadata and marks resume as removed.
    """
    now = int(time.time() * 1000)
    with get_db() as conn:
        cur = conn.cursor()
        active_row = resolve_user_profile(cur, user_id=current_user["id"], profile_id=profile_id)
        if not active_row or not active_row["data"]:
            return {"success": True, "message": "No profile found."}
        existing = json.loads(active_row["data"])

        resume = existing.pop("resume", None)
        existing.pop("resumeAiMap", None)
        if resume and resume.get("storedFile"):
            fpath = RESUME_UPLOAD_DIR / resume["storedFile"]
            if fpath.exists():
                try:
                    fpath.unlink()
                except Exception:
                    pass

        merged_json = json.dumps(existing)
        cur.execute("""
            UPDATE candidate_profiles
            SET data = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (merged_json, now, active_row["id"], current_user["id"]))

        cur.execute("DELETE FROM career_documents WHERE user_id = ? AND profile_id = ?", (current_user["id"], active_row["id"]))
        cur.execute("DELETE FROM resume_files WHERE user_id = ? AND profile_id = ?", (current_user["id"], active_row["id"]))

    return {
        "success": True,
        "profile": existing,
        "message": "Resume deleted successfully."
    }
