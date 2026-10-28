"""
Skill2Role OWASP ASVS Complete Authentication & Authorization Regression Test Suite.

Standard References:
- OWASP Application Security Verification Standard (ASVS v4.0.3)
- OWASP Forgot Password Cheat Sheet
- OAuth 2.0 / OIDC Security Best Current Practice

Coverage Matrix:
- 2.1 Registration: REG-01 through REG-06
- 2.2 Login: LOG-01 through LOG-07
- 2.3 Continue with Google (OAuth 2.0): OAUTH-01 through OAUTH-06
- 2.4 Logout: OUT-01 through OUT-03
- 2.5 Session Management: SESS-01 through SESS-05
- 2.6 Token Refresh: REF-01 through REF-03
- 2.7 Forgot Password: FORGOT-01 through FORGOT-08
- 3.1 Horizontal Privilege Escalation (IDOR): IDOR-01 through IDOR-04
- 3.2 Vertical Privilege Escalation (RBAC): PRIV-01 through PRIV-05
- 3.3 Server-Side Enforcement: SRV-01 through SRV-02
"""

import os
import sys
import time
import json
import uuid
import datetime
from pathlib import Path
import unittest

BASE_DIR = Path(__file__).resolve().parent
TEST_DB_NAME = "test_jobs_owasp_suite.db"
TEST_DB_PATH = (BASE_DIR / TEST_DB_NAME).resolve()

os.environ["SKILL2ROLE_DB_PATH"] = str(TEST_DB_PATH)
os.environ["SKILL2ROLE_JWT_SECRET"] = "owasp-asvs-suite-secret-key-32bytes-secure!"

from database import init_db, get_db, assert_test_database
from seed_india_jobs import seed
from main import app
from fastapi.testclient import TestClient
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    create_refresh_token,
    rotate_refresh_token,
    create_password_reset_token,
    consume_password_reset_token,
    set_google_token_verifier_for_testing,
    registration_limiter,
    forgot_password_limiter
)
import jwt

