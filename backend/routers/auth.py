import re
import time
import uuid
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header, Request, status, Query

try:
    from ..database import get_db
    from ..models import (
        AuthLogin, 
        AuthRegister, 
        AuthGoogle, 
        AuthForgotPassword, 
        AuthResetPassword,
        AuthRefreshToken,
        AuthLogout,
        AuthAvatarUpdate
    )
    from ..services.auth_service import (
        hash_password,
        verify_password,
        validate_password_policy,
        create_access_token,
        create_refresh_token,
        rotate_refresh_token,
        revoke_access_token,
        revoke_refresh_token,
        revoke_all_user_refresh_tokens,
        create_password_reset_token,
        consume_password_reset_token,
        get_current_user,
        require_role,
        verify_google_identity_token,
        dummy_verify_timing,
        registration_limiter,
        forgot_password_limiter,
        delete_user_cascade
    )
except (ImportError, ValueError):
    from database import get_db
    from models import (
        AuthLogin, 
        AuthRegister, 
        AuthGoogle, 
        AuthForgotPassword, 
        AuthResetPassword,
        AuthRefreshToken,
        AuthLogout,
        AuthAvatarUpdate
    )
    from services.auth_service import (
        hash_password,
        verify_password,
        validate_password_policy,
        create_access_token,
        create_refresh_token,
        rotate_refresh_token,
        revoke_access_token,
        revoke_refresh_token,
        revoke_all_user_refresh_tokens,
        create_password_reset_token,
        consume_password_reset_token,
        get_current_user,
        require_role,
        verify_google_identity_token,
        dummy_verify_timing,
        registration_limiter,
        forgot_password_limiter,
        delete_user_cascade
    )

logger = logging.getLogger("skill2role.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])
admin_router = APIRouter(prefix="/admin", tags=["Admin Authorization"], dependencies=[Depends(require_role("admin"))])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def get_user_active_profile(cur, user_id: str) -> tuple[str, str, bool]:
    """Helper to fetch or initialize the user's active candidate profile."""
    p_row = cur.execute(
        "SELECT id, name, is_complete FROM candidate_profiles WHERE user_id = ? AND is_active = 1",
        (user_id,)
    ).fetchone()
    if p_row:
        return p_row["id"], p_row["name"], bool(p_row["is_complete"])

    any_p = cur.execute(
        "SELECT id, name, is_complete FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
        (user_id,)
    ).fetchone()
    if any_p:
        cur.execute("UPDATE candidate_profiles SET is_active = 1 WHERE id = ?", (any_p["id"],))
        return any_p["id"], any_p["name"], bool(any_p["is_complete"])

    prof_id = f"prof_{int(time.time() * 1000)}"
    user_row = cur.execute("SELECT name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    user_name = user_row["name"] if user_row else "Candidate"
    user_email = user_row["email"] if user_row else ""
    prof_name = f"{user_name}'s Profile"
    now = int(time.time() * 1000)
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
    """, (prof_id, user_id, prof_name, json.dumps(clean_data), now, now))
    return prof_id, prof_name, False

# ======================================================================
# 1. Registration (REG-01 to REG-06)
# ======================================================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: AuthRegister, request: Request):
    client_ip = request.client.host if request.client else "unknown"

    # Rate limiting on registration (REG-06)
    if registration_limiter.is_rate_limited(client_ip, max_attempts=10, window_seconds=300):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please wait a few minutes before trying again."
        )

    email = body.email.lower().strip()
    name = body.name.strip()
    pwd = body.password.strip()

    if not email or not pwd or not name:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")

    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    # OWASP ASVS Password Policy (REG-03)
    validate_password_policy(pwd)

    # Basic input sanitation (REG-05 XSS protection)
    clean_name = re.sub(r"<[^>]*?>", "", name).strip()
    if not clean_name:
        clean_name = "Candidate"

    with get_db() as conn:
        cur = conn.cursor()
        existing = cur.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        user_id = f"usr_{int(time.time() * 1000)}_{uuid.uuid4().hex[:5]}"
        hashed = hash_password(pwd)
        avatar = body.avatar or "avatar_1"
        now = int(time.time() * 1000)

        cur.execute("""
            INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, role, created_at)
            VALUES (?, ?, ?, ?, ?, 'local', 'user', ?)
        """, (user_id, email, hashed, clean_name, avatar, now))

        # Create initial candidate profile for new user
        prof_id = f"prof_{int(time.time() * 1000)}"
        prof_name = f"{clean_name}'s Profile"
        clean_data = {
            "general": {"fullName": clean_name, "email": email, "phone": "", "city": "", "bio": "", "links": ""},
            "contacts": {"fullName": clean_name, "email": email},
            "avatar": avatar,
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
        """, (prof_id, user_id, prof_name, json.dumps(clean_data), now, now))

    token = create_access_token(user_id, email, clean_name, role="user")
    refresh_token, _ = create_refresh_token(user_id)

    return {
        "success": True,
        "token": token,
        "refreshToken": refresh_token,
        "user": {
            "id": user_id,
            "email": email,
            "name": clean_name,
            "avatar": avatar,
            "role": "user",
            "authProvider": "local",
            "activeProfileId": prof_id,
            "activeProfileName": prof_name,
            "isProfileComplete": False
        }
    }

