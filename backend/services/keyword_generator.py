"""
AI & Deterministic Role and Search Keyword Generation Engine for Skill2Role.
Ensures the primary skill is strictly anchored across all queries so secondary skills
never displace the core capability into unrelated searches.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("keyword_generator")

class KeywordItem(BaseModel):
    id: str
    roleTitle: str
    searchQuery: str
    priority: int = Field(ge=1, le=4)
    coreSkill: str
    secondarySkills: List[str] = []
    category: str

class KeywordGenerationResult(BaseModel):
    primarySkill: str
    generatedAt: int
    source: str  # "ai_openai", "ai_gemini", "ai_claude", "deterministic_engine"
    keywords: List[KeywordItem]

SENIORITY_LEVELS = ["Junior", "Mid-Level", "Senior", "Staff", "Lead", "Principal"]

def generate_deterministic_keywords(
    primary_skill: str,
    skills_list: List[str],
    selected_roles: List[str],
    user_location: str = ""
) -> List[Dict[str, Any]]:
    """
    Synthesizes anchored role names and search queries deterministically.
    Guarantees primary_skill is always present in every query.
    """
    clean_primary = primary_skill.strip()
    if not clean_primary:
        clean_primary = "Software"

    # Filter out primary skill from secondary skills list
    sec_skills = [
        s.strip() for s in skills_list 
        if s.strip() and s.strip().lower() != clean_primary.lower()
    ]

    base_roles = [r.strip() for r in selected_roles if r.strip()]
    if not base_roles:
        base_roles = ["Backend Engineer", "Software Engineer", "Full Stack Developer"]

    results = []
    seen_queries = set()

    def add_keyword(role_title: str, query: str, priority: int, cat: str, sec: List[str]):
        q_norm = query.strip().lower()
        if q_norm not in seen_queries and len(query.strip()) > 0:
            seen_queries.add(q_norm)
            item_id = f"kw-{len(results) + 1}"
            results.append({
                "id": item_id,
                "roleTitle": role_title.strip(),
                "searchQuery": query.strip(),
                "priority": priority,
                "coreSkill": clean_primary,
                "secondarySkills": sec,
                "category": cat
            })

    # Category 1: Core Anchor Roles (Priority 1)
    for role in base_roles:
        # e.g., "Java Backend Engineer"
        title = f"{clean_primary} {role}"
        query = f'"{clean_primary}" {role}'
        add_keyword(title, query, 1, "Core Anchor Roles", [])

    # Direct Primary Skill Roles
    add_keyword(f"Senior {clean_primary} Engineer", f"Senior {clean_primary} Developer", 1, "Core Anchor Roles", [])
    add_keyword(f"{clean_primary} Core Developer", f"{clean_primary} Software Engineer", 1, "Core Anchor Roles", [])

    # Category 2: Skill Synergy Specializations (Priority 2) - Pairs primary with secondary skills
    for idx, sec in enumerate(sec_skills[:5]):
        for role in base_roles[:2]:
            title = f"{clean_primary} & {sec} {role}"
            query = f"{clean_primary} {role} {sec}"
            add_keyword(title, query, 2, "Skill Synergy Specializations", [sec])

    # Category 3: Architectural & Senior Tracks (Priority 3)
    architect_roles = ["Architect", "Staff Engineer", "Tech Lead", "Platform Engineer"]
    for arch in architect_roles:
        title = f"{clean_primary} {arch}"
        sec_sample = sec_skills[:2]
        query = f"{clean_primary} {arch} {' '.join(sec_sample)}".strip()
        add_keyword(title, query, 3, "Architectural & Senior Tracks", sec_sample)

    # Category 4: Cross-Domain & Modern Cloud Stacks (Priority 4)
    cloud_synergies = [s for s in sec_skills if any(c in s.lower() for c in ["aws", "cloud", "docker", "k8s", "microservices", "kafka", "sql"])]
    if cloud_synergies:
        for cs in cloud_synergies[:3]:
            title = f"Cloud-Native {clean_primary} ({cs}) Developer"
            query = f"{clean_primary} Microservices {cs}"
            add_keyword(title, query, 4, "Cross-Domain Variations", [cs])

    return results

def sanitize_ai_keyword_output(raw_text: str, primary_skill: str) -> Optional[List[Dict[str, Any]]]:
    """
    Parses and strictly validates raw AI responses into validated KeywordItems.
    Discards any candidate items that fail to anchor on primary_skill.
    """
    try:
        clean_json_str = raw_text.strip()
        # Strip markdown fence if present
        if clean_json_str.startswith("```"):
            lines = clean_json_str.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_json_str = "\n".join(lines).strip()

        parsed = json.loads(clean_json_str)
        if isinstance(parsed, dict) and "keywords" in parsed:
            parsed = parsed["keywords"]

        if not isinstance(parsed, list):
            return None

        valid_items = []
        p_lower = primary_skill.lower().strip()
        seen_queries = set()

        for idx, item in enumerate(parsed):
            if not isinstance(item, dict):
                continue

            role_title = str(item.get("roleTitle") or item.get("title") or "").strip()
            search_query = str(item.get("searchQuery") or item.get("query") or "").strip()
            priority = int(item.get("priority") or 2)
            priority = max(1, min(4, priority))
            category = str(item.get("category") or "Generated Specialization").strip()

            # Ensure secondary skills is a clean list
            raw_sec = item.get("secondarySkills") or []
            if isinstance(raw_sec, list):
                secondary = [str(s).strip() for s in raw_sec if str(s).strip()]
            else:
                secondary = [str(raw_sec).strip()]

            # Strict Anchor Rule: primary skill must be in roleTitle or searchQuery
            if p_lower not in role_title.lower() and p_lower not in search_query.lower():
                # Enforce anchor automatically
                role_title = f"{primary_skill} {role_title}"
                search_query = f"{primary_skill} {search_query}"

            q_key = search_query.lower()
            if q_key not in seen_queries and len(role_title) > 0:
                seen_queries.add(q_key)
                valid_items.append({
                    "id": f"ai-kw-{len(valid_items) + 1}",
                    "roleTitle": role_title,
                    "searchQuery": search_query,
                    "priority": priority,
                    "coreSkill": primary_skill,
                    "secondarySkills": secondary,
                    "category": category
                })

        return valid_items if len(valid_items) >= 3 else None
    except Exception as e:
        logger.warning(f"Failed to parse AI keyword output: {e}")
        return None

def generate_keywords_for_profile(
    profile_data: Dict[str, Any],
    ai_settings: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main entry point for generating role names and search keywords.
    Attempts AI provider generation if keys are present; safely falls back to deterministic engine.
    """
    import time
    primary_skill = (profile_data.get("primarySkill") or "").strip()
    if not primary_skill:
        # Pick from skillsList
        skills = profile_data.get("skillsList") or []
        if skills:
            first = skills[0]
            primary_skill = first["name"] if isinstance(first, dict) else str(first)
    if not primary_skill:
        primary_skill = "Software"

    skills_raw = profile_data.get("skillsList") or []
    skills_names = [s["name"] if isinstance(s, dict) else str(s) for s in skills_raw]

    selected_roles = profile_data.get("selectedRoles") or []
    loc = profile_data.get("userLocation") or ""

    # Check if AI provider key is configured
    ai_provider = None
    ai_key = None
    ai_model = None

    if ai_settings:
        if ai_settings.get("openai_key") and ai_settings["openai_key"].strip():
            ai_provider = "openai"
            ai_key = ai_settings["openai_key"].strip()
            ai_model = ai_settings.get("openai_model") or "gpt-4o"
        elif ai_settings.get("gemini_key") and ai_settings["gemini_key"].strip():
            ai_provider = "gemini"
            ai_key = ai_settings["gemini_key"].strip()
            ai_model = ai_settings.get("gemini_model") or "gemini-1.5-pro"
        elif ai_settings.get("claude_key") and ai_settings["claude_key"].strip():
            ai_provider = "claude"
            ai_key = ai_settings["claude_key"].strip()
            ai_model = ai_settings.get("claude_model") or "claude-3-5-sonnet"

    keywords = None
    source = "deterministic_engine"

    # Attempt AI generation if configured
    if ai_provider and ai_key:
        prompt = (
            f"Generate a strict JSON array of 8-12 job title and search keyword variations for a candidate.\n"
            f"PRIMARY SKILL: {primary_skill} (CRITICAL: Every query and role MUST anchor on this skill. Never replace {primary_skill} with secondary skills!).\n"
            f"SECONDARY SKILLS: {', '.join(skills_names[:6])}\n"
            f"DESIRED ROLES: {', '.join(selected_roles[:4])}\n"
            f"LOCATION: {loc}\n\n"
            f"Output JSON schema format:\n"
            f"[{{\"roleTitle\": \"string\", \"searchQuery\": \"string\", \"priority\": 1-4, \"category\": \"string\", \"secondarySkills\": [\"string\"]}}]\n"
            f"Return ONLY valid JSON."
        )

        try:
            if ai_provider == "openai":
                req_data = json.dumps({
                    "model": ai_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }).encode("utf-8")
                req = urllib.request.Request(
                    "https://api.openai.com/v1/chat/completions",
                    data=req_data,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {ai_key}"
                    }
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    raw_content = res_body["choices"][0]["message"]["content"]
                    parsed_kw = sanitize_ai_keyword_output(raw_content, primary_skill)
                    if parsed_kw:
                        keywords = parsed_kw
                        source = f"ai_openai_{ai_model}"
        except Exception as e:
            logger.warning(f"AI Keyword generation failed or timed out ({e}). Falling back to deterministic engine.")

    # Fallback to high-precision deterministic generator
    if not keywords:
        keywords = generate_deterministic_keywords(
            primary_skill=primary_skill,
            skills_list=skills_names,
            selected_roles=selected_roles,
            user_location=loc
        )
        source = "deterministic_engine"

    return {
        "primarySkill": primary_skill,
        "source": source,
        "generatedAt": int(time.time() * 1000),
        "keywords": keywords
    }
