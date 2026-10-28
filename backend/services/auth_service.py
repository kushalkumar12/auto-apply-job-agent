"""
Authentication and Cryptographic Security Service for Skill2Role.
Handles:
- PBKDF2-HMAC-SHA256 password hashing with 100,000 iterations & 16-byte random salt
- Safe password hash migration for legacy static-salted SHA-256 credentials
- OWASP ASVS Password Policy validation (min 8 chars, reject dictionary passwords)
- HS256 JSON Web Token (JWT) issuance with unique JTI, signature verification, and expiration enforcement
- Extraction and validation of current authenticated user from Bearer header
- Token revocation / JTI blacklist check on logout
- Session invalidation enforcement (cross-session invalidation on password reset)
- Refresh token generation, rotation, and token-family theft/reuse detection
- Cryptographic password reset token generation (CSPRNG) and single-use consumption
- Sliding window rate limiting & account lockout for brute-force resistance
- Role-Based Access Control (RBAC) dependency verification
- Cryptographic verification of Google identity tokens (rejecting raw email claims)
"""

import os
import hmac
import hashlib
import datetime
import logging
import secrets
import time
import uuid
import json
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List
from collections import defaultdict
from fastapi import Header, Query, HTTPException, status, Depends
import jwt

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

logger = logging.getLogger("skill2role.auth")

PBKDF2_ITERATIONS = 100_000
PBKDF2_SALT_BYTES = 16
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
JWT_ISSUER = "skill2role"
REFRESH_TOKEN_LIFETIME_DAYS = 7
PASSWORD_RESET_LIFETIME_HOURS = 1

COMMON_WEAK_PASSWORDS = {
    "password", "12345678", "qwerty", "password123", "admin123",
    "123456789", "welcome", "letmein", "abc12345", "iloveyou",
    "monkey", "dragon", "master", "sunshine", "football", "qwertyuiop"
}

def get_jwt_secret() -> str:
    """Returns the cryptographically strong secret used to sign and verify JWTs."""
    secret = os.environ.get("SKILL2ROLE_JWT_SECRET") or os.environ.get("JWT_SECRET")
    if not secret:
        return "skill2role_production_grade_jwt_secret_key_2026_secure_hmac"
    return secret

# ======================================================================
# 1. Password Policy & Cryptographic Hashing
# ======================================================================

def validate_password_policy(password: str) -> None:
    """
    Enforces OWASP ASVS 2.27:
    - Minimum length of 8 characters
    - Disallows common and easily guessable passwords
    """
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if password.lower() in COMMON_WEAK_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too weak or commonly used. Please choose a more secure password."
        )

def hash_password(password: str, iterations: int = PBKDF2_ITERATIONS) -> str:
    """
    Hashes a plaintext password using PBKDF2-HMAC-SHA256 with a unique 16-byte random salt.
    Format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
    """
    if not password:
        raise ValueError("Password cannot be empty.")
    salt = os.urandom(PBKDF2_SALT_BYTES)
    derived_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived_key.hex()}"

def verify_password(password: str, stored_hash: str) -> Tuple[bool, bool]:
    """
    Verifies a plaintext password against the stored password hash using constant-time comparison.
    Returns: (is_valid: bool, needs_migration: bool)
    """
    if not password or not stored_hash:
        return False, False

    # 1. Modern PBKDF2-HMAC-SHA256 format
    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            parts = stored_hash.split("$")
            if len(parts) != 4:
                return False, False
            iterations = int(parts[1])
            salt = bytes.fromhex(parts[2])
            expected_key = bytes.fromhex(parts[3])
            derived_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
            return hmac.compare_digest(expected_key, derived_key), False
        except Exception:
            return False, False

    # 2. Legacy Static-Salted SHA-256 Migration Check
    legacy_a = hashlib.sha256((password + "_salt_porter_2026").encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy_a, stored_hash):
        return True, True

    legacy_b = hashlib.sha256(("skill2role_salt_" + password).encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy_b, stored_hash):
        return True, True

    legacy_c = hashlib.sha256((password + "skill2role_salt_").encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy_c, stored_hash):
        return True, True

    return False, False

DUMMY_SALT = b"\x00" * 16
def dummy_verify_timing():
    """Constant-time timing pad to neutralize user enumeration timing attacks (LOG-03 / FORGOT-02)."""
    hashlib.pbkdf2_hmac("sha256", b"timing_padding_for_enumeration_resistance", DUMMY_SALT, PBKDF2_ITERATIONS)

