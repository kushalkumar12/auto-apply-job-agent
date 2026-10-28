"""
Skill2Role Authentication and Cryptographic Security Regression Test Suite.
Verifies REM-P1-01:
- PBKDF2-HMAC-SHA256 password hashing (100k iterations, 16-byte random salt)
- Safe transparent migration for legacy static-salted SHA-256 credentials
- Expiring HS256 JWT tokens with signature, expiry, and claim verification
- Rejection of plaintext forgeable tokens (tok_<id>)
- Protected endpoints (GET /auth/me, PUT /auth/avatar)
- Rejection of raw email Google auth & verification of Google identity tokens
- Complete isolation with ephemeral test database
"""

import os
import sys
import time
import hashlib
import datetime
from pathlib import Path
import unittest

BASE_DIR = Path(__file__).resolve().parent
TEST_DB_NAME = "test_jobs_auth.db"
TEST_DB_PATH = (BASE_DIR / TEST_DB_NAME).resolve()

os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)
os.environ["SKILL2ROLE_JWT_SECRET"] = "test-auth-security-suite-secret-key-32bytes-secure!"

from database import init_db, get_db, assert_test_database
from seed_india_jobs import seed
from main import app
from fastapi.testclient import TestClient
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    set_google_token_verifier_for_testing
)
import jwt

