"""
SQLite and thread-safe database storage for users, master answer keys, and scorecards.

This module initializes the local SQLite database (evaluation.db), manages user
authentication tables, persists evaluation scorecards, and automatically seeds
the default test user (test / test123).
"""

import sqlite3
import os
import json
import time
from typing import Dict, Optional, List, Any
import bcrypt

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "evaluation.db")


def init_sqlite_db() -> None:
    """
    Initializes SQLite tables for users and scorecards and seeds default test user.
    """
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scorecards (
                evaluation_id TEXT PRIMARY KEY,
                user_id INTEGER,
                exam_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                roll_number TEXT,
                total_score REAL NOT NULL,
                max_score REAL NOT NULL,
                details_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Check and seed default test user (test / test123)
        cursor.execute("SELECT id FROM users WHERE username = 'test'")
        row = cursor.fetchone()
        if not row:
            salt = bcrypt.gensalt()
            hashed_pwd = bcrypt.hashpw(b"test123", salt).decode("utf-8")
            cursor.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                ("test", hashed_pwd)
            )
        conn.commit()


# Run initialization on import
init_sqlite_db()


class SQLiteDatabase:
    """
    Persistent SQLite storage and memory-backed cache for evaluation state.
    """
    def __init__(self, db_path: str = DB_PATH):
        """
        Initializes connection settings and memory caches.
        """
        self.db_path = db_path
        self.master_keys: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.evaluation_results: Dict[str, Dict[str, Any]] = {}

    def get_connection(self) -> sqlite3.Connection:
        """
        Returns a sqlite3 connection configured with Row factory.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # --- User operations ---

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves user record by unique username.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, password_hash, created_at FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    def create_user(self, username: str, password_hash: str) -> Optional[int]:
        """
        Creates a new user record and returns the assigned user ID.
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                    (username, password_hash)
                )
                conn.commit()
                return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

    # --- Master Key operations ---

    def save_master_key(self, exam_id: str, key_data: Dict[str, Any]) -> None:
        """
        Saves a master answer key indexed by its unique exam identifier.
        """
        self.master_keys[exam_id] = key_data

    def get_master_key(self, exam_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a master answer key by exam identifier.
        """
        return self.master_keys.get(exam_id)

    def list_master_keys(self) -> List[str]:
        """
        Returns a list of all registered exam identifiers in the database.
        """
        return list(self.master_keys.keys())

    # --- Scorecard operations ---

    def save_scorecard(self, evaluation_id: str, scorecard_data: Dict[str, Any], user_id: Optional[int] = None) -> None:
        """
        Saves a generated student scorecard in memory and SQLite database.
        """
        self.evaluation_results[evaluation_id] = scorecard_data

        exam_id = scorecard_data.get("exam_id", "JEE_MAIN_EXAM")
        mode = scorecard_data.get("evaluation_mode", "omr_standard")
        roll_number = scorecard_data.get("student_metadata", {}).get("roll_number", "UNKNOWN")
        total_score = scorecard_data.get("total_score", 0.0)
        max_score = scorecard_data.get("max_possible_score", 300.0)
        details_json = json.dumps(scorecard_data, default=str)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO scorecards 
                (evaluation_id, user_id, exam_id, mode, roll_number, total_score, max_score, details_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (evaluation_id, user_id, exam_id, mode, roll_number, total_score, max_score, details_json))
            conn.commit()

    def get_scorecard(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves an evaluation scorecard by evaluation identifier from memory or SQLite.
        """
        if evaluation_id in self.evaluation_results:
            return self.evaluation_results[evaluation_id]

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT details_json FROM scorecards WHERE evaluation_id = ?", (evaluation_id,))
            row = cursor.fetchone()
            if row:
                data = json.loads(row["details_json"])
                self.evaluation_results[evaluation_id] = data
                return data
        return None

    def list_user_scorecards(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Returns all recent scorecards for a specific authenticated user.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT evaluation_id, exam_id, mode, roll_number, total_score, max_score, created_at
                FROM scorecards WHERE user_id = ? ORDER BY created_at DESC
            """, (user_id,))
            return [dict(r) for r in cursor.fetchall()]


db = SQLiteDatabase()