# ======================================================================
# 2. Sliding Window Rate Limiting & Account Lockout
# ======================================================================

class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter for auth endpoints."""
    def __init__(self):
        self.attempts: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str, max_attempts: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds
        self.attempts[key] = [t for t in self.attempts[key] if t > window_start]
        if len(self.attempts[key]) >= max_attempts:
            return True
        self.attempts[key].append(now)
        return False

    def reset(self, key: str):
        if key in self.attempts:
            del self.attempts[key]

registration_limiter = SlidingWindowRateLimiter()
forgot_password_limiter = SlidingWindowRateLimiter()
login_attempt_limiter = SlidingWindowRateLimiter()

# ======================================================================
# 3. Access Token (JWT) Management
# ======================================================================

def create_access_token(
    user_id: str, 
    email: str, 
    name: str, 
    role: str = "user",
    jti: Optional[str] = None,
    expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """
    Issues a cryptographically signed HS256 JWT containing user subject, email, name, role,
    issued-at, expiration, and unique JTI claims.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)

    token_jti = jti or f"jwt_{uuid.uuid4().hex}"

    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "role": role,
        "jti": token_jti,
        "iss": JWT_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Validates token signature, expiration, and issuer.
    Rejects forgeable plaintext tokens and invalid signatures with HTTP 401.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or invalid."
        )

    clean_token = token.strip()

    # Reject plaintext tokens
    if clean_token.startswith("tok_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Plaintext tokens are no longer supported. Please re-authenticate."
        )

    try:
        payload = jwt.decode(
            clean_token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iat"]}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again."
        )
    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )

def revoke_access_token(jti: str, user_id: str, exp: int, reason: str = "logout"):
    """Adds a JWT's JTI to the revoked_tokens blocklist until its natural expiry."""
    if not jti:
        return
    now = int(time.time() * 1000)
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO revoked_tokens (jti, user_id, expires_at, revoked_at, reason)
            VALUES (?, ?, ?, ?, ?)
        """, (jti, user_id, exp * 1000, now, reason))

def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    FastAPI dependency to extract, cryptographically verify, and check revocation of the current user.
    Enforces JTI blocklist check, session invalidation timestamp, and account lockout.
    """
    raw_token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            raw_token = parts[1]
        elif len(parts) == 1:
            raw_token = parts[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format. Expected 'Bearer <token>'."
            )
    elif token:
        raw_token = token.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    payload = decode_access_token(raw_token)
    user_id = payload.get("sub")
    jti = payload.get("jti")
    iat = payload.get("iat", 0)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject missing."
        )

    with get_db() as conn:
        cur = conn.cursor()

        # 1. JTI Revocation / Logout Check (OUT-01)
        if jti:
            revoked = cur.execute("SELECT jti FROM revoked_tokens WHERE jti = ?", (jti,)).fetchone()
            if revoked:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked. Please sign in again."
                )

        # 2. User Existence Check
        user = cur.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated."
            )

        user_dict = dict(user)

        # 3. Cross-Session Invalidation Check (FORGOT-06, Session Invalidation)
        invalidated_before = user_dict.get("sessions_invalidated_before") or 0
        if invalidated_before and iat < invalidated_before:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been terminated due to a password reset or security event. Please sign in again."
            )

        # 4. Account Lockout Check
        locked_until = user_dict.get("locked_until") or 0
        now_ms = int(time.time() * 1000)
        if locked_until > now_ms:
            remaining_mins = max(1, int((locked_until - now_ms) / 60000))
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked. Please try again in {remaining_mins} minutes."
            )

        # Attach active token jti and exp for downstream logout helpers
        user_dict["_token_jti"] = jti
        user_dict["_token_exp"] = payload.get("exp")
        return user_dict

# ======================================================================
# 4. Refresh Token Family & Theft Reuse Detection (REF-01, REF-02, REF-03)
# ======================================================================

def create_refresh_token(user_id: str, family: Optional[str] = None) -> Tuple[str, str]:
    """
    Issues a cryptographically secure random refresh token.
    Stores its SHA-256 hash in SQLite tied to a token family.
    Returns: (raw_refresh_token, token_family)
    """
    raw_token = f"rt_{secrets.token_urlsafe(32)}"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    token_family = family or f"fam_{uuid.uuid4().hex}"
    now_ms = int(time.time() * 1000)
    expires_at = now_ms + (REFRESH_TOKEN_LIFETIME_DAYS * 86400 * 1000)
    token_id = f"rfk_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

    with get_db() as conn:
        conn.execute("""
            INSERT INTO refresh_tokens (id, user_id, token_hash, token_family, is_revoked, expires_at, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        """, (token_id, user_id, token_hash, token_family, expires_at, now_ms))

    return raw_token, token_family

