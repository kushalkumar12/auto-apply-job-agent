import sqlite3
import json
import os
import time
from pathlib import Path
from contextlib import contextmanager

BASE_DIR = Path(__file__).resolve().parent

def get_db_path() -> Path:
    override = os.environ.get("SKILL2ROLE_DB_PATH") or os.environ.get("DATABASE_PATH")
    if override:
        return Path(override).resolve()
    return (BASE_DIR / "jobs.db").resolve()

# Default reference (dynamically refreshed via get_db_path)
DB_PATH = get_db_path()

def assert_test_database():
    """
    Safety guard to ensure destructive test/reset operations can NEVER
    run against the active development or production database.
    """
    target_path = get_db_path()
    active_dev_path = (BASE_DIR / "jobs.db").resolve()

    if target_path == active_dev_path:
        raise RuntimeError(
            f"CRITICAL SAFETY VIOLATION: Attempted destructive database operation on "
            f"active development database ({target_path}). "
            f"Set SKILL2ROLE_DB_PATH to a dedicated test database (containing 'test') before running tests."
        )

    name = target_path.name.lower()
    path_str = str(target_path).lower()
    if ":memory:" not in path_str and "test" not in name and "tmp" not in path_str:
        raise RuntimeError(
            f"SAFETY CHECK FAILED: Configured database path ({target_path}) is not an approved test database. "
            f"Approved test databases must contain 'test' or 'tmp' in the filename or path."
        )

