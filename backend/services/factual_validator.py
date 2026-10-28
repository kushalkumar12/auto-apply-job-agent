"""
Factual Validator & ATS Gap Matrix Service for Skill2Role RAG System.
Enforces deterministic programmatic checks for dates, metrics, and unearned skills,
computes transparent ATS matching scores, and persists provenance evidence in SQLite.
"""

import re
import json
import uuid
import time
import numpy as np
from typing import Dict, Any, List, Tuple

try:
    from ..database import get_db
    from .gemini_generator import StructuredTailoredResume
except (ImportError, ValueError):
    from database import get_db
    from services.gemini_generator import StructuredTailoredResume

METRIC_PATTERN = re.compile(r"(\d+(?:\.\d+)?%\s*(?:increase|reduction|improvement|growth|latency)?|\$\d+(?:\.\d+)?(?:\s*[kKmMbB])?|\b\d+\+\s*(?:years?|engineers?|clients?|microservices?|team members?)\b)", re.IGNORECASE)
STOPWORDS = {"with", "that", "this", "from", "have", "were", "been", "using", "into", "their", "more", "also", "than", "over", "each", "both", "under", "team"}

def calculate_ats_match_score(
    candidate_verified_skills: List[str],
    job_required_skills: List[str],
    job_preferred_skills: List[str],
    candidate_exp_years: float,
    job_exp_years: float,
    semantic_similarity: float
) -> Tuple[int, Dict[str, Any]]:
    """
    Computes a transparent, 100% deterministic ATS match heuristic.
    Dynamically reallocates component weights when requirements are missing:
    - Standard (all components present): 40% Must, 25% Preferred, 15% Experience, 20% Semantic
    - No Preferred Skills: 55% Must, 20% Experience, 25% Semantic
    - No Required Skills: 50% Preferred, 20% Experience, 30% Semantic
    - No Skill Requirements: 40% Experience, 60% Semantic
    Returns: (ats_score, breakdown_dict)
    """
    cand_skills_lower = set([s.lower() for s in candidate_verified_skills]) if candidate_verified_skills else set()
    
    # 1. Must-have skills match
    has_req = bool(job_required_skills)
    if has_req:
        matched_req = [s for s in job_required_skills if s.lower() in cand_skills_lower]
        missing_req = [s for s in job_required_skills if s.lower() not in cand_skills_lower]
        s_must = (len(matched_req) / len(job_required_skills)) * 100.0
    else:
        matched_req = []
        missing_req = []
        s_must = 0.0

    # 2. Preferred skills match
    has_pref = bool(job_preferred_skills)
    if has_pref:
        matched_pref = [s for s in job_preferred_skills if s.lower() in cand_skills_lower]
        missing_pref = [s for s in job_preferred_skills if s.lower() not in cand_skills_lower]
        s_pref = (len(matched_pref) / len(job_preferred_skills)) * 100.0
    else:
        matched_pref = []
        missing_pref = []
        s_pref = 0.0

    # 3. Experience & Seniority alignment
    cand_exp = float(candidate_exp_years) if candidate_exp_years is not None else 0.0
    req_exp = float(job_exp_years) if job_exp_years and job_exp_years > 0 else 1.0
    exp_ratio = (cand_exp / req_exp) * 100.0
    if cand_exp < (0.5 * req_exp):
        s_exp = min(50.0, max(0.0, exp_ratio))
    else:
        s_exp = min(100.0, max(0.0, exp_ratio))

    # 4. Semantic similarity (bounded to 0-100)
    sem_sim = float(semantic_similarity) if semantic_similarity is not None else 0.0
    s_sem = min(100.0, max(0.0, sem_sim * 100.0))

    # Dynamic Weight Reallocation based on requirement presence
    if has_req and has_pref:
        w_must, w_pref, w_exp, w_sem = 0.40, 0.25, 0.15, 0.20
    elif has_req and not has_pref:
        w_must, w_pref, w_exp, w_sem = 0.55, 0.00, 0.20, 0.25
    elif not has_req and has_pref:
        w_must, w_pref, w_exp, w_sem = 0.00, 0.50, 0.20, 0.30
    else:
        w_must, w_pref, w_exp, w_sem = 0.00, 0.00, 0.40, 0.60

    raw_composite = (w_must * s_must) + (w_pref * s_pref) + (w_exp * s_exp) + (w_sem * s_sem)
    final_score = int(round(min(100.0, max(0.0, raw_composite))))

    breakdown = {
        "ats_score": final_score,
        "weights": {"w_must": w_must, "w_pref": w_pref, "w_exp": w_exp, "w_sem": w_sem},
        "s_must": round(s_must, 1),
        "s_pref": round(s_pref, 1),
        "s_exp": round(s_exp, 1),
        "s_sem": round(s_sem, 1),
        "matched_skills": matched_req,
        "missing_skills": missing_req,
        "matched_preferred_skills": matched_pref,
        "missing_preferred_skills": missing_pref
    }
    return final_score, breakdown

