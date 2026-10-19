import sqlite3
import json
import os
import time
from pathlib import Path
from contextlib import contextmanager

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "jobs.db"

def get_db_connection():
    """
    Creates a thread-safe connection to the SQLite database with WAL mode
    and busy timeout configured for concurrent reads and writes.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn

@contextmanager
def get_db():
    """
    Context manager for database connections ensuring proper commit and close.
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """
    Initializes all required schema tables and indexes.
    """
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            company TEXT NOT NULL,
            logo TEXT NOT NULL,
            source TEXT NOT NULL,
            workMode TEXT NOT NULL,
            atsScore INTEGER NOT NULL,
            dateTime TEXT NOT NULL,
            location TEXT NOT NULL,
            salary TEXT NOT NULL,
            description TEXT NOT NULL,
            skills TEXT NOT NULL,
            applied INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            url TEXT DEFAULT '',
            marked INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
        CREATE INDEX IF NOT EXISTS idx_jobs_role ON jobs(role);
        CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
        CREATE INDEX IF NOT EXISTS idx_jobs_workMode ON jobs(workMode);
        CREATE INDEX IF NOT EXISTS idx_jobs_atsScore ON jobs(atsScore);
        CREATE INDEX IF NOT EXISTS idx_jobs_applied ON jobs(applied);
        CREATE INDEX IF NOT EXISTS idx_jobs_marked ON jobs(marked);

        CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            time TEXT NOT NULL,
            platform TEXT NOT NULL,
            iconType TEXT NOT NULL,
            text TEXT NOT NULL,
            countBadge TEXT,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profile (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            auth_provider TEXT DEFAULT 'google',
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings_ai (
            id TEXT PRIMARY KEY,
            openai_key TEXT,
            openai_model TEXT DEFAULT 'gpt-4o',
            gemini_key TEXT,
            gemini_model TEXT DEFAULT 'gemini-1.5-pro',
            claude_key TEXT,
            claude_model TEXT DEFAULT 'claude-3-5-sonnet',
            mcp_servers TEXT,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings_menu (
            id TEXT PRIMARY KEY,
            items TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS feedback_tickets (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            rating INTEGER DEFAULT 5,
            message TEXT NOT NULL,
            user_email TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pipelines (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            targetRoles TEXT NOT NULL,
            platforms TEXT NOT NULL,
            schedule TEXT NOT NULL,
            frequencyLabel TEXT NOT NULL,
            matchThreshold INTEGER DEFAULT 85,
            appliedCount INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            lastRun TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            mode TEXT DEFAULT 'Auto-Apply',
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS candidate_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            is_active INTEGER DEFAULT 0,
            is_complete INTEGER DEFAULT 0,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user ON candidate_profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_candidate_profiles_active ON candidate_profiles(user_id, is_active);

        CREATE TABLE IF NOT EXISTS explorer_runs (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL,
            jobs_discovered INTEGER DEFAULT 0,
            jobs_retained INTEGER DEFAULT 0,
            started_at INTEGER NOT NULL,
            finished_at INTEGER,
            error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_explorer_runs_status ON explorer_runs(status);
        CREATE INDEX IF NOT EXISTS idx_explorer_runs_profile ON explorer_runs(profile_id);
        """)

        # Schema migrations for jobs table
        for col_def in [
            "url TEXT DEFAULT ''",
            "marked INTEGER DEFAULT 0",
            "profile_id TEXT DEFAULT 'default'",
            "user_id TEXT DEFAULT 'default'"
        ]:
            try:
                conn.execute(f"ALTER TABLE jobs ADD COLUMN {col_def}")
            except Exception:
                pass

        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_marked ON jobs(marked);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_profile ON jobs(profile_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);")
        except Exception:
            pass

        # Schema migrations for activities table
        for col_def in [
            "profile_id TEXT DEFAULT 'default'",
            "user_id TEXT DEFAULT 'default'"
        ]:
            try:
                conn.execute(f"ALTER TABLE activities ADD COLUMN {col_def}")
            except Exception:
                pass

        # Schema migrations for explorer_runs table
        for col_def in [
            "completed_at INTEGER",
            "created_at INTEGER",
            "total_discovered INTEGER DEFAULT 0",
            "total_retained INTEGER DEFAULT 0"
        ]:
            try:
                conn.execute(f"ALTER TABLE explorer_runs ADD COLUMN {col_def}")
            except Exception:
                pass

        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_profile ON activities(profile_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);")
        except Exception:
            pass

        # Ensure default clean AI settings exist if not already present
        cur = conn.cursor()
        existing_settings = cur.execute("SELECT id FROM settings_ai WHERE id = 'default'").fetchone()
        if not existing_settings:
            cur.execute("""
                INSERT INTO settings_ai (id, openai_key, openai_model, gemini_key, gemini_model, claude_key, claude_model, mcp_servers, updated_at)
                VALUES ('default', '', 'gpt-4o', '', 'gemini-1.5-pro', '', 'claude-3-5-sonnet', '[]', ?)
            """, (int(time.time() * 1000),))

        # Ensure default clean blank profile exists if not already present
        default_profile = {
            "general": {
                "firstName": "",
                "lastName": "",
                "fullName": "",
                "email": "",
                "countryCode": "+91",
                "phone": "",
                "address1": "",
                "address2": "",
                "city": "",
                "state": "",
                "zipCode": "",
                "country": "India",
                "bio": "",
                "linkedinUrl": "",
                "portfolioUrl": ""
            },
            "contacts": {
                "fullName": "",
                "email": "",
                "phone": "",
                "location": "",
                "links": ""
            },
            "contactLinks": [],
            "skillsList": [],
            "primarySkill": "",
            "experiences": [],
            "educationList": [],
            "screeningAnswers": [],
            "languages": [],
            "selectedRoles": [],
            "selectedLevels": [],
            "userLocation": "",
            "desiredLocations": [],
            "avoidCompanies": [],
            "avoidSkills": [],
            "avoidSources": [],
            "summary": "",
            "resume": None,
            "avatar": "avatar_1"
        }

        prof_row = cur.execute("SELECT id, data FROM profile WHERE id = 'default'").fetchone()
        if not prof_row:
            cur.execute("INSERT INTO profile (id, data, updated_at) VALUES ('default', ?, ?)", (json.dumps(default_profile), int(time.time() * 1000)))

        # Ensure default candidate profile exists in candidate_profiles table
        cand_row = cur.execute("SELECT id FROM candidate_profiles WHERE id = 'default'").fetchone()
        if not cand_row:
            init_data = prof_row["data"] if prof_row and prof_row["data"] else json.dumps(default_profile)
            cur.execute("""
                INSERT INTO candidate_profiles (id, user_id, name, is_active, is_complete, data, created_at, updated_at)
                VALUES ('default', 'default', 'Primary Profile', 1, 0, ?, ?, ?)
            """, (init_data, int(time.time() * 1000), int(time.time() * 1000)))

        # Ensure default clean menu navigation layout exists if not already present
        menu_row = cur.execute("SELECT id FROM settings_menu WHERE id = 'default'").fetchone()
        if not menu_row:
            default_menu = [
                {"id": "explore", "label": "Explore", "description": "Job Discovery Radar & Live ATS Feed", "enabled": True},
                {"id": "generation", "label": "Generation", "description": "AI Resume & Cover Letter Studio", "enabled": True},
                {"id": "automation", "label": "Automation", "description": "Autonomous Application Pipelines", "enabled": True},
                {"id": "profile", "label": "Profile", "description": "Candidate Identity & ATS Resume Data", "enabled": True},
                {"id": "analytics", "label": "Analytics", "description": "Application Metrics & Conversion Rates", "enabled": True},
                {"id": "tools", "label": "Tools", "description": "MCP Integrations & ATS Diagnostic Utilities", "enabled": True}
            ]
            cur.execute("INSERT INTO settings_menu (id, items, updated_at) VALUES ('default', ?, ?)", (json.dumps(default_menu), int(time.time() * 1000)))

def clear_dummy_data():
    """
    Clears all jobs, activities, pipelines, feedback tickets, search logs, explorer runs, and users,
    restoring the database to a completely brand-new, clean slate.
    """
    with get_db() as conn:
        conn.execute("DELETE FROM jobs;")
        conn.execute("DELETE FROM activities;")
        conn.execute("DELETE FROM pipelines;")
        conn.execute("DELETE FROM feedback_tickets;")
        conn.execute("DELETE FROM search_logs;")
        conn.execute("DELETE FROM explorer_runs;")
        conn.execute("DELETE FROM users;")
    conn = get_db_connection()
    conn.isolation_level = None
    conn.execute("VACUUM;")
    conn.close()
    print("[OK] Database wiped clean: 0 jobs, 0 activities, 0 pipelines, 0 users.")

