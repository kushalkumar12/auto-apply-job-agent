"""
Generation Router for Skill2Role RAG System.
Handles master resume ingestion, target job requirements analysis, evidence-grounded
resume tailoring using Gemini 3.6 Flash, provenance review, and document export.
"""

import os
import json
import time
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response, Depends, Query

try:
    from ..database import get_db
    from ..services.document_parser import parse_document
    from ..services.career_facts_service import extract_career_facts
    from ..services.chunking_service import chunk_document
    from ..services.embedding_service import index_chunks, reindex_all_chunks
    from ..services.hybrid_retriever import hybrid_retrieve
    from ..services.job_analyzer import get_or_analyze_job_requirements
    from ..services.gemini_generator import generate_tailored_resume_gemini, StructuredTailoredResume
    from ..services.factual_validator import validate_and_persist_tailored_resume
    from ..services.resume_exporter import generate_docx, generate_pdf
    from ..services.auth_service import get_current_user
except (ImportError, ValueError):
    from database import get_db
    from services.document_parser import parse_document
    from services.career_facts_service import extract_career_facts
    from services.chunking_service import chunk_document
    from services.embedding_service import index_chunks, reindex_all_chunks
    from services.hybrid_retriever import hybrid_retrieve
    from services.job_analyzer import get_or_analyze_job_requirements
    from services.gemini_generator import generate_tailored_resume_gemini, StructuredTailoredResume
    from services.factual_validator import validate_and_persist_tailored_resume
    from services.resume_exporter import generate_docx, generate_pdf
    from services.auth_service import get_current_user

