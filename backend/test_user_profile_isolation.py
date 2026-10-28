"""
Multi-User Profile and Generation Data Isolation Test Suite.
Verifies complete strict isolation between different users:
- Profile retrieval, updates, and validation are 100% scoped to current user.
- Master resume ingestion and indexing status are 100% scoped to current user.
- Candidate profiles listing, lookup, activation, and deletion prevent cross-user leakage.
- AI Generation studio candidate bio and name reflect current user only.
"""

import os
import sys
import time
import json
from pathlib import Path
import unittest

BASE_DIR = Path(__file__).resolve().parent
TEST_DB_NAME = "test_jobs_isolation_verify.db"
TEST_DB_PATH = (BASE_DIR / TEST_DB_NAME).resolve()

os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)
os.environ["SKILL2ROLE_JWT_SECRET"] = "isolation-verify-secret-key-32bytes-secure!"

from database import init_db, get_db, assert_test_database
from seed_india_jobs import seed
from main import app
from fastapi.testclient import TestClient

class TestUserProfileIsolation(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)
        assert_test_database()
        for p in [TEST_DB_PATH, Path(str(TEST_DB_PATH) + "-wal"), Path(str(TEST_DB_PATH) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass

        init_db()
        seed(target_db_path=TEST_DB_PATH)
        cls.client = TestClient(app)

        # 1. Register User Kushal
        reg_kushal = cls.client.post("/api/auth/register", json={
            "email": "kushal@example.com",
            "password": "Password123!",
            "name": "Kushal Kumar"
        })
        assert reg_kushal.status_code in (200, 201), reg_kushal.text
        cls.kushal_token = reg_kushal.json()["token"]
        cls.kushal_headers = {"Authorization": f"Bearer {cls.kushal_token}"}

        # Update Kushal's profile with Kushal's distinct data
        cls.client.put("/api/profile", json={
            "general": {
                "fullName": "Kushal Kumar",
                "email": "kushal@example.com",
                "bio": "Lead Java Architect with 10 years experience"
            },
            "skillsList": [{"name": "Java"}, {"name": "Spring Boot"}, {"name": "Kafka"}],
            "experiences": [{
                "company": "Kushal Corp",
                "title": "Principal Architect",
                "period": "2020 - Present",
                "location": "Bengaluru",
                "description": "Led high-scale distributed payments processing."
            }]
        }, headers=cls.kushal_headers)

        # Record Kushal's candidate profile ID
        prof_res = cls.client.get("/api/profiles", headers=cls.kushal_headers)
        cls.kushal_profiles = prof_res.json().get("profiles", [])
        cls.kushal_prof_id = cls.kushal_profiles[0]["id"] if cls.kushal_profiles else None

        # 2. Register User Pengu
        reg_pengu = cls.client.post("/api/auth/register", json={
            "email": "penguin@gmail.com",
            "password": "Password123!",
            "name": "pengu"
        })
        assert reg_pengu.status_code in (200, 201), reg_pengu.text
        cls.pengu_token = reg_pengu.json()["token"]
        cls.pengu_id = reg_pengu.json()["user"]["id"]
        cls.pengu_headers = {"Authorization": f"Bearer {cls.pengu_token}"}

    @classmethod
    def tearDownClass(cls):
        for p in [TEST_DB_PATH, Path(str(TEST_DB_PATH) + "-wal"), Path(str(TEST_DB_PATH) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass

    def test_01_pengu_profile_does_not_leak_kushal_data(self):
        """Verify Pengu gets Pengu's profile and never Kushal's."""
        resp = self.client.get("/api/profile", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        cand_name = data.get("general", {}).get("fullName") or data.get("contacts", {}).get("fullName") or ""
        cand_email = data.get("general", {}).get("email") or data.get("contacts", {}).get("email") or ""

        self.assertNotEqual(cand_name, "Kushal Kumar")
        self.assertNotEqual(cand_email, "kushal@example.com")
        self.assertEqual(cand_email, "penguin@gmail.com")
        self.assertEqual(cand_name, "pengu")

        # Kushal Corp experience should not be present for Pengu
        exps = data.get("experiences", [])
        for exp in exps:
            self.assertNotEqual(exp.get("company"), "Kushal Corp")

    def test_02_kushal_profile_remains_intact(self):
        """Verify Kushal gets Kushal's profile."""
        resp = self.client.get("/api/profile", headers=self.kushal_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        cand_name = data.get("general", {}).get("fullName") or data.get("contacts", {}).get("fullName")
        self.assertEqual(cand_name, "Kushal Kumar")

    def test_03_pengu_master_resume_status_is_empty(self):
        """Verify Pengu has no uploaded master resume, even if Kushal or others exist."""
        resp = self.client.get("/api/generation/master-resume/status", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["indexed"])
        self.assertEqual(data["status"], "not_uploaded")
        self.assertEqual(data["facts_count"], 0)

    def test_04_generation_jobs_candidate_bio_scoped_to_pengu(self):
        """Verify Generation View starts empty for Pengu, and queued jobs reflect Pengu."""
        # 1. New user with no tailored resumes and no bookmarks starts with empty queue
        resp = self.client.get("/api/generation/jobs", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 200)
        jobs_list = resp.json().get("jobs", [])
        self.assertEqual(len(jobs_list), 0)

        # 2. When Pengu bookmarks a job, it enters Pengu's generation queue
        with get_db() as conn:
            target_job = conn.execute("SELECT id FROM jobs LIMIT 1").fetchone()
            target_job_id = target_job["id"] if target_job else 21907

        mark_resp = self.client.post(f"/api/jobs/{target_job_id}/toggle-marker", headers=self.pengu_headers)
        self.assertEqual(mark_resp.status_code, 200)

        try:
            resp2 = self.client.get("/api/generation/jobs", headers=self.pengu_headers)
            self.assertEqual(resp2.status_code, 200)
            queued = resp2.json().get("jobs", [])
            self.assertEqual(len(queued), 1)

            candidate = queued[0].get("candidate", {})
            self.assertEqual(candidate.get("name"), "pengu")
            self.assertEqual(candidate.get("email"), "penguin@gmail.com")
            self.assertNotEqual(candidate.get("name"), "Kushal Kumar")
            self.assertNotEqual(candidate.get("experience", {}).get("company") if candidate.get("experience") else None, "Kushal Corp")

            # 3. Cross-user isolation: Kushal must not see Pengu's marked job in Kushal's queue
            kushal_resp = self.client.get("/api/generation/jobs", headers=self.kushal_headers)
            self.assertEqual(kushal_resp.status_code, 200)
            kushal_job_ids = [j["id"] for j in kushal_resp.json().get("jobs", [])]
            self.assertNotIn(target_job_id, kushal_job_ids)
        finally:
            # Cleanup bookmark
            with get_db() as conn:
                conn.execute("DELETE FROM job_bookmarks WHERE user_id = ?", (self.pengu_id,))
                conn.execute("UPDATE jobs SET marked = 0, user_id = 'default' WHERE id = ?", (target_job_id,))

    def test_05_candidate_profiles_list_isolated(self):
        """Verify Pengu only sees Pengu's candidate profiles."""
        resp = self.client.get("/api/profiles", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 200)
        profiles = resp.json().get("profiles", [])
        self.assertGreaterEqual(len(profiles), 1)

        pengu_profile_ids = [p["id"] for p in profiles]
        self.assertNotIn(self.kushal_prof_id, pengu_profile_ids)

    def test_06_direct_access_blocks_cross_user_inspection(self):
        """Verify Pengu attempting to directly fetch Kushal's profile ID receives 404."""
        resp = self.client.get(f"/api/profiles/{self.kushal_prof_id}", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 404)

    def test_07_direct_access_blocks_cross_user_activation(self):
        """Verify Pengu attempting to activate Kushal's profile ID receives 404."""
        resp = self.client.post(f"/api/profiles/{self.kushal_prof_id}/activate", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 404)

    def test_08_direct_access_blocks_cross_user_deletion(self):
        """Verify Pengu attempting to delete Kushal's profile ID is blocked (404 or 405)."""
        resp = self.client.delete(f"/api/profiles/{self.kushal_prof_id}", headers=self.pengu_headers)
        self.assertIn(resp.status_code, (404, 405))

    def test_09_pengu_analytics_is_zero_initialized_without_catalog_leak(self):
        """Verify Pengu's analytics returns clean 0s with no seeded catalog or cross-user data."""
        resp = self.client.get("/api/analytics", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["totalJobsInDb"], 0, "Pengu should have 0 tracked jobs")
        self.assertEqual(data["totalApplications"], 0, "Pengu should have 0 applications")
        self.assertEqual(data["interviews"], 0)
        self.assertEqual(data["responseRate"], "0%")
        self.assertEqual(data["averageAtsScore"], "0%")
        self.assertEqual(data["platformMetrics"], [])
        self.assertEqual(data["topRoles"], [])
        self.assertEqual(data["funnel"]["jobsFound"], 0)
        self.assertEqual(data["funnel"]["tailoredResumes"], 0)
        self.assertEqual(data["heatmap"]["totals"]["searches"], 0)
        self.assertEqual(data["heatmap"]["totals"]["all"], 0)
        self.assertEqual(data["heatmap"]["searches"], {})
        self.assertEqual(data["heatmap"]["all"], {})

    def test_10_pengu_activities_isolation(self):
        """Verify Pengu's activity log is isolated from Kushal's activity log."""
        resp = self.client.get("/api/activities", headers=self.pengu_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 0, "Pengu should start with 0 activities")
        self.assertEqual(data["activities"], [])

if __name__ == "__main__":
    unittest.main()