class TestAuthSecurityUpgrade(unittest.TestCase):

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

    @classmethod
    def tearDownClass(cls):
        set_google_token_verifier_for_testing(None)
        for p in [TEST_DB_PATH, Path(str(TEST_DB_PATH) + "-wal"), Path(str(TEST_DB_PATH) + "-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass
        os.environ.pop("SKILL2ROLE_DB_PATH", None)

    # ----------------------------------------------------------------------
    # 1. PBKDF2 Password Hashing
    # ----------------------------------------------------------------------
    def test_registration_hashes_password_with_pbkdf2(self):
        """Proves new registrations store PBKDF2-HMAC-SHA256 with 100k iterations and unique salt."""
        synthetic_email = f"synth_reg_{int(time.time() * 1000)}@example.com"
        resp = self.client.post("/api/auth/register", json={
            "name": "Synthetic User",
            "email": synthetic_email,
            "password": "CorrectHorseBatteryStaple123!",
            "avatar": "avatar_2"
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data.get("success"))
        token = data.get("token")
        self.assertIsNotNone(token)
        self.assertFalse(token.startswith("tok_"))
        self.assertEqual(token.count("."), 2)  # Valid JWT format

        # Check database record
        with get_db() as conn:
            cur = conn.cursor()
            user = cur.execute("SELECT password_hash FROM users WHERE email = ?", (synthetic_email,)).fetchone()
            self.assertIsNotNone(user)
            stored_hash = user["password_hash"]
            self.assertTrue(stored_hash.startswith("pbkdf2_sha256$100000$"))
            parts = stored_hash.split("$")
            self.assertEqual(len(parts), 4)
            self.assertEqual(parts[1], "100000")
            self.assertEqual(len(parts[2]), 32)  # 16 bytes = 32 hex chars
            self.assertEqual(len(parts[3]), 64)  # 32 bytes = 64 hex chars

    def test_login_success_with_pbkdf2_and_jwt(self):
        """Proves login verifies PBKDF2 hash and issues signed, expiring JWT."""
        email = f"synth_login_{int(time.time() * 1000)}@example.com"
        pwd = "ValidPassword_2026_Secure!"
        self.client.post("/api/auth/register", json={
            "name": "Login Test User",
            "email": email,
            "password": pwd
        })

        resp = self.client.post("/api/auth/login", json={"email": email, "password": pwd})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        token = data.get("token")
        self.assertIsNotNone(token)

        # Decode token and verify claims
        payload = decode_access_token(token)
        self.assertEqual(payload["email"], email)
        self.assertEqual(payload["name"], "Login Test User")
        self.assertEqual(payload["iss"], "skill2role")
        self.assertIn("exp", payload)
        self.assertIn("iat", payload)
        self.assertGreater(payload["exp"], payload["iat"])

    def test_login_with_incorrect_password_rejected(self):
        """Proves incorrect password returns HTTP 401."""
        email = f"synth_wrongpwd_{int(time.time() * 1000)}@example.com"
        pwd = "RightPassword123!"
        self.client.post("/api/auth/register", json={
            "name": "Wrong Pwd User",
            "email": email,
            "password": pwd
        })

        resp = self.client.post("/api/auth/login", json={"email": email, "password": "WrongPassword456!"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid email or password", resp.json()["detail"])

    # ----------------------------------------------------------------------
    # 2. Safe Password Hash Migration Strategy
    # ----------------------------------------------------------------------
    def test_legacy_sha256_hash_safe_migration(self):
        """Proves legacy static-salted SHA-256 account is transparently migrated to PBKDF2 on login."""
        legacy_email = f"legacy_user_{int(time.time() * 1000)}@example.com"
        plain_pwd = "OldLegacyPassword_2025"
        # Generate legacy Scheme A hash: sha256(password + "_salt_porter_2026")
        legacy_hash = hashlib.sha256((plain_pwd + "_salt_porter_2026").encode("utf-8")).hexdigest()

        # Seed legacy user directly into SQLite
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
                VALUES (?, ?, ?, 'Legacy User', 'avatar_1', 'local', ?)
            """, (f"usr_legacy_{int(time.time())}", legacy_email, legacy_hash, int(time.time() * 1000)))

        # 1. Login with legacy account using the correct password
        resp = self.client.post("/api/auth/login", json={"email": legacy_email, "password": plain_pwd})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json().get("success"))

        # 2. Verify database hash was upgraded automatically to PBKDF2
        with get_db() as conn:
            cur = conn.cursor()
            user = cur.execute("SELECT password_hash FROM users WHERE email = ?", (legacy_email,)).fetchone()
            self.assertIsNotNone(user)
            upgraded_hash = user["password_hash"]
            self.assertTrue(upgraded_hash.startswith("pbkdf2_sha256$100000$"))
            self.assertNotEqual(upgraded_hash, legacy_hash)

        # 3. Verify subsequent login succeeds with the upgraded PBKDF2 hash
        resp2 = self.client.post("/api/auth/login", json={"email": legacy_email, "password": plain_pwd})
        self.assertEqual(resp2.status_code, 200)

    def test_legacy_scheme_b_migration(self):
        """Proves legacy Scheme B ('skill2role_salt_' + pwd) also transparently migrates to PBKDF2."""
        legacy_email = f"legacy_b_{int(time.time() * 1000)}@example.com"
        plain_pwd = "SchemeBPassword_2025!"
        legacy_hash = hashlib.sha256(("skill2role_salt_" + plain_pwd).encode("utf-8")).hexdigest()

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
                VALUES (?, ?, ?, 'Legacy B User', 'avatar_3', 'local', ?)
            """, (f"usr_leg_b_{int(time.time())}", legacy_email, legacy_hash, int(time.time() * 1000)))

        resp = self.client.post("/api/auth/login", json={"email": legacy_email, "password": plain_pwd})
        self.assertEqual(resp.status_code, 200)

        with get_db() as conn:
            cur = conn.cursor()
            user = cur.execute("SELECT password_hash FROM users WHERE email = ?", (legacy_email,)).fetchone()
            self.assertTrue(user["password_hash"].startswith("pbkdf2_sha256$100000$"))

    # ----------------------------------------------------------------------
    # 3. JWT Token Verification & Protected Endpoints
    # ----------------------------------------------------------------------
    def test_get_me_with_valid_jwt(self):
        """Proves GET /api/auth/me returns authenticated user details when valid Bearer JWT is supplied."""
        email = f"auth_me_{int(time.time() * 1000)}@example.com"
        reg = self.client.post("/api/auth/register", json={
            "name": "Auth Me Candidate",
            "email": email,
            "password": "Password123!Secure"
        })
        token = reg.json()["token"]

        resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["user"]["email"], email)
        self.assertEqual(data["user"]["name"], "Auth Me Candidate")

    def test_get_me_missing_token_unauthorized(self):
        """Proves GET /api/auth/me without Authorization header returns HTTP 401."""
        resp = self.client.get("/api/auth/me")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("credentials were not provided", resp.json()["detail"])

    def test_get_me_invalid_token_format(self):
        """Proves malformed Authorization header returns HTTP 401."""
        resp = self.client.get("/api/auth/me", headers={"Authorization": "TokenNotBearer 12345"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid authorization header format", resp.json()["detail"])

    def test_get_me_rejects_plaintext_forgeable_token(self):
        """Proves legacy plaintext tok_<id> tokens are rejected with HTTP 401 (SEC-02)."""
        resp = self.client.get("/api/auth/me", headers={"Authorization": "Bearer tok_usr_123456789"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Plaintext tokens are no longer supported", resp.json()["detail"])

    def test_get_me_expired_token_rejected(self):
        """Proves expired JWT is rejected with HTTP 401 and descriptive reason."""
        expired_token = create_access_token(
            user_id="usr_expired_1",
            email="expired@example.com",
            name="Expired User",
            expires_delta=datetime.timedelta(seconds=-60)  # Expired 60s ago
        )

        resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Token has expired", resp.json()["detail"])

    def test_get_me_tampered_signature_rejected(self):
        """Proves cryptographically modified token signature is rejected with HTTP 401."""
        valid_token = create_access_token(
            user_id="usr_tamper_1",
            email="tamper@example.com",
            name="Tamper User"
        )
        # Invert last characters of signature
        parts = valid_token.split(".")
        tampered_sig = parts[2][:-4] + ("XXXX" if not parts[2].endswith("XXXX") else "YYYY")
        tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"

        resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("signature", resp.json()["detail"].lower())

    def test_update_avatar_requires_valid_token(self):
        """Proves PUT /api/auth/avatar requires authentication and updates caller's avatar."""
        email = f"avatar_user_{int(time.time() * 1000)}@example.com"
        reg = self.client.post("/api/auth/register", json={
            "name": "Avatar User",
            "email": email,
            "password": "Password123!Secure",
            "avatar": "avatar_1"
        })
        token = reg.json()["token"]

        # 1. Unauthenticated request rejected
        resp_unauth = self.client.put("/api/auth/avatar", json={"avatar": "avatar_5"})
        self.assertEqual(resp_unauth.status_code, 401)

        # 2. Authenticated request succeeds
        resp_auth = self.client.put(
            "/api/auth/avatar",
            json={"avatar": "avatar_5"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(resp_auth.status_code, 200)
        self.assertEqual(resp_auth.json()["avatar"], "avatar_5")

    # ----------------------------------------------------------------------
    # 4. Google Authentication Security (SEC-03)
    # ----------------------------------------------------------------------
    def test_google_auth_rejects_raw_email_without_identity_token(self):
        """Proves attempting Google login with raw email and no ID token is rejected with HTTP 400."""
        resp = self.client.post("/api/auth/google", json={
            "email": "victim_account@gmail.com",
            "name": "Attacker"
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Google identity token", resp.json()["detail"])
        self.assertIn("Raw email sign-in is disabled", resp.json()["detail"])

    def test_google_auth_valid_verified_token(self):
        """Proves valid cryptographically verified Google ID token creates/logs in user with JWT."""
        def mock_verifier(token_str):
            if token_str == "valid_google_signed_jwt_token_123":
                return {
                    "email": "google_verified_candidate@gmail.com",
                    "name": "Verified Google Candidate",
                    "sub": "google_sub_987654321"
                }
            raise Exception("Invalid Google signature")

        set_google_token_verifier_for_testing(mock_verifier)

        resp = self.client.post("/api/auth/google", json={
            "credential": "valid_google_signed_jwt_token_123",
            "avatar": "avatar_4"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["user"]["email"], "google_verified_candidate@gmail.com")
        self.assertEqual(data["user"]["authProvider"], "google")

        # Verify returned token is a signed JWT
        jwt_token = data["token"]
        payload = decode_access_token(jwt_token)
        self.assertEqual(payload["email"], "google_verified_candidate@gmail.com")

    def test_google_auth_invalid_token_rejected(self):
        """Proves invalid or expired Google ID token returns HTTP 401."""
        def mock_failing_verifier(token_str):
            raise Exception("Token expired or audience mismatch")

        set_google_token_verifier_for_testing(mock_failing_verifier)

        resp = self.client.post("/api/auth/google", json={
            "credential": "expired_or_fake_google_token_456"
        })
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid or expired Google identity token", resp.json()["detail"])

    # ----------------------------------------------------------------------
    # 5. 100% Application-Wide Authorization Enforcement
    # ----------------------------------------------------------------------
    def test_unauthenticated_jobs_endpoint_blocked(self):
        """Proves /api/jobs cannot be accessed without valid login token."""
        resp = self.client.get("/api/jobs")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("credentials were not provided", resp.json()["detail"])

    def test_unauthenticated_profile_endpoint_blocked(self):
        """Proves /api/profile cannot be accessed without valid login token."""
        resp = self.client.get("/api/profile")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("credentials were not provided", resp.json()["detail"])

    def test_unauthenticated_discovery_endpoint_blocked(self):
        """Proves /api/discovery/stats cannot be accessed without valid login token."""
        resp = self.client.get("/api/discovery/stats")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("credentials were not provided", resp.json()["detail"])

    def test_authenticated_jobs_endpoint_succeeds(self):
        """Proves /api/jobs succeeds when called with valid JWT authorization header."""
        email = f"auth_jobs_{int(time.time() * 1000)}@example.com"
        reg = self.client.post("/api/auth/register", json={
            "name": "Auth Jobs User",
            "email": email,
            "password": "Password123!Secure"
        })
        token = reg.json()["token"]

        resp = self.client.get("/api/jobs", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("jobs", data)
        self.assertIn("total", data)

if __name__ == "__main__":
    unittest.main()