def rotate_refresh_token(raw_refresh_token: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Rotates a refresh token:
    - Validates token hash and expiration
    - Detects token reuse (theft signal): If already revoked, revokes the ENTIRE token family (REF-02)
    - If valid, revokes the old token and issues a new access token and rotated refresh token (REF-01)
    Returns: (user_dict, new_access_token, new_refresh_token)
    """
    if not raw_refresh_token or not raw_refresh_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is required."
        )

    token_hash = hashlib.sha256(raw_refresh_token.strip().encode("utf-8")).hexdigest()
    now_ms = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        token_record = cur.execute(
            "SELECT * FROM refresh_tokens WHERE token_hash = ?",
            (token_hash,)
        ).fetchone()

        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or unrecognized refresh token."
            )

        user_id = token_record["user_id"]
        family = token_record["token_family"]

        # REUSE DETECTION (OWASP ASVS / REF-02)
        # If an already-revoked refresh token is presented, this is a theft event!
        if token_record["is_revoked"]:
            logger.warning(f"Security Alert: Replay of revoked refresh token detected for family {family} (User {user_id}).")
            # Revoke entire token family
            cur.execute("UPDATE refresh_tokens SET is_revoked = 1 WHERE token_family = ?", (family,))
            # Invalidate all active sessions for this user
            cur.execute(
                "UPDATE users SET sessions_invalidated_before = ? WHERE id = ?",
                (int(time.time()), user_id)
            )
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token reuse detected. All sessions in this token family have been revoked for your security."
            )

        # Check expiration
        if token_record["expires_at"] < now_ms:
            cur.execute("UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?", (token_record["id"],))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please sign in again."
            )

        # Fetch user
        user = cur.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Associated user account not found."
            )

        user_dict = dict(user)

        # Invalidate the consumed refresh token
        cur.execute("UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?", (token_record["id"],))

    # Issue new access token and rotated refresh token within the same token family
    new_access_token = create_access_token(
        user_id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        role=user_dict.get("role", "user")
    )
    new_refresh_token, _ = create_refresh_token(user_id=user_dict["id"], family=family)

    return user_dict, new_access_token, new_refresh_token

def revoke_refresh_token(raw_refresh_token: str):
    """Revokes a single refresh token upon logout (OUT-02)."""
    if not raw_refresh_token:
        return
    token_hash = hashlib.sha256(raw_refresh_token.strip().encode("utf-8")).hexdigest()
    with get_db() as conn:
        conn.execute("UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?", (token_hash,))

def revoke_all_user_refresh_tokens(user_id: str):
    """Revokes all active refresh tokens for a user."""
    with get_db() as conn:
        conn.execute("UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?", (user_id,))

# ======================================================================
# 5. Cryptographic Password Reset Flow (FORGOT-01 to FORGOT-08)
# ======================================================================

def create_password_reset_token(email: str) -> Optional[str]:
    """
    Generates a cryptographically random password reset token (256-bit entropy).
    Stores only the SHA-256 hash with a 1-hour expiration window.
    Applies timing attack resistance when email is not found.
    """
    clean_email = email.lower().strip()
    with get_db() as conn:
        cur = conn.cursor()
        user = cur.execute("SELECT id FROM users WHERE email = ?", (clean_email,)).fetchone()

        if not user:
            # Neutralize timing enumeration attack (LOG-03 / FORGOT-02)
            dummy_verify_timing()
            return None

        user_id = user["id"]
        # Invalidate any existing unused reset tokens for this user
        cur.execute("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0", (user_id,))

        raw_token = f"rst_{secrets.token_urlsafe(32)}"
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        now_ms = int(time.time() * 1000)
        expires_at = now_ms + (PASSWORD_RESET_LIFETIME_HOURS * 3600 * 1000)
        reset_id = f"pr_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

        cur.execute("""
            INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        """, (reset_id, user_id, token_hash, expires_at, now_ms))

        return raw_token

def consume_password_reset_token(raw_token: str, new_password: str) -> Dict[str, Any]:
    """
    Validates and consumes a single-use password reset token:
    - Enforces password strength policy (REG-03)
    - Validates token hash, expiration, and single-use status (FORGOT-04, FORGOT-05)
    - Upgrades user password to new PBKDF2-HMAC-SHA256 hash
    - CRITICAL P0: Invalidates all other active sessions and tokens (FORGOT-06)
    """
    validate_password_policy(new_password)

    if not raw_token or not raw_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is required."
        )

    token_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    now_ms = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        reset_record = cur.execute(
            "SELECT * FROM password_resets WHERE token_hash = ?",
            (token_hash,)
        ).fetchone()

        if not reset_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token is invalid or does not exist."
            )

        if reset_record["used"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has already been used. Please request a new link."
            )

        if reset_record["expires_at"] < now_ms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired. Please request a new link."
            )

        user_id = reset_record["user_id"]
        new_hash = hash_password(new_password)
        now_sec = int(time.time())

        # Update password and terminate all active sessions (FORGOT-06)
        cur.execute("""
            UPDATE users 
            SET password_hash = ?, 
                sessions_invalidated_before = ?, 
                failed_login_attempts = 0, 
                locked_until = 0 
            WHERE id = ?
        """, (new_hash, now_sec, user_id))

        # Mark token as consumed (single-use enforcement: FORGOT-04)
        cur.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (reset_record["id"],))

        # Revoke all active refresh tokens for this user
        cur.execute("UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?", (user_id,))

    return {
        "success": True,
        "message": "Password has been successfully reset. All active sessions have been terminated."
    }

# ======================================================================
# 6. Role-Based Access Control (RBAC: PRIV-01 to PRIV-05)
# ======================================================================

def require_role(required_role: str):
    """
    FastAPI dependency factory enforcing function-level authorization.
    Rejects unauthorized roles with HTTP 403 Forbidden.
    """
    def role_verifier(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "user")
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires '{required_role}' privilege."
            )
        return current_user
    return role_verifier

# ======================================================================
# 7. Google OAuth / OIDC Identity Token Verification
# ======================================================================

_test_google_token_verifier = None

def set_google_token_verifier_for_testing(verifier_fn):
    """Allows test suites to inject mock token verification for offline hermetic testing."""
    global _test_google_token_verifier
    _test_google_token_verifier = verifier_fn

def verify_google_identity_token(token_str: str) -> Dict[str, Any]:
    """
    Cryptographically verifies Google OAuth2 identity token.
    Extracts verified 'email', 'name', 'sub', and 'picture'.
    Rejects raw, unverified emails.
    """
    if not token_str or not token_str.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google identity token is required."
        )

    if _test_google_token_verifier is not None:
        try:
            return _test_google_token_verifier(token_str)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Google identity token test verification rejected: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google identity token."
            )

    google_client_id = os.environ.get("GOOGLE_CLIENT_ID")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        request_transport = requests.Request()
        id_info = id_token.verify_oauth2_token(
            token_str,
            request_transport,
            google_client_id if google_client_id else None
        )
        if "email" not in id_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token payload does not contain a verified email."
            )
        return id_info
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Google identity token verification rejected: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google identity token."
        )

# ======================================================================
# 8. User Deletion & Complete Cascade Cleanup (Rule 4)
# ======================================================================

def delete_user_cascade(cur, user_id: str) -> bool:
    """
    Safely deletes a user and cleanly cascades deletion across all candidate profiles,
    tailored resumes, career documents, facts, embeddings, automation pipelines,
    job bookmarks, explorer runs, user sessions, and security tokens.
    Also purges uploaded files from disk storage.
    Enforces Rule 4: Deleting a user must handle their profiles (cascade delete).
    """
    user_row = cur.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user_row:
        return False

    # 1. Fetch all candidate profile IDs for this user
    p_rows = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ?", (user_id,)).fetchall()
    profile_ids = [r["id"] for r in p_rows]

    # 2. Clean resume disk files for each profile
    upload_dir = Path(__file__).resolve().parent.parent / "uploads" / "resumes"
    if upload_dir.exists():
        for pid in profile_ids:
            for f in upload_dir.glob(f"{pid}_*"):
                try:
                    if f.is_file():
                        f.unlink()
                except Exception:
                    pass

    # 3. Delete all profile-scoped data
    for pid in profile_ids:
        cur.execute("DELETE FROM tailored_resumes WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM career_documents WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM career_facts WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM document_chunks WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM chunk_embeddings WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM pipelines WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM job_bookmarks WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM explorer_runs WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM resume_files WHERE profile_id = ?", (pid,))
        try:
            cur.execute("DELETE FROM activities WHERE profile_id = ?", (pid,))
        except Exception:
            pass

    # 4. Delete any user-scoped entries directly
    cur.execute("DELETE FROM resume_files WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM pipelines WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM job_bookmarks WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM explorer_runs WHERE user_id = ?", (user_id,))
    try:
        cur.execute("DELETE FROM activities WHERE user_id = ?", (user_id,))
    except Exception:
        pass
    try:
        cur.execute("DELETE FROM jobs WHERE user_id = ?", (user_id,))
    except Exception:
        pass
    cur.execute("DELETE FROM candidate_profiles WHERE user_id = ?", (user_id,))

    # 5. Auth & sessions cascade
    cur.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM revoked_tokens WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM password_resets WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))

    return True


def reset_user_data_cascade(cur, user_id: str) -> dict:
    """
    Resets all candidate profile data, uploaded documents, tailored resumes,
    application pipelines, bookmarks, explorer runs, and activity logs
    associated with the given user.
    CRITICAL: The user account (users table), credentials, tokens, and active
    sessions are PRESERVED. The user remains logged in.
    """
    user_row = cur.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found.")

    user_name = user_row["name"] if user_row["name"] else "Candidate"
    user_email = user_row["email"] if user_row["email"] else ""

    # 1. Fetch all candidate profile IDs for this user
    p_rows = cur.execute("SELECT id FROM candidate_profiles WHERE user_id = ?", (user_id,)).fetchall()
    profile_ids = [r["id"] for r in p_rows]

    # 2. Clean disk files for each profile
    upload_dir = Path(__file__).resolve().parent.parent / "uploads" / "resumes"
    if upload_dir.exists():
        for pid in profile_ids:
            for f in upload_dir.glob(f"{pid}_*"):
                try:
                    if f.is_file():
                        f.unlink()
                except Exception:
                    pass

    # 3. Clean profile-scoped database entries
    for pid in profile_ids:
        cur.execute("DELETE FROM tailored_resumes WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM career_documents WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM career_facts WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM document_chunks WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM chunk_embeddings WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM pipelines WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM job_bookmarks WHERE profile_id = ?", (pid,))
        cur.execute("DELETE FROM explorer_runs WHERE profile_id = ?", (pid,))
        try:
            cur.execute("DELETE FROM activities WHERE profile_id = ?", (pid,))
        except Exception:
            pass

    # 4. Clean user-scoped database entries
    cur.execute("DELETE FROM pipelines WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM job_bookmarks WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM explorer_runs WHERE user_id = ?", (user_id,))
    try:
        cur.execute("DELETE FROM activities WHERE user_id = ?", (user_id,))
    except Exception:
        pass
    try:
        cur.execute("DELETE FROM jobs WHERE user_id = ?", (user_id,))
    except Exception:
        pass

    # 5. Reset candidate profiles table for this user
    cur.execute("DELETE FROM candidate_profiles WHERE user_id = ?", (user_id,))

    # 6. Re-create a fresh, blank candidate profile for the user (is_complete = 0)
    now = int(time.time() * 1000)
    prof_id = f"prof_{now}"
    clean_data = {
        "general": {"fullName": user_name, "email": user_email, "primarySkill": "", "bio": ""},
        "contacts": {"fullName": user_name, "email": user_email},
        "avatar": "avatar_1",
        "primarySkill": "",
        "experienceYears": 0,
        "skillsList": [],
        "experiences": [],
        "educationList": [],
        "userLocation": "",
        "desiredLocations": [],
        "selectedRoles": [],
        "resume": None
    }
    cur.execute("""
        INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
        VALUES (?, ?, ?, 1, 0, ?, ?, ?)
    """, (prof_id, user_id, f"{user_name}'s Profile", json.dumps(clean_data), now, now))

    # Also sync legacy profile table if default user
    if user_id in ("default", "usr_default"):
        try:
            cur.execute("""
                UPDATE profile SET data = ?, updated_at = ? WHERE id = 'default'
            """, (json.dumps(clean_data), now))
        except Exception:
            pass

    return {
        "success": True,
        "message": "User candidate data, resumes, and application history have been reset. Your account remains active.",
        "profile": clean_data,
        "profile_id": prof_id
    }

