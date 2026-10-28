import os
import time
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent

# Guarantee isolated temporary database
TEST_DB_NAME = "test_jobs_obj1.db"
TEST_DB_PATH = (BASE_DIR / TEST_DB_NAME).resolve()
os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)

from database import init_db, get_db, assert_test_database
from seed_india_jobs import seed
from services.auth_service import create_access_token
from main import app

class TestObjective1StatusCorrectness(unittest.TestCase):
    """
    Regression test suite verifying application status correctness,
    submission gate enforcement, and prevention of false positive success.
    """

    @classmethod
    def setUpClass(cls):
        os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)
        assert_test_database()
        # Clean any stale test database
        for p in [TEST_DB_PATH, Path(str(TEST_DB_PATH) + "-wal"), Path(str(TEST_DB_PATH) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass

        init_db()
        seed(target_db_path=TEST_DB_PATH)

        # Seed authenticated test user and issue JWT
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
                VALUES ('usr_obj1_tester', 'obj1_tester@example.com', 'pbkdf2_dummy', 'Objective 1 Tester', 'avatar_1', 'local', ?)
            """, (int(time.time() * 1000),))

        cls.token = create_access_token("usr_obj1_tester", "obj1_tester@example.com", "Objective 1 Tester")
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        for p in [TEST_DB_PATH, Path(str(TEST_DB_PATH) + "-wal"), Path(str(TEST_DB_PATH) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass
        os.environ.pop("SKILL2ROLE_DB_PATH", None)

    def test_apply_job_without_authentication_rejected_with_401(self):
        """
        Verify that protected job apply endpoint rejects unauthenticated requests with HTTP 401.
        """
        resp = self.client.post("/api/jobs/1/apply", json={"user_approved": False})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("credentials were not provided", resp.json()["detail"])

    def test_apply_job_without_user_approval_blocked_by_gate(self):
        """
        Verify that POST /jobs/{id}/apply without explicit user approval
        is blocked with HTTP 400 and preserves applied=0 in database.
        """
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE jobs SET applied = 0 WHERE id = 1")

        # Attempt to apply with user_approved=False
        resp = self.client.post("/api/jobs/1/apply", json={"user_approved": False}, headers=self.auth_headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.json()

        # Detailed error response must be preserved
        detail = data.get("detail", {})
        self.assertEqual(detail.get("error"), "USER_APPROVAL_REQUIRED")
        self.assertIn("blocked by the submission gate", detail.get("message", ""))
        self.assertTrue(len(detail.get("reasons", [])) > 0)

        # Database must still have applied=0
        with get_db() as conn:
            cur = conn.cursor()
            job = cur.execute("SELECT applied FROM jobs WHERE id = 1").fetchone()
            self.assertEqual(job["applied"], 0, "Job must remain unapplied after gate rejection")

    def test_apply_job_nonexistent_returns_404(self):
        """Verify requesting apply on non-existent job returns 404."""
        resp = self.client.post("/api/jobs/99999/apply", json={"user_approved": False}, headers=self.auth_headers)
        self.assertEqual(resp.status_code, 404)

    def test_automation_pipeline_without_approval_blocked_and_count_not_incremented(self):
        """
        Verify that triggering an automation pipeline without approval is blocked
        with HTTP 400 and appliedCount is NOT incremented.
        """
        # Create a pipeline
        pipe_payload = {
            "title": "Backend Engineering Auto-Apply",
            "targetRoles": "Java Developer, Backend Engineer",
            "platforms": ["LinkedIn", "Greenhouse"],
            "schedule": "Daily at 10:00",
            "frequencyLabel": "Daily",
            "matchThreshold": 85,
            "mode": "Auto-Apply"
        }
        create_resp = self.client.post("/api/automation/pipelines", json=pipe_payload, headers=self.auth_headers)
        self.assertEqual(create_resp.status_code, 201)
        pipe_id = create_resp.json()["id"]

        # Run pipeline with user_approved=False
        run_resp = self.client.post(f"/api/automation/pipelines/{pipe_id}/run", json={"user_approved": False}, headers=self.auth_headers)
        self.assertEqual(run_resp.status_code, 400)
        detail = run_resp.json().get("detail", {})
        self.assertEqual(detail.get("error"), "USER_APPROVAL_REQUIRED")

        # Verify database appliedCount is still 0
        with get_db() as conn:
            cur = conn.cursor()
            row = cur.execute("SELECT appliedCount FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
            self.assertEqual(row["appliedCount"], 0, "appliedCount must not be incremented on blocked run")

        # Repeat to verify metric inflation bug does not recur
        run_resp2 = self.client.post(f"/api/automation/pipelines/{pipe_id}/run", json={"user_approved": False}, headers=self.auth_headers)
        self.assertEqual(run_resp2.status_code, 400)
        with get_db() as conn:
            cur = conn.cursor()
            row = cur.execute("SELECT appliedCount FROM pipelines WHERE id = ?", (pipe_id,)).fetchone()
            self.assertEqual(row["appliedCount"], 0, "appliedCount must remain 0 after multiple blocked attempts")

    def test_apply_job_blocked_by_safety_gate_when_locked(self):
        """
        Verify that even with user_approved=True, when the submission gate safety lock
        or missing requirements trigger, the endpoint returns HTTP 422 and applied=0.
        """
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE jobs SET applied = 0 WHERE id = 2")

        resp = self.client.post("/api/jobs/2/apply", json={"user_approved": True}, headers=self.auth_headers)
        self.assertEqual(resp.status_code, 422)
        data = resp.json()
        detail = data.get("detail", {})
        self.assertEqual(detail.get("error"), "SUBMISSION_GATE_BLOCKED")
        self.assertTrue(len(detail.get("reasons", [])) > 0)

        # Database must still have applied=0
        with get_db() as conn:
            cur = conn.cursor()
            job = cur.execute("SELECT applied FROM jobs WHERE id = 2").fetchone()
            self.assertEqual(job["applied"], 0, "Job must remain unapplied when gate blocks")

    def test_withdrawing_application_always_allowed(self):
        """
        Verify that withdrawing an existing application (transition from applied=1 to applied=0)
        is always permitted without gate checks.
        """
        # Set job 3 to applied=1 directly in DB
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE jobs SET applied = 1 WHERE id = 3")

        # Withdraw application (no body needed)
        resp = self.client.post("/api/jobs/3/apply", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertFalse(data.get("applied"), "Job applied flag must be False")
        self.assertIn("withdrawn", data.get("message", "").lower())

        with get_db() as conn:
            cur = conn.cursor()
            job = cur.execute("SELECT applied FROM jobs WHERE id = 3").fetchone()
            self.assertEqual(job["applied"], 0, "Job application must be 0 in DB")

if __name__ == "__main__":
    unittest.main()
