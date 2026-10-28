"""
Platform Login Browser Routes for Skill2Role.
Launches dedicated Chrome session for logging into LinkedIn, Indeed, and Naukri.
Preserves session cookies in a persistent profile for authenticated job discovery and automated applications.
"""

from __future__ import annotations

import logging
import os
import platform
import subprocess
import shutil
import sqlite3
import threading
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger("skill2role.login")

router = APIRouter(tags=["Platform Login"])

LOGIN_LOCK = threading.Lock()
LOGIN_PROC: subprocess.Popen | None = None

BASE_DIR = Path(__file__).resolve().parent.parent
BROWSER_PROFILE_DIR = BASE_DIR / "browser_profile"
BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

class LoginOpenRequest(BaseModel):
    url: str

def find_system_chrome() -> str | None:
    """Finds installed Google Chrome binary across Windows, macOS, and Linux."""
    candidates = []
    if platform.system() == "Windows":
        for base in [
            os.environ.get("PROGRAMFILES", r"C:\Program Files"),
            os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"),
            os.path.expandvars(r"%LOCALAPPDATA%"),
        ]:
            candidates.append(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
            candidates.append(os.path.join(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"))
            candidates.append(os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
    elif platform.system() == "Darwin":
        candidates.extend([
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        ])
    else:
        candidates.extend([
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/usr/bin/brave-browser"
        ])

    for path in candidates:
        if os.path.isfile(path):
            return path
    return None

ALLOWED_DOMAINS = {"linkedin.com", "indeed.com", "naukri.com", "instahyre.com", "wellfound.com"}

@router.post("/login/open")
def open_login_browser(req: LoginOpenRequest):
    """
    Launches system Chrome in headed mode with dedicated profile for platform authentication.
    Allows user to log in, solve 2FA, and solve CAPTCHAs interactively.
    """
    global LOGIN_PROC

    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Target login URL is required.")

    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid login URL provided.")

    if not any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported login domain. Supported domains: {', '.join(ALLOWED_DOMAINS)}"
        )

    chrome_path = find_system_chrome()
    if not chrome_path:
        raise HTTPException(
            status_code=500,
            detail="Google Chrome / Chromium executable not found on system. Please install Google Chrome."
        )

    with LOGIN_LOCK:
        if LOGIN_PROC is not None:
            try:
                LOGIN_PROC.terminate()
            except Exception as e:
                logger.debug(f"Failed to terminate previous browser process: {e}")
            LOGIN_PROC = None

        try:
            cmd = [
                chrome_path,
                f"--user-data-dir={str(BROWSER_PROFILE_DIR)}",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-default-apps",
                "--new-window",
                url
            ]
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            LOGIN_PROC = proc
            logger.info(f"Platform Login Browser opened (PID {proc.pid}) for URL: {url}")
            return {
                "success": True,
                "status": "opening",
                "pid": proc.pid,
                "url": url,
                "profileDir": str(BROWSER_PROFILE_DIR)
            }
        except Exception as e:
            logger.error(f"Failed to launch Chrome browser: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to open browser: {e}")

@router.post("/login/close")
def close_login_browser():
    """
    Safely terminates the open login browser process.
    """
    global LOGIN_PROC
    with LOGIN_LOCK:
        if LOGIN_PROC is None:
            return {"success": True, "status": "already_closed"}
        proc = LOGIN_PROC
        LOGIN_PROC = None

    try:
        proc.terminate()
        logger.info(f"Platform Login Browser (PID {proc.pid}) closed.")
    except Exception as e:
        logger.debug(f"Process termination notice: {e}")

    return {"success": True, "status": "closed"}

@router.get("/login/status")
def get_login_browser_status():
    """
    Checks whether a login browser window is actively open.
    """
    global LOGIN_PROC
    with LOGIN_LOCK:
        if LOGIN_PROC is None:
            return {"open": False}
        if LOGIN_PROC.poll() is not None:
            LOGIN_PROC = None
            return {"open": False}
        return {"open": True}

@router.get("/login/sessions")
def get_login_sessions():
    """
    Inspects persistent browser profile cookies to determine which platforms have active login sessions.
    Checks:
      - LinkedIn: 'li_at' cookie
      - Indeed: 'INDEED_CSRF_TOKEN' / 'indeed_rcc'
      - Naukri: 'nauk_auth' / 'USER_LOGGED_IN'
    """
    result = {
        "linkedin": False,
        "indeed": False,
        "naukri": False
    }

    profile_cookies = BROWSER_PROFILE_DIR / "Default" / "Network" / "Cookies"
    if not profile_cookies.exists():
        return result

    tmp_cookies = BROWSER_PROFILE_DIR / "_session_cookies_check.db"
    try:
        shutil.copy2(str(profile_cookies), str(tmp_cookies))
        conn = sqlite3.connect(str(tmp_cookies))
        cursor = conn.cursor()

        # 1. LinkedIn Session Check
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM cookies WHERE host_key LIKE '%linkedin.com' AND name = 'li_at'"
            )
            result["linkedin"] = cursor.fetchone()[0] > 0
        except Exception:
            pass

        # 2. Indeed Session Check
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM cookies WHERE host_key LIKE '%indeed.com' AND name IN ('INDEED_CSRF_TOKEN', 'indeed_rcc')"
            )
            result["indeed"] = cursor.fetchone()[0] > 0
        except Exception:
            pass

        # 3. Naukri Session Check
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM cookies WHERE host_key LIKE '%naukri.com' AND name IN ('nauk_auth', 'USER_LOGGED_IN', 'nlogin')"
            )
            result["naukri"] = cursor.fetchone()[0] > 0
        except Exception:
            pass

        conn.close()
    except Exception as e:
        logger.debug(f"Notice reading session cookies database: {e}")
    finally:
        try:
            tmp_cookies.unlink(missing_ok=True)
        except Exception:
            pass

    return result
