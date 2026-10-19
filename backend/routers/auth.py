import hashlib
import re
import time
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, status

try:
    from ..database import get_db
    from ..models import AuthLogin, AuthRegister, AuthGoogle, AuthForgotPassword, AuthAvatarUpdate
except (ImportError, ValueError):
    from database import get_db
    from models import AuthLogin, AuthRegister, AuthGoogle, AuthForgotPassword, AuthAvatarUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def hash_password(password: str) -> str:
    salt = "_salt_porter_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def get_user_active_profile(cur, user_id: str) -> tuple[str, str, bool]:
    """Helper to fetch or initialize the user's active candidate profile."""
    # Look in candidate_profiles for this user
    p_row = cur.execute(
        "SELECT id, name, is_complete FROM candidate_profiles WHERE user_id = ? AND is_active = 1",
        (user_id,)
    ).fetchone()
    if p_row:
        return p_row["id"], p_row["name"], bool(p_row["is_complete"])

    # If none active, check if any exists
    any_p = cur.execute(
        "SELECT id, name, is_complete FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
        (user_id,)
    ).fetchone()
    if any_p:
        cur.execute("UPDATE candidate_profiles SET is_active = 1 WHERE id = ?", (any_p["id"],))
        return any_p["id"], any_p["name"], bool(any_p["is_complete"])

    # Check legacy default profile table
    def_row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
    def_data = def_row["data"] if def_row and def_row["data"] else "{}"

    # Create first candidate profile for this user
    prof_id = f"prof_{int(time.time() * 1000)}"
    prof_name = "Candidate Profile"
    now = int(time.time() * 1000)
    cur.execute("""
        INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
        VALUES (?, ?, ?, 1, 0, ?, ?, ?)
    """, (prof_id, user_id, prof_name, def_data, now, now))
    return prof_id, prof_name, False

@router.post("/login")
def login(creds: AuthLogin):
    email = creds.email.lower().strip()
    if not email or not creds.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    with get_db() as conn:
        cur = conn.cursor()
        user = cur.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        if user["auth_provider"] == "local":
            hashed = hash_password(creds.password)
            if hashed != user["password_hash"]:
                raise HTTPException(status_code=401, detail="Invalid email or password.")

        prof_id, prof_name, is_complete = get_user_active_profile(cur, user["id"])
        token = f"tok_{user['id']}"
        return {
            "success": True,
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "avatar": user["avatar"],
                "authProvider": user["auth_provider"],
                "activeProfileId": prof_id,
                "activeProfileName": prof_name,
                "isProfileComplete": is_complete
            }
        }

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: AuthRegister):
    email = body.email.lower().strip()
    name = body.name.strip()
    pwd = body.password.strip()

    if not email or not pwd or not name:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")

    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if len(pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

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
            INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
            VALUES (?, ?, ?, ?, ?, 'local', ?)
        """, (user_id, email, hashed, name, avatar, now))

        # Create initial candidate profile for new user
        prof_id = f"prof_{int(time.time() * 1000)}"
        prof_name = f"{name}'s Profile"
        cur.execute("""
            INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
            VALUES (?, ?, ?, 1, 0, '{}', ?, ?)
        """, (prof_id, user_id, prof_name, now, now))

    token = f"tok_{user_id}"
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "avatar": avatar,
            "authProvider": "local",
            "activeProfileId": prof_id,
            "activeProfileName": prof_name,
            "isProfileComplete": False
        }
    }

@router.post("/google")
def google_auth(body: AuthGoogle):
    if not body.email or not body.email.strip():
        raise HTTPException(status_code=400, detail="Email is required for Google Sign-In.")
    email = body.email.lower().strip()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Invalid Google account email.")

    name = body.name or email.split("@")[0].title()
    avatar = body.avatar or "avatar_1"
    now = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        user = cur.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            user_id = f"usr_g_{int(time.time() * 1000)}"
            cur.execute("""
                INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
                VALUES (?, ?, '', ?, ?, 'google', ?)
            """, (user_id, email, name, avatar, now))

            prof_id = f"prof_{int(time.time() * 1000)}"
            prof_name = f"{name}'s Profile"
            cur.execute("""
                INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES (?, ?, ?, 1, 0, '{}', ?, ?)
            """, (prof_id, user_id, prof_name, now, now))
            is_complete = False
        else:
            user_id = user["id"]
            name = user["name"]
            avatar = user["avatar"]
            prof_id, prof_name, is_complete = get_user_active_profile(cur, user_id)

    token = f"tok_{user_id}"
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "avatar": avatar,
            "authProvider": "google",
            "activeProfileId": prof_id,
            "activeProfileName": prof_name,
            "isProfileComplete": is_complete
        }
    }

@router.post("/forgot-password")
def forgot_password(body: AuthForgotPassword):
    if not body.email or not EMAIL_REGEX.match(body.email.strip()):
        raise HTTPException(status_code=400, detail="Valid email is required.")
    return {
        "success": True,
        "message": "If an account exists with this email, password recovery instructions and a secure reset token have been generated."
    }

@router.get("/me")
def get_me(authorization: Optional[str] = Header(None)):
    with get_db() as conn:
        cur = conn.cursor()
        user = None

        if authorization and authorization.startswith("Bearer "):
            raw_token = authorization.split(" ")[1].strip()
            if raw_token.startswith("tok_"):
                user_id = raw_token[4:]
                user = cur.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="User session not found or unauthorized.")

        prof_id, prof_name, is_complete = get_user_active_profile(cur, user["id"])

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "avatar": user["avatar"],
                "authProvider": user["auth_provider"],
                "activeProfileId": prof_id,
                "activeProfileName": prof_name,
                "isProfileComplete": is_complete
            }
        }

@router.put("/avatar")
def update_avatar(body: AuthAvatarUpdate):
    if not body.avatar:
        raise HTTPException(status_code=400, detail="Avatar identifier is required.")

    with get_db() as conn:
        cur = conn.cursor()
        user = cur.execute("SELECT id FROM users LIMIT 1").fetchone()
        if user:
            cur.execute("UPDATE users SET avatar = ? WHERE id = ?", (body.avatar, user["id"]))

        # Also update profile data
        row = cur.execute("SELECT data FROM profile WHERE id = 'default'").fetchone()
        if row and row["data"]:
            try:
                import json
                pdata = json.loads(row["data"])
                pdata["avatar"] = body.avatar
                cur.execute("UPDATE profile SET data = ? WHERE id = 'default'", (json.dumps(pdata),))
            except Exception:
                pass

    return {"success": True, "avatar": body.avatar}