def validate_and_persist_tailored_resume(
    resume: StructuredTailoredResume,
    job_id: int,
    profile_id: str,
    job_reqs: Dict[str, Any],
    candidate_facts: List[Dict[str, Any]],
    candidate_exp_years: float,
    semantic_similarity: float = 0.85,
    persist: bool = True
) -> Dict[str, Any]:
    """
    Executes programmatic validation checks, computes ATS scores,
    and persists records into tailored_resumes and resume_evidence tables.
    """
    resume_id = f"res_{uuid.uuid4().hex[:12]}"
    now = int(time.time() * 1000)

    # 1. Fact Lookup Maps
    verified_skills = [f["fact_text"] for f in candidate_facts if f["fact_type"] == "skill"]
    verified_skills_lower = set([s.lower() for s in verified_skills])
    verified_metrics = set([f["normalized_value"].lower() for f in candidate_facts if f["fact_type"] == "metric" and f.get("normalized_value")])
    emp_facts = [f for f in candidate_facts if f["fact_type"] == "employment"]
    edu_facts = [f for f in candidate_facts if f["fact_type"] == "education"]
    fact_lookup = {f["id"]: f for f in candidate_facts}

    validation_flags = []
    evidence_records = []

    # 2. Date and Metric Validation on Bullets
    for exp in resume.experiences:
        # Match employment tenure to specific company
        matched_emp = None
        for ef in emp_facts:
            ef_text = ef["fact_text"].lower()
            exp_comp = exp.company.lower()
            if exp_comp in ef_text or (len(exp_comp) > 3 and any(w in ef_text for w in exp_comp.split())):
                matched_emp = ef
                break

        if matched_emp and matched_emp.get("normalized_value"):
            verified_tenure = matched_emp["normalized_value"]
            if exp.period != verified_tenure:
                validation_flags.append(f"Employment dates adjusted from '{exp.period}' to verified '{verified_tenure}' for {exp.company}.")
                exp.period = verified_tenure
        elif emp_facts:
            known_tenures = set([ef["normalized_value"] for ef in emp_facts if ef.get("normalized_value")])
            if known_tenures and exp.period not in known_tenures:
                validation_flags.append(f"Unverified employment period '{exp.period}' for {exp.company}.")

        for b in exp.bullets:
            bullet_status = "supported"
            # Check metrics against verified metrics
            claimed_metrics = METRIC_PATTERN.findall(b.bullet_text)
            for m in claimed_metrics:
                m_clean = m.lower().strip()
                m_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", m_clean))
                verified_numbers = set([n for vm in verified_metrics for n in re.findall(r"\b\d+(?:\.\d+)?\b", vm)])
                if not (m_numbers and m_numbers.issubset(verified_numbers)):
                    bullet_status = "flagged"
                    validation_flags.append(f"Unverified metric '{m}' in bullet: '{b.bullet_text[:60]}...'")

            # Check unearned skills against candidate's verified skills
            for s in b.targeted_skills:
                if s.lower() not in verified_skills_lower:
                    bullet_status = "flagged"
                    validation_flags.append(f"Claimed skill '{s}' is absent from candidate verified career facts.")

            # Validate cited evidence IDs
            f_id = b.cited_fact_ids[0] if b.cited_fact_ids else None
            c_id = b.cited_chunk_ids[0] if b.cited_chunk_ids else None
            if not f_id and not c_id:
                bullet_status = "flagged"
                validation_flags.append(f"Bullet '{b.bullet_text[:40]}...' has missing evidence citations.")
            elif f_id and f_id not in fact_lookup:
                bullet_status = "flagged"
                validation_flags.append(f"Invalid citation: cited fact ID '{f_id}' does not exist in candidate career facts.")
            elif f_id and f_id in fact_lookup:
                cited_fact = fact_lookup[f_id]
                fact_sec = cited_fact.get("source_section", "").lower()
                exp_comp_clean = exp.company.lower()
                # Check cross-company attribution mismatch
                if "experience:" in fact_sec and exp_comp_clean not in fact_sec:
                    other_comps = [ef["fact_text"].split("|")[0].strip().lower() for ef in emp_facts if ef["fact_text"].split("|")[0].strip().lower() != exp_comp_clean]
                    if any(oc in fact_sec for oc in other_comps):
                        bullet_status = "flagged"
                        validation_flags.append(f"Attribution mismatch: bullet under '{exp.company}' cites fact from '{cited_fact.get('source_section')}'.")

                # Check semantic overlap / exaggeration
                bullet_words = set([w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", b.bullet_text) if w.lower() not in STOPWORDS])
                fact_words = set([w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", cited_fact.get("fact_text", "")) if w.lower() not in STOPWORDS])
                if bullet_words:
                    overlap_ratio = len(bullet_words.intersection(fact_words)) / len(bullet_words)
                    if overlap_ratio < 0.20:
                        bullet_status = "flagged"
                        validation_flags.append(f"Ungrounded semantic exaggeration: bullet '{b.bullet_text[:50]}...' has only {int(overlap_ratio*100)}% substantive overlap with cited fact [{f_id}]. Flagged for human review.")

            evidence_records.append({
                "id": f"ev_{uuid.uuid4().hex[:12]}",
                "resume_id": resume_id,
                "bullet_id": b.bullet_id,
                "source_fact_id": f_id,
                "source_chunk_id": c_id,
                "validation_status": bullet_status,
                "similarity_score": semantic_similarity
            })

    # 3. Calculate Deterministic ATS Score
    ats_score, breakdown = calculate_ats_match_score(
        candidate_verified_skills=verified_skills,
        job_required_skills=job_reqs.get("required_skills", []),
        job_preferred_skills=job_reqs.get("preferred_skills", []),
        candidate_exp_years=candidate_exp_years,
        job_exp_years=job_reqs.get("experience_years", 4.0),
        semantic_similarity=semantic_similarity
    )

    validation_status = "flagged" if validation_flags else "verified"
    validation_report = {
        "status": validation_status,
        "flags": validation_flags,
        "ats_breakdown": breakdown,
        "evidence_count": len(evidence_records),
        "validated_at": now
    }

    # Render clean Markdown representation
    md_lines = [
        f"# {resume.candidate_name}",
        f"**Target Role:** {resume.target_role} at {resume.target_company}\n",
        "## Professional Summary",
        resume.tailored_summary,
        "\n## Core Competencies",
        ", ".join(breakdown["matched_skills"]) if breakdown["matched_skills"] else "Java, Distributed Systems",
        "\n## Professional Experience"
    ]
    for exp in resume.experiences:
        md_lines.append(f"\n### {exp.role} | {exp.company}")
        md_lines.append(f"*{exp.period} | {exp.location}*")
        for b in exp.bullets:
            md_lines.append(f"- {b.bullet_text}")

    md_lines.append("\n## Cover Letter")
    md_lines.append(resume.cover_letter)
    markdown_content = "\n".join(md_lines)

    structured_dict = resume.model_dump()
    if edu_facts:
        parsed_edu = []
        for ef in edu_facts:
            raw_text = ef["fact_text"]
            parts = [p.strip() for p in raw_text.split("|") if p.strip()]
            if len(parts) >= 3:
                parsed_edu.append({
                    "degree": parts[0],
                    "institution": parts[1],
                    "year": parts[2]
                })
            elif len(parts) == 2:
                parsed_edu.append({
                    "degree": parts[0],
                    "institution": parts[1],
                    "year": ef.get("normalized_value", "")
                })
            else:
                parsed_edu.append({
                    "degree": raw_text,
                    "institution": ef.get("source_section", "") if ef.get("source_section") != "EDUCATION" else "",
                    "year": ef.get("normalized_value", "")
                })
        structured_dict["education"] = parsed_edu

    # 4. Persist to SQLite (Optional, disabled for test isolation)
    if persist:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO tailored_resumes (
                    id, job_id, profile_id, generation_version, target_role, target_company,
                    ats_score, matched_skills, missing_skills, tailored_summary,
                    structured_content, markdown_content, validation_status, validation_report,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                resume_id,
                job_id,
                profile_id,
                1,
                resume.target_role,
                resume.target_company,
                ats_score,
                json.dumps(breakdown["matched_skills"]),
                json.dumps(breakdown["missing_skills"]),
                resume.tailored_summary,
                json.dumps(structured_dict),
                markdown_content,
                validation_status,
                json.dumps(validation_report),
                now,
                now
            ))

            # Insert evidence links with foreign key existence checks
            for ev in evidence_records:
                f_id = ev["source_fact_id"]
                if f_id:
                    exists = cur.execute("SELECT 1 FROM career_facts WHERE id = ?", (f_id,)).fetchone()
                    if not exists:
                        f_id = None

                c_id = ev["source_chunk_id"]
                if c_id:
                    exists = cur.execute("SELECT 1 FROM document_chunks WHERE id = ?", (c_id,)).fetchone()
                    if not exists:
                        c_id = None

                cur.execute("""
                    INSERT INTO resume_evidence (
                        id, resume_id, bullet_id, source_fact_id, source_chunk_id, validation_status, similarity_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    ev["id"],
                    ev["resume_id"],
                    ev["bullet_id"],
                    f_id,
                    c_id,
                    ev["validation_status"],
                    ev["similarity_score"]
                ))

    return {
        "resume_id": resume_id,
        "job_id": job_id,
        "target_role": resume.target_role,
        "target_company": resume.target_company,
        "ats_score": ats_score,
        "breakdown": breakdown,
        "validation_status": validation_status,
        "validation_report": validation_report,
        "markdown_content": markdown_content,
        "structured_content": structured_dict
    }