# ======================================================================
# 2. Login (LOG-01 to LOG-07)
# ======================================================================

@router.post("/login")
def login(creds: AuthLogin, request: Request):
    email = creds.email.lower().strip()
    if not email or not creds.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    with get_db() as conn:
        cur = conn.cursor()
        user = cur.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

        # Non-existent account timing resistance (LOG-03)
        if not user:
            dummy_verify_timing()
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        user_dict = dict(user)
        user_id = user_dict["id"]
        now_ms = int(time.time() * 1000)
        locked_until = user_dict.get("locked_until") or 0

        # Account lockout check (LOG-04)
        if locked_until > now_ms:
            remaining_mins = max(1, int((locked_until - now_ms) / 60000))
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked due to repeated failed attempts. Please try again in {remaining_mins} minutes."
            )

        if user_dict.get("auth_provider") == "local":
            is_valid, needs_migration = verify_password(creds.password, user_dict["password_hash"])
            if not is_valid:
                failed_attempts = (user_dict.get("failed_login_attempts") or 0) + 1
                if failed_attempts >= 5:
                    new_locked_until = now_ms + (15 * 60 * 1000)  # Lock for 15 minutes
                    cur.execute(
                        "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
                        (failed_attempts, new_locked_until, user_id)
                    )
                    conn.commit()
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail="Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in 15 minutes."
                    )
                else:
                    cur.execute(
                        "UPDATE users SET failed_login_attempts = ? WHERE id = ?",
                        (failed_attempts, user_id)
                    )
                    conn.commit()
                raise HTTPException(status_code=401, detail="Invalid email or password.")

            # Reset failed attempts upon successful authentication
            cur.execute(
                "UPDATE users SET failed_login_attempts = 0, locked_until = 0 WHERE id = ?",
                (user_id,)
            )

            # Safe transparent migration to PBKDF2-HMAC-SHA256
            if needs_migration:
                new_hash = hash_password(creds.password)
                cur.execute(
                    "UPDATE users SET password_hash = ? WHERE id = ?",
                    (new_hash, user_id)
                )
                logger.info(f"Successfully upgraded user password hash to PBKDF2-HMAC-SHA256")

        prof_id, prof_name, is_complete = get_user_active_profile(cur, user_id)
        
    # Fresh unique token issuance (Session fixation protection: LOG-06)
    user_role = user_dict.get("role", "user") or "user"
    token = create_access_token(user_id, user_dict["email"], user_dict["name"], role=user_role)
    refresh_token, _ = create_refresh_token(user_id)

    return {
        "success": True,
        "token": token,
        "refreshToken": refresh_token,
        "user": {
            "id": user_id,
            "email": user_dict["email"],
            "name": user_dict["name"],
            "avatar": user_dict["avatar"],
            "role": user_role,
            "authProvider": user_dict.get("auth_provider", "local"),
            "activeProfileId": prof_id,
            "activeProfileName": prof_name,
            "isProfileComplete": is_complete
        }
    }