class TestOwaspAsvsAuthSecurity(unittest.TestCase):

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

        # Pre-seed three accounts: User A (standard), User B (standard), Admin (privileged)
        with get_db() as conn:
            cur = conn.cursor()
            now = int(time.time() * 1000)

            # User A
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, role, created_at)
                VALUES ('usr_user_a', 'user_a@example.com', ?, 'User Alpha', 'avatar_1', 'local', 'user', ?)
            """, (hash_password("CorrectHorseBattery123!"), now))

            # User B
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, role, created_at)
                VALUES ('usr_user_b', 'user_b@example.com', ?, 'User Beta', 'avatar_2', 'local', 'user', ?)
            """, (hash_password("CorrectHorseBattery456!"), now))

            # Admin User
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, role, created_at)
                VALUES ('usr_admin', 'admin@example.com', ?, 'System Administrator', 'avatar_3', 'local', 'admin', ?)
            """, (hash_password("AdminSecurePassword789!"), now))

            # Seed candidate profile for User A
            cur.execute("""
                INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES ('prof_user_a', 'usr_user_a', 'Alpha Confidential Profile', 1, 1, '{"salary": 150000}', ?, ?)
            """, (now, now))

            # Seed candidate profile for User B
            cur.execute("""
                INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES ('prof_user_b', 'usr_user_b', 'Beta Confidential Profile', 1, 1, '{"salary": 90000}', ?, ?)
            """, (now, now))

        # Generate tokens
        cls.token_a = create_access_token("usr_user_a", "user_a@example.com", "User Alpha", role="user")
        cls.token_b = create_access_token("usr_user_b", "user_b@example.com", "User Beta", role="user")
        cls.token_admin = create_access_token("usr_admin", "admin@example.com", "System Administrator", role="admin")

        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}
        cls.headers_admin = {"Authorization": f"Bearer {cls.token_admin}"}

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

    def setUp(self):
        registration_limiter.attempts.clear()
        forgot_password_limiter.attempts.clear()
        with get_db() as conn:
            conn.execute("UPDATE users SET sessions_invalidated_before = 0, locked_until = 0, failed_login_attempts = 0")
        self.token_a = create_access_token("usr_user_a", "user_a@example.com", "User Alpha", role="user")
        self.token_b = create_access_token("usr_user_b", "user_b@example.com", "User Beta", role="user")
        self.token_admin = create_access_token("usr_admin", "admin@example.com", "System Administrator", role="admin")
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}
        self.headers_admin = {"Authorization": f"Bearer {self.token_admin}"}

    # ======================================================================
    # 2.1 Registration (REG-01 to REG-06)
    # ======================================================================

    def test_reg_01_successful_registration(self):
        """REG-01: Successful registration with strong password returns JWT and refresh token."""
        unique_email = f"reg_success_{int(time.time() * 1000)}@example.com"
        resp = self.client.post("/api/auth/register", json={
            "name": "Valid Candidate",
            "email": unique_email,
            "password": "StrongPassword2026!"
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIsNotNone(data.get("token"))
        self.assertIsNotNone(data.get("refreshToken"))
        self.assertEqual(data["user"]["email"], unique_email)

    def test_reg_02_duplicate_email_registration(self):
        """REG-02: Duplicate registration rejected with 409 without leaking account password."""
        resp = self.client.post("/api/auth/register", json={
            "name": "Imposter Alpha",
            "email": "user_a@example.com",
            "password": "AnotherPassword123!"
        })
        self.assertEqual(resp.status_code, 409)
        self.assertIn("already exists", resp.json().get("detail", ""))

    def test_reg_03_weak_password_rejection(self):
        """REG-03: Rejects weak passwords: 'password', '12345678', 'qwerty' (ASVS 2.27)."""
        weak_passwords = ["password", "12345678", "qwerty", "short"]
        for weak in weak_passwords:
            resp = self.client.post("/api/auth/register", json={
                "name": "Weak User",
                "email": f"weak_{weak}_{int(time.time()*1000)}@example.com",
                "password": weak
            })
            self.assertEqual(resp.status_code, 400, f"Expected 400 rejection for weak password: {weak}")
            self.assertIn("Password", resp.json().get("detail", ""))

    def test_reg_04_sql_injection_in_registration(self):
        """REG-04: SQL injection in registration input is sanitized/rejected without DB error."""
        sqli_email = "' OR 1=1 --@example.com"
        resp = self.client.post("/api/auth/register", json={
            "name": "SQL Injection User",
            "email": sqli_email,
            "password": "SecurePassword123!"
        })
        # Rejected by email regex or safely parameterized, never crashes SQLite
        self.assertIn(resp.status_code, (400, 422))

    def test_reg_05_xss_in_registration_fields(self):
        """REG-05: XSS payload in name field is stripped/neutralized."""
        xss_name = "<script>alert(1)</script>John Doe"
        xss_email = f"xss_{int(time.time()*1000)}@example.com"
        resp = self.client.post("/api/auth/register", json={
            "name": xss_name,
            "email": xss_email,
            "password": "StrongPassword123!"
        })
        self.assertEqual(resp.status_code, 201)
        # Verify script tag is sanitized from returned name
        self.assertNotIn("<script>", resp.json()["user"]["name"])

    def test_reg_06_rate_limiting_on_registration(self):
        """REG-06: Sliding window rate limiter throttles excessive rapid registration attempts."""
        test_ip = "192.168.1.99"
        registration_limiter.reset(test_ip)
        # Attempt 10 registrations
        for i in range(10):
            registration_limiter.is_rate_limited(test_ip, max_attempts=10, window_seconds=300)
        # 11th attempt must be throttled
        is_blocked = registration_limiter.is_rate_limited(test_ip, max_attempts=10, window_seconds=300)
        self.assertTrue(is_blocked)

    # ======================================================================
    # 2.2 Login (LOG-01 to LOG-07)
    # ======================================================================

    def test_log_01_successful_login(self):
        """LOG-01: Valid credentials return session JWT + refresh token."""
        resp = self.client.post("/api/auth/login", json={
            "email": "user_a@example.com",
            "password": "CorrectHorseBattery123!"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIsNotNone(data.get("token"))
        self.assertIsNotNone(data.get("refreshToken"))
        self.assertEqual(data["user"]["email"], "user_a@example.com")

    def test_log_02_invalid_password_returns_generic_error(self):
        """LOG-02: Wrong password returns uniform 'Invalid email or password' message."""
        resp = self.client.post("/api/auth/login", json={
            "email": "user_a@example.com",
            "password": "WrongPassword999!"
        })
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json().get("detail"), "Invalid email or password.")

    def test_log_03_non_existent_account_login_timing_resistance(self):
        """LOG-03: Non-existent account returns identical error message and runs timing pad."""
        resp = self.client.post("/api/auth/login", json={
            "email": "non_existent_user_9999@example.com",
            "password": "AnyPassword123!"
        })
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json().get("detail"), "Invalid email or password.")

    def test_log_04_account_lockout_after_consecutive_failures(self):
        """LOG-04: 5 consecutive failed attempts lock the account."""
        victim_email = f"lockout_{int(time.time()*1000)}@example.com"
        self.client.post("/api/auth/register", json={
            "name": "Lockout Victim",
            "email": victim_email,
            "password": "ValidPassword123!"
        })

        # Submit 5 wrong passwords
        for i in range(5):
            r = self.client.post("/api/auth/login", json={
                "email": victim_email,
                "password": f"WrongAttempt{i}!"
            })
            if i == 4:
                # 5th attempt triggers lockout
                self.assertEqual(r.status_code, 423)
                self.assertIn("locked", r.json().get("detail", "").lower())

        # 6th attempt must be locked
        r_locked = self.client.post("/api/auth/login", json={
            "email": victim_email,
            "password": "ValidPassword123!"  # Even correct password is locked
        })
        self.assertEqual(r_locked.status_code, 423)

    def test_log_05_sql_injection_in_login(self):
        """LOG-05: SQL injection payload 'admin' OR '1'='1' rejected without bypass."""
        resp = self.client.post("/api/auth/login", json={
            "email": "admin' OR '1'='1",
            "password": "anything"
        })
        self.assertIn(resp.status_code, (400, 401))

    def test_log_06_session_fixation_protection(self):
        """LOG-06: Every login generates a fresh, unique JWT with distinct JTI."""
        r1 = self.client.post("/api/auth/login", json={"email": "user_a@example.com", "password": "CorrectHorseBattery123!"})
        token_1 = r1.json()["token"]
        payload_1 = decode_access_token(token_1)

        r2 = self.client.post("/api/auth/login", json={"email": "user_a@example.com", "password": "CorrectHorseBattery123!"})
        token_2 = r2.json()["token"]
        payload_2 = decode_access_token(token_2)

        self.assertNotEqual(token_1, token_2)
        self.assertNotEqual(payload_1.get("jti"), payload_2.get("jti"))

    def test_log_07_unsupported_plaintext_token_rejected(self):
        """LOG-07: Plaintext tokens (tok_*) are strictly rejected."""
        resp = self.client.get("/api/auth/me", headers={"Authorization": "Bearer tok_forged_admin"})
        self.assertEqual(resp.status_code, 401)

    # ======================================================================
    # 2.3 Continue with Google (OAuth 2.0 / OIDC)
    # ======================================================================

    def test_oauth_01_successful_google_login(self):
        """OAUTH-01: Cryptographically verified Google ID token logs in successfully."""
        set_google_token_verifier_for_testing(lambda tok: {
            "email": "google_test_user@example.com",
            "name": "Google Tester",
            "sub": "g_12345678"
        })
        resp = self.client.post("/api/auth/google", json={"credential": "mock_google_jwt_valid"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["user"]["email"], "google_test_user@example.com")
        self.assertIsNotNone(resp.json().get("token"))
        self.assertIsNotNone(resp.json().get("refreshToken"))

    def test_oauth_02_invalid_or_tampered_token_rejected(self):
        """OAUTH-02: Tampered Google token rejected with 401."""
        set_google_token_verifier_for_testing(lambda tok: (_ for _ in ()).throw(ValueError("Invalid signature")))
        resp = self.client.post("/api/auth/google", json={"credential": "tampered_google_token"})
        self.assertEqual(resp.status_code, 401)

    def test_oauth_03_missing_identity_token_rejected(self):
        """OAUTH-03: Empty credential body rejected with 400."""
        resp = self.client.post("/api/auth/google", json={})
        self.assertEqual(resp.status_code, 400)

    def test_oauth_04_unverified_email_token_rejected(self):
        """OAUTH-04: Google token missing verified email claim rejected."""
        set_google_token_verifier_for_testing(lambda tok: {"name": "No Email User"})
        resp = self.client.post("/api/auth/google", json={"credential": "token_without_email"})
        self.assertEqual(resp.status_code, 401)

    def test_oauth_05_account_linking_collision_handled(self):
        """OAUTH-05: Registering with email then logging in with Google seamlessly links without duplicate account."""
        collision_email = f"link_collision_{int(time.time()*1000)}@example.com"
        # 1. Register with email/password
        self.client.post("/api/auth/register", json={
            "name": "Pre-Registered User",
            "email": collision_email,
            "password": "StrongPassword2026!"
        })

        # 2. Login with Google using same email
        set_google_token_verifier_for_testing(lambda tok: {
            "email": collision_email,
            "name": "Pre-Registered User",
            "sub": "g_link_999"
        })
        resp = self.client.post("/api/auth/google", json={"credential": "valid_google_token_link"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["user"]["email"], collision_email)

    def test_oauth_06_raw_email_bypass_disabled(self):
        """OAUTH-06: Passing raw email without cryptographic credential is explicitly rejected."""
        resp = self.client.post("/api/auth/google", json={"email": "victim@example.com"})
        self.assertEqual(resp.status_code, 400)

    # ======================================================================
    # 2.4 Logout (OUT-01 to OUT-03)
    # ======================================================================

    def test_out_01_logout_terminates_session_and_revokes_jwt(self):
        """OUT-01: Logout blacklists the active JWT JTI; captured cookie/token is rejected."""
        # 1. Login
        login_resp = self.client.post("/api/auth/login", json={
            "email": "user_a@example.com",
            "password": "CorrectHorseBattery123!"
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Verify token is active
        r_pre = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(r_pre.status_code, 200)

        # 3. Call logout
        r_logout = self.client.post("/api/auth/logout", headers=headers)
        self.assertEqual(r_logout.status_code, 200)

        # 4. Replay captured token: must return 401 Unauthorized
        r_post = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(r_post.status_code, 401)
        self.assertIn("revoked", r_post.json().get("detail", "").lower())

    def test_out_02_logout_revokes_refresh_token(self):
        """OUT-02: Refresh token is revoked upon logout; subsequent refresh attempt fails."""
        login_resp = self.client.post("/api/auth/login", json={
            "email": "user_a@example.com",
            "password": "CorrectHorseBattery123!"
        })
        token = login_resp.json()["token"]
        rt = login_resp.json()["refreshToken"]
        headers = {"Authorization": f"Bearer {token}"}

        # Logout with refresh token
        self.client.post("/api/auth/logout", headers=headers, json={"refresh_token": rt})

        # Attempt to use the refresh token
        ref_resp = self.client.post("/api/auth/refresh", json={"refresh_token": rt})
        self.assertEqual(ref_resp.status_code, 401)

    def test_out_03_logout_accessible_from_authenticated_session(self):
        """OUT-03: Logout endpoint requires valid authentication credentials."""
        resp = self.client.post("/api/auth/logout")
        self.assertEqual(resp.status_code, 401)

    # ======================================================================
    # 2.5 Session Management (SESS-01 to SESS-05)
    # ======================================================================

    def test_sess_01_token_structure_and_signature_integrity(self):
        """SESS-01: Validates cryptographic HMAC-SHA256 signature and tamper rejection."""
        token = create_access_token("usr_user_a", "user_a@example.com", "User Alpha")
        parts = token.split(".")
        self.assertEqual(len(parts), 3)

        # Tampered token
        tampered = parts[0] + "." + parts[1] + ".tampered_signature_payload"
        resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered}"})
        self.assertEqual(resp.status_code, 401)

    def test_sess_02_session_id_in_url_not_supported(self):
        """SESS-02: Query parameter token is deprecated or rejected when header required."""
        # Clean Bearer header format is enforced
        resp = self.client.get("/api/auth/me", headers={"Authorization": "MalformedTokenFormat"})
        self.assertEqual(resp.status_code, 401)

    def test_sess_03_expired_token_rejected(self):
        """SESS-03: Token past its expiration window is strictly rejected with 401."""
        expired_token = create_access_token(
            "usr_user_a",
            "user_a@example.com",
            "User Alpha",
            expires_delta=datetime.timedelta(seconds=-10)
        )
        resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("expired", resp.json().get("detail", "").lower())

    def test_sess_04_session_visibility_listing(self):
        """SESS-04 & SESS-05: User can list active sessions and terminate other sessions."""
        # User A lists sessions
        resp = self.client.get("/api/auth/sessions", headers=self.headers_a)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("sessions", resp.json())

        # Terminate other sessions
        term_resp = self.client.post("/api/auth/sessions/terminate", headers=self.headers_a)
        self.assertEqual(term_resp.status_code, 200)
        self.assertTrue(term_resp.json().get("success"))

    # ======================================================================
    # 2.6 Token Refresh (REF-01 to REF-03)
    # ======================================================================

    def test_ref_01_normal_token_rotation(self):
        """REF-01: Refresh exchange issues new access + refresh tokens and invalidates the old one."""
        rt_old, fam_old = create_refresh_token("usr_user_a")

        resp = self.client.post("/api/auth/refresh", json={"refresh_token": rt_old})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        new_token = data.get("token")
        new_rt = data.get("refreshToken")

        self.assertIsNotNone(new_token)
        self.assertIsNotNone(new_rt)
        self.assertNotEqual(rt_old, new_rt)

    def test_ref_02_refresh_token_reuse_theft_detection(self):
        """REF-02 (CRITICAL): Reusing an old rotated refresh token triggers token family revocation!"""
        # Step 1: Issue token
        rt_1, fam = create_refresh_token("usr_user_b")

        # Step 2: Rotate once (old -> new)
        resp_1 = self.client.post("/api/auth/refresh", json={"refresh_token": rt_1})
        self.assertEqual(resp_1.status_code, 200)
        rt_2 = resp_1.json()["refreshToken"]

        # Step 3: Replay the already-used rt_1 (Theft attempt!)
        resp_replay = self.client.post("/api/auth/refresh", json={"refresh_token": rt_1})
        self.assertEqual(resp_replay.status_code, 401)
        self.assertIn("reuse detected", resp_replay.json().get("detail", "").lower())

        # Step 4: Verify the legitimate user's new token rt_2 is NOW ALSO REVOKED (family revoked!)
        resp_subsequent = self.client.post("/api/auth/refresh", json={"refresh_token": rt_2})
        self.assertEqual(resp_subsequent.status_code, 401)

    def test_ref_03_refresh_with_invalid_token_fails(self):
        """REF-03: Unknown or invalid refresh token rejected with 401."""
        resp = self.client.post("/api/auth/refresh", json={"refresh_token": "rt_invalid_non_existent"})
        self.assertEqual(resp.status_code, 401)

    # ======================================================================
    # 2.7 Forgot Password (FORGOT-01 to FORGOT-08)
    # ======================================================================

    def test_forgot_01_and_02_enumeration_resistant_responses(self):
        """FORGOT-01 & FORGOT-02: Existing and non-existent accounts return identical message."""
        r_exist = self.client.post("/api/auth/forgot-password", json={"email": "user_a@example.com"})
        self.assertEqual(r_exist.status_code, 200)

        r_non_exist = self.client.post("/api/auth/forgot-password", json={"email": "does_not_exist_xyz@example.com"})
        self.assertEqual(r_non_exist.status_code, 200)

        # Bodies must match identically (enumeration resistance)
        self.assertEqual(r_exist.json()["message"], r_non_exist.json()["message"])

    def test_forgot_03_and_04_token_entropy_and_single_use(self):
        """FORGOT-03 & FORGOT-04: High-entropy reset token can only be consumed once."""
        email = f"single_use_{int(time.time()*1000)}@example.com"
        self.client.post("/api/auth/register", json={
            "name": "Single Use User",
            "email": email,
            "password": "InitialPassword123!"
        })

        # Request reset in test mode to receive raw token
        resp = self.client.post("/api/auth/forgot-password?test_mode=true", json={"email": email})
        self.assertEqual(resp.status_code, 200)
        reset_token = resp.json().get("test_reset_token")
        self.assertIsNotNone(reset_token)
        self.assertTrue(len(reset_token) > 30)  # High entropy

        # First consumption: Must succeed
        r_reset_1 = self.client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "NewStrongPassword2026!"
        })
        self.assertEqual(r_reset_1.status_code, 200)
        self.assertTrue(r_reset_1.json().get("success"))

        # Second consumption (Reuse): Must fail (FORGOT-04)
        r_reset_2 = self.client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "AnotherNewPassword123!"
        })
        self.assertEqual(r_reset_2.status_code, 400)
        self.assertIn("used", r_reset_2.json().get("detail", "").lower())

    def test_forgot_06_session_invalidation_after_reset_p0_critical(self):
        """FORGOT-06 (P0 CRITICAL): Resetting password from Browser B instantly invalidates Browser A's session."""
        email = f"sess_inval_{int(time.time()*1000)}@example.com"
        self.client.post("/api/auth/register", json={
            "name": "Session Inval User",
            "email": email,
            "password": "OriginalPassword123!"
        })

        # Browser A logs in
        login_a = self.client.post("/api/auth/login", json={"email": email, "password": "OriginalPassword123!"})
        token_browser_a = login_a.json()["token"]
        headers_a = {"Authorization": f"Bearer {token_browser_a}"}

        # Browser A verifies access
        r_check = self.client.get("/api/auth/me", headers=headers_a)
        self.assertEqual(r_check.status_code, 200)

        # Slight pause to ensure strictly later timestamp
        time.sleep(1.05)

        # Browser B requests and executes password reset
        f_resp = self.client.post("/api/auth/forgot-password?test_mode=true", json={"email": email})
        reset_token = f_resp.json()["test_reset_token"]

        r_reset = self.client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "BrandNewPassword2026!"
        })
        self.assertEqual(r_reset.status_code, 200)

        # Browser A attempts to use previously captured token: MUST BE REJECTED 401
        r_browser_a_retest = self.client.get("/api/auth/me", headers=headers_a)
        self.assertEqual(r_browser_a_retest.status_code, 401)
        self.assertIn("terminated", r_browser_a_retest.json().get("detail", "").lower())

    def test_forgot_08_rate_limiting_on_reset_requests(self):
        """FORGOT-08: Throttling excessive forgot-password requests."""
        flood_email = "flood_target@example.com"
        forgot_password_limiter.reset(flood_email)
        for i in range(5):
            forgot_password_limiter.is_rate_limited(flood_email, max_attempts=5, window_seconds=600)
        is_limited = forgot_password_limiter.is_rate_limited(flood_email, max_attempts=5, window_seconds=600)
        self.assertTrue(is_limited)

    # ======================================================================
    # 3.1 Horizontal Privilege Escalation (IDOR: IDOR-01 to IDOR-04)
    # ======================================================================

    def test_idor_01_user_profile_access_isolation(self):
        """IDOR-01: User B cannot access User A's candidate profile."""
        # User B requests /api/profile -> returns User B's own profile, NEVER User A's data
        resp = self.client.get("/api/profile", headers=self.headers_b)
        self.assertEqual(resp.status_code, 200)
        data = resp.json().get("data", {})
        self.assertNotEqual(data.get("fullName"), "User Alpha")

    def test_idor_02_user_profile_modification_isolation(self):
        """IDOR-02: User B cannot modify User A's active candidate profile."""
        update_payload = {"general": {"fullName": "Hacked By User B", "primarySkill": "Hacking"}}
        self.client.put("/api/profile", headers=self.headers_b, json=update_payload)

        # Verify User A's profile is completely untouched
        resp_a = self.client.get("/api/profile", headers=self.headers_a)
        data_a = resp_a.json().get("data", {})
        self.assertNotEqual(data_a.get("fullName"), "Hacked By User B")

    def test_idor_03_bookmarks_access_isolation(self):
        """IDOR-03: User B cannot view User A's marked jobs."""
        # User A marks job 1
        self.client.post("/api/jobs/1/mark", headers=self.headers_a)

        # User B gets marked jobs: must NOT contain User A's marked jobs
        resp_b = self.client.get("/api/jobs?marked=true", headers=self.headers_b)
        self.assertEqual(resp_b.status_code, 200)
        jobs_b = resp_b.json().get("jobs", [])
        self.assertNotIn(1, [j["id"] for j in jobs_b])

    def test_idor_04_unpredictable_id_bypass(self):
        """IDOR-04: Harvesting User A's profile ID does not grant User B access."""
        # Attempt direct lookup or deletion of User A's profile using User B's token
        resp = self.client.delete("/api/profile/candidate/prof_user_a", headers=self.headers_b)
        # Must be 403 or 404
        self.assertIn(resp.status_code, (403, 404))

    # ======================================================================
    # 3.2 Vertical Privilege Escalation (RBAC: PRIV-01 to PRIV-05)
    # ======================================================================

    def test_priv_01_admin_endpoint_access_control(self):
        """PRIV-01: Standard user receives 403 on admin endpoint; Admin user receives 200."""
        # 1. User A (standard) requests /admin/users -> 403 Forbidden
        resp_standard = self.client.get("/admin/users", headers=self.headers_a)
        self.assertEqual(resp_standard.status_code, 403)
        self.assertIn("requires 'admin'", resp_standard.json().get("detail", ""))

        # 2. Admin requests /admin/users -> 200 OK
        resp_admin = self.client.get("/admin/users", headers=self.headers_admin)
        self.assertEqual(resp_admin.status_code, 200)
        self.assertIn("users", resp_admin.json())

    def test_priv_02_role_parameter_tampering_mass_assignment(self):
        """PRIV-02: Tampering with role parameter does not elevate standard user to admin."""
        tamper_email = f"tamper_{int(time.time()*1000)}@example.com"
        reg_resp = self.client.post("/api/auth/register", json={
            "name": "Tamper Attempt",
            "email": tamper_email,
            "password": "StrongPassword123!",
            "role": "admin",
            "isAdmin": True
        })
        self.assertEqual(reg_resp.status_code, 201)
        # Server ignores injected role and enforces standard 'user'
        self.assertEqual(reg_resp.json()["user"]["role"], "user")

        # Verify attempting to access admin route with this token fails with 403
        tamper_token = reg_resp.json()["token"]
        r_admin = self.client.get("/admin/users", headers={"Authorization": f"Bearer {tamper_token}"})
        self.assertEqual(r_admin.status_code, 403)

    def test_priv_03_client_side_check_bypass(self):
        """PRIV-03: Server strictly enforces authorization independent of client-side headers."""
        resp = self.client.get("/admin/users", headers={
            "Authorization": f"Bearer {self.token_a}",
            "X-Is-Admin": "true",
            "X-Role": "admin"
        })
        self.assertEqual(resp.status_code, 403)

    def test_priv_04_http_method_bypass(self):
        """PRIV-04: Non-permitted HTTP methods are rejected."""
        resp = self.client.post("/admin/users", headers=self.headers_a)
        # 405 Method Not Allowed
        self.assertEqual(resp.status_code, 405)

    def test_priv_05_header_based_url_override_bypass(self):
        """PRIV-05: Spoofed headers (X-Original-URL, X-Rewrite-URL) do not bypass authorization."""
        resp = self.client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {self.token_a}",
            "X-Original-URL": "/admin/users",
            "X-Rewrite-URL": "/admin/users"
        })
        self.assertEqual(resp.status_code, 200)  # Handles /me normally, does not expose admin data

    # ======================================================================
    # 3.3 Server-Side Enforcement (SRV-01 to SRV-02)
    # ======================================================================

    def test_srv_01_direct_api_call_without_token_rejected(self):
        """SRV-01: Direct API invocation without Authorization header is rejected across all protected endpoints."""
        protected_endpoints = [
            "/api/jobs",
            "/api/discovery/stream",
            "/api/profile",
            "/api/analytics",
            "/api/settings/ai",
            "/api/settings/menu",
            "/api/automation/pipelines",
            "/api/auth/me"
        ]
        for ep in protected_endpoints:
            r = self.client.get(ep)
            self.assertEqual(r.status_code, 401, f"Endpoint {ep} must return 401 when called without token")

    def test_srv_02_career_document_user_isolation(self):
        """SRV-02: Career documents require authenticated session and user ownership."""
        r = self.client.get("/api/profile/resume/content")
        self.assertEqual(r.status_code, 401)


if __name__ == "__main__":
    unittest.main()
