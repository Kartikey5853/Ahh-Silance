"""
Pytest configuration that isolates tests from the live development SQLite database
and live uploads directory so running tests never pollutes real user records.
"""

import os
import tempfile
import atexit
import shutil

_TEST_TMP_DIR = tempfile.mkdtemp(prefix="neira_pytest_")
_TEST_DB_PATH = os.path.join(_TEST_TMP_DIR, "test_evaluation.db")
_TEST_UPLOADS_DIR = os.path.join(_TEST_TMP_DIR, "uploads_evaluations")
os.makedirs(_TEST_UPLOADS_DIR, exist_ok=True)

# Must be set before any test imports backend.core.database or backend.main
os.environ["EVALUATION_DB_PATH"] = _TEST_DB_PATH
os.environ["EVALUATION_UPLOADS_DIR"] = _TEST_UPLOADS_DIR


def _cleanup_test_tmp_dir() -> None:
    shutil.rmtree(_TEST_TMP_DIR, ignore_errors=True)


atexit.register(_cleanup_test_tmp_dir)


def pytest_configure(config) -> None:
    """Ensures db singleton and schema point to the isolated temporary DB."""
    import backend.core.database as db_mod
    db_mod.DB_PATH = _TEST_DB_PATH
    db_mod.db.db_path = _TEST_DB_PATH
    db_mod.init_sqlite_db(_TEST_DB_PATH)