def get_db_connection():
    """
    Creates a thread-safe connection to the SQLite database with WAL mode
    and busy timeout configured for concurrent reads and writes.
    """
    target_path = get_db_path()
    conn = sqlite3.connect(str(target_path), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA foreign_keys = ON;")
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
            role TEXT DEFAULT 'user',
            sessions_invalidated_before INTEGER DEFAULT 0,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            token_family TEXT NOT NULL,
            is_revoked INTEGER DEFAULT 0,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(token_family);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

        CREATE TABLE IF NOT EXISTS revoked_tokens (
            jti TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            revoked_at INTEGER NOT NULL,
            reason TEXT DEFAULT 'logout'
        );
        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user ON revoked_tokens(user_id);

        CREATE TABLE IF NOT EXISTS password_resets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at INTEGER NOT NULL,
            used INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash);
        CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_info TEXT,
            ip_address TEXT,
            created_at INTEGER NOT NULL,
            last_seen_at INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

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
            user_id TEXT NOT NULL DEFAULT 'default',
            profile_id TEXT NOT NULL DEFAULT 'default',
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

        CREATE TABLE IF NOT EXISTS job_bookmarks (
            user_id TEXT NOT NULL,
            profile_id TEXT NOT NULL DEFAULT 'default',
            job_id INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (user_id, profile_id, job_id)
        );
        CREATE INDEX IF NOT EXISTS idx_job_bookmarks_job ON job_bookmarks(job_id);

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

        -- ======================================================================
        -- STAGE 2 RAG SUBSYSTEM SCHEMAS
        -- ======================================================================
        CREATE TABLE IF NOT EXISTS resume_files (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_bytes BLOB NOT NULL,
            file_size INTEGER NOT NULL,
            content_type TEXT NOT NULL DEFAULT 'application/pdf',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_resume_files_user ON resume_files(user_id);
        CREATE INDEX IF NOT EXISTS idx_resume_files_profile ON resume_files(profile_id);

        CREATE TABLE IF NOT EXISTS career_documents (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default',
            profile_id TEXT NOT NULL DEFAULT 'default',
            document_type TEXT NOT NULL,          -- 'master_resume', 'portfolio', 'certification'
            original_filename TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            content_hash TEXT NOT NULL,           -- SHA-256 for change detection & deduplication
            document_version INTEGER NOT NULL DEFAULT 1,
            processing_status TEXT NOT NULL,      -- 'pending', 'processing', 'indexed', 'failed'
            error_message TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_career_docs_profile ON career_documents(profile_id);

        CREATE TABLE IF NOT EXISTS career_facts (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            profile_id TEXT NOT NULL DEFAULT 'default',
            fact_type TEXT NOT NULL,              -- 'skill', 'employment', 'responsibility', 'project', 'achievement', 'education', 'metric'
            fact_text TEXT NOT NULL,
            normalized_value TEXT,                -- e.g. 'Java', '10 Years', '40% Latency Reduction'
            verification_status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'inferred', 'flagged'
            source_section TEXT,                  -- 'Experience: Swiggy', 'Skills: Backend'
            source_line INTEGER,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (document_id) REFERENCES career_documents(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_career_facts_doc ON career_facts(document_id);
        CREATE INDEX IF NOT EXISTS idx_career_facts_profile ON career_facts(profile_id);

        CREATE TABLE IF NOT EXISTS document_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            profile_id TEXT NOT NULL DEFAULT 'default',
            section_type TEXT NOT NULL,           -- 'summary', 'experience', 'skills', 'projects', 'education'
            section_title TEXT NOT NULL,
            chunk_text TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            chunk_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (document_id) REFERENCES career_documents(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
        CREATE INDEX IF NOT EXISTS idx_chunks_profile ON document_chunks(profile_id);

        CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
            chunk_id UNINDEXED,
            profile_id UNINDEXED,
            section_type,
            section_title,
            chunk_text,
            tokenize = 'porter unicode61'
        );

        CREATE TRIGGER IF NOT EXISTS trg_document_chunks_ai AFTER INSERT ON document_chunks BEGIN
            INSERT INTO document_chunks_fts(chunk_id, profile_id, section_type, section_title, chunk_text)
            VALUES (new.id, new.profile_id, new.section_type, new.section_title, new.chunk_text);
        END;

        CREATE TRIGGER IF NOT EXISTS trg_document_chunks_ad AFTER DELETE ON document_chunks BEGIN
            DELETE FROM document_chunks_fts WHERE chunk_id = old.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_document_chunks_au AFTER UPDATE ON document_chunks BEGIN
            DELETE FROM document_chunks_fts WHERE chunk_id = old.id;
            INSERT INTO document_chunks_fts(chunk_id, profile_id, section_type, section_title, chunk_text)
            VALUES (new.id, new.profile_id, new.section_type, new.section_title, new.chunk_text);
        END;

        CREATE TABLE IF NOT EXISTS chunk_embeddings (
            chunk_id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            profile_id TEXT NOT NULL DEFAULT 'default',
            embedding BLOB NOT NULL,             -- 768 float32 numbers packed as 3072 raw bytes
            embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-2',
            vector_dimension INTEGER NOT NULL DEFAULT 768,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE,
            FOREIGN KEY (document_id) REFERENCES career_documents(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_embeddings_profile ON chunk_embeddings(profile_id);

        CREATE TABLE IF NOT EXISTS job_requirements (
            job_id INTEGER PRIMARY KEY,
            required_skills TEXT NOT NULL,       -- JSON Array
            preferred_skills TEXT NOT NULL,      -- JSON Array
            seniority_level TEXT,
            experience_years REAL,
            responsibilities TEXT NOT NULL,      -- JSON Array
            raw_keywords TEXT NOT NULL,          -- JSON Array
            analyzed_at INTEGER NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tailored_resumes (
            id TEXT PRIMARY KEY,
            job_id INTEGER NOT NULL,
            profile_id TEXT NOT NULL DEFAULT 'default',
            generation_version INTEGER NOT NULL DEFAULT 1,
            target_role TEXT NOT NULL,
            target_company TEXT NOT NULL,
            ats_score INTEGER NOT NULL,
            matched_skills TEXT NOT NULL,        -- JSON Array
            missing_skills TEXT NOT NULL,        -- JSON Array
            tailored_summary TEXT NOT NULL,
            structured_content TEXT NOT NULL,    -- Complete JSON
            markdown_content TEXT NOT NULL,
            validation_status TEXT NOT NULL,     -- 'verified', 'flagged'
            validation_report TEXT NOT NULL,     -- JSON
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_tailored_resumes_job ON tailored_resumes(job_id);
        CREATE INDEX IF NOT EXISTS idx_tailored_resumes_profile ON tailored_resumes(profile_id);

        CREATE TABLE IF NOT EXISTS resume_evidence (
            id TEXT PRIMARY KEY,
            resume_id TEXT NOT NULL,
            bullet_id TEXT NOT NULL,
            source_fact_id TEXT,
            source_chunk_id TEXT,
            validation_status TEXT NOT NULL DEFAULT 'supported', -- 'supported', 'inferred', 'flagged'
            similarity_score REAL,
            FOREIGN KEY (resume_id) REFERENCES tailored_resumes(id) ON DELETE CASCADE,
            FOREIGN KEY (source_fact_id) REFERENCES career_facts(id) ON DELETE SET NULL,
            FOREIGN KEY (source_chunk_id) REFERENCES document_chunks(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_resume ON resume_evidence(resume_id);
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

        # Schema migrations for users table (OWASP ASVS / RBAC / Lockout / Invalidation)
        for col_def in [
            "role TEXT DEFAULT 'user'",
            "sessions_invalidated_before INTEGER DEFAULT 0",
            "failed_login_attempts INTEGER DEFAULT 0",
            "locked_until INTEGER DEFAULT 0"
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col_def}")
            except Exception:
                pass

        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);")
        except Exception:
            pass

        # Schema migrations for pipelines table (User & Profile isolation)
        for col_def in [
            "user_id TEXT DEFAULT 'default'",
            "profile_id TEXT DEFAULT 'default'"
        ]:
            try:
                conn.execute(f"ALTER TABLE pipelines ADD COLUMN {col_def}")
            except Exception:
                pass

        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pipelines_user ON pipelines(user_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pipelines_profile ON pipelines(profile_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pipelines_user_profile ON pipelines(user_id, profile_id);")
        except Exception:
            pass

        # Schema migrations for job_bookmarks table (Profile-scoped bookmarks)
        for col_def in [
            "profile_id TEXT DEFAULT 'default'"
        ]:
            try:
                conn.execute(f"ALTER TABLE job_bookmarks ADD COLUMN {col_def}")
            except Exception:
                pass

        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_job_bookmarks_profile ON job_bookmarks(profile_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_job_bookmarks_user_profile ON job_bookmarks(user_id, profile_id);")
        except Exception:
            pass

        # Ensure default clean AI settings exist if not already present
        cur = conn.cursor()
        existing_settings = cur.execute("SELECT id FROM settings_ai WHERE id = 'default'").fetchone()
        if not existing_settings:
            cur.execute("""
                INSERT INTO settings_ai (id, openai_key, openai_model, gemini_key, gemini_model, claude_key, claude_model, mcp_servers, updated_at)
                VALUES ('default', '', 'gpt-4o', '', 'gemini-3.6-flash', '', 'claude-3-5-sonnet', '[]', ?)
            """, (int(time.time() * 1000),))

        # Schema migrations for settings_ai table
        for col_def in [
            "gemini_embedding_model TEXT DEFAULT 'gemini-embedding-2'"
        ]:
            try:
                conn.execute(f"ALTER TABLE settings_ai ADD COLUMN {col_def}")
            except Exception:
                pass

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
                {"id": "profile", "label": "Job Profile", "description": "Candidate Identity & ATS Resume Data", "enabled": True},
                {"id": "analytics", "label": "Analytics", "description": "Application Metrics & Conversion Rates", "enabled": True},
                {"id": "tools", "label": "Tools", "description": "MCP Integrations & ATS Diagnostic Utilities", "enabled": True}
            ]
            cur.execute("INSERT INTO settings_menu (id, items, updated_at) VALUES ('default', ?, ?)", (json.dumps(default_menu), int(time.time() * 1000)))

def clear_dummy_data(force_test_only: bool = True):
    """
    Clears all jobs, activities, pipelines, feedback tickets, search logs, explorer runs, and users,
    restoring the database to a completely brand-new, clean slate.
    Enforces assert_test_database() unless explicitly overridden with force_test_only=False.
    """
    if force_test_only:
        assert_test_database()
    with get_db() as conn:
        conn.execute("DELETE FROM jobs;")
        conn.execute("DELETE FROM activities;")
        conn.execute("DELETE FROM pipelines;")
        conn.execute("DELETE FROM feedback_tickets;")
        conn.execute("DELETE FROM search_logs;")
        conn.execute("DELETE FROM explorer_runs;")
        conn.execute("DELETE FROM candidate_profiles;")
        conn.execute("DELETE FROM job_bookmarks;")
        conn.execute("DELETE FROM tailored_resumes;")
        conn.execute("DELETE FROM career_documents;")
        conn.execute("DELETE FROM career_facts;")
        conn.execute("DELETE FROM document_chunks;")
        conn.execute("DELETE FROM chunk_embeddings;")
        conn.execute("DELETE FROM users;")
        conn.execute("DELETE FROM refresh_tokens;")
        conn.execute("DELETE FROM revoked_tokens;")
        conn.execute("DELETE FROM password_resets;")
        conn.execute("DELETE FROM user_sessions;")
    conn = get_db_connection()
    conn.isolation_level = None
    conn.execute("VACUUM;")
    conn.close()
    print("[OK] Database wiped clean: 0 jobs, 0 activities, 0 pipelines, 0 users.")


def backup_database(dest_path: Path = None) -> Path:
    """
    Performs safe online backup using SQLite's native backup API.
    Guarantees consistent snapshot without table locking.
    """
    if dest_path is None:
        dest_path = BASE_DIR / "backups" / f"jobs_backup_{int(time.time())}.db"
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as source_conn:
        dest_conn = sqlite3.connect(str(dest_path))
        try:
            source_conn.backup(dest_conn, pages=100)
        finally:
            dest_conn.close()
    return dest_path

