"""
Candidate Profile Validation Engine for Skill2Role.
Enforces mandatory candidate profile fields required before unlocking Explorer and application features.
"""

from typing import Dict, Any, List, Tuple
import re

MANDATORY_FIELD_DEFINITIONS = [
    {"field": "fullName", "label": "Full Name", "description": "Candidate full legal or professional name"},
    {"field": "email", "label": "Contact Email", "description": "Valid email address for candidate communications"},
    {"field": "primarySkill", "label": "Primary Skill", "description": "Core technical capability anchoring job search (e.g. Java, Python)"},
    {"field": "skillsList", "label": "Technical Skills", "description": "At least 2 technical competencies in candidate skillset"},
    {"field": "selectedRoles", "label": "Target Roles", "description": "At least 1 target job title or role preference"},
    {"field": "userLocation", "label": "Location Preference", "description": "Target geographic location or remote preference"},
    {"field": "resume", "label": "Resume / CV", "description": "Uploaded resume document or structured professional summary"}
]

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_candidate_profile(data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, bool]]:
    """
    Validates that a candidate profile contains all mandatory fields.
    Returns:
        (is_complete: bool, missing_fields: List[str], field_status: Dict[str, bool])
    """
    if not isinstance(data, dict):
        missing = [d["field"] for d in MANDATORY_FIELD_DEFINITIONS]
        return False, missing, {f: False for f in missing}

    general = data.get("general") if isinstance(data.get("general"), dict) else {}
    contacts = data.get("contacts") if isinstance(data.get("contacts"), dict) else {}
    skills_sec = data.get("skills") if isinstance(data.get("skills"), dict) else {}
    prefs_sec = data.get("preferences") if isinstance(data.get("preferences"), dict) else {}

    field_status = {}

    # 1. Full Name
    name = (
        general.get("fullName") or 
        contacts.get("fullName") or 
        data.get("fullName") or 
        f"{general.get('firstName', '')} {general.get('lastName', '')}".strip()
    ).strip()
    field_status["fullName"] = bool(name and len(name) >= 2)

    # 2. Email Address
    email = (general.get("email") or contacts.get("email") or data.get("email") or "").strip()
    field_status["email"] = bool(email and EMAIL_REGEX.match(email))

    # 3. Primary Skill
    primary_skill = (
        data.get("primarySkill") or 
        general.get("primarySkill") or 
        skills_sec.get("primarySkill") or 
        prefs_sec.get("primarySkill") or ""
    ).strip()
    # If not explicitly specified, inspect first skill from skillsList
    if not primary_skill:
        raw_skills = data.get("skillsList") or skills_sec.get("technical") or skills_sec.get("all") or []
        if isinstance(raw_skills, list) and len(raw_skills) > 0:
            first = raw_skills[0]
            primary_skill = (first.get("name") if isinstance(first, dict) else str(first)).strip()
    field_status["primarySkill"] = bool(primary_skill and len(primary_skill) >= 2)

    # 4. Skills List (must have >= 2 skills)
    skills_list = data.get("skillsList") or skills_sec.get("technical") or skills_sec.get("all") or []
    if isinstance(skills_list, list):
        valid_skills = [s for s in skills_list if (s.get("name") if isinstance(s, dict) else str(s)).strip()]
        field_status["skillsList"] = len(valid_skills) >= 2
    else:
        field_status["skillsList"] = False

    # 5. Selected Roles (must have >= 1 target role)
    roles = data.get("selectedRoles") or prefs_sec.get("selectedRoles") or prefs_sec.get("targetRoles") or []
    if isinstance(roles, list):
        valid_roles = [r for r in roles if str(r).strip()]
        field_status["selectedRoles"] = len(valid_roles) >= 1
    else:
        field_status["selectedRoles"] = False

    # 6. Location Preference
    loc = (
        data.get("userLocation") or 
        general.get("city") or 
        contacts.get("location") or 
        data.get("location") or ""
    ).strip()
    if not loc and isinstance(prefs_sec.get("preferredLocations"), list) and len(prefs_sec["preferredLocations"]) > 0:
        loc = str(prefs_sec["preferredLocations"][0]).strip()
    field_status["userLocation"] = bool(loc and len(loc) >= 2)

    # 7. Resume Document or Professional Summary
    has_resume = False
    resume = data.get("resume")
    if isinstance(resume, dict):
        if resume.get("storedFile") or resume.get("rawText") or resume.get("fileName") or resume.get("parsedText"):
            has_resume = True
    if not has_resume:
        summary = (data.get("summary") or general.get("bio") or "").strip()
        if summary and len(summary) >= 20:
            has_resume = True
    if not has_resume:
        exps = data.get("experiences")
        if isinstance(exps, list) and len(exps) > 0:
            has_resume = True

    field_status["resume"] = has_resume

    missing_fields = [f for f, passed in field_status.items() if not passed]
    is_complete = len(missing_fields) == 0

    return is_complete, missing_fields, field_status
