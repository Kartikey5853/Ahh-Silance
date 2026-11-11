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

    def list_students(self, subject_id: Optional[str] = None, class_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT id, subject_id, class_id, name, roll_number, email, section,
                   phone, parent_name, parent_phone, dob, blood_group,
                   attendance_percentage, cgpa_or_percentage, admission_year, status, notes, created_at
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
            return [dict(r) for r in cursor.fetchall()]

    def get_student(self, student_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, subject_id, class_id, name, roll_number, email, section,
                       phone, parent_name, parent_phone, dob, blood_group,
                       attendance_percentage, cgpa_or_percentage, admission_year, status, notes, created_at
                FROM students WHERE id = ?
            """, (student_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
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
        notes: str = ""
    ) -> Dict[str, Any]:
        student_id = f"stud-{uuid.uuid4().hex[:8]}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # If student with this roll number already exists for this subject, update instead of duplicating
            cursor.execute(
                "SELECT id FROM students WHERE UPPER(TRIM(roll_number)) = UPPER(?) AND subject_id = ?",
                (roll_number.strip(), subject_id)
            )
            existing = cursor.fetchone()
            if existing:
                self.update_student(existing[0], {
                    "name": name,
                    "email": email,
                    "section": section,
                    "class_id": class_id
                })
                return self.get_student(existing[0]) # type: ignore

            cursor.execute("""
                INSERT INTO students (
                    id, subject_id, class_id, name, roll_number, email, section,
                    phone, parent_name, parent_phone, dob, blood_group,
                    attendance_percentage, cgpa_or_percentage, admission_year, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_id, subject_id, class_id, name, roll_number, email, section,
                phone, parent_name, parent_phone, dob, blood_group,
                attendance_percentage, cgpa_or_percentage, admission_year, status, notes
            ))
            conn.commit()
            return self.get_student(student_id) # type: ignore

    def update_student(self, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        allowed = [
            "name", "roll_number", "email", "section", "class_id", "subject_id",
            "phone", "parent_name", "parent_phone", "dob", "blood_group",
            "attendance_percentage", "cgpa_or_percentage", "admission_year", "status", "notes"
        ]
        fields = []
        values = []
        for k, v in updates.items():
            if k in allowed and v is not None:
                fields.append(f"{k} = ?")
                values.append(v)
        if not fields:
            return self.get_student(student_id)
        values.append(student_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE students SET {', '.join(fields)} WHERE id = ?", tuple(values))
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

    def list_exams(self, subject_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT id, subject_id, title, exam_type, max_marks, passing_marks, academic_year, exam_date, correction_deadline, question_paper_filename, answer_key_text, questions_json, created_at FROM exams"
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
                d = dict(r)
                d["questions"] = json.loads(d.get("questions_json") or "[]")
                # Count evaluations
                cursor2 = conn.cursor()
                cursor2.execute("SELECT COUNT(*) FROM academic_evaluations WHERE exam_id = ?", (d["id"],))
                d["evaluations_count"] = cursor2.fetchone()[0]
                results.append(d)
            return results

    def get_exam(self, exam_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, subject_id, title, exam_type, max_marks, passing_marks, academic_year, exam_date, correction_deadline, question_paper_filename, answer_key_text, questions_json, created_at
                FROM exams WHERE id = ?
            """, (exam_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["questions"] = json.loads(d.get("questions_json") or "[]")
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

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO exams (
                    id, subject_id, title, exam_type, max_marks, passing_marks,
                    academic_year, exam_date, correction_deadline, question_paper_filename, answer_key_text, questions_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                data.get("answer_key_text", ""),
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

    def update_exam_questions(self, exam_id: str, questions: List[Dict[str, Any]], max_marks: Optional[float] = None) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if max_marks is not None:
                cursor.execute("""
                    UPDATE exams SET questions_json = ?, max_marks = ? WHERE id = ?
                """, (json.dumps(questions), max_marks, exam_id))
            else:
                cursor.execute("UPDATE exams SET questions_json = ? WHERE id = ?", (json.dumps(questions), exam_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_exam_answer_key(self, exam_id: str, answer_key_text: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
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
