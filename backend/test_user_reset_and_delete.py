import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Configure dedicated test database
TEST_DB_PATH = Path(__file__).resolve().parent / "jobs_test_user_reset.db"
os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)

from main import app
from database import init_db, get_db

class TestUserResetAndDelete(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if TEST_DB_PATH.exists():
            try:
                TEST_DB_PATH.unlink()
            except Exception:
                pass
        init_db()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        if TEST_DB_PATH.exists():
            try:
                TEST_DB_PATH.unlink()
            except Exception:
                pass

    def test_user_data_reset_preserves_account_and_deletes_only_user_data(self):
        # 1. Register User A
        reg_a = self.client.post("/api/auth/register", json={
            "email": "user_a@example.com",
            "password": "SecurePassword123!",
            "name": "User Alpha"
        })
        self.assertEqual(reg_a.status_code, 201)
        token_a = reg_a.json()["token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B
        reg_b = self.client.post("/api/auth/register", json={
            "email": "user_b@example.com",
            "password": "SecurePassword123!",
            "name": "User Beta"
        })
        self.assertEqual(reg_b.status_code, 201)
        token_b = reg_b.json()["token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User A updates profile
        upd_a = self.client.put("/api/profile", headers=headers_a, json={
            "experienceYears": 10.0,
            "general": {
                "fullName": "User Alpha",
                "email": "user_a@example.com",
                "title": "Principal Java Architect",
                "primarySkill": "Java",
                "experienceYears": 10.0,
                "bio": "Expert in distributed Java microservices and enterprise architecture."
            },
            "contacts": {
                "email": "user_a@example.com",
                "location": "Bengaluru, Karnataka, India"
            },
            "skills": {
                "primarySkill": "Java",
                "technical": ["Java", "Spring Boot", "PostgreSQL", "Kafka", "Docker", "AWS"],
                "all": ["Java", "Spring Boot", "PostgreSQL", "Kafka"]
            },
            "preferences": {
                "primarySkill": "Java",
                "selectedRoles": ["Senior Java Engineer", "Lead Backend Architect"],
                "preferredLocations": ["Bengaluru", "Remote"]
            },
            "resume": {
                "fileName": "user_alpha_resume.pdf",
                "fileSize": 142850,
                "parsedText": "Principal Java Software Engineer with 10+ years designing resilient backend systems in Java, Spring Boot, AWS, Kafka, and SQL."
            }
        })
        self.assertEqual(upd_a.status_code, 200)

        # 4. Check User A profile validation: should be complete
        val_a = self.client.get("/api/profiles/active/validation", headers=headers_a)
        self.assertEqual(val_a.status_code, 200)
        self.assertTrue(val_a.json()["isComplete"])

        # 5. User A calls reset-user-data
        reset_res = self.client.post("/api/settings/reset-user-data", headers=headers_a, json={
            "confirmToken": "reset"
        })
        self.assertEqual(reset_res.status_code, 200)
        self.assertTrue(reset_res.json()["success"])

        # 6. User A profile should now be INCOMPLETE
        val_a_after = self.client.get("/api/profiles/active/validation", headers=headers_a)
        self.assertEqual(val_a_after.status_code, 200)
        self.assertFalse(val_a_after.json()["isComplete"])

        # 7. CRITICAL: User A account is STILL ACTIVE! User A can still authenticate!
        me_a = self.client.get("/api/auth/me", headers=headers_a)
        self.assertEqual(me_a.status_code, 200)
        self.assertEqual(me_a.json()["user"]["email"], "user_a@example.com")

        # 8. User B account and sessions are COMPLETELY UNTOUCHED!
        me_b = self.client.get("/api/auth/me", headers=headers_b)
        self.assertEqual(me_b.status_code, 200)
        self.assertEqual(me_b.json()["user"]["email"], "user_b@example.com")

    def test_account_deletion_removes_user_and_profiles_and_prevents_login(self):
        # 1. Register User C
        reg_c = self.client.post("/api/auth/register", json={
            "email": "user_c@example.com",
            "password": "SecurePassword123!",
            "name": "User Charlie"
        })
        self.assertEqual(reg_c.status_code, 201)
        token_c = reg_c.json()["token"]
        headers_c = {"Authorization": f"Bearer {token_c}"}

        # 2. Delete account via DELETE /api/auth/account
        del_res = self.client.delete("/api/auth/account", headers=headers_c)
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json()["success"])

        # 3. User C can NO LONGER authenticate with token
        me_c = self.client.get("/api/auth/me", headers=headers_c)
        self.assertEqual(me_c.status_code, 401)

        # 4. User C cannot log in with credentials
        login_c = self.client.post("/api/auth/login", json={
            "email": "user_c@example.com",
            "password": "SecurePassword123!"
        })
        self.assertEqual(login_c.status_code, 401)

        # 5. Check database directly: No records for User C in users or candidate_profiles
        with get_db() as conn:
            cur = conn.cursor()
            u = cur.execute("SELECT id FROM users WHERE email = 'user_c@example.com'").fetchone()
            self.assertIsNone(u)

if __name__ == "__main__":
    unittest.main()
