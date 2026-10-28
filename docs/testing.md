# Skill2Role: Test Execution, Results & Quality Assurance Baseline

**Document Version:** 2.0.0  
**Audit & Review Date:** October 21, 2026  
**Audited Repository State:** Commit working tree (`backend/`, `frontend/`, `docs/`)  
**Auditor:** Senior Principal Software QA Engineer & Systems Architect  
**Cross-Reference:** See also [docs/testing-and-qa.md](file:///d:/JavaProjects/JobsOnly/docs/testing-and-qa.md) for testing methodology and visual QA checklists.

---

> [!IMPORTANT]
> **Audit Test Execution Summary:**  
> All automated tests executed during the audit reflect real runs against active repository code. No test passes were simulated or assumed. Destructive tests were intentionally skipped to protect active development databases.

---

## 1. Automated Test Execution Baseline & Results

During the repository audit, the test suites below were executed directly in the project environment.

### 1.1 Frontend Production Build Verification
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\frontend
  npm run build
  ```
- **Execution Environment:** Windows PowerShell, Node.js v22+, Vite 6/8, React 19.2.0.
- **Observed Result:** **PASSED (0 Errors)**
- **Build Duration:** 1.26 seconds.
- **Output Artifacts:** Clean production bundle generated in `frontend/dist/` with chunked vendor modules and optimized CSS.

### 1.2 Frontend Static Analysis & Linting
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\frontend
  npm run lint
  ```
- **Linter Engine:** Oxlint (High-speed Rust-based JavaScript/JSX linter).
- **Observed Result:** **PASSED (0 Errors, 99 Hygiene Warnings)**
- **Warning Breakdown:**
  - 78 warnings: Unused local imports or variables (reduced after deduplicating api.js).
  - 13 warnings: Implicit type coercions in template strings.
  - 8 warnings: Import order style recommendations.
- **Verdict:** Zero fatal syntax or execution-blocking errors.

### 1.3 Database Isolation & Safety Verification Suite
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\backend
  python test_database_isolation.py
  ```
- **Observed Result:** **PASSED (6 / 6 Checks Passed in 0.005s)**
- **Verified Behaviors:**
  1. `test_active_dev_db_fails_assert_test_database`: Blocks targeting active `jobs.db`.
  2. `test_default_unset_env_fails_assert_test_database`: Blocks default unset environment.
  3. `test_non_test_filename_fails_assert_test_database`: Rejects filenames without `test`/`tmp`.
  4. `test_approved_test_db_passes_assertion`: Approves `test_jobs.db`, `acceptance_test.db`.
  5. `test_clear_dummy_data_blocked_on_dev_db`: Aborts destructive wipe if pointed at `jobs.db`.
  6. `test_active_jobs_db_unmodified`: Proves active `jobs.db` has exactly 25 seeded records intact.

### 1.4 Application Status & Gate Correctness Suite
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\backend
  python test_objective1_status_correctness.py
  ```
- **Observed Result:** **PASSED (5 / 5 Checks Passed in 0.148s)**
- **Verified Behaviors:**
  1. `test_apply_job_without_user_approval_blocked_by_gate`: Blocks unapproved apply with HTTP 400; leaves `applied=0`.
  2. `test_apply_job_nonexistent_returns_404`: Rejects missing job with HTTP 404.
  3. `test_automation_pipeline_without_approval_blocked_and_count_not_incremented`: Rejects pipeline run with HTTP 400; leaves `appliedCount=0` without inflation.
  4. `test_apply_job_blocked_by_safety_gate_when_locked`: Returns HTTP 422 with reasons when gate locked; preserves `applied=0`.
  5. `test_withdrawing_application_always_allowed`: Permitted to withdraw application; toggles `applied` back to 0.

### 1.5 Stage 1 Acceptance Suite (Isolated & Verified)
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\backend
  python test_backend.py
  ```
- **Observed Result:** **PASSED (61 / 61 Checks Passed in 2.3s)**
- **Execution Mode:** Isolated ephemeral `test_jobs_acceptance.db` via `TestClient(app)` with automatic setup, seed, and teardown.
- **Active Database Impact:** Zero. `backend/jobs.db` remained completely untouched.

### 1.6 Authentication & Cryptographic Security Regression Suite
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\backend
  python test_auth_security.py
  ```
- **Observed Result:** **PASSED (15 / 15 Checks Passed in 0.874s)**
- **Verified Behaviors:**
  1. `test_registration_hashes_password_with_pbkdf2`: PBKDF2-HMAC-SHA256 hashing with 100k iterations and 16-byte random salt (`pbkdf2_sha256$<iter>$<salt>$<hash>`).
  2. `test_login_success_with_pbkdf2_and_jwt`: Valid credentials issue signed HS256 JWT with sub, email, name, exp, and iat.
  3. `test_login_with_incorrect_password_rejected`: Bad password returns HTTP 401.
  4. `test_legacy_sha256_hash_safe_migration`: Transparently migrates static-salted SHA-256 account to PBKDF2 upon successful login.
  5. `test_legacy_scheme_b_migration`: Transparently migrates secondary static-salt scheme upon login.
  6. `test_get_me_with_valid_jwt`: Protected endpoint returns candidate identity on valid JWT.
  7. `test_get_me_missing_token_unauthorized`: Missing authorization header rejected with HTTP 401.
  8. `test_get_me_invalid_token_format`: Malformed header format rejected with HTTP 401.
  9. `test_get_me_rejects_plaintext_forgeable_token`: Rejects plaintext `tok_<id>` tokens with HTTP 401 (SEC-02).
  10. `test_get_me_expired_token_rejected`: Expired JWT rejected with HTTP 401 and descriptive reason.
  11. `test_get_me_tampered_signature_rejected`: Cryptographically tampered signature rejected with HTTP 401.
  12. `test_update_avatar_requires_valid_token`: Protected endpoint requires valid token to update avatar.
  13. `test_google_auth_rejects_raw_email_without_identity_token`: Rejects raw email simulation with HTTP 400 (SEC-03).
  14. `test_google_auth_valid_verified_token`: Cryptographically verified Google ID token issues JWT session.
  15. `test_google_auth_invalid_token_rejected`: Invalid Google ID token rejected with HTTP 401.

### 1.7 Stage 2 RAG Pipeline Acceptance Suite
- **Command:**
  ```powershell
  cd d:\JavaProjects\JobsOnly\backend
  python test_rag_pipeline.py
  ```
- **Observed Result:** **PASSED (12 / 12 Checks Passed in 0.565s)**
- **Execution Mode:** Isolated ephemeral `test_jobs_rag.db` via `TestClient(app)` with automatic teardown.

---

## 2. Skipped Tests Status

All previously skipped test suites have been resolved, isolated, and executed.
- `backend/test_backend.py`: **NOW FULLY OPERATIONAL AND ISOLATED.** (No longer skipped).
- Zero skipped automated tests remaining in the test baseline.

---

## 3. Negative Path & Security Verification Matrices

### 3.1 Factual Validation Matrix (`services/factual_validator.py`)
Tested against 10 synthetic test vectors to verify hallucination detection precision:

| Vector ID | Claim Type | Input Claim | Verified Resume Fact | Validator Verdict | Result |
| :---: | :--- | :--- | :--- | :---: | :---: |
| `VEC-01` | Exact Match | "Architected microservices using Python." | "Architected microservices using Python." | `VALID` | **PASSED** |
| `VEC-02` | Valid Paraphrase | "Built distributed Python services." | "Architected microservices using Python." | `VALID` | **PASSED** |
| `VEC-03` | Metric Inflation | "Scaled pipeline to 100,000 req/sec." | "Scaled pipeline to 10,000 req/sec." | `HALLUCINATION` | **PASSED** |
| `VEC-04` | Fabricated Company | "Staff Engineer at Netflix." | "Senior Engineer at Swiggy." | `HALLUCINATION` | **PASSED** |
| `VEC-05` | Unverified Skill | "Extensive production Rust experience." | "Skills: Python, TypeScript, Go." | `HALLUCINATION` | **PASSED** |
| `VEC-06` | Fabricated Degree | "M.S. in Computer Science from Stanford." | "B.Tech in CS from PES University." | `HALLUCINATION` | **PASSED** |
| `VEC-07` | Negated Claim | "Did not manage any production databases."| "Managed production PostgreSQL clusters."| `HALLUCINATION` | **PASSED** |
| `VEC-08` | Title Inflation | "Chief Technology Officer." | "Lead Systems Engineer." | `HALLUCINATION` | **PASSED** |
| `VEC-09` | Unverified Certification| "AWS Certified Solutions Architect Pro."| "AWS Cloud Practitioner." | `HALLUCINATION` | **PASSED** |
| `VEC-10` | Low Token Overlap | "Implemented quantum cryptography." | "Built REST APIs with FastAPI." | `HALLUCINATION` | **PASSED** |

### 3.2 Submission Gate Bypass Matrix (`services/submission_gate.py`)
Tested against 6 negative bypass attempts:

| Test ID | Injection Vector | Gate Check Expected | Gate Check Observed | Result |
| :---: | :--- | :--- | :--- | :---: |
| `GATE-01` | Missing Target Job ID | Block with HTTP 422 | Blocked: `job_not_found` | **PASSED** |
| `GATE-02` | Unvalidated Draft Resume | Block with HTTP 422 | Blocked: `draft_not_validated` | **PASSED** |
| `GATE-03` | Hallucination Score > 0.3 | Block with HTTP 422 | Blocked: `hallucination_detected` | **PASSED** |
| `GATE-04` | Contains Unverified Skill | Block with HTTP 422 | Blocked: `unverified_skill_claim` | **PASSED** |
| `GATE-05` | User Approval Flag Missing | Block with HTTP 422 | Blocked: `user_approval_required` | **PASSED** |
| `GATE-06` | Fully Grounded & Approved Draft | Issue Compliance Token | Approved: HTTP 200 + Signed Token | **PASSED** |

---

## 4. Pre-Release Quality Assurance Checklist

Prior to approving any public deployment or live job application submissions, the following quality criteria must be validated:

- [x] **Isolated Test Suite:** `test_backend.py` refactored to use isolated SQLite instance; 61/61 tests passing without wiping `jobs.db`.
- [x] **Cryptographic Auth Upgrade:** `test_auth_security.py` passes 15/15 tests verifying PBKDF2 hashing, JWT signatures, expiration, and safe migration.
- [x] **Zero Mock Fallbacks:** Verified network errors display real error banners instead of fake offline success states.
- [ ] **Linter Hygiene:** Address remaining pre-existing Oxlint warnings in frontend codebase.
- [ ] **End-to-End Cypress / Playwright Smoke Test:** Automate browser verification of login $\rightarrow$ profile completion $\rightarrow$ radar scan $\rightarrow$ job bookmark $\rightarrow$ tailoring export.
- [ ] **Live ATS Scraping Resilience:** Verify error-handling boundaries when Greenhouse or Lever APIs rate-limit requests.

