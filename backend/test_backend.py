import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from database import clear_dummy_data, get_db

BASE_URL = "http://127.0.0.1:5000/api"

def request(method, path, data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            body = resp.read()
            if "application/json" in content_type:
                return resp.status, json.loads(body.decode("utf-8"))
            elif "text/csv" in content_type:
                return resp.status, body.decode("utf-8")
            else:
                try:
                    return resp.status, json.loads(body.decode("utf-8"))
                except Exception:
                    return resp.status, body.decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}

def multipart_request(path, filename, content_bytes, field_name="file"):
    boundary = "----TestBoundaryStage1SanityCheck"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
    ).encode("utf-8") + content_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")
    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}

def run_tests():
    print("======================================================================")
    print("SKILL2ROLE STAGE 1 ACCEPTANCE CRITERIA VERIFICATION SUITE")
    print("======================================================================")
    passed = 0
    total = 0

    def assert_eq(desc, actual, expected):
        nonlocal passed, total
        total += 1
        if actual == expected:
            print(f"  [PASS] {desc}")
            passed += 1
        else:
            print(f"  [FAIL] {desc} (got {actual}, expected {expected})")

    # ------------------------------------------------------------------
    # 1. Health & Server Telemetry
    # ------------------------------------------------------------------
    print("\n--- 1. Health & Core Infrastructure ---")
    status, data = request("GET", "/health")
    assert_eq("GET /api/health status", status, 200)
    assert_eq("Health status is ok", data.get("status"), "ok")
    assert_eq("Database totalJobsInDb is int", isinstance(data.get("totalJobsInDb"), int), True)

    # ------------------------------------------------------------------
    # 2. Registration & Authentication Gate
    # ------------------------------------------------------------------
    print("\n--- 2. Registration, Validation & Authentication ---")
    # Short password rejection (< 6 chars)
    short_pw = {"email": "invalid_pw@example.com", "password": "123", "name": "Short Pass User"}
    status, res_short = request("POST", "/auth/register", data=short_pw)
    assert_eq("Short password rejected (400)", status, 400)

    # Invalid email format rejection
    bad_email = {"email": "not-an-email", "password": "secure_password_123", "name": "Bad Email"}
    status, res_bad_email = request("POST", "/auth/register", data=bad_email)
    assert_eq("Invalid email rejected (400)", status, 400)

    # Valid registration
    test_user_email = f"stage1_test_{int(time.time())}@example.com"
    valid_reg = {"email": test_user_email, "password": "StrongPassword123!", "name": "Stage 1 Candidate"}
    status, reg_res = request("POST", "/auth/register", data=valid_reg)
    assert_eq("Valid registration status (200/201)", status in [200, 201], True)
    assert_eq("Registration returned auth token", "token" in reg_res, True)

    # Duplicate account rejection
    status, dup_res = request("POST", "/auth/register", data=valid_reg)
    assert_eq("Duplicate email rejected (400/409)", status in [400, 409], True)

    # Failed login with wrong password
    status, wrong_login = request("POST", "/auth/login", data={"email": test_user_email, "password": "WrongPassword"})
    assert_eq("Login with bad password rejected (401)", status, 401)

    # Successful login
    status, login_res = request("POST", "/auth/login", data={"email": test_user_email, "password": "StrongPassword123!"})
    assert_eq("Login with correct credentials succeeds (200)", status, 200)
    user_token = login_res.get("token")
    assert_eq("Valid JWT token received on login", bool(user_token), True)

    # ------------------------------------------------------------------
    # 3. Mandatory Profile Completion Gate
    # ------------------------------------------------------------------
    print("\n--- 3. Mandatory Profile Completion Gate ---")
    # Reset/clear active profile to incomplete state
    request("POST", "/settings/reset-profile")
    status, val_data = request("GET", "/profiles/active/validation")
    assert_eq("GET /profiles/active/validation status", status, 200)
    assert_eq("Incomplete profile isComplete is False", val_data.get("isComplete"), False)
    assert_eq("Missing fields listed", len(val_data.get("missingFields", [])) > 0, True)

    # Guard check: Starting explorer discovery while profile is incomplete must return HTTP 403 Forbidden!
    status, disc_start = request("POST", "/discovery/start")
    assert_eq("Explorer /discovery/start guarded when profile incomplete (403)", status, 403)
    assert_eq("403 error identifies mandatory profile requirement", "Mandatory profile" in str(disc_start), True)

    # Complete all 7 mandatory profile fields:
    # 1. fullName, 2. email, 3. primarySkill, 4. skillsList (>=2), 5. selectedRoles (>=1), 6. userLocation, 7. resume
    complete_profile_payload = {
        "general": {
            "fullName": "Kushal Kumar",
            "email": "kushal@example.com",
            "title": "Principal Java Architect",
            "primarySkill": "Java",
            "bio": "Expert in distributed Java microservices and enterprise architecture."
        },
        "contacts": {
            "email": "kushal@example.com",
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
            "fileName": "kushal_kumar_lead_architect.pdf",
            "fileSize": 142850,
            "parsedText": "Principal Java Software Engineer with 10+ years designing resilient backend systems in Java, Spring Boot, AWS, Kafka, and SQL."
        }
    }
    status, put_prof = request("PUT", "/profile", data=complete_profile_payload)
    assert_eq("PUT /api/profile with all mandatory fields status (200)", status, 200)

    # Now verify the gate validation reports 100% complete
    status, val_after = request("GET", "/profiles/active/validation")
    assert_eq("Profile validation status", status, 200)
    assert_eq("Profile is now isComplete: True", val_after.get("isComplete"), True)
    assert_eq("Missing fields count is 0", len(val_after.get("missingFields", [])), 0)

    # Guard check: Starting discovery now succeeds
    status, disc_start_ok = request("POST", "/discovery/start")
    assert_eq("Explorer /discovery/start succeeds once profile is complete (200)", status, 200)
    assert_eq("Discovery task is running or active", disc_start_ok.get("status") == "running" or disc_start_ok.get("running") is True, True)

    # Stop discovery
    status, disc_stop = request("POST", "/discovery/stop")
    assert_eq("Explorer /discovery/stop returns status (200)", status, 200)

    # ------------------------------------------------------------------
    # 4. Candidate Profiles & Persona Isolation
    # ------------------------------------------------------------------
    print("\n--- 4. Multi-Profile Management & Identity Isolation ---")
    status, profiles_resp = request("GET", "/profiles")
    assert_eq("GET /profiles status (200)", status, 200)
    profiles_list = profiles_resp.get("profiles", []) if isinstance(profiles_resp, dict) else profiles_resp
    assert_eq("Profiles returned as array", isinstance(profiles_list, list), True)

    # Create a secondary candidate persona
    secondary_profile = {
        "name": "Cloud DevOps Specialist",
        "primarySkill": "Kubernetes",
        "description": "Candidate profile focused strictly on Cloud Infrastructure and Site Reliability"
    }
    status, create_sec = request("POST", "/profiles", data=secondary_profile)
    assert_eq("POST /profiles creates secondary persona (201)", status, 201)
    sec_id = create_sec.get("profile", {}).get("id") or create_sec.get("id")
    assert_eq("Secondary profile has valid ID", bool(sec_id), True)

    # Activate secondary profile and verify isolation
    status, act_res = request("POST", f"/profiles/{sec_id}/activate")
    assert_eq("POST /profiles/{id}/activate status (200)", status, 200)
    assert_eq("Active profile changed to secondary", act_res.get("activeProfileId"), sec_id)

    # Check secondary profile is incomplete initially
    status, sec_val = request("GET", "/profiles/active/validation")
    assert_eq("Secondary profile validation isComplete is False", sec_val.get("isComplete"), False)

    # Switch back to primary profile
    status, switch_back = request("POST", "/profiles/default/activate")
    assert_eq("Switch back to default profile (200)", status, 200)
    status, def_val = request("GET", "/profiles/active/validation")
    assert_eq("Default profile remains complete", def_val.get("isComplete"), True)

    # ------------------------------------------------------------------
    # 5. AI-Generated Role and Search Keywords (Primary Skill Anchored)
    # ------------------------------------------------------------------
    print("\n--- 5. Keyword Generation & Primary Skill Anchoring ---")
    kw_request = {
        "primarySkill": "Java",
        "secondarySkills": ["AWS", "SQL", "Kafka"],
        "targetRoles": ["Senior Java Engineer", "Backend Developer"],
        "experience": "Senior"
    }
    status, kw_res = request("POST", "/profile/keywords/generate", data=kw_request)
    assert_eq("POST /profile/keywords/generate status (200)", status, 200)
    keywords = kw_res.get("keywords", [])
    assert_eq("Generated keywords is non-empty list", len(keywords) > 0, True)

    # CRITICAL REQUIREMENT: Primary skill (Java) must be anchored; secondary skills (AWS, SQL) must not replace primary skill!
    primary_anchored_count = 0
    for kw in keywords:
        search_query = kw.get("searchQuery", "").lower()
        role_title = kw.get("roleTitle", "").lower()
        primary_k = kw.get("primarySkill", "").lower()
        if "java" in search_query or "java" in role_title or primary_k == "java":
            primary_anchored_count += 1

    assert_eq("All generated keywords anchor on primary skill (Java)", primary_anchored_count, len(keywords))

    # Save keywords
    status, save_kw = request("PUT", "/profile/keywords", data={"keywords": keywords})
    assert_eq("PUT /profile/keywords status (200)", status, 200)
    assert_eq("Saved keywords count matches", save_kw.get("count"), len(keywords))

    # ------------------------------------------------------------------
    # 6. Truthful Platform Status (LinkedIn / Indeed / Direct ATS)
    # ------------------------------------------------------------------
    print("\n--- 6. Truthful Platform Integration Reporting ---")
    status, conn_res = request("GET", "/discovery/connectors")
    assert_eq("GET /discovery/connectors status (200)", status, 200)
    connectors = {c.get("id"): c for c in conn_res.get("connectors", [])}
    
    assert_eq("LinkedIn connector present", "linkedin" in connectors, True)
    assert_eq("LinkedIn status truthfully reports auth requirement", connectors["linkedin"]["status"], "auth_required")

    assert_eq("Indeed connector present", "indeed" in connectors, True)
    assert_eq("Indeed status truthfully reports auth requirement", connectors["indeed"]["status"], "auth_required")

    assert_eq("Direct ATS connector present", "ats_direct" in connectors, True)
    assert_eq("Direct ATS status is active", connectors["ats_direct"]["status"], "active")

    # ------------------------------------------------------------------
    # 7. Daily Explorer Data & 5-Day Historical Archive
    # ------------------------------------------------------------------
    print("\n--- 7. 5-Day History Scope (Today + Previous 4 Days) ---")
    status, hist_resp = request("GET", "/jobs/history-summary")
    assert_eq("GET /jobs/history-summary status (200)", status, 200)
    history = hist_resp.get("history", []) if isinstance(hist_resp, dict) else hist_resp
    assert_eq("History returns exactly 5 days (Today + 4 past days)", len(history), 5)
    assert_eq("First history entry is Today (offset 0)", history[0].get("dayOffset"), 0)
    assert_eq("Fifth history entry is 4 days ago (offset 4)", history[4].get("dayOffset"), 4)

    # ------------------------------------------------------------------
    # 8. Complete Excel / CSV Export (Beyond 10 Records & Formula Injection Protection)
    # ------------------------------------------------------------------
    print("\n--- 8. Complete Dataset Export & Formula Injection Sanitization ---")
    status, csv_data = request("GET", "/jobs/export")
    assert_eq("GET /jobs/export status (200)", status, 200)
    assert_eq("CSV contains UTF-8 BOM", csv_data.startswith("\ufeff"), True)
    assert_eq("CSV contains header row with S.No,Role Title,Company", "S.No,Role Title,Company" in csv_data or "S.No" in csv_data, True)

    # ------------------------------------------------------------------
    # 9. Excel / CSV Import (Validation & Safe Processing)
    # ------------------------------------------------------------------
    print("\n--- 9. Excel/CSV Import & Validation ---")
    # Valid CSV content with 2 jobs
    valid_csv_content = (
        "Role,Company,Location,Work Mode,Official Posting URL,Key Skills\r\n"
        "Lead Java Cloud Architect,Acme Corp,Bengaluru,Hybrid,https://example.com/acme/job/101,\"Java, Spring Boot, AWS\"\r\n"
        "Staff Backend Engineer,Global FinTech,Remote,Remote,https://example.com/fintech/job/202,\"Java, Kafka, Microservices\"\r\n"
    ).encode("utf-8")

    status, import_res = multipart_request("/jobs/import", "stage1_import_test.csv", valid_csv_content)
    assert_eq("POST /jobs/import status (200)", status, 200)
    assert_eq("Import processed 2 rows", import_res.get("processed"), 2)
    assert_eq("Import inserted 2 records", import_res.get("inserted"), 2)

    # Test Duplicate Import Handling (importing same file skips duplicate URLs)
    status, dup_import_res = multipart_request("/jobs/import", "stage1_import_test.csv", valid_csv_content)
    assert_eq("Duplicate import status (200)", status, 200)
    assert_eq("Duplicates correctly skipped", dup_import_res.get("skipped"), 2)
    assert_eq("0 new records inserted on duplicate", dup_import_res.get("inserted"), 0)

    # Test Malformed File Import (Invalid Headers)
    bad_csv = "RandomColA,RandomColB,RandomColC\r\nVal1,Val2,Val3\r\n".encode("utf-8")
    status, bad_import = multipart_request("/jobs/import", "bad_headers.csv", bad_csv)
    assert_eq("Import with invalid headers rejected (400)", status, 400)
    assert_eq("Error message mentions missing required headers", "Missing required headers" in str(bad_import) or "required" in str(bad_import).lower(), True)

    # Verify imported jobs are tagged with source 'Excel Import' and NOT misrepresented as live radar discoveries
    status, jobs_check = request("GET", "/jobs?origin=all&limit=10")
    assert_eq("GET /jobs status (200)", status, 200)
    imported_jobs = [j for j in jobs_check.get("jobs", []) if j.get("source") == "Excel Import"]
    assert_eq("Imported jobs properly tagged with source 'Excel Import'", len(imported_jobs) >= 2, True)

    # Clean up test records
    print("\n--- Post-Test Database Cleanup ---")
    clear_dummy_data()

    print("\n======================================================================")
    print(f"[SUMMARY] Stage 1 Acceptance Test Results: {passed}/{total} Passed ({100.0 * passed / (total or 1):.1f}%)")
    print("======================================================================")
    if passed == total:
        print("[SUCCESS] 100% OF STAGE 1 ACCEPTANCE TESTS PASSED!")
        return 0
    else:
        print(f"[WARNING] {total - passed} TESTS FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
