# Authentication & Authorization Testing Plan & OWASP ASVS Compliance

Application scope: Register, Login, Continue with Google.  
Explicitly in scope: Logout, Session Management, Token Refresh, Forgot Password, Role & Horizontal Access Control.  
Reference standards: OWASP ASVS (Authentication, Session Management, Access Control), OWASP Forgot Password Cheat Sheet.

---

## 1. Test Environment & Test Data Requirements

| Requirement | Description | Status in Skill2Role |
|-------------|-------------|-----------------------|
| Test users | Minimum three accounts: User A (`usr_user_a`), User B (`usr_user_b`), Admin (`usr_admin`). | Fully seeded in test database |
| Proxy tool | Burp Suite Community/Pro or OWASP ZAP, configured to intercept and modify requests. | Supported |
| Token inspection | Ability to decode JWTs and inspect cookie / Bearer attributes. | HS256 JWTs with JTI, IAT, EXP, SUB, ROLE |
| Email / Test inbox | Ability to receive password reset tokens. | Test mode query & response parameter support |
| Database access | SQLite WAL read/write access to inspect session records and hashes. | Ephemeral test database with auto-cleanup |

---

## 2. Authentication Testing (AuthN)

### 2.1 Registration

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| REG-01 | Successful registration | Submit valid email + strong password | Account created; JWT + refresh token issued | `test_reg_01_successful_registration` |
| REG-02 | Duplicate email registration | Register with an already-registered email | Rejected with 409; enumeration resistant message | `test_reg_02_duplicate_email_registration` |
| REG-03 | Weak password rejection | Submit passwords: "password", "12345678", "qwerty", "short" | Rejected with policy message 400 | `test_reg_03_weak_password_rejection` |
| REG-04 | SQL injection in registration | Submit `' OR 1=1 --` as email | Input sanitized or rejected; no database syntax error | `test_reg_04_sql_injection_in_registration` |
| REG-05 | XSS in registration fields | Submit `<script>alert(1)</script>` as name | Input sanitized; HTML tags stripped | `test_reg_05_xss_in_registration_fields` |
| REG-06 | Rate limiting on registration | Submit rapid registration attempts from same IP | Throttled with 429 Too Many Requests | `test_reg_06_rate_limiting_on_registration` |

### 2.2 Login

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| LOG-01 | Successful login | Valid credentials | Session created; JWT + refresh token returned | `test_log_01_successful_login` |
| LOG-02 | Invalid password | Valid email + wrong password | Generic 401 "Invalid email or password" | `test_log_02_invalid_password_returns_generic_error` |
| LOG-03 | Non-existent account login | Random email + any password | Same 401 message and constant-time dummy verify | `test_log_03_non_existent_account_login_timing_resistance` |
| LOG-04 | Account lockout / rate limiting | 5 consecutive failed attempts | Account temporarily locked (HTTP 423) | `test_log_04_account_lockout_after_consecutive_failures` |
| LOG-05 | SQL injection in login | `admin' OR '1'='1` as email | Rejected; no auth bypass | `test_log_05_sql_injection_in_login` |
| LOG-06 | Session fixation | Compare token across subsequent logins | Unique JTI and fresh token on every authentication | `test_log_06_session_fixation_protection` |
| LOG-07 | Plaintext token rejection | Submit forged `tok_*` token | 401 Unauthorized | `test_log_07_unsupported_plaintext_token_rejected` |

### 2.3 Continue with Google (OAuth 2.0 / OIDC)

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| OAUTH-01 | Successful Google login | Authenticate with valid Google identity token | User logged in; JWT + refresh token issued | `test_oauth_01_successful_google_login` |
| OAUTH-02 | Tampered token validation | Modify signature of Google credential | Rejected with 401 | `test_oauth_02_invalid_or_tampered_token_rejected` |
| OAUTH-03 | Missing identity token | Send empty Google auth body | 400 Bad Request | `test_oauth_03_missing_identity_token_rejected` |
| OAUTH-04 | Unverified email payload | Token without verified email claim | 401 Unauthorized | `test_oauth_04_unverified_email_token_rejected` |
| OAUTH-05 | Account linking collision | Register with email/password; then Google login with same email | Links cleanly to existing user record | `test_oauth_05_account_linking_collision_handled` |
| OAUTH-06 | Raw email bypass disabled | Send raw unverified email parameter | 400 Bad Request (raw email sign-in blocked) | `test_oauth_06_raw_email_bypass_disabled` |

### 2.4 Logout

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| OUT-01 | Logout terminates session | Log in; capture token; call logout; replay token | 401 Unauthorized (JTI added to revoked blocklist) | `test_out_01_logout_terminates_session_and_revokes_jwt` |
| OUT-02 | Refresh token invalidation | Log in; capture refresh token; logout; attempt refresh | 401 Unauthorized (Token revoked server-side) | `test_out_02_logout_revokes_refresh_token` |
| OUT-03 | Logout authentication | Access `/api/auth/logout` without token | 401 Unauthorized | `test_out_03_logout_accessible_from_authenticated_session` |

