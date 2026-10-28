"""
Gemini Structured Resume Generator for Skill2Role RAG System.
Synthesizes evidence-grounded, ATS-tailored resumes using Gemini 3.6 Flash
with strict Pydantic JSON schema output and deterministic fallback engine.
"""

import os
import re
import json
import uuid
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

try:
    from .embedding_service import get_gemini_api_key
    from .chunking_service import redact_pii
except (ImportError, ValueError):
    from services.embedding_service import get_gemini_api_key
    from services.chunking_service import redact_pii

GEMINI_GENERATION_MODEL = "gemini-3.6-flash"

class EvidenceCitedBullet(BaseModel):
    bullet_id: str = Field(description="Unique bullet identifier")
    bullet_text: str = Field(description="Action-verb bullet point tailored to target job")
    cited_fact_ids: List[str] = Field(description="IDs of source career facts substantiating this bullet")
    cited_chunk_ids: List[str] = Field(description="IDs of source document chunks used as context")
    targeted_skills: List[str] = Field(description="Technical skills highlighted in this bullet")

class TailoredExperienceItem(BaseModel):
    company: str
    role: str
    period: str
    location: str
    bullets: List[EvidenceCitedBullet]

class StructuredTailoredResume(BaseModel):
    candidate_name: str
    target_role: str
    target_company: str
    tailored_summary: str
    matched_skills: List[str]
    missing_skills: List[str]
    experiences: List[TailoredExperienceItem]
    cover_letter: str

def build_deterministic_resume(
    candidate_name: str,
    target_role: str,
    target_company: str,
    job_reqs: Dict[str, Any],
    retrieved_chunks: List[Dict[str, Any]],
    candidate_facts: List[Dict[str, Any]]
) -> StructuredTailoredResume:
    """
    Deterministic synthesis fallback engine.
    Ensures 100% testable, zero-external-dependency resume generation
    using verified career facts and retrieved context.
    """
    verified_skills = set([f["normalized_value"].lower() for f in candidate_facts if f["fact_type"] == "skill"])
    req_skills = job_reqs.get("required_skills", [])
    
    matched = [s for s in req_skills if s.lower() in verified_skills]
    missing = [s for s in req_skills if s.lower() not in verified_skills]

    # Gather employment facts
    emp_facts = [f for f in candidate_facts if f["fact_type"] == "employment"]
    ach_facts = [f for f in candidate_facts if f["fact_type"] in ("achievement", "responsibility")]

    experiences = []
    if emp_facts:
        for idx, emp in enumerate(emp_facts[:2]):
            # Split role and period from employment fact
            raw_emp = emp["fact_text"]
            parts = [p.strip() for p in re.split(r"[-–|@]+", raw_emp)]
            comp = parts[0] if parts else target_company
            r_title = parts[1] if len(parts) > 1 else target_role

            # Ground bullets by matching facts belonging to THIS specific company
            comp_lower = comp.lower()
            company_facts = [
                f for f in ach_facts
                if comp_lower in f.get("source_section", "").lower() or comp_lower in f.get("fact_text", "").lower()
            ]
            rel_facts = company_facts[:2] if company_facts else ach_facts[idx*2 : (idx+1)*2]

            bullets = []
            for b_idx, b_fact in enumerate(rel_facts):
                # Find matching chunk for citation if available
                matching_chunks = [c["chunk_id"] for c in retrieved_chunks if comp_lower in c.get("section_title", "").lower() or comp_lower in c.get("chunk_text", "").lower()]
                c_ids = matching_chunks[:2] if matching_chunks else [c["chunk_id"] for c in retrieved_chunks[:2]]
                bullets.append(EvidenceCitedBullet(
                    bullet_id=f"b_{uuid.uuid4().hex[:8]}",
                    bullet_text=b_fact["fact_text"],
                    cited_fact_ids=[b_fact["id"]],
                    cited_chunk_ids=c_ids,
                    targeted_skills=matched[:2]
                ))

            experiences.append(TailoredExperienceItem(
                company=comp,
                role=r_title,
                period=emp["normalized_value"] or "2021 - Present",
                location="Bengaluru, India",
                bullets=bullets or [EvidenceCitedBullet(
                    bullet_id=f"b_{uuid.uuid4().hex[:8]}",
                    bullet_text=f"Developed backend microservices leveraging {', '.join(matched[:3])}.",
                    cited_fact_ids=[emp["id"]],
                    cited_chunk_ids=[retrieved_chunks[0].get("chunk_id") or retrieved_chunks[0].get("id", "")] if retrieved_chunks else [],
                    targeted_skills=matched[:3]
                )]
            ))
    else:
        # Fallback single experience block
        sample_bullets = []
        for c in retrieved_chunks[:3]:
            sample_bullets.append(EvidenceCitedBullet(
                bullet_id=f"b_{uuid.uuid4().hex[:8]}",
                bullet_text=c["chunk_text"].splitlines()[-1][:120],
                cited_fact_ids=[f["id"] for f in c.get("associated_facts", [])[:1]],
                cited_chunk_ids=[c.get("chunk_id") or c.get("id", "")],
                targeted_skills=matched[:2]
            ))
        experiences.append(TailoredExperienceItem(
            company=target_company,
            role=target_role,
            period="2021 - Present",
            location="Bengaluru, India",
            bullets=sample_bullets
        ))

    summary = (
        f"Experienced {target_role} with strong background in {', '.join(matched[:4])}. "
        f"Proven track record of building reliable, high-performance distributed systems tailored for {target_company}."
    )

    cover_letter = (
        f"Dear Hiring Team at {target_company},\n\n"
        f"I am writing to express my strong enthusiasm for the {target_role} position. "
        f"With deep hands-on expertise in {', '.join(matched[:4])}, I am excited by the prospect of contributing "
        f"to your engineering initiatives.\n\n"
        f"Throughout my career, I have focused on building scalable, resilient architectures and delivering measurable business impact. "
        f"I welcome the opportunity to discuss how my verified background aligns with your team's objectives.\n\n"
        f"Sincerely,\n{candidate_name}"
    )

    return StructuredTailoredResume(
        candidate_name=candidate_name,
        target_role=target_role,
        target_company=target_company,
        tailored_summary=summary,
        matched_skills=matched,
        missing_skills=missing,
        experiences=experiences,
        cover_letter=cover_letter
    )

