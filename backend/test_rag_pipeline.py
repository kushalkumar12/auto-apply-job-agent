"""
Comprehensive Acceptance and Adversarial Test Suite for Skill2Role RAG System.
Verifies all 12 stages: Parser, Facts, Chunking, BLOB Embeddings, FTS5 Triggers,
Hybrid RRF Retrieval, Job Analyzer, ATS Scoring, Provenance, Isolation, and Export.
"""

import os
import io
import json
import time
import unittest
import numpy as np
import pymupdf
import docx
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from main import app
from database import get_db, init_db, backup_database
from services.document_parser import parse_document, compute_content_hash
from services.career_facts_service import extract_career_facts
from services.chunking_service import chunk_document
from services.embedding_service import (
    generate_embeddings, pack_vector_blob, unpack_vector_blob,
    index_chunks, EMBEDDING_DIM
)
from services.hybrid_retriever import hybrid_retrieve, sanitize_fts_query
from services.job_analyzer import get_or_analyze_job_requirements, analyze_job
from services.gemini_generator import build_deterministic_resume
from services.factual_validator import (
    calculate_ats_match_score, validate_and_persist_tailored_resume
)
from services.auth_service import create_access_token
from services.resume_exporter import generate_docx, generate_pdf

class TestSkill2RoleRAGPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = (BACKEND_DIR / "test_jobs_rag.db").resolve()
        os.environ["SKILL2ROLE_DB_PATH"] = str(cls.test_db_path)
        for p in [cls.test_db_path, Path(str(cls.test_db_path) + "-wal"), Path(str(cls.test_db_path) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass
        init_db()
        cls.client = TestClient(app)
        cls.profile_id = "test_candidate_rag"
        cls.adversary_profile_id = "test_candidate_adversary"

        # Ensure test candidate profiles and user exist
        with get_db() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
                VALUES ('user_test', 'rag_tester@example.com', 'pbkdf2_dummy', 'RAG Tester', 'avatar_1', 'local', ?)
            """, (int(time.time()),))
            conn.execute("""
                INSERT OR REPLACE INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES (?, 'user_test', 'Senior Java Developer', 1, 1, '{}', ?, ?)
            """, (cls.profile_id, int(time.time()), int(time.time())))
            conn.execute("""
                INSERT OR REPLACE INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES (?, 'user_test2', 'Frontend Vue Developer', 0, 1, '{}', ?, ?)
            """, (cls.adversary_profile_id, int(time.time()), int(time.time())))

            # Ensure a test job exists
            conn.execute("""
                INSERT OR REPLACE INTO jobs (
                    id, role, company, logo, source, workMode, atsScore, dateTime,
                    location, salary, description, skills, created_at
                ) VALUES (
                    88881, 'Lead Backend Engineer', 'Acme Payments', '', 'Direct ATS',
                    'Remote', 88, 'Today', 'Bengaluru, India', '35 LPA',
                    'We are seeking a Lead Backend Engineer with 6+ years experience in Java, Spring Boot, Kafka, and AWS. Must scale high-throughput payment pipelines with 99.99% availability.',
                    '["Java", "Spring Boot", "Kafka", "AWS", "PostgreSQL", "Docker"]', ?
                )
            """, (int(time.time()),))

        cls.token = create_access_token("user_test", "rag_tester@example.com", "RAG Tester")
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        with get_db() as conn:
            conn.execute("DELETE FROM jobs WHERE id = 88881;")
            conn.execute("DELETE FROM tailored_resumes WHERE profile_id IN (?, ?);", (cls.profile_id, cls.adversary_profile_id))
            conn.execute("DELETE FROM career_documents WHERE profile_id IN (?, ?);", (cls.profile_id, cls.adversary_profile_id))
            conn.execute("DELETE FROM candidate_profiles WHERE id IN (?, ?);", (cls.profile_id, cls.adversary_profile_id))

    def setUp(self):
        # Create a synthetic in-memory PDF resume
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text((50, 72), """Kushal Kumar
Summary
Principal Backend Engineer with 10+ years architecting distributed payment systems.
Experience
Swiggy - Principal Engineer (2021 - Present)
- Architected high throughput order routing in Java 17 and Kafka, reducing latency by 45%
- Mentored team of 14 senior engineers and reduced cloud infrastructure cost by $250k
Flipkart - Lead Software Development Engineer (2018 - 2021)
- Built inventory microservices handling 25,000 requests per second with Spring Boot
Skills
Java, Spring Boot, Kafka, AWS, PostgreSQL, Redis, Docker, Microservices, CI/CD
Education
B.Tech in Computer Science, VTU, 2014""")
        self.pdf_bytes = doc.tobytes()

    # ------------------------------------------------------------------
    # 1. Document Parsing & Section Hierarchy
    # ------------------------------------------------------------------
    def test_01_document_parser_pdf_and_docx(self):
        parsed_pdf = parse_document(self.pdf_bytes, "master.pdf")
        self.assertEqual(parsed_pdf["format"], "pdf")
        self.assertGreater(parsed_pdf["line_count"], 10)
        
        section_types = [s["section_type"] for s in parsed_pdf["sections"]]
        self.assertIn("summary", section_types)
        self.assertIn("experience", section_types)
        self.assertIn("skills", section_types)
        self.assertIn("education", section_types)

        # Test DOCX Parser
        doc_w = docx.Document()
        doc_w.add_paragraph("Kushal Kumar")
        doc_w.add_heading("Skills", level=1)
        doc_w.add_paragraph("Java, Spring Boot, Kafka")
        buf = io.BytesIO()
        doc_w.save(buf)
        parsed_docx = parse_document(buf.getvalue(), "resume.docx")
        self.assertEqual(parsed_docx["format"], "docx")
        self.assertIn("skills", [s["section_type"] for s in parsed_docx["sections"]])

    # ------------------------------------------------------------------
    # 2. Career Fact Extraction & Atomic Grounding
    # ------------------------------------------------------------------
    def test_02_career_facts_extraction(self):
        parsed = parse_document(self.pdf_bytes, "master.pdf")
        facts = extract_career_facts(parsed, "doc_test_1", profile_id=self.profile_id)
        
        fact_types = set([f["fact_type"] for f in facts])
        self.assertIn("skill", fact_types)
        self.assertIn("employment", fact_types)
        self.assertIn("achievement", fact_types)
        self.assertIn("metric", fact_types)
        self.assertIn("education", fact_types)

        # Verify numerical metric extraction
        metric_values = [f["normalized_value"] for f in facts if f["fact_type"] == "metric"]
        self.assertTrue(any("45%" in m for m in metric_values))

    # ------------------------------------------------------------------
    # 3. Semantic Chunking with Section Context Anchors
    # ------------------------------------------------------------------
    def test_03_semantic_chunking(self):
        parsed = parse_document(self.pdf_bytes, "master.pdf")
        chunks = chunk_document(parsed, "doc_test_1", profile_id=self.profile_id)
        self.assertGreaterEqual(len(chunks), 3)
        
        # Verify that experience chunks contain contextual headers
        exp_chunk = next(c for c in chunks if c["section_type"] == "experience")
        self.assertTrue(exp_chunk["chunk_text"].startswith("[Experience:"))

    # ------------------------------------------------------------------
    # 4. IEEE 754 Float32 BLOB Vector Packing & Vector Math
    # ------------------------------------------------------------------
    def test_04_blob_vector_packing_and_math(self):
        texts = ["Java Spring Boot microservices", "React TypeScript UI components"]
        vectors = generate_embeddings(texts)
        self.assertEqual(len(vectors), 2)
        self.assertEqual(len(vectors[0]), EMBEDDING_DIM)
        
        # Test 3,072-byte packing
        blob = pack_vector_blob(vectors[0])
        self.assertEqual(len(blob), 3072)
        
        # Test lossless round-trip unpacking
        unpacked = unpack_vector_blob(blob)[0]
        self.assertTrue(np.allclose(vectors[0], unpacked, atol=1e-6))

    # ------------------------------------------------------------------
    # 5. SQLite FTS5 Automated Trigger Synchronization
    # ------------------------------------------------------------------
    def test_05_fts5_trigger_synchronization(self):
        test_chunk = [{
            "id": "chk_trg_test",
            "document_id": "doc_trg_test",
            "section_type": "experience",
            "section_title": "Swiggy Lead",
            "chunk_text": "Engineered distributed Kafka event pipeline on AWS EC2.",
            "chunk_index": 0,
            "chunk_hash": "hash_trg_1"
        }]

        with get_db() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO career_documents (
                    id, user_id, profile_id, document_type, original_filename, storage_path,
                    file_size, content_hash, processing_status, created_at, updated_at
                ) VALUES ('doc_trg_test', 'user_test', ?, 'master_resume', 'test.pdf', '', 100, 'h1', 'indexed', 0, 0)
            """, (self.profile_id,))

        indexed = index_chunks(test_chunk, profile_id=self.profile_id)
        self.assertEqual(indexed, 1)

        # FTS5 Match
        with get_db() as conn:
            res = conn.execute("""
                SELECT chunk_id FROM document_chunks_fts
                WHERE document_chunks_fts MATCH 'Kafka' AND profile_id = ?
            """, (self.profile_id,)).fetchall()
            self.assertEqual(len(res), 1)
            self.assertEqual(res[0][0], "chk_trg_test")

            # Test Cascade / Trigger Delete
            conn.execute("DELETE FROM document_chunks WHERE id = 'chk_trg_test';")
            res_after = conn.execute("""
                SELECT chunk_id FROM document_chunks_fts
                WHERE chunk_id = 'chk_trg_test'
            """).fetchall()
            self.assertEqual(len(res_after), 0)

            # Cleanup
            conn.execute("DELETE FROM career_documents WHERE id = 'doc_trg_test';")

    # ------------------------------------------------------------------
    # 6. Hybrid Retrieval (RRF) & Candidate Persona Isolation
    # ------------------------------------------------------------------
    def test_06_hybrid_retrieval_and_persona_isolation(self):
        parsed = parse_document(self.pdf_bytes, "master.pdf")
        chunks = chunk_document(parsed, "doc_iso_1", profile_id=self.profile_id)
        
        with get_db() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO career_documents (
                    id, user_id, profile_id, document_type, original_filename, storage_path,
                    file_size, content_hash, processing_status, created_at, updated_at
                ) VALUES ('doc_iso_1', 'user_test', ?, 'master_resume', 'test.pdf', '', 100, 'hiso', 'indexed', 0, 0)
            """, (self.profile_id,))
        index_chunks(chunks, profile_id=self.profile_id)

        # Candidate A retrieves Kafka experience
        results_a = hybrid_retrieve("Kafka Spring Boot payment pipeline", profile_id=self.profile_id, top_k=3)
        self.assertGreaterEqual(len(results_a), 1)
        self.assertTrue(any("Kafka" in r["chunk_text"] for r in results_a))

        # Adversary Candidate B searches for same keywords: Must return 0 chunks
        results_b = hybrid_retrieve("Kafka Spring Boot payment pipeline", profile_id=self.adversary_profile_id, top_k=3)
        self.assertEqual(len(results_b), 0)

        # Cleanup
        with get_db() as conn:
            conn.execute("DELETE FROM document_chunks WHERE profile_id = ?;", (self.profile_id,))
            conn.execute("DELETE FROM career_documents WHERE id = 'doc_iso_1';")

    # ------------------------------------------------------------------
    # 7. Job Requirement Extraction & SQLite Caching
    # ------------------------------------------------------------------
    def test_07_job_requirement_analyzer(self):
        reqs = get_or_analyze_job_requirements(88881)
        self.assertIn("Java", reqs["required_skills"])
        self.assertIn("Kafka", reqs["required_skills"])
        self.assertEqual(reqs["seniority_level"], "Lead")
        self.assertEqual(reqs["experience_years"], 6.0)

        # Verify cached in SQLite job_requirements
        with get_db() as conn:
            row = conn.execute("SELECT * FROM job_requirements WHERE job_id = 88881").fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["seniority_level"], "Lead")

    # ------------------------------------------------------------------
    # 8. Deterministic Transparent ATS Score Formula
    # ------------------------------------------------------------------
    def test_08_reproducible_ats_matching_formula(self):
        score, breakdown = calculate_ats_match_score(
            candidate_verified_skills=["Java", "Spring Boot", "Kafka", "AWS", "PostgreSQL", "Docker"],
            job_required_skills=["Java", "Spring Boot", "Kafka", "AWS"],
            job_preferred_skills=["Docker", "Kubernetes"],
            candidate_exp_years=10.0,
            job_exp_years=6.0,
            semantic_similarity=0.92
        )
        # All 4/4 required skills matched = 100
        self.assertEqual(breakdown["s_must"], 100.0)
        # 1/2 preferred skills matched (Docker) = 50.0
        self.assertEqual(breakdown["s_pref"], 50.0)
        # 10 years / 6 years = 100
        self.assertEqual(breakdown["s_exp"], 100.0)
        # Semantic 0.92 -> 92.0
        self.assertEqual(breakdown["s_sem"], 92.0)
        # 0.40*100 + 0.25*50 + 0.15*100 + 0.20*92 = 40 + 12.5 + 15 + 18.4 = 85.9 -> 86
        self.assertEqual(score, 86)

    # ------------------------------------------------------------------
    # 9. Adversarial Anti-Hallucination Guardrails
    # ------------------------------------------------------------------
    def test_09_adversarial_anti_hallucination_guardrails(self):
        # Job requiring skills candidate does NOT possess: Rust, Solidity, WebAssembly
        adv_job_reqs = {
            "required_skills": ["Rust", "Solidity", "WebAssembly"],
            "preferred_skills": ["Vyper"],
            "experience_years": 5.0,
            "responsibilities": ["Develop smart contracts in Solidity and Rust."]
        }
        cand_facts = [
            {"id": "f_java", "fact_type": "skill", "fact_text": "Java", "normalized_value": "java"},
            {"id": "f_spring", "fact_type": "skill", "fact_text": "Spring Boot", "normalized_value": "spring boot"}
        ]
        resume = build_deterministic_resume(
            candidate_name="Kushal Kumar",
            target_role="Rust Core Developer",
            target_company="Crypto Labs",
            job_reqs=adv_job_reqs,
            retrieved_chunks=[],
            candidate_facts=cand_facts
        )
        
        # Verify generator did NOT claim unearned skills
        self.assertIn("Rust", resume.missing_skills)
        self.assertIn("Solidity", resume.missing_skills)
        self.assertEqual(len(resume.matched_skills), 0)

        # Validate with factual validator
        val_res = validate_and_persist_tailored_resume(
            resume=resume,
            job_id=88881,
            profile_id=self.profile_id,
            job_reqs=adv_job_reqs,
            candidate_facts=cand_facts,
            candidate_exp_years=2.0,
            semantic_similarity=0.20
        )
        # ATS score must reflect lack of required skills
        self.assertLessEqual(val_res["ats_score"], 45)
        self.assertEqual(val_res["breakdown"]["matched_skills"], [])
        
        # Cleanup
        with get_db() as conn:
            conn.execute("DELETE FROM tailored_resumes WHERE id = ?", (val_res["resume_id"],))

    # ------------------------------------------------------------------
    # 10. Document Exporters (.DOCX and .PDF)
    # ------------------------------------------------------------------
    def test_10_docx_and_pdf_export(self):
        sample_data = {
            "candidate_name": "Kushal Kumar",
            "candidate_email": "kushal@example.com",
            "candidate_phone": "+91 9876543210",
            "candidate_location": "Bengaluru, India",
            "candidate_linkedin": "linkedin.com/in/kushal",
            "target_role": "Lead Backend Engineer",
            "target_company": "Acme Payments & Commerce",
            "tailored_summary": "Expert in high throughput Java & Kafka microservices with <10ms SLA.",
            "matched_skills": ["Java", "Spring Boot & Cloud", "Kafka", "AWS"],
            "experiences": [{
                "company": "Swiggy & Instamart",
                "role": "Principal Engineer",
                "period": "2021 - Present",
                "location": "Bengaluru",
                "bullets": [{"bullet_text": "Architected R&D data pipeline reducing latency by 45% with Redis & Kafka (<5ms p99)."}]
            }],
            "education": [{
                "degree": "B.Tech in Computer Science",
                "institution": "Visvesvaraya Technological University",
                "year": "2014"
            }],
            "cover_letter": "Dear Acme Payments team,\n\nI am thrilled to apply for the role & contribute."
        }
        docx_stream = generate_docx(sample_data)
        self.assertGreater(len(docx_stream.getvalue()), 10000)

        # Verify text extracted from docx
        doc_read = docx.Document(docx_stream)
        docx_full_text = "\n".join([p.text for p in doc_read.paragraphs])
        self.assertIn("kushal@example.com", docx_full_text)
        self.assertIn("EDUCATION", docx_full_text)
        self.assertIn("B.Tech in Computer Science", docx_full_text)

        # Verify PDF does not crash on XML special characters (&, <, >)
        pdf_stream = generate_pdf(sample_data)
        self.assertGreater(len(pdf_stream.getvalue()), 1500)

        # Verify text extracted from PDF independently using PyMuPDF
        pdf_doc = pymupdf.open(stream=pdf_stream.getvalue(), filetype="pdf")
        pdf_text = "\n".join([page.get_text() for page in pdf_doc])
        self.assertIn("kushal@example.com", pdf_text)
        self.assertIn("EDUCATION", pdf_text)
        self.assertIn("B.Tech in Computer Science", pdf_text)
        self.assertIn("Swiggy & Instamart", pdf_text)

    # ------------------------------------------------------------------
    # 11. End-to-End API Integration Workflow
    # ------------------------------------------------------------------
    def test_11_full_api_workflow(self):
        # 1. Upload Master Resume
        upload_resp = self.client.post(
            "/api/generation/master-resume/upload",
            files={"file": ("master_resume.pdf", self.pdf_bytes, "application/pdf")},
            data={"profile_id": self.profile_id},
            headers=self.auth_headers
        )
        self.assertEqual(upload_resp.status_code, 200)
        up_data = upload_resp.json()
        self.assertTrue(up_data["success"])
        self.assertGreaterEqual(up_data["facts_extracted"], 5)
        self.assertGreaterEqual(up_data["chunks_indexed"], 2)

        # 2. Check Status
        status_resp = self.client.get(f"/api/generation/master-resume/status?profile_id={self.profile_id}", headers=self.auth_headers)
        self.assertEqual(status_resp.status_code, 200)
        st_data = status_resp.json()
        self.assertTrue(st_data["indexed"])
        self.assertEqual(st_data["status"], "indexed")

        # 3. Generate Tailored Resume for Job 88881
        gen_resp = self.client.post(f"/api/generation/jobs/88881/generate?profile_id={self.profile_id}", headers=self.auth_headers)
        self.assertEqual(gen_resp.status_code, 200)
        gen_data = gen_resp.json()
        self.assertTrue(gen_data["success"])
        resume_id = gen_data["resume_id"]
        self.assertGreaterEqual(gen_data["ats_score"], 60)

        # 4. Fetch Generated Resume and Citations
        fetch_resp = self.client.get(f"/api/generation/resumes/{resume_id}", headers=self.auth_headers)
        self.assertEqual(fetch_resp.status_code, 200)
        f_data = fetch_resp.json()
        self.assertEqual(f_data["id"], resume_id)
        self.assertGreater(len(f_data["evidence"]), 0)

        # 5. Export DOCX
        docx_resp = self.client.get(f"/api/generation/resumes/{resume_id}/export/docx", headers=self.auth_headers)
        self.assertEqual(docx_resp.status_code, 200)
        self.assertEqual(docx_resp.headers["content-type"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        self.assertGreater(len(docx_resp.content), 10000)

        # 6. Export PDF
        pdf_resp = self.client.get(f"/api/generation/resumes/{resume_id}/export/pdf", headers=self.auth_headers)
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertEqual(pdf_resp.headers["content-type"], "application/pdf")
        self.assertGreater(len(pdf_resp.content), 1500)

        # 7. Backward-compatible /generation/jobs
        legacy_jobs_resp = self.client.get("/api/generation/jobs", headers=self.auth_headers)
        self.assertEqual(legacy_jobs_resp.status_code, 200)
        self.assertIn("jobs", legacy_jobs_resp.json())

        # 8. Re-index endpoint
        reindex_resp = self.client.post(f"/api/generation/master-resume/reindex?profile_id={self.profile_id}", headers=self.auth_headers)
        self.assertEqual(reindex_resp.status_code, 200)
        re_data = reindex_resp.json()
        self.assertTrue(re_data["success"])
        self.assertIn(re_data["embedding_model"], ["gemini-embedding-2", "deterministic-local-v1"])
        self.assertEqual(re_data["vector_dimension"], 768)

        # 9. Non-existent profile safety test (never assume default exists)
        bad_profile_resp = self.client.get("/api/generation/master-resume/status?profile_id=completely_nonexistent_profile_id_9999", headers=self.auth_headers)
        self.assertEqual(bad_profile_resp.status_code, 404)

        # Cleanup test artifacts
        with get_db() as conn:
            conn.execute("DELETE FROM tailored_resumes WHERE id = ?", (resume_id,))
            conn.execute("DELETE FROM document_chunks WHERE profile_id = ?", (self.profile_id,))
            conn.execute("DELETE FROM career_facts WHERE profile_id = ?", (self.profile_id,))
            conn.execute("DELETE FROM career_documents WHERE profile_id = ?", (self.profile_id,))

    # ------------------------------------------------------------------
    # 12. Model Incompatibility & Isolated Vector Fallback Guard
    # ------------------------------------------------------------------
    def test_12_embedding_model_incompatibility_guard(self):
        """
        Confirms that when stored chunk embeddings belong to a different model or dimension,
        vector search safely excludes them and never compares incompatible vector spaces.
        """
        # Store an artificial chunk with an incompatible model name satisfying foreign key constraints
        now_ts = int(time.time())
        with get_db() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO career_documents (
                    id, user_id, profile_id, document_type, original_filename,
                    storage_path, file_size, content_hash, document_version,
                    processing_status, created_at, updated_at
                ) VALUES ('doc_incompat', 'user_test', ?, 'master_resume', 'test.pdf', '', 100, 'hash_incompat', 1, 'indexed', ?, ?)
            """, (self.profile_id, now_ts, now_ts))
            conn.execute("""
                INSERT OR REPLACE INTO document_chunks (
                    id, document_id, profile_id, section_type, section_title,
                    chunk_text, chunk_index, chunk_hash, created_at
                ) VALUES ('chunk_incompat_test', 'doc_incompat', ?, 'skills', 'Skills', 'Rust, Solidity, Web3', 0, 'hash_chunk', ?)
            """, (self.profile_id, now_ts))
            conn.execute("""
                INSERT OR REPLACE INTO chunk_embeddings (
                    chunk_id, document_id, profile_id, embedding, embedding_model, vector_dimension, created_at
                ) VALUES ('chunk_incompat_test', 'doc_incompat', ?, ?, 'legacy-incompatible-model-v9', 768, ?)
            """, (self.profile_id, pack_vector_blob(np.ones(768, dtype=np.float32)), now_ts))
        
        # Test vector retrieval directly
        from services.hybrid_retriever import retrieve_vector_chunks
        vec_res = retrieve_vector_chunks("Java Spring Boot", profile_id=self.profile_id)
        # Should not include chunk_incompat_test because the model doesn't match
        self.assertNotIn("chunk_incompat_test", [r["chunk_id"] for r in vec_res])

        # Cleanup (deleting document cascades to document_chunks and chunk_embeddings)
        with get_db() as conn:
            conn.execute("DELETE FROM career_documents WHERE id = 'doc_incompat'")

    @classmethod
    def tearDownClass(cls):
        for p in [cls.test_db_path, Path(str(cls.test_db_path) + "-wal"), Path(str(cls.test_db_path) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass
        os.environ.pop("SKILL2ROLE_DB_PATH", None)

if __name__ == "__main__":
    unittest.main()
