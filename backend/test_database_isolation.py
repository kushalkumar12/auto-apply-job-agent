import os
import sqlite3
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Ensure we import database module cleanly
from database import get_db_path, assert_test_database, clear_dummy_data, get_db_connection

class TestDatabaseIsolationSafety(unittest.TestCase):
    """
    Regression test suite proving that active development database
    (backend/jobs.db) is protected against destructive test setups and operations.
    """

    def setUp(self):
        # Save original environment state
        self.orig_env = os.environ.get("SKILL2ROLE_DB_PATH")

    def tearDown(self):
        # Restore environment
        if self.orig_env is not None:
            os.environ["SKILL2ROLE_DB_PATH"] = self.orig_env
        else:
            os.environ.pop("SKILL2ROLE_DB_PATH", None)

    def test_active_dev_db_fails_assert_test_database(self):
        """Proves assert_test_database() blocks explicit active jobs.db path."""
        active_db = str(BASE_DIR / "jobs.db")
        os.environ["SKILL2ROLE_DB_PATH"] = active_db

        with self.assertRaises(RuntimeError) as ctx:
            assert_test_database()
        self.assertIn("CRITICAL SAFETY VIOLATION", str(ctx.exception))
        self.assertIn("active development database", str(ctx.exception))

    def test_default_unset_env_fails_assert_test_database(self):
        """Proves default configuration (pointing to jobs.db) fails safety assertion."""
        os.environ.pop("SKILL2ROLE_DB_PATH", None)
        os.environ.pop("DATABASE_PATH", None)

        with self.assertRaises(RuntimeError) as ctx:
            assert_test_database()
        self.assertIn("CRITICAL SAFETY VIOLATION", str(ctx.exception))

    def test_non_test_filename_fails_assert_test_database(self):
        """Proves filenames without 'test' or 'tmp' are rejected."""
        os.environ["SKILL2ROLE_DB_PATH"] = str(BASE_DIR / "production_mirror.db")

        with self.assertRaises(RuntimeError) as ctx:
            assert_test_database()
        self.assertIn("SAFETY CHECK FAILED", str(ctx.exception))
        self.assertIn("not an approved test database", str(ctx.exception))

    def test_approved_test_db_passes_assertion(self):
        """Proves dedicated test database names pass safety assertion."""
        for valid_name in ["test_jobs.db", "acceptance_test.db", "tmp_jobs.db"]:
            os.environ["SKILL2ROLE_DB_PATH"] = str(BASE_DIR / valid_name)
            # Should not raise any exception
            assert_test_database()

    def test_clear_dummy_data_blocked_on_dev_db(self):
        """Proves clear_dummy_data() raises RuntimeError and refuses to wipe active database."""
        os.environ["SKILL2ROLE_DB_PATH"] = str(BASE_DIR / "jobs.db")

        with self.assertRaises(RuntimeError) as ctx:
            clear_dummy_data(force_test_only=True)
        self.assertIn("CRITICAL SAFETY VIOLATION", str(ctx.exception))

    def test_active_jobs_db_unmodified(self):
        """Verifies that the real development jobs.db remains intact with 25 seeded records."""
        real_db = BASE_DIR / "jobs.db"
        self.assertTrue(real_db.exists(), "Active jobs.db must exist")

        conn = sqlite3.connect(str(real_db))
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        job_count = cur.execute("SELECT COUNT(*) as count FROM jobs").fetchone()["count"]
        conn.close()

        self.assertEqual(job_count, 25, f"Expected 25 jobs in active database, found {job_count}")

if __name__ == "__main__":
    unittest.main()