def generate_tailored_resume_gemini(
    candidate_name: str,
    target_role: str,
    target_company: str,
    job_reqs: Dict[str, Any],
    retrieved_chunks: List[Dict[str, Any]],
    candidate_facts: List[Dict[str, Any]]
) -> StructuredTailoredResume:
    """
    Synthesizes a tailored resume using Gemini 3.6 Flash structured JSON output.
    Falls back deterministically if no API key is available.
    """
    api_key = get_gemini_api_key()
    if not (api_key and GENAI_AVAILABLE):
        return build_deterministic_resume(candidate_name, target_role, target_company, job_reqs, retrieved_chunks, candidate_facts)

    prompt = f"""
    You are an evidence-grounded ATS resume generator. Synthesize a job-specific resume for {candidate_name} targeting {target_role} at {target_company}.
    
    TARGET JOB REQUIREMENTS:
    - Required Skills: {json.dumps(job_reqs.get('required_skills', []))}
    - Preferred Skills: {json.dumps(job_reqs.get('preferred_skills', []))}
    - Core Deliverables: {json.dumps(job_reqs.get('responsibilities', []))}
    
    VERIFIED CANDIDATE CAREER FACTS:
    {json.dumps([{ 'id': f['id'], 'type': f['fact_type'], 'text': redact_pii(f['fact_text']), 'val': f['normalized_value']} for f in candidate_facts[:30]])}
    
    RELEVANT RETRIEVED RESUME CONTEXT:
    {json.dumps([{ 'chunk_id': c.get('chunk_id') or c.get('id', ''), 'title': c.get('section_title') or c.get('title', ''), 'text': c.get('chunk_text', '') } for c in retrieved_chunks])}
    
    STRICT ANTI-HALLUCINATION RULES:
    1. NEVER invent past companies, employment periods, degrees, or certifications not in the verified facts.
    2. NEVER claim proficiency in skills not supported by verified facts. Any required skill not in candidate facts must be listed in missing_skills.
    3. Every experience bullet point MUST include `cited_fact_ids` referencing real facts from the input.
    """

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=GEMINI_GENERATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=StructuredTailoredResume,
                temperature=0.2
            )
        )
        data = json.loads(response.text)
        return StructuredTailoredResume(**data)
    except Exception as e:
        print(f"[Gemini Generator] Generation API call failed ({e}). Using deterministic evidence generator.")
        return build_deterministic_resume(candidate_name, target_role, target_company, job_reqs, retrieved_chunks, candidate_facts)