### 2.5 Session Management

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| SESS-01 | Cryptographic signature integrity | Tamper with JWT payload or signature | Rejected with 401 | `test_sess_01_token_structure_and_signature_integrity` |
| SESS-02 | Malformed token in header | Malformed Bearer header | Rejected with 401 | `test_sess_02_session_id_in_url_not_supported` |
| SESS-03 | Token expiration | Use token past its expiration timestamp | 401 Token has expired | `test_sess_03_expired_token_rejected` |
| SESS-04 | Session listing | Query `/api/auth/sessions` | Active token families and sessions listed | `test_sess_04_session_visibility_listing` |
| SESS-05 | Session termination | Call `/api/auth/sessions/terminate` | All other active sessions terminated | `test_sess_04_session_visibility_listing` |

### 2.6 Token Refresh

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| REF-01 | Normal rotation | Submit refresh token to `/api/auth/refresh` | New access token + rotated refresh token issued | `test_ref_01_normal_token_rotation` |
| REF-02 | Token reuse detection (THEFT) | Replay an already consumed refresh token | 401 Unauthorized; ENTIRE token family revoked! | `test_ref_02_refresh_token_reuse_theft_detection` |
| REF-03 | Refresh after invalidation | Submit unrecognized or revoked refresh token | 401 Unauthorized | `test_ref_03_refresh_with_invalid_token_fails` |

### 2.7 Forgot Password

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| FORGOT-01 | Request reset for existing account | Submit registered email | Generic message: "If an account exists, a reset link has been sent" | `test_forgot_01_and_02_enumeration_resistant_responses` |
| FORGOT-02 | Enumeration resistance | Submit non-existent email | Identical message and constant-time execution | `test_forgot_01_and_02_enumeration_resistant_responses` |
| FORGOT-03 | Reset token entropy | Inspect generated reset token | 256-bit CSPRNG entropy (`secrets.token_urlsafe(32)`) | `test_forgot_03_and_04_token_entropy_and_single_use` |
| FORGOT-04 | Token single-use | Consume reset token; attempt second consumption | Second attempt rejected with 400 (already used) | `test_forgot_03_and_04_token_entropy_and_single_use` |
| FORGOT-05 | Token expiry | Consume token past 1-hour window | Rejected with 400 (expired) | `test_forgot_03_and_04_token_entropy_and_single_use` |
| FORGOT-06 | Session invalidation after reset (P0) | Reset password on Browser B; use Browser A token | Browser A session immediately invalidated (401) | `test_forgot_06_session_invalidation_after_reset_p0_critical` |
| FORGOT-08 | Rate limiting on reset requests | Request reset 5+ times rapidly for same account | Throttled with 429 Too Many Requests | `test_forgot_08_rate_limiting_on_reset_requests` |

---

## 3. Authorization Testing (AuthZ)

### 3.1 Horizontal Privilege Escalation (IDOR)

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| IDOR-01 | User profile access | As User B, request `/api/profile` | Returns User B's profile only; User A data isolated | `test_idor_01_user_profile_access_isolation` |
| IDOR-02 | Resource modification | As User B, attempt `PUT /api/profile` | Modifies User B's record; User A's record unaffected | `test_idor_02_user_profile_modification_isolation` |
| IDOR-03 | Marked jobs isolation | User A marks job; User B queries `/api/jobs?marked=true` | User B does not see User A's bookmarks | `test_idor_03_bookmarks_access_isolation` |
| IDOR-04 | Harvested ID bypass | User B attempts deletion of User A's profile ID | 403 or 404 Forbidden / Not Found | `test_idor_04_unpredictable_id_bypass` |

### 3.2 Vertical Privilege Escalation (RBAC)

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| PRIV-01 | Admin endpoint access | As standard user, request `/admin/users` | 403 Forbidden; as Admin user -> 200 OK | `test_priv_01_admin_endpoint_access_control` |
| PRIV-02 | Role parameter tampering | Register with `role="admin"` | Injected role ignored; assigned `role="user"` | `test_priv_02_role_parameter_tampering_mass_assignment` |
| PRIV-03 | Client-side check bypass | Send `X-Is-Admin: true` header to admin endpoint | Server rejects with 403 Forbidden | `test_priv_03_client_side_check_bypass` |
| PRIV-04 | HTTP method bypass | Send `POST /admin/users` | 405 Method Not Allowed | `test_priv_04_http_method_bypass` |
| PRIV-05 | Header-based URL override | Send `X-Original-URL: /admin/users` to `/api/auth/me` | Route not overridden; no elevation | `test_priv_05_header_based_url_override_bypass` |

### 3.3 Server-Side Enforcement Verification

| Test ID | Scenario | Steps | Expected Result | Automated Test |
|---------|----------|-------|-----------------|----------------|
| SRV-01 | Direct API call without token | Call protected endpoints directly | All return 401 Unauthorized server-side | `test_srv_01_direct_api_call_without_token_rejected` |
| SRV-02 | Career document protection | Access `/api/profile/resume/content` without token | 401 Unauthorized | `test_srv_02_career_document_user_isolation` |

---

## 4. Test Execution Command

To run the complete automated test suite locally:

```bash
cd backend
python -m unittest test_owasp_asvs_suite.py
```
