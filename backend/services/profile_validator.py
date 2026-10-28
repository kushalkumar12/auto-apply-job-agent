"""
Candidate Profile Validation Engine for Skill2Role.
Enforces mandatory candidate profile fields required during initial onboarding (Page 1 & Page 2)
before unlocking Explorer and application features.
"""

from typing import Dict, Any, List, Tuple
import re

MANDATORY_FIELD_DEFINITIONS = [
    {"field": "fullName", "label": "Full Name", "description": "Candidate first and last name"},
    {"field": "resume", "label": "Resume PDF", "description": "Uploaded candidate master resume document in PDF format"},
    {"field": "primarySkills", "label": "Primary Skills", "description": "1 to 5 primary technical skills anchoring your search"},
    {"field": "experienceYears", "label": "Years of Experience", "description": "Candidate total professional software engineering experience in years"},
    {"field": "selectedRoles", "label": "Preferred Role", "description": "At least 1 target job title or role preference"},
    {"field": "userLocation", "label": "Preferred Locations", "description": "Target geographic location or cities (e.g. Bengaluru, Hyderabad, Remote)"},
    {"field": "preferredWorkModes", "label": "Preferred Work Mode", "description": "At least 1 preferred work mode (Onsite, Hybrid, Remote)"}
]

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_candidate_profile(data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, bool]]:
    """
    Validates that a candidate profile contains all mandatory fields from Page 1 and Page 2:
    - Personal Information: Full Name (First + Last Name, or exception), Resume PDF
    - Search Preferences: Primary Skills (1-5), Preferred Role, Preferred Locations, Preferred Work Mode
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

    # 1. Full Name (First Name + Last Name, or First Name with noLastName exception)
    first_name = (data.get("firstName") or general.get("firstName") or "").strip()
    last_name = (data.get("lastName") or general.get("lastName") or "").strip()
    no_last_name = bool(data.get("noLastName") or general.get("noLastName"))
    
    full_name_candidate = (
        data.get("fullName") or 
        general.get("fullName") or 
        contacts.get("fullName") or 
        ""
    ).strip()

    if first_name:
        if last_name or no_last_name:
            field_status["fullName"] = True
        else:
            field_status["fullName"] = len(first_name) >= 2 and bool(full_name_candidate and len(full_name_candidate) >= 3)
    elif full_name_candidate:
        field_status["fullName"] = len(full_name_candidate) >= 2
    else:
        field_status["fullName"] = False

    # 2. Resume PDF (Mandatory)
    res_obj = data.get("resume") or general.get("resume") or data.get("resumeMeta")
    if isinstance(res_obj, dict) and (res_obj.get("fileName") or res_obj.get("storedFile") or res_obj.get("rawText")):
        field_status["resume"] = True
    elif isinstance(res_obj, str) and len(res_obj.strip()) > 0:
        field_status["resume"] = True
    else:
        field_status["resume"] = False

    # 3. Primary Skills (Mandatory: 1 to 5 skills, strict max 5)
    primary_skills = data.get("primarySkills")
    if primary_skills is None:
        primary_skills = prefs_sec.get("primarySkills")
    if isinstance(primary_skills, list):
        clean_ps = [str(s).strip() for s in primary_skills if str(s).strip()]
        field_status["primarySkills"] = (1 <= len(clean_ps) <= 5)
    elif (data.get("primarySkill") or general.get("primarySkill") or skills_sec.get("primarySkill") or prefs_sec.get("primarySkill") or "").strip():
        field_status["primarySkills"] = True
    else:
        field_status["primarySkills"] = False

    # 4. Years of Experience (Mandatory on Page 2 for job matching)
    exp_val = data.get("experienceYears")
    if exp_val is None:
        exp_val = data.get("totalExperienceYears")
    if exp_val is None:
        exp_val = general.get("experienceYears")
    if exp_val is None:
        exp_val = prefs_sec.get("experienceYears")
        
    if exp_val is not None and str(exp_val).strip() != "":
        try:
            exp_float = float(exp_val)
            field_status["experienceYears"] = (exp_float >= 0)
        except (ValueError, TypeError):
            field_status["experienceYears"] = False
    else:
        field_status["experienceYears"] = False

    # 5. Preferred Role (Mandatory: at least 1)
    roles = (
        data.get("preferredRoles") or 
        data.get("selectedRoles") or 
        prefs_sec.get("selectedRoles") or 
        prefs_sec.get("targetRoles") or 
        prefs_sec.get("preferredRoles") or
        []
    )
    if isinstance(roles, list):
        valid_roles = [r for r in roles if str(r).strip()]
        field_status["selectedRoles"] = len(valid_roles) >= 1
    elif isinstance(roles, str) and len(roles.strip()) > 0:
        field_status["selectedRoles"] = True
    else:
        field_status["selectedRoles"] = False

    # 5. Preferred Locations (Mandatory: at least 1)
    locs = (
        data.get("preferredLocations") or 
        data.get("desiredLocations") or 
        prefs_sec.get("preferredLocations") or 
        prefs_sec.get("desiredLocations") or 
        []
    )
    single_loc = (
        data.get("userLocation") or 
        general.get("city") or 
        contacts.get("location") or 
        data.get("location") or 
        ""
    ).strip()

    if isinstance(locs, list) and len([l for l in locs if str(l).strip()]) >= 1:
        field_status["userLocation"] = True
    elif single_loc and len(single_loc) >= 2:
        field_status["userLocation"] = True
    else:
        field_status["userLocation"] = False

    # 6. Preferred Work Mode (Mandatory: Onsite, Hybrid, Remote)
    work_modes = data.get("preferredWorkModes") or prefs_sec.get("preferredWorkModes")
    work_formats = data.get("workFormats") or prefs_sec.get("workFormats")

    if isinstance(work_modes, list) and len(work_modes) > 0:
        field_status["preferredWorkModes"] = len([m for m in work_modes if str(m).strip()]) >= 1
    elif isinstance(work_formats, dict) and any(work_formats.values()):
        field_status["preferredWorkModes"] = bool(
            work_formats.get("remote") or work_formats.get("hybrid") or work_formats.get("onsite")
        )
    else:
        # Default True (Hybrid, Remote default)
        field_status["preferredWorkModes"] = True

    missing_fields = [f for f, passed in field_status.items() if not passed]
    is_complete = len(missing_fields) == 0

    return is_complete, missing_fields, field_status
