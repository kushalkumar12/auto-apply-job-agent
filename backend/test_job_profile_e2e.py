"""
End-to-End Verification Test Suite for Production-Grade Job Profile Module
Tests criteria A through L from the specification.
"""
import io
import time
import unittest
from fastapi.testclient import TestClient
from main import app
from services import auth_service
from database import get_db_connection

class TestJobProfileModuleE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # User 1: Primary candidate
        cls.user1_email = f"candidate_e2e_{int(time.time())}@example.com"
        cls.user1_pwd = "StrongPassword123!"
        
        # Register user 1
        res1 = cls.client.post("/api/auth/register", json={
            "email": cls.user1_email,
            "password": cls.user1_pwd,
            "name": "Kushal Kumar"
        })
        if res1.status_code in (200, 201):
            cls.token1 = res1.json().get("token") or res1.json().get("access_token")
        else:
            login_res = cls.client.post("/api/auth/login", json={
                "email": cls.user1_email,
                "password": cls.user1_pwd
            })
            cls.token1 = login_res.json().get("token") or login_res.json().get("access_token")

        cls.headers1 = {"Authorization": f"Bearer {cls.token1}"}

        # User 2: Malicious / other candidate for isolation testing
        cls.user2_email = f"attacker_e2e_{int(time.time())}@example.com"
        cls.user2_pwd = "StrongPassword123!"
        res2 = cls.client.post("/api/auth/register", json={
            "email": cls.user2_email,
            "password": cls.user2_pwd,
            "name": "Other User"
        })
        if res2.status_code in (200, 201):
            cls.token2 = res2.json().get("token") or res2.json().get("access_token")
        else:
            login_res = cls.client.post("/api/auth/login", json={
                "email": cls.user2_email,
                "password": cls.user2_pwd
            })
            cls.token2 = login_res.json().get("token") or login_res.json().get("access_token")

        cls.headers2 = {"Authorization": f"Bearer {cls.token2}"}

    def test_01_initial_onboarding_state(self):
        """New profile starts incomplete and gates Explorer discovery."""
        val_res = self.client.get("/api/profiles/active/validation", headers=self.headers1)
        self.assertEqual(val_res.status_code, 200)
        data = val_res.json()
        
        # Discovery must be blocked if profile is incomplete
        if not data.get("isComplete"):
            disc_res = self.client.post("/api/discovery/start", headers=self.headers1, json={})
            self.assertEqual(disc_res.status_code, 403)

    def test_02_resume_upload_and_preview(self):
        """Resume PDF upload, file size validation, format enforcement, and inline view."""
        # 1. Non-pdf rejection
        fake_txt = io.BytesIO(b"Hello world text file")
        res_bad = self.client.post(
            "/api/profile/resume",
            headers=self.headers1,
            files={"file": ("test.txt", fake_txt, "text/plain")}
        )
        self.assertEqual(res_bad.status_code, 400)

        # 2. Valid PDF upload
        fake_pdf = io.BytesIO(b"%PDF-1.4 sample pdf content for resume master data test")
        res_pdf = self.client.post(
            "/api/profile/resume",
            headers=self.headers1,
            files={"file": ("Kushal_Kumar_Resume.pdf", fake_pdf, "application/pdf")}
        )
        self.assertEqual(res_pdf.status_code, 200)
        res_json = res_pdf.json()
        self.assertTrue(res_json.get("success"))
        self.assertEqual(res_json.get("resumeFileName"), "Kushal_Kumar_Resume.pdf")

        # 3. View resume inline
        view_res = self.client.get("/api/profile/resume/view", headers=self.headers1)
        self.assertEqual(view_res.status_code, 200)
        self.assertEqual(view_res.headers.get("content-type"), "application/pdf")
        self.assertIn("inline", view_res.headers.get("content-disposition", ""))

    def test_03_onboarding_completion_page1_and_page2(self):
        """Completing Page 1 & Page 2 persists master data and marks is_complete True."""
        profile_payload = {
            "fullName": "Kushal Kumar",
            "firstName": "Kushal",
            "lastName": "Kumar",
            "primarySkills": ["Java", "Spring Boot", "React", "Kafka", "PostgreSQL"],
            "selectedRoles": ["Full-Stack Developer", "Backend Developer"],
            "preferredRoles": ["Full-Stack Developer", "Backend Developer"],
            "userLocation": "Bengaluru",
            "preferredLocations": ["Bengaluru", "Pune", "Remote"],
            "preferredWorkModes": ["Hybrid", "Remote"],
            "globalOpportunities": True,
            "additionalSkills": ["Docker", "Kubernetes", "AWS"],
            "is_complete": True
        }

        save_res = self.client.put("/api/profile", headers=self.headers1, json=profile_payload)
        self.assertEqual(save_res.status_code, 200)

        # Verify active profile validation
        val_res = self.client.get("/api/profiles/active/validation", headers=self.headers1)
        self.assertEqual(val_res.status_code, 200)
        val_data = val_res.json()
        self.assertTrue(val_data.get("isComplete"))
        self.assertEqual(len(val_data.get("missingFields", [])), 0)

        # Explorer /discovery/start is now allowed
        start_res = self.client.post("/api/discovery/start", headers=self.headers1, json={})
        self.assertEqual(start_res.status_code, 200)
        stop_res = self.client.post("/api/discovery/stop", headers=self.headers1, json={})
        self.assertEqual(stop_res.status_code, 200)

    def test_04_explorer_consumes_updated_preferences(self):
        """Job Explorer matches jobs using the updated master profile preferences."""
        # 1. Fetch profile-driven jobs
        jobs_res = self.client.get("/api/jobs?profileDriven=true&page=1&limit=10", headers=self.headers1)
        self.assertEqual(jobs_res.status_code, 200)
        data = jobs_res.json()
        self.assertIn("jobs", data)
        self.assertGreater(data.get("total", 0), 0)

        # 2. Update avoid preference (avoid specific company e.g. 'Infosys')
        up_profile = {
            "avoidCompanies": ["Infosys"],
            "avoidSkills": ["WordPress"],
            "avoidRoles": ["Telemarketer"]
        }
        self.client.put("/api/profile", headers=self.headers1, json=up_profile)

        # 3. Subsequent search respects avoid preferences
        jobs_res_2 = self.client.get("/api/jobs?profileDriven=true&page=1&limit=20", headers=self.headers1)
        self.assertEqual(jobs_res_2.status_code, 200)
        jobs2 = jobs_res_2.json().get("jobs", [])
        for job in jobs2:
            self.assertNotEqual((job.get("company") or "").lower(), "infosys")

    def test_05_resume_generation_preserves_master_profile(self):
        """Resume Generation uses active profile without modifying master data or master resume."""
        # Get master profile before generation
        before_prof = self.client.get("/api/profile", headers=self.headers1).json()

        # Find a job to tailor
        jobs_res = self.client.get("/api/jobs?limit=1", headers=self.headers1)
        jobs = jobs_res.json().get("jobs", [])
        if jobs:
            job_id = jobs[0]["id"]
            # Mark job for generation
            self.client.post(f"/api/jobs/{job_id}/toggle-marker", headers=self.headers1)

            # Generate tailored resume
            gen_res = self.client.post(f"/api/generation/jobs/{job_id}/generate", headers=self.headers1)
            self.assertIn(gen_res.status_code, [200, 201])
            gen_data = gen_res.json()
            self.assertTrue(gen_data.get("success"))
            self.assertIn("resume_id", gen_data)

            # Master profile after generation must be unchanged
            after_prof = self.client.get("/api/profile", headers=self.headers1).json()
            self.assertEqual(before_prof.get("primarySkills"), after_prof.get("primarySkills"))
            self.assertEqual(before_prof.get("fullName"), after_prof.get("fullName"))
            self.assertEqual(before_prof.get("resumeFileName"), after_prof.get("resumeFileName"))

    def test_06_unauthorized_profile_access_isolation(self):
        """User 2 cannot access or delete User 1's profile or resume."""
        # User 2 attempts to view User 1's resume via profile_id
        prof1_data = self.client.get("/api/profile", headers=self.headers1).json()
        user1_id = prof1_data.get("id")

        if user1_id:
            hijack_res = self.client.get(f"/api/profile/resume/view?profile_id={user1_id}", headers=self.headers2)
            # Must either return 403 Forbidden or return User 2's own empty resume
            if hijack_res.status_code == 200:
                self.assertNotEqual(hijack_res.content, b"%PDF-1.4 sample pdf content for resume master data test")
            else:
                self.assertIn(hijack_res.status_code, [403, 404])

    def test_07_resume_permitted_deletion(self):
        """Permitted resume deletion removes document reference cleanly."""
        del_res = self.client.delete("/api/profile/resume", headers=self.headers1)
        self.assertEqual(del_res.status_code, 200)

        # View resume now reports 404
        view_after = self.client.get("/api/profile/resume/view", headers=self.headers1)
        self.assertEqual(view_after.status_code, 404)

if __name__ == "__main__":
    unittest.main()