router = APIRouter(prefix="/generation", tags=["Generation"])
RESUME_STORAGE_DIR = Path(__file__).resolve().parent.parent / "data" / "resumes"
RESUME_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def resolve_profile_id(cur, profile_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """
    Validates and resolves a candidate profile ID against candidate_profiles.
    Never assumes a default profile exists.
    1. If a specific profile_id is provided and belongs to user_id, returns it.
    2. If profile_id is provided but belongs to another user, raises 403 Forbidden.
    3. If user_id is provided, checks active profile or first profile for that specific user.
    4. Fallback to active candidate profile or any existing profile.
    """
    if profile_id:
        if user_id:
            row = cur.execute("SELECT id FROM candidate_profiles WHERE id = ? AND user_id = ?", (profile_id, user_id)).fetchone()
            if row:
                return row["id"]
            other = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (profile_id,)).fetchone()
            if other and other["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's candidate profile.")
            if profile_id != "default":
                raise HTTPException(
                    status_code=404,
                    detail=f"Candidate profile '{profile_id}' not found."
                )
        else:
            row = cur.execute("SELECT id FROM candidate_profiles WHERE id = ?", (profile_id,)).fetchone()
            if row:
                return row["id"]
            if profile_id != "default":
                raise HTTPException(
                    status_code=404,
                    detail=f"Candidate profile '{profile_id}' not found in candidate_profiles."
                )

    if user_id:
        active_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? AND is_active = 1 LIMIT 1", (user_id,)).fetchone()
        if active_row:
            return active_row["id"]
        any_row = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()
        if any_row:
            return any_row["id"]

    # Fallback to active candidate profile
    active_row = cur.execute("SELECT id FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
    if active_row:
        return active_row["id"]

    # Fallback to any existing candidate profile
    any_row = cur.execute("SELECT id FROM candidate_profiles ORDER BY created_at ASC LIMIT 1").fetchone()
    if any_row:
        return any_row["id"]

    raise HTTPException(
        status_code=404,
        detail="No candidate profile exists. Please create or import a candidate profile first."
    )

class GenerateRequest(BaseModel):
    jobId: Optional[int] = None
    job_id: Optional[int] = None
    candidateName: Optional[str] = None
    targetRole: Optional[str] = None
    type: Optional[str] = "resume"

class ResumeUpdateRequest(BaseModel):
    tailored_summary: Optional[str] = None
    cover_letter: Optional[str] = None
    experiences: Optional[List[Dict[str, Any]]] = None

# ======================================================================
# 1. MASTER RESUME INGESTION & STATUS
# ======================================================================

@router.post("/master-resume/upload")
async def upload_master_resume(
    file: UploadFile = File(...),
    profile_id: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Ingests and indexes a candidate's master resume (.pdf, .docx).
    Parses document, extracts career facts, chunks text, and indexes embeddings in SQLite.
    """
    filename = file.filename or "master_resume.pdf"
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Parse Document
    try:
        parsed_doc = parse_document(content, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse resume document: {str(e)}")

    content_hash = parsed_doc["content_hash"]
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    now = int(time.time() * 1000)
    user_id = current_user.get("id") if current_user else None

    with get_db() as conn:
        cur = conn.cursor()
        resolved_pid = resolve_profile_id(cur, profile_id, user_id=user_id)

    # 2. Save file to disk
    storage_filename = f"{resolved_pid}_{content_hash[:8]}_{filename}"
    file_path = RESUME_STORAGE_DIR / storage_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # 3. Insert or update career_documents
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO career_documents (
                id, user_id, profile_id, document_type, original_filename,
                storage_path, file_size, content_hash, document_version,
                processing_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            document_id, user_id or "default", resolved_pid, "master_resume", filename,
            str(file_path), len(content), content_hash, 1,
            "indexing", now, now
        ))

    # 4. Extract atomic career facts
    facts = extract_career_facts(parsed_doc, document_id, profile_id=resolved_pid)
    with get_db() as conn:
        cur = conn.cursor()
        for fact in facts:
            cur.execute("""
                INSERT OR REPLACE INTO career_facts (
                    id, document_id, profile_id, fact_type, fact_text,
                    normalized_value, verification_status, source_section,
                    source_line, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fact["id"], fact["document_id"], fact["profile_id"], fact["fact_type"],
                fact["fact_text"], fact["normalized_value"], fact["verification_status"],
                fact["source_section"], fact["source_line"], fact["created_at"]
            ))

    # 5. Semantic Chunking & Vector/FTS5 Indexing
    chunks = chunk_document(parsed_doc, document_id, profile_id=resolved_pid)
    indexed_count = index_chunks(chunks, profile_id=resolved_pid)

    # 6. Mark document as indexed
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE career_documents SET processing_status = 'indexed', updated_at = ? WHERE id = ?", (int(time.time() * 1000), document_id))

    return {
        "success": True,
        "document_id": document_id,
        "filename": filename,
        "file_size": len(content),
        "facts_extracted": len(facts),
        "chunks_indexed": indexed_count,
        "status": "indexed",
        "message": f"Master resume '{filename}' parsed and indexed successfully ({len(facts)} verified facts, {indexed_count} search chunks)."
    }

@router.get("/master-resume/status")
def get_master_resume_status(
    profile_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Returns indexing status, fact count, and chunk count for the active profile.
    """
    user_id = current_user.get("id") if current_user else None
    with get_db() as conn:
        cur = conn.cursor()
        resolved_pid = resolve_profile_id(cur, profile_id, user_id=user_id)
        if user_id and not profile_id:
            doc = cur.execute("""
                SELECT * FROM career_documents
                WHERE (profile_id = ? OR user_id = ?) AND document_type = 'master_resume'
                ORDER BY created_at DESC LIMIT 1
            """, (resolved_pid, user_id)).fetchone()
        else:
            doc = cur.execute("""
                SELECT * FROM career_documents
                WHERE profile_id = ? AND document_type = 'master_resume'
                ORDER BY created_at DESC LIMIT 1
            """, (resolved_pid,)).fetchone()

        if not doc:
            return {
                "indexed": False,
                "document_id": None,
                "filename": None,
                "facts_count": 0,
                "chunks_count": 0,
                "status": "not_uploaded"
            }

        facts_count = cur.execute("SELECT count(*) FROM career_facts WHERE profile_id = ?", (resolved_pid,)).fetchone()[0]
        chunks_count = cur.execute("SELECT count(*) FROM document_chunks WHERE profile_id = ?", (resolved_pid,)).fetchone()[0]

        return {
            "indexed": doc["processing_status"] == "indexed",
            "document_id": doc["id"],
            "filename": doc["original_filename"],
            "file_size": doc["file_size"],
            "facts_count": facts_count,
            "chunks_count": chunks_count,
            "status": doc["processing_status"],
            "updated_at": doc["updated_at"]
        }

@router.post("/master-resume/reindex")
def reindex_master_resume(
    profile_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Re-computes vector embeddings across document chunks to handle embedding model or dimension
    upgrades safely. Updates embedding_model and vector_dimension metadata without deleting
    underlying career documents or verified facts.
    """
    user_id = current_user.get("id") if current_user else None
    with get_db() as conn:
        cur = conn.cursor()
        resolved_pid = resolve_profile_id(cur, profile_id, user_id=user_id)

    res = reindex_all_chunks(profile_id=resolved_pid)
    return {
        "success": True,
        "profile_id": resolved_pid,
        "reindexed_chunks": res["reindexed"],
        "embedding_model": res["model"],
        "vector_dimension": res["dimension"],
        "message": f"Successfully reindexed {res['reindexed']} chunks with model '{res['model']}' ({res['dimension']}-dim)."
    }

# ======================================================================
# 2. TARGET JOB REQUIREMENTS
# ======================================================================

@router.post("/jobs/{job_id}/requirements")
def analyze_target_job_requirements(job_id: int):
    """
    Returns structured requirements (must-have skills, preferred skills, seniority, deliverables).
    """
    try:
        reqs = get_or_analyze_job_requirements(job_id)
        return {"success": True, "job_id": job_id, "requirements": reqs}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# ======================================================================
# 3. END-TO-END RAG RESUME GENERATION
# ======================================================================

@router.post("/jobs/{job_id}/generate")
def run_rag_generation_for_job(
    job_id: int,
    profile_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Executes the full RAG pipeline:
    1. Loads target job requirements.
    2. Retrieves top candidate experience chunks via Hybrid FTS5 + Cosine RRF.
    3. Synthesizes structured resume using Gemini 3.6 Flash.
    4. Validates dates, metrics, and unearned skills.
    5. Computes transparent deterministic ATS score and stores in SQLite.
    """
    user_id = current_user.get("id") if current_user else None
    with get_db() as conn:
        cur = conn.cursor()
        job_row = cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job_row:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
        job = dict(job_row)

        resolved_pid = resolve_profile_id(cur, profile_id, user_id=user_id)

        # Candidate profile metadata from candidate_profiles
        prof_row = cur.execute("SELECT data FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
        if not prof_row and user_id:
            prof_row = cur.execute("SELECT data FROM candidate_profiles WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
        if not prof_row:
            prof_row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
        profile_data = json.loads(prof_row["data"]) if prof_row and prof_row["data"] else {}

        # Fetch verified career facts
        facts = [dict(r) for r in cur.execute("SELECT * FROM career_facts WHERE profile_id = ?", (resolved_pid,)).fetchall()]

    candidate_name = (
        profile_data.get("general", {}).get("fullName") or
        profile_data.get("contacts", {}).get("fullName") or
        "Candidate"
    )
    exp_years = float(profile_data.get("experienceYears", 5.0) or 5.0)

    # 1. Job requirements
    job_reqs = get_or_analyze_job_requirements(job_id)

    # 2. Hybrid Retrieval (RRF)
    search_query = f"{job['role']} {job.get('skills', '')} {' '.join(job_reqs.get('required_skills', []))}"
    retrieved_chunks = hybrid_retrieve(search_query, profile_id=resolved_pid, top_k=6)

    # 3. Gemini Generation
    structured_resume = generate_tailored_resume_gemini(
        candidate_name=candidate_name,
        target_role=job["role"],
        target_company=job["company"],
        job_reqs=job_reqs,
        retrieved_chunks=retrieved_chunks,
        candidate_facts=facts
    )

    # 4. Factual Validation & ATS Scoring
    if retrieved_chunks and "rrf_score" in retrieved_chunks[0]:
        sim_score = min(1.0, max(0.0, retrieved_chunks[0]["rrf_score"] * 25.0))
    elif retrieved_chunks:
        sim_score = 0.50
    else:
        sim_score = 0.0

    validation_result = validate_and_persist_tailored_resume(
        resume=structured_resume,
        job_id=job_id,
        profile_id=resolved_pid,
        job_reqs=job_reqs,
        candidate_facts=facts,
        candidate_exp_years=exp_years,
        semantic_similarity=sim_score
    )

    return {
        "success": True,
        "resume_id": validation_result["resume_id"],
        "job_id": job_id,
        "role": job["role"],
        "company": job["company"],
        "ats_score": validation_result["ats_score"],
        "breakdown": validation_result["breakdown"],
        "validation_status": validation_result["validation_status"],
        "validation_report": validation_result["validation_report"],
        "structured_content": validation_result["structured_content"],
        "markdown_content": validation_result["markdown_content"]
    }

# ======================================================================
# 4. TAILORED RESUME MANAGEMENT & EDITING
# ======================================================================

@router.get("/resumes/{resume_id}")
def get_tailored_resume(resume_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """
    Retrieves generated tailored resume, citations, and ATS breakdown.
    """
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT * FROM tailored_resumes WHERE id = ?", (resume_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if current_user and row["profile_id"] and row["profile_id"] != 'default':
            prof = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (row["profile_id"],)).fetchone()
            if prof and prof["user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's candidate resume.")

        evidence_rows = cur.execute("""
            SELECT e.*, f.fact_text, f.source_section, c.chunk_text
            FROM resume_evidence e
            LEFT JOIN career_facts f ON e.source_fact_id = f.id
            LEFT JOIN document_chunks c ON e.source_chunk_id = c.id
            WHERE e.resume_id = ?
        """, (resume_id,)).fetchall()

    return {
        "id": row["id"],
        "job_id": row["job_id"],
        "target_role": row["target_role"],
        "target_company": row["target_company"],
        "ats_score": row["ats_score"],
        "matched_skills": json.loads(row["matched_skills"]),
        "missing_skills": json.loads(row["missing_skills"]),
        "tailored_summary": row["tailored_summary"],
        "structured_content": json.loads(row["structured_content"]),
        "markdown_content": row["markdown_content"],
        "validation_status": row["validation_status"],
        "validation_report": json.loads(row["validation_report"]),
        "evidence": [dict(e) for e in evidence_rows],
        "created_at": row["created_at"]
    }

@router.put("/resumes/{resume_id}")
def update_tailored_resume(resume_id: str, req: ResumeUpdateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """
    Saves candidate manual edits to summary, cover letter, or experience bullets.
    """
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT structured_content, profile_id FROM tailored_resumes WHERE id = ?", (resume_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if current_user and row["profile_id"] and row["profile_id"] != 'default':
            prof = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (row["profile_id"],)).fetchone()
            if prof and prof["user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Forbidden: You cannot edit another user's candidate resume.")

        structured = json.loads(row["structured_content"])
        if req.tailored_summary is not None:
            structured["tailored_summary"] = req.tailored_summary
        if req.cover_letter is not None:
            structured["cover_letter"] = req.cover_letter
        if req.experiences is not None:
            structured["experiences"] = req.experiences

        now = int(time.time() * 1000)
        cur.execute("""
            UPDATE tailored_resumes
            SET tailored_summary = ?, structured_content = ?, updated_at = ?
            WHERE id = ?
        """, (
            structured.get("tailored_summary", ""),
            json.dumps(structured),
            now,
            resume_id
        ))

    return {"success": True, "message": "Resume updated successfully."}

# ======================================================================
# 5. DOCUMENT EXPORT (.DOCX & .PDF)
# ======================================================================

@router.get("/resumes/{resume_id}/export/docx")
def export_resume_docx(resume_id: str, production: bool = False, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """
    Downloads native ATS-formatted .docx resume.
    If production=True, blocks export if synthetic/placeholder contact data is present.
    """
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT structured_content, target_role, target_company, profile_id FROM tailored_resumes WHERE id = ?", (resume_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if current_user and row["profile_id"] and row["profile_id"] != 'default':
            prof = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (row["profile_id"],)).fetchone()
            if prof and prof["user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Forbidden: You cannot export another user's candidate resume.")

    structured = json.loads(row["structured_content"])
    try:
        docx_stream = generate_docx(structured, production_mode=production)
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"error": "BLOCKED", "message": str(e)})
    
    filename = f"Resume_{row['target_company']}_{row['target_role']}.docx".replace(" ", "_")
    return Response(
        content=docx_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/resumes/{resume_id}/export/pdf")
def export_resume_pdf(resume_id: str, production: bool = False, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """
    Downloads clean ATS-formatted .pdf resume.
    If production=True, blocks export if synthetic/placeholder contact data is present.
    """
    with get_db() as conn:
        cur = conn.cursor()
        row = cur.execute("SELECT structured_content, target_role, target_company, profile_id FROM tailored_resumes WHERE id = ?", (resume_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if current_user and row["profile_id"] and row["profile_id"] != 'default':
            prof = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (row["profile_id"],)).fetchone()
            if prof and prof["user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Forbidden: You cannot export another user's candidate resume.")

    structured = json.loads(row["structured_content"])
    try:
        pdf_stream = generate_pdf(structured, production_mode=production)
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"error": "BLOCKED", "message": str(e)})

    filename = f"Resume_{row['target_company']}_{row['target_role']}.pdf".replace(" ", "_")
    return Response(
        content=pdf_stream.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# ======================================================================
# 6. BACKWARD-COMPATIBLE STUDIO DATA
# ======================================================================

@router.get("/jobs")
def get_generation_jobs(
    profile_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Returns opportunities for GenerationView studio list with latest resume generation stats.
    Only returns jobs that:
    1) Have a tailored resume created for this candidate profile in tailored_resumes, OR
    2) Have been explicitly marked / queued by this user for tailoring.
    """
    user_id = current_user.get("id") if current_user else None
    with get_db() as conn:
        cur = conn.cursor()
        prof_row = None
        resolved_pid = None
        if profile_id:
            resolved_pid = resolve_profile_id(cur, profile_id, user_id=user_id)
            prof_row = cur.execute("SELECT id, data FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
        elif user_id:
            prof_row = cur.execute("SELECT id, data FROM candidate_profiles WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
            if not prof_row:
                prof_row = cur.execute("SELECT id, data FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1", (user_id,)).fetchone()
            if prof_row:
                resolved_pid = prof_row["id"]

        if not prof_row:
            try:
                resolved_pid = resolve_profile_id(cur, None, user_id=user_id)
                prof_row = cur.execute("SELECT id, data FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
            except HTTPException:
                prof_row = cur.execute("SELECT 'default' as id, data FROM profile WHERE id = 'default'").fetchone()
                if prof_row:
                    resolved_pid = 'default'

        profile_data = json.loads(prof_row["data"]) if prof_row and prof_row["data"] else {}

        # 1. Fetch all tailored resumes generated for this active profile
        tailored_jobs = []
        if resolved_pid:
            tailored_rows = cur.execute("""
                SELECT 
                    j.*, 
                    tr.id as tailored_id, 
                    tr.ats_score as tr_ats, 
                    tr.validation_status as tr_status, 
                    tr.created_at as tr_created
                FROM tailored_resumes tr
                JOIN jobs j ON tr.job_id = j.id
                WHERE tr.profile_id = ?
                ORDER BY tr.created_at DESC
            """, (resolved_pid,)).fetchall()
            tailored_jobs = [dict(r) for r in tailored_rows]

        # 2. Fetch jobs marked / queued by this user that do not yet have a tailored resume
        queued_jobs = []
        tailored_job_ids = {tj["id"] for tj in tailored_jobs}
        if user_id:
            marked_rows = cur.execute("""
                SELECT * FROM jobs 
                WHERE (marked = 1 AND user_id = ? AND profile_id = ?) 
                   OR id IN (SELECT job_id FROM job_bookmarks WHERE user_id = ? AND profile_id = ?)
                ORDER BY id DESC
            """, (user_id, resolved_pid or 'default', user_id, resolved_pid or 'default')).fetchall()
            for r in marked_rows:
                rd = dict(r)
                if rd["id"] not in tailored_job_ids:
                    rd["tailored_id"] = None
                    rd["tr_ats"] = None
                    rd["tr_status"] = None
                    queued_jobs.append(rd)
        elif not user_id and resolved_pid == 'default':
            marked_rows = cur.execute("""
                SELECT * FROM jobs 
                WHERE marked = 1
                ORDER BY id DESC
            """).fetchall()
            for r in marked_rows:
                rd = dict(r)
                if rd["id"] not in tailored_job_ids:
                    rd["tailored_id"] = None
                    rd["tr_ats"] = None
                    rd["tr_status"] = None
                    queued_jobs.append(rd)

        all_target_jobs = tailored_jobs + queued_jobs

    candidate_name = (
        profile_data.get("general", {}).get("fullName") or
        profile_data.get("contacts", {}).get("fullName") or
        (current_user.get("name") if current_user else None) or
        "Candidate"
    )
    candidate_bio = profile_data.get("general", {}).get("bio") or profile_data.get("summary") or ""
    candidate_email = (
        profile_data.get("general", {}).get("email") or
        profile_data.get("contacts", {}).get("email") or
        (current_user.get("email") if current_user else None) or
        ""
    )
    candidate_phone = profile_data.get("general", {}).get("phone") or profile_data.get("contacts", {}).get("phone") or ""
    candidate_loc = profile_data.get("userLocation") or profile_data.get("contacts", {}).get("city") or ""

    profile_exps = profile_data.get("experiences") or []
    first_exp = profile_exps[0] if (isinstance(profile_exps, list) and len(profile_exps) > 0) else None

    # Dynamically extract authentic candidate skills from profile
    raw_skills = profile_data.get("skillsList") or []
    extracted_skills = []
    for s in raw_skills:
        if isinstance(s, str) and s.strip():
            extracted_skills.append(s.strip())
        elif isinstance(s, dict) and s.get("name"):
            extracted_skills.append(s["name"].strip())

    candidate_skills = []
    if extracted_skills:
        candidate_skills = [{"category": "Core Competencies", "items": ", ".join(extracted_skills)}]

    candidate_exp = None
    if first_exp and (first_exp.get("company") or first_exp.get("title") or first_exp.get("description")):
        candidate_exp = {
            "company": first_exp.get("company", ""),
            "role": first_exp.get("title", ""),
            "period": first_exp.get("period", ""),
            "location": first_exp.get("location", ""),
            "bullets": [first_exp.get("description", "")] if first_exp.get("description") else []
        }

    result = []
    for d in all_target_jobs:
        d["applied"] = bool(d.get("applied", 0))
        is_tailored = bool(d.get("tailored_id"))

        result.append({
            "id": d["id"],
            "role": d["role"],
            "company": d["company"],
            "source": d.get("source", "Explore"),
            "workMode": d.get("workMode", "Remote"),
            "atsScore": d["tr_ats"] if is_tailored and d.get("tr_ats") is not None else d.get("atsScore", 85),
            "tailored_resume_id": d.get("tailored_id"),
            "validation_status": d.get("tr_status"),
            "date": d.get("dateTime", ""),
            "status": "tailored" if is_tailored else "pending",
            "selected": False,
            "candidate": {
                "name": candidate_name,
                "title": f"{d['role']} | {candidate_bio[:50]}" if candidate_bio else d["role"],
                "location": candidate_loc,
                "email": candidate_email,
                "phone": candidate_phone,
                "linkedin": profile_data.get("general", {}).get("links", "") or profile_data.get("contacts", {}).get("linkedin", ""),
                "summary": candidate_bio,
                "skills": candidate_skills,
                "experience": candidate_exp
            }
        })

    return {"jobs": result}

@router.post("/generate")
def generate_tailored_resume_legacy(
    req: GenerateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Backward-compatible generate endpoint delegating to run_rag_generation_for_job.
    """
    target_id = req.jobId if req.jobId is not None else req.job_id
    if target_id is None:
        raise HTTPException(status_code=400, detail="jobId or job_id required")

    rag_res = run_rag_generation_for_job(target_id, profile_id=None, current_user=current_user)
    return {
        "success": True,
        "jobId": target_id,
        "company": rag_res["company"],
        "role": rag_res["role"],
        "tailored_resume_id": rag_res["resume_id"],
        "atsScore": rag_res["ats_score"],
        "tailoredSummary": rag_res["structured_content"]["tailored_summary"],
        "content": rag_res["markdown_content"],
        "message": f"Resume generated and optimized for {rag_res['company']} ({rag_res['role']}) with ATS score {rag_res['ats_score']}%."
    }
