"""
SQLite and thread-safe database storage for academic institutions, subjects,
students, exams, master answer keys, and scorecards.

This module initializes the local SQLite database (evaluation.db), manages user
profiles, institutions (College, School, Competitive), subject hierarchies,
enrolled students, exams with Gemini-scanned questions, and strict evaluations.
"""

import sqlite3
import os
import json
import time
import datetime
import uuid
from typing import Dict, Optional, List, Any
import bcrypt

DB_PATH = os.environ.get("EVALUATION_DB_PATH") or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "evaluation.db")


def _add_column_if_not_exists(cursor: sqlite3.Cursor, table: str, column_name: str, column_def: str) -> None:
    """Safely adds a column to an existing table if it does not already exist."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    if column_name not in columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_name} {column_def}")


def init_sqlite_db(db_path: Optional[str] = None) -> None:
    """
    Initializes SQLite tables for users, institutions, subjects, students,
    exams, scorecards, and evaluations. Seeds default professor profile and demo course.
    """
    target_path = db_path or os.environ.get("EVALUATION_DB_PATH") or DB_PATH
    with sqlite3.connect(target_path) as conn:
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        _add_column_if_not_exists(cursor, "users", "full_name", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "users", "email", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "users", "role", "TEXT DEFAULT 'Professor'")
        _add_column_if_not_exists(cursor, "users", "department", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "users", "institution_id", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "users", "gemini_api_key", "TEXT DEFAULT ''")

        # 2. Institutions Table (College, School, Competitive)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS institutions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'college', 'school', 'competitive'
                code TEXT,
                config_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2.1 Classes Table (Hierarchy: Organization -> Class -> Subject)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS classes (
                id TEXT PRIMARY KEY,
                institution_id TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT,
                department TEXT,
                academic_year TEXT DEFAULT '2026-2027',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        _add_column_if_not_exists(cursor, "classes", "start_date", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "classes", "end_date", "TEXT DEFAULT ''")

        # 3. Subjects Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subjects (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                institution_id TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                institution_type TEXT NOT NULL,
                semester_or_grade TEXT,
                credits INTEGER DEFAULT 4,
                academic_year TEXT DEFAULT '2026-2027',
                chapters_json TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        _add_column_if_not_exists(cursor, "subjects", "class_id", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "subjects", "grading_system", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "subjects", "theory_practical_split", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "subjects", "board_or_program", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "subjects", "ltp_hours", "TEXT DEFAULT '3-1-0'")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_inst_code ON subjects(institution_id, code)")

        # 4. Students Table (Added one-by-one per subject / class)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                name TEXT NOT NULL,
                roll_number TEXT NOT NULL,
                email TEXT,
                section TEXT DEFAULT 'A',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        _add_column_if_not_exists(cursor, "students", "class_id", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "phone", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "parent_name", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "parent_phone", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "dob", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "blood_group", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "attendance_percentage", "REAL DEFAULT 85.0")
        _add_column_if_not_exists(cursor, "students", "cgpa_or_percentage", "REAL DEFAULT 0.0")
        _add_column_if_not_exists(cursor, "students", "admission_year", "TEXT DEFAULT '2024'")
        _add_column_if_not_exists(cursor, "students", "status", "TEXT DEFAULT 'Active'")
        _add_column_if_not_exists(cursor, "students", "notes", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "students", "semester_records_json", "TEXT DEFAULT '[]'")

        # 5. Exams Table (With question paper, scanned questions, rubrics, answer keys)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS exams (
                id TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                title TEXT NOT NULL,
                exam_type TEXT NOT NULL,
                max_marks REAL NOT NULL DEFAULT 50.0,
                passing_marks REAL NOT NULL DEFAULT 20.0,
                academic_year TEXT DEFAULT '2026-2027',
                exam_date TEXT,
                question_paper_filename TEXT,
                answer_key_text TEXT,
                questions_json TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        _add_column_if_not_exists(cursor, "exams", "correction_deadline", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "exams", "paper_id", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "exams", "paper_page_count", "INTEGER DEFAULT 0")
        _add_column_if_not_exists(cursor, "exams", "target_section", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "exams", "answer_key_json", "TEXT DEFAULT '{}'")

        # 6. Academic Evaluations Table (Strict evaluated student papers)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS academic_evaluations (
                id TEXT PRIMARY KEY,
                exam_id TEXT NOT NULL,
                student_id TEXT NOT NULL,
                roll_number TEXT NOT NULL,
                student_name TEXT NOT NULL,
                answer_sheet_filename TEXT,
                total_score REAL NOT NULL,
                max_score REAL NOT NULL,
                percentage REAL NOT NULL,
                grade TEXT,
                breakdown_json TEXT NOT NULL,
                teacher_feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        _add_column_if_not_exists(cursor, "academic_evaluations", "page_count", "INTEGER DEFAULT 1")
        _add_column_if_not_exists(cursor, "academic_evaluations", "magic_ink_json", "TEXT DEFAULT '{}'")
        _add_column_if_not_exists(cursor, "academic_evaluations", "pages_dir", "TEXT DEFAULT ''")
        _add_column_if_not_exists(cursor, "academic_evaluations", "structured_transcription_json", "TEXT DEFAULT '[]'")

        # 7. Legacy Scorecards Table (For backwards compatibility with JEE pipeline)
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

        conn.commit()


# Run initialization on import
init_sqlite_db()


class SQLiteDatabase:
    """
    Persistent SQLite storage and memory-backed cache for evaluation state,
    institutions, subjects, students, exams, and strict grading.
    """
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.environ.get("EVALUATION_DB_PATH") or DB_PATH
        self.master_keys: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.evaluation_results: Dict[str, Dict[str, Any]] = {}

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # --- User operations ---

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, username, password_hash, full_name, email, role, department, institution_id, gemini_api_key, created_at
                FROM users WHERE username = ?
            """, (username,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, username, full_name, email, role, department, institution_id, gemini_api_key, created_at
                FROM users WHERE id = ?
            """, (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    def update_user_profile(self, user_id: int, updates: Dict[str, Any]) -> bool:
        allowed = ["full_name", "email", "role", "department", "institution_id", "gemini_api_key"]
        fields = []
        values = []
        for k, v in updates.items():
            if k in allowed:
                fields.append(f"{k} = ?")
                values.append(v)
        if not fields:
            return False
        values.append(user_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", tuple(values))
            conn.commit()
            return cursor.rowcount > 0

    def create_user(
        self,
        username: str,
        password_hash: str,
        full_name: str = "",
        email: str = "",
        role: str = "Professor",
        department: str = "",
        institution_id: str = "",
        gemini_api_key: str = ""
    ) -> Optional[int]:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO users (username, password_hash, full_name, email, role, department, institution_id, gemini_api_key)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (username, password_hash, full_name, email, role, department, institution_id, gemini_api_key)
                )
                conn.commit()
                return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

    def list_users(self, institution_id: Optional[str] = None, role: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lists registered users (excluding password hashes) with workload stats.
        Optionally filtered by institution_id or role.
        """
        query = """
            SELECT id, username, full_name, email, role, department, institution_id, created_at
            FROM users WHERE 1=1
        """
        params: List[Any] = []
        if institution_id:
            query += " AND (institution_id = ? OR institution_id = '' OR institution_id IS NULL)"
            params.append(institution_id)
        if role:
            query += " AND LOWER(role) = LOWER(?)"
            params.append(role)
        query += " ORDER BY id ASC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            results = []
            for r in cursor.fetchall():
                d = dict(r)
                # Count assigned subjects
                c2 = conn.cursor()
                c2.execute("SELECT COUNT(*) FROM subjects WHERE user_id = ?", (d["id"],))
                d["subjects_count"] = c2.fetchone()[0]
                results.append(d)
            return results

    def admin_update_user_role(self, user_id: int, new_role: str, department: Optional[str] = None) -> bool:
        """
        Updates a user's role (e.g. Teacher, HOD, Coordinator, Admin) and optional department.
        """
        updates = ["role = ?"]
        params: List[Any] = [new_role]
        if department is not None:
            updates.append("department = ?")
            params.append(department)
        params.append(user_id)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", tuple(params))
            conn.commit()
            return cursor.rowcount > 0

    def admin_reassign_teacher_subjects(self, from_user_id: int, to_user_id: int) -> int:
        """
        Transfers all subjects from one faculty member to another.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE subjects SET user_id = ? WHERE user_id = ?", (to_user_id, from_user_id))
            conn.commit()
            return cursor.rowcount

    def admin_reassign_subject_teacher(self, subject_id: str, new_user_id: int) -> bool:
        """
        Assigns a specific subject to a teacher.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE subjects SET user_id = ? WHERE id = ?", (new_user_id, subject_id))
            conn.commit()
            return cursor.rowcount > 0

    def admin_reset_user_password(self, user_id: int, new_password_hash: str) -> bool:
        """
        Resets user password hash.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def admin_delete_user(self, user_id: int) -> bool:
        """
        Removes a user account. Any assigned subjects become orphaned (user_id = 0) so course data is preserved.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE subjects SET user_id = 0 WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            return cursor.rowcount > 0

    def admin_transfer_student(self, student_id: str, to_class_id: str, to_section: Optional[str] = None) -> bool:
        """
        Moves a student to a different class cohort and optionally updates section.
        """
        updates = ["class_id = ?"]
        params: List[Any] = [to_class_id]
        if to_section is not None:
            updates.append("section = ?")
            params.append(to_section)
        params.append(student_id)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE students SET {', '.join(updates)} WHERE id = ?", tuple(params))
            conn.commit()
            return cursor.rowcount > 0

    def admin_get_system_health(self, institution_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Computes comprehensive diagnostic metrics and highlights operational bottlenecks.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Faculty stats
            cursor.execute("SELECT COUNT(*) FROM users")
            total_users = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM users WHERE LOWER(role) LIKE '%admin%'")
            total_admins = cursor.fetchone()[0]
            total_faculty = total_users - total_admins

            # 2. Student stats
            cursor.execute("SELECT COUNT(*) FROM students")
            total_students = cursor.fetchone()[0]

            # 3. Class and Subject stats
            cursor.execute("SELECT COUNT(*) FROM classes")
            total_classes = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM subjects")
            total_subjects = cursor.fetchone()[0]

            # 4. Exams & Evaluations stats
            cursor.execute("SELECT COUNT(*) FROM exams")
            total_exams = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM academic_evaluations")
            total_evaluations = cursor.fetchone()[0]

            # 5. Overdue / bottleneck exams
            today_str = datetime.date.today().strftime("%Y-%m-%d")
            cursor.execute("""
                SELECT e.id, e.title, e.subject_id, e.exam_date, e.correction_deadline,
                       (SELECT COUNT(*) FROM academic_evaluations ae WHERE ae.exam_id = e.id) as evals_count
                FROM exams e
                WHERE e.correction_deadline != '' AND e.correction_deadline < ?
                ORDER BY e.correction_deadline ASC
            """, (today_str,))
            overdue_exams = [dict(r) for r in cursor.fetchall()]

            # 6. Exams missing question paper or answer key
            cursor.execute("""
                SELECT id, title, subject_id, exam_date,
                       (question_paper_filename = '' OR question_paper_filename IS NULL) as missing_paper,
                       (answer_key_text = '' AND (answer_key_json = '{}' OR answer_key_json = '' OR answer_key_json IS NULL)) as missing_key
                FROM exams
                WHERE (question_paper_filename = '' OR question_paper_filename IS NULL)
                   OR (answer_key_text = '' AND (answer_key_json = '{}' OR answer_key_json = '' OR answer_key_json IS NULL))
            """)
            incomplete_exams = [dict(r) for r in cursor.fetchall()]

            # 7. Orphaned subjects (assigned to user_id = 0 or user that does not exist)
            cursor.execute("""
                SELECT s.id, s.name, s.code, s.class_id, s.institution_id, s.user_id
                FROM subjects s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE u.id IS NULL OR s.user_id = 0
            """)
            orphaned_subjects = [dict(r) for r in cursor.fetchall()]

            # 8. Empty classes (0 enrolled students)
            cursor.execute("""
                SELECT c.id, c.name, c.code, c.department
                FROM classes c
                WHERE (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) = 0
            """)
            empty_classes = [dict(r) for r in cursor.fetchall()]

            return {
                "total_users": total_users,
                "total_faculty": total_faculty,
                "total_admins": total_admins,
                "total_students": total_students,
                "total_classes": total_classes,
                "total_subjects": total_subjects,
                "total_exams": total_exams,
                "total_evaluations": total_evaluations,
                "overdue_exams": overdue_exams,
                "incomplete_exams": incomplete_exams,
                "orphaned_subjects": orphaned_subjects,
                "empty_classes": empty_classes,
                "healthy": len(overdue_exams) == 0 and len(orphaned_subjects) == 0
            }

    def admin_fix_orphans(self, fallback_user_id: int) -> int:
        """
        Reassigns all orphaned subjects to the fallback admin/faculty user.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE subjects SET user_id = ?
                WHERE user_id = 0 OR user_id NOT IN (SELECT id FROM users)
            """, (fallback_user_id,))
            conn.commit()
            return cursor.rowcount

    def update_institution(self, inst_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Updates organization parameters (name, code, type, config).
        """
        allowed = ["name", "code", "type"]
        fields = []
        values = []
        for k in allowed:
            if k in updates and updates[k] is not None:
                fields.append(f"{k} = ?")
                values.append(updates[k])
        if "config" in updates and updates["config"] is not None:
            fields.append("config_json = ?")
            values.append(json.dumps(updates["config"]))

        if fields:
            values.append(inst_id)
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"UPDATE institutions SET {', '.join(fields)} WHERE id = ?", tuple(values))
                conn.commit()
        return self.get_institution(inst_id)

    # --- Institution operations ---

    def list_institutions(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, type, code, config_json, created_at FROM institutions ORDER BY created_at ASC")
            results = []
            for r in cursor.fetchall():
                d = dict(r)
                d["config"] = json.loads(d["config_json"])
                results.append(d)
            return results

    def get_institution(self, institution_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, type, code, config_json, created_at FROM institutions WHERE id = ?", (institution_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["config"] = json.loads(d["config_json"])
                return d
        return None

    def create_institution(self, inst_id: str, name: str, inst_type: str, code: str, config: Dict[str, Any]) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO institutions (id, name, type, code, config_json)
                VALUES (?, ?, ?, ?, ?)
            """, (inst_id, name, inst_type, code, json.dumps(config)))
            conn.commit()
        return self.get_institution(inst_id) # type: ignore

    # --- Class operations (Organization -> Class -> Subject) ---

    def list_classes(self, institution_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT id, institution_id, name, code, department, academic_year, start_date, end_date, created_at FROM classes"
        params: List[Any] = []
        if institution_id:
            query += " WHERE institution_id = ?"
            params.append(institution_id)
        query += " ORDER BY created_at DESC"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            results = []
            for r in cursor.fetchall():
                d = dict(r)
                cursor2 = conn.cursor()
                cursor2.execute("SELECT COUNT(*) FROM subjects WHERE class_id = ?", (d["id"],))
                d["subjects_count"] = cursor2.fetchone()[0]
                cursor2.execute("SELECT COUNT(*) FROM students WHERE class_id = ?", (d["id"],))
                d["students_count"] = cursor2.fetchone()[0]
                results.append(d)
            return results

    def get_class(self, class_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, institution_id, name, code, department, academic_year, start_date, end_date, created_at FROM classes WHERE id = ?", (class_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                cursor.execute("SELECT COUNT(*) FROM subjects WHERE class_id = ?", (d["id"],))
                d["subjects_count"] = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM students WHERE class_id = ?", (d["id"],))
                d["students_count"] = cursor.fetchone()[0]
                return d
            return None

    def create_class(self, data: Dict[str, Any]) -> Dict[str, Any]:
        class_id = data.get("id") or f"class-{uuid.uuid4().hex[:8]}"
        today = datetime.date.today()
        default_start = today.strftime("%Y-%m-%d")
        default_end = (today + datetime.timedelta(days=182)).strftime("%Y-%m-%d")

        start_date = data.get("start_date") or default_start
        end_date = data.get("end_date") or default_end
        name = (data.get("name") or "New Class").strip()
        code = (data.get("code") or "").strip()
        inst_id = data.get("institution_id", "")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            if code and inst_id:
                cursor.execute("SELECT id FROM classes WHERE UPPER(TRIM(code)) = UPPER(?) AND institution_id = ?", (code, inst_id))
                existing = cursor.fetchone()
                if existing:
                    return self.get_class(existing[0]) # type: ignore

            cursor.execute("""
                INSERT INTO classes (id, institution_id, name, code, department, academic_year, start_date, end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                class_id,
                inst_id,
                name,
                code,
                data.get("department", "Computer Science"),
                data.get("academic_year", "2026-2027"),
                start_date,
                end_date
            ))
            conn.commit()
        return self.get_class(class_id) # type: ignore

    def delete_class(self, class_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM classes WHERE id = ?", (class_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Subject operations ---

    def list_subjects(self, user_id: Optional[int] = None, institution_id: Optional[str] = None, class_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT id, user_id, institution_id, class_id, name, code, institution_type, semester_or_grade, credits, academic_year, chapters_json, grading_system, theory_practical_split, board_or_program, ltp_hours, created_at FROM subjects WHERE 1=1"
        params: List[Any] = []
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if institution_id:
            query += " AND institution_id = ?"
            params.append(institution_id)
        if class_id:
            query += " AND class_id = ?"
            params.append(class_id)
        query += " ORDER BY created_at DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            results = []
            for r in cursor.fetchall():
                d = dict(r)
                d["chapters"] = json.loads(d.get("chapters_json") or "[]")
                # Count enrolled students
                cursor2 = conn.cursor()
                cursor2.execute("SELECT COUNT(*) FROM students WHERE subject_id = ?", (d["id"],))
                d["enrolled_students"] = cursor2.fetchone()[0]
                # Count scheduled exams
                cursor2.execute("SELECT COUNT(*) FROM exams WHERE subject_id = ?", (d["id"],))
                d["exams_count"] = cursor2.fetchone()[0]
                results.append(d)
            return results

    def get_subject(self, subject_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, institution_id, class_id, name, code, institution_type, semester_or_grade, credits, academic_year, chapters_json, grading_system, theory_practical_split, board_or_program, ltp_hours, created_at
                FROM subjects WHERE id = ?
            """, (subject_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["chapters"] = json.loads(d.get("chapters_json") or "[]")
                cursor.execute("SELECT COUNT(*) FROM students WHERE subject_id = ?", (subject_id,))
                d["enrolled_students"] = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM exams WHERE subject_id = ?", (subject_id,))
                d["exams_count"] = cursor.fetchone()[0]
                return d
        return None

    def create_subject(self, data: Dict[str, Any]) -> Dict[str, Any]:
        sub_id = data.get("id") or f"subj-{uuid.uuid4().hex[:8]}"
        chapters = data.get("chapters", [])
        code = (data.get("code") or "SUB-101").strip()
        inst_id = data.get("institution_id", "")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Prevent duplicate subject codes: reuse existing subject if code matches
            cursor.execute(
                "SELECT id FROM subjects WHERE UPPER(TRIM(code)) = UPPER(?)",
                (code,)
            )
            existing = cursor.fetchone()
            if existing:
                return self.get_subject(existing[0]) # type: ignore

            cursor.execute("""
                INSERT INTO subjects (
                    id, user_id, institution_id, class_id, name, code, institution_type,
                    semester_or_grade, credits, academic_year, chapters_json,
                    grading_system, theory_practical_split, board_or_program, ltp_hours
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                sub_id,
                data.get("user_id", 1),
                data.get("institution_id", ""),
                data.get("class_id", ""),
                data.get("name", "New Subject"),
                code,
                data.get("institution_type", "college"),
                data.get("semester_or_grade", "Sem 6"),
                int(data.get("credits", 4)),
                data.get("academic_year", "2026-2027"),
                json.dumps(chapters),
                data.get("grading_system", ""),
                data.get("theory_practical_split", ""),
                data.get("board_or_program", ""),
                data.get("ltp_hours", "3-1-0")
            ))
            conn.commit()
        return self.get_subject(sub_id) # type: ignore

    # --- Student operations (Added one-by-one with rich academic profile) ---

    @staticmethod
    def _parse_student_row(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        try:
            d["semester_records"] = json.loads(d.get("semester_records_json") or "[]")
        except Exception:
            d["semester_records"] = []
        return d

    def list_students(self, subject_id: Optional[str] = None, class_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT id, subject_id, class_id, name, roll_number, email, section,
                   phone, parent_name, parent_phone, dob, blood_group,
                   attendance_percentage, cgpa_or_percentage, admission_year, status, notes,
                   semester_records_json, created_at
            FROM students WHERE 1=1
        """
        params: List[Any] = []
        if subject_id:
            query += " AND subject_id = ?"
            params.append(subject_id)
        if class_id:
            query += " AND class_id = ?"
            params.append(class_id)
        query += " ORDER BY roll_number ASC"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            return [self._parse_student_row(r) for r in cursor.fetchall()]

    def find_students_by_roll(self, roll_number: str, class_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT id, subject_id, class_id, name, roll_number, email, section,
                   phone, parent_name, parent_phone, dob, blood_group,
                   attendance_percentage, cgpa_or_percentage, admission_year, status, notes,
                   semester_records_json, created_at
            FROM students WHERE UPPER(TRIM(roll_number)) = UPPER(TRIM(?))
        """
        params: List[Any] = [roll_number]
        if class_id:
            query += " AND class_id = ?"
            params.append(class_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            return [self._parse_student_row(r) for r in cursor.fetchall()]

    def get_student(self, student_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, subject_id, class_id, name, roll_number, email, section,
                       phone, parent_name, parent_phone, dob, blood_group,
                       attendance_percentage, cgpa_or_percentage, admission_year, status, notes,
                       semester_records_json, created_at
                FROM students WHERE id = ?
            """, (student_id,))
            row = cursor.fetchone()
            if row:
                return self._parse_student_row(row)
        return None

    def add_student(
        self,
        subject_id: str,
        name: str,
        roll_number: str,
        email: str = "",
        section: str = "A",
        class_id: str = "",
        phone: str = "",
        parent_name: str = "",
        parent_phone: str = "",
        dob: str = "",
        blood_group: str = "",
        attendance_percentage: float = 85.0,
        cgpa_or_percentage: float = 0.0,
        admission_year: str = "2024",
        status: str = "Active",
        notes: str = "",
        semester_records: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        student_id = f"stud-{uuid.uuid4().hex[:8]}"
        sem_json = json.dumps(semester_records or [])
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # If student with this roll number already exists for this subject, update instead of duplicating
            cursor.execute(
                "SELECT id FROM students WHERE UPPER(TRIM(roll_number)) = UPPER(?) AND subject_id = ?",
                (roll_number.strip(), subject_id)
            )
            existing = cursor.fetchone()
            if existing:
                upd_payload: Dict[str, Any] = {
                    "name": name,
                    "email": email,
                    "section": section,
                    "class_id": class_id,
                }
                if semester_records is not None:
                    upd_payload["semester_records"] = semester_records
                self.update_student(existing[0], upd_payload)
                return self.get_student(existing[0]) # type: ignore

            cursor.execute("""
                INSERT INTO students (
                    id, subject_id, class_id, name, roll_number, email, section,
                    phone, parent_name, parent_phone, dob, blood_group,
                    attendance_percentage, cgpa_or_percentage, admission_year, status, notes,
                    semester_records_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_id, subject_id, class_id, name, roll_number, email, section,
                phone, parent_name, parent_phone, dob, blood_group,
                attendance_percentage, cgpa_or_percentage, admission_year, status, notes,
                sem_json
            ))
            conn.commit()
            return self.get_student(student_id) # type: ignore

    def update_student(self, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        allowed = [
            "name", "roll_number", "email", "section", "class_id", "subject_id",
            "phone", "parent_name", "parent_phone", "dob", "blood_group",
            "attendance_percentage", "cgpa_or_percentage", "admission_year", "status", "notes"
        ]
        normalized_updates = dict(updates)
        if "semester_records" in normalized_updates and normalized_updates["semester_records"] is not None:
            normalized_updates["semester_records_json"] = json.dumps(normalized_updates.pop("semester_records"))
            allowed.append("semester_records_json")

        fields = []
        values = []
        for k, v in normalized_updates.items():
            if k in allowed and v is not None:
                fields.append(f"{k} = ?")
                values.append(v)
        if not fields:
            return self.get_student(student_id)

        current = self.get_student(student_id)
        values.append(student_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE students SET {', '.join(fields)} WHERE id = ?", tuple(values))

            # Sync shared student profile fields (CGPA, semester records, contact info, name) across sibling subject rows
            if current and current.get("roll_number"):
                shared_allowed = [
                    "name", "email", "section", "phone", "parent_name", "parent_phone",
                    "dob", "blood_group", "cgpa_or_percentage", "admission_year",
                    "status", "notes", "semester_records_json"
                ]
                shared_fields = []
                shared_vals: List[Any] = []
                for sk in shared_allowed:
                    if sk in normalized_updates and normalized_updates[sk] is not None:
                        shared_fields.append(f"{sk} = ?")
                        shared_vals.append(normalized_updates[sk])
                if shared_fields:
                    shared_vals.append(current["roll_number"].strip())
                    if current.get("class_id"):
                        shared_vals.append(current["class_id"])
                        cursor.execute(
                            f"UPDATE students SET {', '.join(shared_fields)} WHERE UPPER(TRIM(roll_number)) = UPPER(?) AND class_id = ?",
                            tuple(shared_vals),
                        )
                    else:
                        cursor.execute(
                            f"UPDATE students SET {', '.join(shared_fields)} WHERE UPPER(TRIM(roll_number)) = UPPER(?)",
                            tuple(shared_vals),
                        )
            conn.commit()
        return self.get_student(student_id)

    def delete_student(self, student_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
            cursor.execute("DELETE FROM academic_evaluations WHERE student_id = ?", (student_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Exam operations ---

    @staticmethod
    def _parse_exam_row(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["questions"] = json.loads(d.get("questions_json") or "[]")
        try:
            d["answer_key_structured"] = json.loads(d.get("answer_key_json") or "{}")
        except Exception:
            d["answer_key_structured"] = {}
        d["target_section"] = d.get("target_section") or ""
        return d

    def list_exams(self, subject_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = (
            "SELECT id, subject_id, title, exam_type, max_marks, passing_marks, academic_year, "
            "exam_date, correction_deadline, question_paper_filename, paper_id, paper_page_count, "
            "target_section, answer_key_text, answer_key_json, questions_json, created_at FROM exams"
        )
        params: List[Any] = []
        if subject_id:
            query += " WHERE subject_id = ?"
            params.append(subject_id)
        query += " ORDER BY created_at DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            results = []
            for r in cursor.fetchall():
                d = self._parse_exam_row(r)
                cursor2 = conn.cursor()
                cursor2.execute("SELECT COUNT(*) FROM academic_evaluations WHERE exam_id = ?", (d["id"],))
                d["evaluations_count"] = cursor2.fetchone()[0]
                results.append(d)
            return results

    def get_exam(self, exam_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, subject_id, title, exam_type, max_marks, passing_marks, academic_year,
                       exam_date, correction_deadline, question_paper_filename, paper_id, paper_page_count,
                       target_section, answer_key_text, answer_key_json, questions_json, created_at
                FROM exams WHERE id = ?
            """, (exam_id,))
            row = cursor.fetchone()
            if row:
                d = self._parse_exam_row(row)
                cursor.execute("SELECT COUNT(*) FROM academic_evaluations WHERE exam_id = ?", (exam_id,))
                d["evaluations_count"] = cursor.fetchone()[0]
                return d
        return None

    def create_exam(self, data: Dict[str, Any]) -> Dict[str, Any]:
        exam_id = data.get("id") or f"exam-{uuid.uuid4().hex[:8]}"
        questions = data.get("questions", [])
        exam_date = data.get("exam_date") or time.strftime("%Y-%m-%d")
        
        # Default correction deadline: 10 days after exam date
        correction_deadline = data.get("correction_deadline")
        if not correction_deadline:
            try:
                dt = datetime.datetime.strptime(exam_date, "%Y-%m-%d")
                correction_deadline = (dt + datetime.timedelta(days=10)).strftime("%Y-%m-%d")
            except Exception:
                correction_deadline = time.strftime("%Y-%m-%d")

        answer_key_structured = data.get("answer_key_structured") or {}
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO exams (
                    id, subject_id, title, exam_type, max_marks, passing_marks,
                    academic_year, exam_date, correction_deadline, question_paper_filename,
                    paper_id, paper_page_count, target_section, answer_key_text, answer_key_json, questions_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                exam_id,
                data.get("subject_id", "subj-nlp-101"),
                data.get("title", "New Examination"),
                data.get("exam_type", "Mid-Sem"),
                float(data.get("max_marks", 50.0)),
                float(data.get("passing_marks", 20.0)),
                data.get("academic_year", "2026-2027"),
                exam_date,
                correction_deadline,
                data.get("question_paper_filename", ""),
                data.get("paper_id", ""),
                int(data.get("paper_page_count") or 0),
                data.get("target_section", ""),
                data.get("answer_key_text", ""),
                json.dumps(answer_key_structured),
                json.dumps(questions)
            ))
            conn.commit()
        return self.get_exam(exam_id) # type: ignore

    def delete_exam(self, exam_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM exams WHERE id = ?", (exam_id,))
            cursor.execute("DELETE FROM academic_evaluations WHERE exam_id = ?", (exam_id,))
            conn.commit()
            return cursor.rowcount > 0

    def update_exam_questions(
        self,
        exam_id: str,
        questions: List[Dict[str, Any]],
        max_marks: Optional[float] = None,
        paper_id: Optional[str] = None,
        paper_page_count: Optional[int] = None,
        question_paper_filename: Optional[str] = None,
        title: Optional[str] = None,
        correction_deadline: Optional[str] = None,
        target_section: Optional[str] = None,
    ) -> bool:
        updates = ["questions_json = ?"]
        params: List[Any] = [json.dumps(questions)]
        if max_marks is not None:
            updates.append("max_marks = ?")
            params.append(float(max_marks))
        if paper_id is not None:
            updates.append("paper_id = ?")
            params.append(paper_id)
        if paper_page_count is not None:
            updates.append("paper_page_count = ?")
            params.append(int(paper_page_count))
        if question_paper_filename is not None:
            updates.append("question_paper_filename = ?")
            params.append(question_paper_filename)
        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if correction_deadline is not None:
            updates.append("correction_deadline = ?")
            params.append(correction_deadline)
        if target_section is not None:
            updates.append("target_section = ?")
            params.append(target_section)

        params.append(exam_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE exams SET {', '.join(updates)} WHERE id = ?", tuple(params))
            conn.commit()
            return cursor.rowcount > 0

    def update_exam_meta(self, exam_id: str, meta: Dict[str, Any]) -> bool:
        allowed = [
            "title", "exam_type", "max_marks", "passing_marks",
            "academic_year", "exam_date", "correction_deadline", "target_section", "subject_id"
        ]
        updates: List[str] = []
        params: List[Any] = []
        for k, v in meta.items():
            if k in allowed and v is not None:
                updates.append(f"{k} = ?")
                params.append(v)
        if not updates:
            return False
        params.append(exam_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE exams SET {', '.join(updates)} WHERE id = ?", tuple(params))
            conn.commit()
            return cursor.rowcount > 0

    def update_exam_answer_key(
        self,
        exam_id: str,
        answer_key_text: str,
        answer_key_structured: Optional[Dict[str, Any]] = None,
    ) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if answer_key_structured is not None:
                cursor.execute(
                    "UPDATE exams SET answer_key_text = ?, answer_key_json = ? WHERE id = ?",
                    (answer_key_text, json.dumps(answer_key_structured), exam_id),
                )
            else:
                cursor.execute("UPDATE exams SET answer_key_text = ? WHERE id = ?", (answer_key_text, exam_id))
            conn.commit()
            return cursor.rowcount > 0

    # --- Academic Evaluation operations ---

    def save_academic_evaluation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        eval_id = data.get("id") or f"eval-{uuid.uuid4().hex[:8]}"
        breakdown = data.get("breakdown", [])
        magic_ink = data.get("magic_ink") or data.get("magic_ink_json") or {}
        structured_tx = data.get("structured_transcription") or []
        page_count = int(data.get("page_count") or (len(data.get("pages", [])) if data.get("pages") else 1))
        pages_dir = str(data.get("pages_dir") or "")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO academic_evaluations (
                    id, exam_id, student_id, roll_number, student_name, answer_sheet_filename,
                    total_score, max_score, percentage, grade, breakdown_json, teacher_feedback,
                    page_count, magic_ink_json, pages_dir, structured_transcription_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                eval_id,
                data["exam_id"],
                data["student_id"],
                data["roll_number"],
                data["student_name"],
                data.get("answer_sheet_filename", ""),
                float(data["total_score"]),
                float(data["max_score"]),
                float(data["percentage"]),
                data.get("grade", "Passed"),
                json.dumps(breakdown),
                data.get("teacher_feedback", ""),
                page_count,
                json.dumps(magic_ink) if isinstance(magic_ink, dict) else str(magic_ink),
                pages_dir,
                json.dumps(structured_tx)
            ))
            conn.commit()
        return self.get_academic_evaluation(eval_id) # type: ignore

    def get_academic_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, exam_id, student_id, roll_number, student_name, answer_sheet_filename,
                       total_score, max_score, percentage, grade, breakdown_json, teacher_feedback,
                       page_count, magic_ink_json, pages_dir, structured_transcription_json, created_at
                FROM academic_evaluations WHERE id = ?
            """, (eval_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["breakdown"] = json.loads(d.get("breakdown_json") or "[]")
                try:
                    d["magic_ink"] = json.loads(d.get("magic_ink_json") or "{}")
                except Exception:
                    d["magic_ink"] = {}
                try:
                    d["structured_transcription"] = json.loads(d.get("structured_transcription_json") or "[]")
                except Exception:
                    d["structured_transcription"] = []
                return d
        return None

    def list_academic_evaluations(self, exam_id: Optional[str] = None, student_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT id, exam_id, student_id, roll_number, student_name, answer_sheet_filename,
                   total_score, max_score, percentage, grade, breakdown_json, teacher_feedback,
                   page_count, magic_ink_json, pages_dir, structured_transcription_json, created_at
            FROM academic_evaluations
        """
        params: List[Any] = []
        conditions: List[str] = []
        if exam_id:
            conditions.append("exam_id = ?")
            params.append(exam_id)
        if student_id:
            conditions.append("student_id = ?")
            params.append(student_id)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            results = []
            for r in cursor.fetchall():
                d = dict(r)
                d["breakdown"] = json.loads(d.get("breakdown_json") or "[]")
                try:
                    d["magic_ink"] = json.loads(d.get("magic_ink_json") or "{}")
                except Exception:
                    d["magic_ink"] = {}
                try:
                    d["structured_transcription"] = json.loads(d.get("structured_transcription_json") or "[]")
                except Exception:
                    d["structured_transcription"] = []
                results.append(d)
            return results

    def update_academic_evaluation(self, eval_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates inline-edited breakdown fields or teacher feedback and recalculates total score."""
        existing = self.get_academic_evaluation(eval_id)
        if not existing:
            return None

        breakdown = updates.get("breakdown") if updates.get("breakdown") is not None else existing.get("breakdown", [])
        teacher_feedback = updates.get("teacher_feedback") if updates.get("teacher_feedback") is not None else existing.get("teacher_feedback", "")
        max_score = float(existing.get("max_score") or 20.0)
        exam = self.get_exam(existing.get("exam_id", "")) or {}
        eq_by_qno = {str(q.get("q_no") or "").strip().lower(): q for q in (exam.get("questions") or [])}
        or_best: Dict[str, float] = {}
        non_or_sum = 0.0
        for b in breakdown:
            q_key = str(b.get("q_no") or "").strip().lower()
            eq = eq_by_qno.get(q_key) or {}
            og = str(eq.get("or_group") or "").strip()
            marks_val = float(b.get("awarded_marks") or 0.0)
            if eq.get("is_or_choice") and og:
                or_best[og] = max(or_best.get(og, 0.0), marks_val)
            else:
                non_or_sum += marks_val
        total_score = round(non_or_sum + sum(or_best.values()), 1)
        percentage = round((total_score / max_score) * 100.0, 1) if max_score > 0 else 0.0

        if updates.get("grade") is not None:
            grade = str(updates["grade"])
        elif percentage >= 90:
            grade = "Outstanding (A+)"
        elif percentage >= 80:
            grade = "Excellent (A)"
        elif percentage >= 70:
            grade = "Very Good (B+)"
        elif percentage >= 60:
            grade = "Good (B)"
        elif percentage >= 40:
            grade = "Pass (C)"
        else:
            grade = "Fail (F)"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE academic_evaluations
                SET breakdown_json = ?,
                    teacher_feedback = ?,
                    total_score = ?,
                    percentage = ?,
                    grade = ?
                WHERE id = ?
                """,
                (json.dumps(breakdown), teacher_feedback, total_score, percentage, grade, eval_id),
            )
            conn.commit()
        return self.get_academic_evaluation(eval_id)

    # --- Legacy Master Key & Scorecard operations ---

    def save_master_key(self, exam_id: str, key_data: Dict[str, Any]) -> None:
        self.master_keys[exam_id] = key_data

    def get_master_key(self, exam_id: str) -> Optional[Dict[str, Any]]:
        return self.master_keys.get(exam_id)

    def list_master_keys(self) -> List[str]:
        return list(self.master_keys.keys())

    def save_scorecard(self, evaluation_id: str, scorecard_data: Dict[str, Any], user_id: Optional[int] = None) -> None:
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
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT evaluation_id, exam_id, mode, roll_number, total_score, max_score, created_at
                FROM scorecards WHERE user_id = ? ORDER BY created_at DESC
            """, (user_id,))
            return [dict(r) for r in cursor.fetchall()]


db = SQLiteDatabase()