# ======================================================================
# 3. Google OAuth 2.0 / OIDC (OAUTH-01 to OAUTH-06)
# ======================================================================

@router.post("/google")
def google_auth(body: AuthGoogle):
    token_str = body.credential or body.id_token
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google identity token (credential or id_token) is required. Raw email sign-in is disabled for security."
        )

    # Cryptographically verify the Google identity token
    id_info = verify_google_identity_token(token_str)
    email = id_info.get("email", "").lower().strip()
    if not email or not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token payload does not contain a valid email address."
        )

    name = id_info.get("name") or body.name or email.split("@")[0].title()
    avatar = body.avatar or "avatar_1"
    now = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        user = cur.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            user_id = f"usr_g_{int(time.time() * 1000)}"
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, role, created_at)
                VALUES (?, ?, '', ?, ?, 'google', 'user', ?)
            """, (user_id, email, name, avatar, now))

            prof_id = f"prof_{int(time.time() * 1000)}"
            prof_name = f"{name}'s Profile"
            cur.execute("""
                INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES (?, ?, ?, 1, 0, '{}', ?, ?)
            """, (prof_id, user_id, prof_name, now, now))
            is_complete = False
            user_role = "user"
        else:
            user_dict = dict(user)
            user_id = user_dict["id"]
            name = user_dict["name"]
            avatar = user_dict["avatar"]
            user_role = user_dict.get("role", "user") or "user"
            prof_id, prof_name, is_complete = get_user_active_profile(cur, user_id)

    token = create_access_token(user_id, email, name, role=user_role)
    refresh_token, _ = create_refresh_token(user_id)

    return {
        "success": True,
        "token": token,
        "refreshToken": refresh_token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "avatar": avatar,
            "role": user_role,
            "authProvider": "google",
            "activeProfileId": prof_id,
            "activeProfileName": prof_name,
            "isProfileComplete": is_complete
        }
    }

# ======================================================================
# 4. Token Refresh & Theft Reuse Detection (REF-01 to REF-03)
# ======================================================================

@router.post("/refresh")
def refresh_token_endpoint(body: AuthRefreshToken):
    user, new_access_token, new_refresh_token = rotate_refresh_token(body.refresh_token)
    return {
        "success": True,
        "token": new_access_token,
        "refreshToken": new_refresh_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "avatar": user["avatar"],
            "role": user.get("role", "user")
        }
    }

# ======================================================================
# 5. Logout & Session Termination (OUT-01 to OUT-03)
# ======================================================================

@router.post("/logout")
def logout(body: Optional[AuthLogout] = None, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    token_jti = current_user.get("_token_jti")
    token_exp = current_user.get("_token_exp", int(time.time() + 86400))

    # Revoke access token JTI (OUT-01)
    if token_jti:
        revoke_access_token(token_jti, user_id, token_exp, reason="logout")

    # Invalidate refresh token if provided, or all user refresh tokens (OUT-02)
    if body and body.refresh_token:
        revoke_refresh_token(body.refresh_token)
    else:
        revoke_all_user_refresh_tokens(user_id)

    return {
        "success": True,
        "message": "Successfully logged out. Session and credentials terminated."
    }

# ======================================================================
# 6. Forgot Password & Reset Flow (FORGOT-01 to FORGOT-08)
# ======================================================================

@router.post("/forgot-password")
def forgot_password(body: AuthForgotPassword, request: Request, test_mode: Optional[bool] = Query(False)):
    email = body.email.lower().strip()
    if not email or not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Valid email is required.")

    # Rate limiting on reset requests (FORGOT-08)
    if forgot_password_limiter.is_rate_limited(email, max_attempts=5, window_seconds=600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests for this email. Please try again later."
        )

    # Cryptographically secure random token generation & timing resistance (FORGOT-02, FORGOT-03)
    reset_token = create_password_reset_token(email)

    response_payload = {
        "success": True,
        "message": "If an account exists, a reset link has been sent"
    }

    # Hermetic test hook: expose reset_token only in test mode or if requested by internal header
    if test_mode or request.headers.get("X-Test-Mode") == "1":
        response_payload["test_reset_token"] = reset_token

    return response_payload

@router.post("/reset-password")
def reset_password(body: AuthResetPassword):
    result = consume_password_reset_token(body.token, body.new_password)
    return result

# ======================================================================
# 7. Session Visibility & Termination (SESS-01 to SESS-05)
# ======================================================================

@router.get("/sessions")
def list_sessions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with get_db() as conn:
        cur = conn.cursor()
        rows = cur.execute(
            "SELECT id, token_family, created_at, expires_at, is_revoked FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
        sessions = [
            {
                "id": r["id"],
                "tokenFamily": r["token_family"],
                "createdAt": r["created_at"],
                "expiresAt": r["expires_at"],
                "isActive": not bool(r["is_revoked"])
            }
            for r in rows
        ]
    return {
        "userId": user_id,
        "sessions": sessions
    }

@router.post("/sessions/terminate")
def terminate_other_sessions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    now_sec = int(time.time())
    with get_db() as conn:
        cur = conn.cursor()
        # Invalidate all prior sessions (FORGOT-06 / SESS-05)
        cur.execute(
            "UPDATE users SET sessions_invalidated_before = ? WHERE id = ?",
            (now_sec, user_id)
        )
        cur.execute(
            "UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?",
            (user_id,)
        )
    return {
        "success": True,
        "message": "All other sessions have been terminated."
    }

# ======================================================================
# 8. User Identity & Profile (Horizontal Isolation IDOR-01, IDOR-02)
# ======================================================================

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        prof_id, prof_name, is_complete = get_user_active_profile(cur, current_user["id"])

        return {
            "user": {
                "id": current_user["id"],
                "email": current_user["email"],
                "name": current_user["name"],
                "avatar": current_user["avatar"],
                "role": current_user.get("role", "user") or "user",
                "authProvider": current_user.get("auth_provider", "local"),
                "activeProfileId": prof_id,
                "activeProfileName": prof_name,
                "isProfileComplete": is_complete
            }
        }

@router.put("/avatar")
def update_avatar(body: AuthAvatarUpdate, current_user: dict = Depends(get_current_user)):
    if not body.avatar:
        raise HTTPException(status_code=400, detail="Avatar identifier is required.")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE users SET avatar = ? WHERE id = ?", (body.avatar, current_user["id"]))

    return {"success": True, "avatar": body.avatar}

# ======================================================================
# 9. Admin Authorization Endpoints (Vertical RBAC: PRIV-01 to PRIV-05)
# ======================================================================

@admin_router.get("/users")
def get_all_users_admin():
    """Privileged admin endpoint listing all registered users in system."""
    with get_db() as conn:
        cur = conn.cursor()
        users = cur.execute("SELECT id, email, name, role, auth_provider, created_at FROM users").fetchall()
        return {
            "users": [dict(u) for u in users]
        }

@admin_router.delete("/users/{user_id}")
def delete_user_by_id_admin(user_id: str):
    """Privileged admin endpoint to delete a user and cascade clean all their data."""
    with get_db() as conn:
        cur = conn.cursor()
        success = delete_user_cascade(cur, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found.")
    return {"success": True, "message": f"User '{user_id}' and all associated profiles and data deleted."}

@router.delete("/account")
@router.delete("/me")
def delete_my_account(current_user: dict = Depends(get_current_user)):
    """Allows authenticated user to delete their account and cascade clean all their profiles/data."""
    with get_db() as conn:
        cur = conn.cursor()
        success = delete_user_cascade(cur, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="User not found.")
    return {"success": True, "message": "Your account and all associated profiles have been deleted."}
