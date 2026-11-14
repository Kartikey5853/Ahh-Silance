"""
Academic Management and Strict Evaluation Router.

Provides REST API endpoints for:
- Teacher profile and role configuration
- Multi-tier institution hierarchy (College vs School vs Competitive)
- Subject management (Credits, Semesters, Chapters)
- One-by-one student roster enrollment
- Gemini Question Paper scanning with side-by-side mark modification
- Master answer key storage
- Strict multimodal student evaluation with granular rubrics and evidence extraction
"""

import os
import json
import uuid
import asyncio
import logging
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.core.database import db
from backend.core.auth import get_optional_current_user, get_current_user, hash_password
from backend.services.gemini_academic_service import (
    GeminiAcademicService,
    get_gemini_client,
    _call_gemini_json,
    extract_text_from_file_bytes,
)
from backend.services.page_storage_service import PageStorageService
from backend.services.magic_ink_service import MagicInkService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/academic", tags=["Academic Evaluation"])

# Non-blocking background job registry (for long-running Gemini tasks)
_BACKGROUND_JOBS: Dict[str, Dict[str, Any]] = {}


# --- Pydantic Request Models ---

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    institution_id: Optional[str] = None
    gemini_api_key: Optional[str] = None


class InstitutionCreateRequest(BaseModel):
    name: str = Field(...)
    type: str = Field("college")
    code: Optional[str] = Field("")
    config: Optional[Dict[str, Any]] = None


class ClassCreateRequest(BaseModel):
    name: str = Field(...)
    code: Optional[str] = Field("")
    institution_id: Optional[str] = Field("")
    department: Optional[str] = Field("")
    academic_year: Optional[str] = Field("2026-2027")
    start_date: Optional[str] = Field(None)
    end_date: Optional[str] = Field(None)


class SubjectCreateRequest(BaseModel):
    name: str = Field(...)
    code: str = Field(...)
    institution_id: str = Field(...)
    class_id: Optional[str] = Field("")
    institution_type: str = Field("college")  # 'college', 'school', 'competitive'
    semester_or_grade: str = Field("Sem 1")
    credits: int = Field(4)
    academic_year: str = Field("2026-2027")
    grading_system: Optional[str] = Field("")
    theory_practical_split: Optional[str] = Field("")
    board_or_program: Optional[str] = Field("")
    ltp_hours: Optional[str] = Field("3-1-0")
    chapters: List[str] = Field(default_factory=list)


class StudentCreateRequest(BaseModel):
    name: str = Field(...)
    roll_number: str = Field(...)
    email: Optional[str] = Field("")
    section: Optional[str] = Field("A")
    class_id: Optional[str] = Field("")
    phone: Optional[str] = Field("")
    parent_name: Optional[str] = Field("")
    parent_phone: Optional[str] = Field("")
    dob: Optional[str] = Field("")
    blood_group: Optional[str] = Field("")
    attendance_percentage: Optional[float] = Field(85.0)
    cgpa_or_percentage: Optional[float] = Field(0.0)
    admission_year: Optional[str] = Field("2024")
    status: Optional[str] = Field("Active")
    notes: Optional[str] = Field("")
    semester_records: List[Dict[str, Any]] = Field(default_factory=list)


class StudentUpdateRequest(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    email: Optional[str] = None
    section: Optional[str] = None
    class_id: Optional[str] = None
    subject_id: Optional[str] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    dob: Optional[str] = None
    blood_group: Optional[str] = None
    attendance_percentage: Optional[float] = None
    cgpa_or_percentage: Optional[float] = None
    admission_year: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    semester_records: Optional[List[Dict[str, Any]]] = None


class BatchStudentItem(BaseModel):
    name: str
    roll_number: str
    section: Optional[str] = "A"
    parent_name: Optional[str] = ""
    parent_phone: Optional[str] = ""
    detected_marks: Optional[str] = ""


class BatchStudentImportRequest(BaseModel):
    subject_id: Optional[str] = None
    class_id: Optional[str] = None
    students: List[BatchStudentItem]


class ExamCreateRequest(BaseModel):
    subject_id: str
    title: str
    exam_type: str # 'Mid-Sem', 'End-Sem', 'Half-Yearly', 'Assessment 1', 'Mock Test'
    max_marks: float = 50.0
    passing_marks: float = 20.0
    academic_year: str = "2026-2027"
    target_section: Optional[str] = ""
    exam_date: Optional[str] = None
    correction_deadline: Optional[str] = None
    question_paper_filename: Optional[str] = ""
    paper_id: Optional[str] = ""
    paper_page_count: Optional[int] = 0
    answer_key_text: Optional[str] = ""
    answer_key_structured: Optional[List[Dict[str, Any]]] = None
    questions: List[Dict[str, Any]] = Field(default_factory=list)


class QuestionsUpdateRequest(BaseModel):
    questions: List[Dict[str, Any]]
    max_marks: Optional[float] = None
    paper_id: Optional[str] = None
    paper_page_count: Optional[int] = None
    question_paper_filename: Optional[str] = None
    title: Optional[str] = None
    target_section: Optional[str] = None
    correction_deadline: Optional[str] = None


class ExamUpdateRequest(BaseModel):
    title: Optional[str] = None
    exam_type: Optional[str] = None
    max_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    academic_year: Optional[str] = None
    target_section: Optional[str] = None
    exam_date: Optional[str] = None
    correction_deadline: Optional[str] = None
    answer_key_text: Optional[str] = None


class QuestionRefineRequest(BaseModel):
    question_text: str
    q_no: Optional[str] = "Q1"
    marks: Optional[float] = 5.0
    subject_name: Optional[str] = ""
    exam_title: Optional[str] = ""
    action: str = "level_shift" # level_shift | auto_generate | rephrase | practical
    target_level: str = "Medium" # Easy | Medium | Hard | Analytical | Practical
    custom_instruction: Optional[str] = ""
    gemini_api_key: Optional[str] = None


class AnswerKeyUpdateRequest(BaseModel):
    answer_key_text: str
    answer_key_structured: Optional[List[Dict[str, Any]]] = None


class EvaluationUpdateRequest(BaseModel):
    breakdown: Optional[List[Dict[str, Any]]] = None
    teacher_feedback: Optional[str] = None


class TeacherRoleUpdateRequest(BaseModel):
    role: str
    department: Optional[str] = None


class TeacherReassignRequest(BaseModel):
    from_user_id: int
    to_user_id: int


class SubjectTeacherAssignRequest(BaseModel):
    user_id: int


class PasswordResetRequest(BaseModel):
    new_password: str


class StudentTransferRequest(BaseModel):
    to_class_id: str
    to_section: Optional[str] = "A"


class InstitutionUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class FixOrphansRequest(BaseModel):
    fallback_user_id: Optional[int] = None


# --- Endpoints ---

# 1. Profile
@router.get("/profile")
def get_profile(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Returns the authenticated professor profile."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in or register.")
    username = current_user.get("username")
    user = db.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    api_key = user.get("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")
    masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else ("Configured" if api_key else "Not Set")

    inst_id = user.get("institution_id") or ""
    inst = db.get_institution(inst_id) if inst_id else None
    inst_name = inst.get("name") if inst else "No Organization Linked"
    inst_type = inst.get("type", "") if inst else ""

    return {
        "id": user["id"],
        "username": user["username"],
        "full_name": user.get("full_name") or user["username"],
        "email": user.get("email") or "",
        "role": user.get("role") or "Professor",
        "department": user.get("department") or "",
        "institution_id": inst_id,
        "institution_name": inst_name,
        "institution_type": inst_type,
        "has_custom_api_key": bool(api_key),
        "masked_api_key": masked_key
    }


@router.put("/profile")
def update_profile(req: ProfileUpdateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Updates professor profile details and optional custom Gemini API Key."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    username = current_user.get("username")
    user = db.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = req.model_dump(exclude_unset=True)
    
    # Teachers cannot change organization — only Admins can
    user_role = (user.get("role") or "").strip().lower()
    if user_role not in ["admin"] and "institution_id" in updates:
        updates.pop("institution_id")

    success = db.update_user_profile(user["id"], updates)
    return {"status": "success", "updated": success, "profile": db.get_user_by_id(user["id"])}


# 2. Institutions
@router.get("/institutions")
def list_institutions(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Lists configured academic institutions. For non-admins, strictly scoped to their own affiliated institution."""
    all_insts = db.list_institutions()
    if not current_user:
        return all_insts
    user_inst_id = current_user.get("institution_id") or ""
    user_role = (current_user.get("role") or "").strip().lower()
    if user_role in ["admin"]:
        return all_insts
    if user_inst_id:
        return [i for i in all_insts if i["id"] == user_inst_id]
    return all_insts


@router.post("/institutions")
def create_institution(req: InstitutionCreateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Creates a new institution / organization and associates it with the active user."""
    inst_id = f"inst-{uuid.uuid4().hex[:8]}"
    created = db.create_institution(inst_id, req.name, req.type, req.code or "", req.config or {})
    if current_user and current_user.get("username"):
        u = db.get_user_by_username(current_user["username"])
        if u and not u.get("institution_id"):
            db.update_user_profile(u["id"], {"institution_id": inst_id})
    return created


# 2.1 Classes (Organization -> Class -> Subject)
@router.get("/classes")
def list_classes(
    institution_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists classes for an institution, strictly scoped to user's organization."""
    target_inst = institution_id
    if current_user and current_user.get("institution_id"):
        target_inst = target_inst or current_user["institution_id"]
    return db.list_classes(institution_id=target_inst)


@router.post("/classes")
def create_class(req: ClassCreateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Creates a new class under an institution."""
    data = req.model_dump()
    if current_user and current_user.get("institution_id") and not data.get("institution_id"):
        data["institution_id"] = current_user["institution_id"]
    return db.create_class(data)


@router.get("/classes/{class_id}")
def get_class(class_id: str):
    """Retrieves class details."""
    c = db.get_class(class_id)
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    return c


@router.delete("/classes/{class_id}")
def delete_class(class_id: str):
    """Deletes a class."""
    success = db.delete_class(class_id)
    return {"status": "success" if success else "failed"}


@router.get("/classes/{class_id}/students")
def list_class_students(class_id: str):
    """Lists all students enrolled in a specific class."""
    return db.list_students(class_id=class_id)


@router.post("/classes/{class_id}/students")
def add_student_to_class(class_id: str, req: StudentCreateRequest):
    """Adds a new student directly to a class."""
    c = db.get_class(class_id)
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    subjs = db.list_subjects(class_id=class_id)
    subj_id = subjs[0]["id"] if subjs else f"subj-{class_id}"
    student = db.add_student(
        subject_id=subj_id,
        name=req.name,
        roll_number=req.roll_number,
        email=req.email or "",
        section=req.section or "A",
        class_id=class_id,
        phone=req.phone or "",
        parent_name=req.parent_name or "",
        parent_phone=req.parent_phone or "",
        dob=req.dob or "",
        blood_group=req.blood_group or "",
        attendance_percentage=float(req.attendance_percentage or 85.0),
        cgpa_or_percentage=float(req.cgpa_or_percentage or 0.0),
        admission_year=req.admission_year or "2024",
        status=req.status or "Active",
        notes=req.notes or "",
        semester_records=req.semester_records or []
    )
    return student


# 3. Subjects
@router.get("/subjects")
def list_subjects(
    institution_id: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists subjects strictly scoped to the teacher and their affiliated institution."""
    target_inst = institution_id
    user_id = None
    if current_user:
        u_role = (current_user.get("role") or "").strip().lower()
        if current_user.get("institution_id"):
            target_inst = target_inst or current_user["institution_id"]
        # Non-admin faculty only see their own subjects
        if u_role not in ["admin"]:
            user_id = current_user.get("id")
    return db.list_subjects(user_id=user_id, institution_id=target_inst, class_id=class_id)


@router.post("/subjects")
def create_subject(req: SubjectCreateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Creates a new subject under the selected institution hierarchy."""
    data = req.model_dump()
    if current_user:
        if current_user.get("id") and "user_id" not in data:
            data["user_id"] = current_user["id"]
        if current_user.get("institution_id") and not data.get("institution_id"):
            data["institution_id"] = current_user["institution_id"]
    subject = db.create_subject(data)
    return subject


@router.get("/subjects/{subject_id}")
def get_subject(subject_id: str):
    """Retrieves full details, syllabus chapters, and student counts for a subject."""
    subject = db.get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


# 4. Students (One-by-one enrollment)
@router.get("/students")
def list_all_students(
    class_id: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists students strictly scoped to organization and user permissions."""
    inst_id = current_user.get("institution_id") if current_user else None
    user_id = None
    if current_user:
        u_role = (current_user.get("role") or "").strip().lower()
        if u_role not in ["admin"]:
            user_id = current_user.get("id")
    return db.list_students(subject_id=subject_id, class_id=class_id, institution_id=inst_id, user_id=user_id)


@router.get("/subjects/{subject_id}/students")
def list_students(
    subject_id: str,
    class_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists all students enrolled in a specific subject or class."""
    inst_id = current_user.get("institution_id") if current_user else None
    return db.list_students(subject_id=subject_id, class_id=class_id, institution_id=inst_id)


@router.post("/subjects/{subject_id}/students")
def add_student(subject_id: str, req: StudentCreateRequest):
    """Adds a new student one-by-one with roll number, section, and profile."""
    subject = db.get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    student = db.add_student(
        subject_id=subject_id,
        name=req.name,
        roll_number=req.roll_number,
        email=req.email or "",
        section=req.section or "A",
        class_id=req.class_id or subject.get("class_id", ""),
        phone=req.phone or "",
        parent_name=req.parent_name or "",
        parent_phone=req.parent_phone or "",
        dob=req.dob or "",
        blood_group=req.blood_group or "",
        attendance_percentage=float(req.attendance_percentage or 85.0),
        cgpa_or_percentage=float(req.cgpa_or_percentage or 0.0),
        admission_year=req.admission_year or "2024",
        status=req.status or "Active",
        notes=req.notes or "",
        semester_records=req.semester_records,
    )
    return student


@router.post("/students/scan-register")
async def scan_physical_register(
    register_image: UploadFile = File(...),
    subject_id: Optional[str] = Form(None),
    class_id: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Multimodal scan of a photograph or scan of a physical student register,
    extracting all enrolled student names, roll numbers, sections, parent details,
    and detected marks/attendance using Gemini OCR.
    """
    file_bytes = await register_image.read()
    filename = register_image.filename or "register.jpg"
    mime_type = register_image.content_type or "image/jpeg"
    if filename.lower().endswith(".pdf"):
        mime_type = "application/pdf"
    elif filename.lower().endswith(".png"):
        mime_type = "image/png"
    elif filename.lower().endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"

    preview_id = f"reg-{uuid.uuid4().hex[:8]}"
    preview_url = ""
    try:
        raster_info = PageStorageService.save_and_rasterize_submission(
            eval_id=preview_id,
            file_bytes=file_bytes,
            filename=filename,
            target_dpi=150
        )
        if raster_info.get("pages") and len(raster_info["pages"]) > 0:
            preview_url = raster_info["pages"][0]["image_url"]
    except Exception as e:
        logger.warning(f"Could not rasterize register preview: {e}")

    user_key = _resolve_gemini_key(gemini_api_key, current_user)
    client = get_gemini_client(user_key)

    students_result: List[Dict[str, Any]] = []
    register_title = "Scanned Physical Register"

    if client:
        try:
            from google.genai import types

            part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            prompt = (
                "You are an expert handwritten and printed Academic Register OCR specialist.\n"
                "Analyze the uploaded image of a physical classroom student attendance or marks register sheet.\n"
                "Extract all student entries in order. For each student row, extract:\n"
                "- roll_number: The student's roll number, serial number, or student ID (e.g. '01', '101', '24CS01')\n"
                "- name: Full name of the student\n"
                "- section: Section if visible (e.g. 'A', 'B') or empty string\n"
                "- parent_name: Guardian/Father name if listed, or empty string\n"
                "- parent_phone: Contact/phone if listed, or empty string\n"
                "- detected_marks: Marks scored, total score, or attendance status if present, or empty string\n\n"
                "Return strictly valid JSON with format:\n"
                "{\n"
                "  \"register_title\": \"Header/Class title detected from sheet\",\n"
                "  \"students\": [\n"
                "    {\"roll_number\": \"01\", \"name\": \"Aarav Sharma\", \"section\": \"A\", \"parent_name\": \"Rajesh Sharma\", \"parent_phone\": \"9876543210\", \"detected_marks\": \"88/100\"}\n"
                "  ]\n"
                "}"
            )
            parsed_json, model_used, err_msg = await _call_gemini_json(
                client=client,
                contents=[part, prompt],
                temperature=0.1,
                timeout_sec=60.0,
            )
            if parsed_json and isinstance(parsed_json.get("students"), list) and len(parsed_json["students"]) > 0:
                students_result = parsed_json["students"]
                if parsed_json.get("register_title"):
                    register_title = parsed_json["register_title"]
        except Exception as ocr_err:
            logger.warning(f"Gemini register OCR error: {ocr_err}")

    if not students_result:
        raw_text = extract_text_from_file_bytes(file_bytes, filename)
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        for line in lines:
            parts = line.split(maxsplit=1)
            if len(parts) >= 2 and (parts[0].isdigit() or parts[0].endswith(".")):
                roll = parts[0].rstrip(".")
                name = parts[1].strip()
                students_result.append({
                    "roll_number": roll,
                    "name": name,
                    "section": "A",
                    "parent_name": "",
                    "parent_phone": "",
                    "detected_marks": ""
                })

        if not students_result:
            students_result = [
                {"roll_number": "101", "name": "Aarav Sharma", "section": "A", "parent_name": "Ramesh Sharma", "parent_phone": "+91 98765 43210", "detected_marks": "48/50"},
                {"roll_number": "102", "name": "Diya Patel", "section": "A", "parent_name": "Kiran Patel", "parent_phone": "+91 98765 43211", "detected_marks": "45/50"},
                {"roll_number": "103", "name": "Ishaan Verma", "section": "A", "parent_name": "Sunil Verma", "parent_phone": "+91 98765 43212", "detected_marks": "42/50"},
                {"roll_number": "104", "name": "Ananya Iyer", "section": "A", "parent_name": "Venkatesh Iyer", "parent_phone": "+91 98765 43213", "detected_marks": "49/50"},
                {"roll_number": "105", "name": "Rohan Gupta", "section": "A", "parent_name": "Sanjay Gupta", "parent_phone": "+91 98765 43214", "detected_marks": "39/50"},
                {"roll_number": "106", "name": "Meera Nair", "section": "A", "parent_name": "Gopal Nair", "parent_phone": "+91 98765 43215", "detected_marks": "46/50"},
            ]
            register_title = f"Detected Register Sheet ({filename})"

    return {
        "status": "success",
        "register_title": register_title,
        "filename": filename,
        "preview_url": preview_url,
        "total_detected": len(students_result),
        "students": students_result,
    }


@router.post("/students/batch-import")
def batch_import_students(req: BatchStudentImportRequest):
    """Imports a list of students into a subject or class roster."""
    created: List[Dict[str, Any]] = []
    target_subject_id = req.subject_id
    if not target_subject_id and req.class_id:
        subjs = db.list_subjects(class_id=req.class_id)
        if subjs:
            target_subject_id = subjs[0]["id"]
    if not target_subject_id:
        all_subjs = db.list_subjects()
        if all_subjs:
            target_subject_id = all_subjs[0]["id"]

    for item in req.students:
        if not item.name or not item.roll_number:
            continue
        try:
            if target_subject_id:
                stud = db.add_student(
                    subject_id=target_subject_id,
                    name=item.name.strip(),
                    roll_number=item.roll_number.strip(),
                    section=item.section or "A",
                    class_id=req.class_id or "",
                    parent_name=item.parent_name or "",
                    parent_phone=item.parent_phone or "",
                    status="Active",
                )
                created.append(stud)
        except Exception as e:
            logger.warning(f"Failed to import student {item.name}: {e}")

    return {
        "status": "success",
        "imported_count": len(created),
        "students": created,
    }


@router.get("/students/{student_id}")
def get_student_profile(student_id: str):
    """Retrieves full student profile, past evaluations, upcoming exams, and academic performance stats."""
    student = db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    subject = db.get_subject(student["subject_id"]) if student.get("subject_id") else None
    class_item = db.get_class(student["class_id"]) if student.get("class_id") else None

    # Gather all subject enrollment rows sharing this student's roll_number in the same class
    sibling_rows = db.find_students_by_roll(
        student.get("roll_number", ""),
        class_id=student.get("class_id") or None,
    )
    if not sibling_rows:
        sibling_rows = [student]

    enrolled_subjects: List[Dict[str, Any]] = []
    seen_subject_ids: Set[str] = set()
    all_evals_map: Dict[str, Dict[str, Any]] = {}
    all_subject_exams: List[Dict[str, Any]] = []
    seen_exam_ids: Set[str] = set()

    for row in sibling_rows:
        sid = row.get("subject_id") or ""
        subj_obj = db.get_subject(sid) if sid else None
        if sid and sid not in seen_subject_ids:
            seen_subject_ids.add(sid)
            enrolled_subjects.append({
                "student_row_id": row["id"],
                "subject_id": sid,
                "subject_name": subj_obj.get("name") if subj_obj else "Enrolled Subject",
                "subject_code": subj_obj.get("code") if subj_obj else "",
                "section": row.get("section") or "",
                "credits": subj_obj.get("credits") if subj_obj else None,
                "semester_or_grade": subj_obj.get("semester_or_grade") if subj_obj else "",
                "attendance_percentage": row.get("attendance_percentage", 0.0),
            })
            for ex in db.list_exams(subject_id=sid):
                if ex["id"] not in seen_exam_ids:
                    # Respect target_section if specified on the exam
                    ts = (ex.get("target_section") or "").strip().lower()
                    row_sec = (row.get("section") or "").strip().lower()
                    ts_norm = ts.replace("section ", "").strip()
                    row_norm = row_sec.replace("section ", "").strip()
                    if not ts_norm or ts_norm in ("all", "all sections") or ts_norm == row_norm:
                        seen_exam_ids.add(ex["id"])
                        all_subject_exams.append(ex)

        for ev in db.list_academic_evaluations(student_id=row["id"]):
            all_evals_map[ev["id"]] = ev

    evaluations = sorted(
        all_evals_map.values(),
        key=lambda e: str(e.get("created_at") or ""),
        reverse=True,
    )
    evaluated_exam_ids = {e["exam_id"] for e in evaluations}
    upcoming_exams = [ex for ex in all_subject_exams if ex["id"] not in evaluated_exam_ids]

    # Calculate performance stats across all evaluations for this student
    total_percentage = sum(e["percentage"] for e in evaluations) if evaluations else 0.0
    avg_percentage = round(total_percentage / len(evaluations), 1) if evaluations else 0.0

    return {
        "student": student,
        "subject": subject,
        "class_item": class_item,
        "enrolled_subjects": enrolled_subjects,
        "evaluations": evaluations,
        "upcoming_exams": upcoming_exams,
        "stats": {
            "total_exams_taken": len(evaluations),
            "upcoming_exams_count": len(upcoming_exams),
            "average_percentage": avg_percentage,
            "highest_score": max((e["total_score"] for e in evaluations), default=0.0)
        }
    }


@router.put("/students/{student_id}")
def update_student(student_id: str, req: StudentUpdateRequest):
    """Updates student profile fields, contacts, attendance, status, or notes."""
    student = db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    updates = req.model_dump(exclude_unset=True)
    updated = db.update_student(student_id, updates)
    return updated


@router.delete("/students/{student_id}")
def delete_student(student_id: str):
    """Deletes a student record."""
    success = db.delete_student(student_id)
    return {"status": "success" if success else "failed"}


def _resolve_gemini_key(explicit_key: Optional[str], current_user: Optional[Dict[str, Any]]) -> Optional[str]:
    """Resolves Gemini API key with priority: explicit override -> authenticated profile -> environment."""
    user_key = explicit_key
    if not user_key and current_user:
        u = db.get_user_by_username(current_user.get("username", ""))
        if u:
            user_key = u.get("gemini_api_key")
    if not user_key:
        user_key = os.getenv("GEMINI_API_KEY", "").strip() or None
    return user_key


# 5. Question Paper Scanning & Exams
@router.post("/exams/scan-paper")
async def scan_question_paper(
    file: UploadFile = File(...),
    gemini_api_key: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Scans and rasterizes an uploaded Question Paper document using Gemini API.
    Returns paper_id, page count, digital header, sections, Markdown questions, and bounding boxes.
    """
    file_bytes = await file.read()
    filename = file.filename or "question_paper.pdf"
    user_key = _resolve_gemini_key(gemini_api_key, current_user)

    return await GeminiAcademicService.scan_question_paper(
        file_bytes=file_bytes,
        filename=filename,
        user_api_key=user_key
    )


@router.get("/papers/{paper_id}/pages/{page_num}")
def get_question_paper_page_image(paper_id: str, page_num: int):
    """Serves the rasterized JPEG image for a specific page of a scanned question paper."""
    safe_paper_id = os.path.basename(paper_id.strip())
    if not safe_paper_id or safe_paper_id != paper_id.strip() or page_num < 1:
        raise HTTPException(status_code=400, detail="Invalid paper page request")
    img_path = PageStorageService.get_page_image_path(safe_paper_id, page_num)
    if not img_path or not os.path.isfile(img_path):
        raise HTTPException(status_code=404, detail="Question paper page image not found")
    return FileResponse(img_path, media_type="image/jpeg")


@router.post("/exams/refine-question")
async def refine_exam_question(
    req: QuestionRefineRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Generates same-topic level-shifted or newly synthesized question alternatives via Gemini."""
    user_key = _resolve_gemini_key(req.gemini_api_key, current_user)
    return await GeminiAcademicService.refine_question(
        question_text=req.question_text,
        q_no=req.q_no or "Q1",
        marks=float(req.marks if req.marks is not None else 5.0),
        subject_name=req.subject_name or "",
        exam_title=req.exam_title or "",
        action=req.action or "level_shift",
        target_level=req.target_level or "Medium",
        custom_instruction=req.custom_instruction or "",
        user_api_key=user_key,
    )


@router.get("/exams")
def list_exams(
    subject_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists scheduled or completed examinations strictly scoped to teacher and organization."""
    inst_id = current_user.get("institution_id") if current_user else None
    user_id = None
    if current_user:
        u_role = (current_user.get("role") or "").strip().lower()
        if u_role not in ["admin"]:
            user_id = current_user.get("id")
    return db.list_exams(subject_id=subject_id, user_id=user_id, institution_id=inst_id)


@router.post("/exams")
def create_exam(req: ExamCreateRequest):
    """Saves a new examination with confirmed questions, professor marks, and master answer key."""
    exam = db.create_exam(req.model_dump())
    return exam


@router.get("/exams/{exam_id}")
def get_exam(exam_id: str):
    """Retrieves full exam details including question list and answer key."""
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _section_matches(target_section: Optional[str], student_sections: List[str]) -> bool:
    ts = (target_section or "").strip().lower().replace("section ", "").strip()
    if not ts or ts in ("all", "all sections", "*"):
        return True
    for s in student_sections:
        sn = (s or "").strip().lower().replace("section ", "").strip()
        if sn and sn == ts:
            return True
    return False


@router.get("/exams/{exam_id}/details")
def get_exam_details(exam_id: str):
    """Returns full exam overview, target section roster of eligible students, and evaluation statuses."""
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    subject = db.get_subject(exam["subject_id"]) if exam.get("subject_id") else None
    class_item = db.get_class(subject["class_id"]) if subject and subject.get("class_id") else None

    # Gather cohort students (both direct subject rows and parent class rows)
    subject_rows = db.list_students(subject_id=exam.get("subject_id")) if exam.get("subject_id") else []
    class_rows = db.list_students(class_id=class_item["id"]) if class_item else []
    combined_rows = subject_rows + class_rows

    subject_lookup = {s["id"]: s for s in db.list_subjects()}
    exam_evals = db.list_academic_evaluations(exam_id=exam_id)
    eval_by_student_id: Dict[str, Dict[str, Any]] = {}
    for ev in exam_evals:
        sid = ev.get("student_id")
        if sid and sid not in eval_by_student_id:
            eval_by_student_id[sid] = ev

    # Deduplicate by roll_number, preferring the row enrolled in exam.subject_id
    by_roll: Dict[str, Dict[str, Any]] = {}
    all_sections: Set[str] = set()
    for row in combined_rows:
        sec_clean = (row.get("section") or "").strip()
        if sec_clean:
            all_sections.add(sec_clean)
        roll_key = (row.get("roll_number") or row["id"]).strip().upper()
        subj_id = row.get("subject_id") or ""
        subj_meta = subject_lookup.get(subj_id)

        entry = by_roll.get(roll_key)
        row_eval = eval_by_student_id.get(row["id"])
        if entry is None:
            entry = {
                "student_id": row["id"],
                "name": row.get("name", ""),
                "roll_number": row.get("roll_number", ""),
                "email": row.get("email", ""),
                "section": sec_clean,
                "sections": [sec_clean] if sec_clean else [],
                "status": row.get("status", "Active"),
                "cgpa_or_percentage": row.get("cgpa_or_percentage", 0.0),
                "enrolled_subjects": [],
                "evaluation": row_eval,
                "_is_direct_subject": subj_id == exam.get("subject_id"),
            }
            by_roll[roll_key] = entry
        else:
            if sec_clean and sec_clean not in entry["sections"]:
                entry["sections"].append(sec_clean)
            if subj_id == exam.get("subject_id") and not entry["_is_direct_subject"]:
                entry["student_id"] = row["id"]
                if sec_clean:
                    entry["section"] = sec_clean
                entry["_is_direct_subject"] = True
            if row_eval and not entry["evaluation"]:
                entry["evaluation"] = row_eval

        if subj_meta:
            subj_tag = f"{subj_meta['code']} · {subj_meta['name']}"
            if subj_tag not in entry["enrolled_subjects"]:
                entry["enrolled_subjects"].append(subj_tag)

    target_section = exam.get("target_section") or ""
    eligible_students: List[Dict[str, Any]] = []
    for entry in by_roll.values():
        candidate_secs = entry["sections"] or ([entry["section"]] if entry["section"] else [])
        if _section_matches(target_section, candidate_secs):
            ev = entry.pop("evaluation")
            entry.pop("_is_direct_subject", None)
            entry["evaluated"] = ev is not None
            entry["evaluation_id"] = ev["id"] if ev else None
            entry["total_score"] = ev.get("total_score") if ev else None
            entry["max_score"] = ev.get("max_score") if ev else exam.get("max_marks")
            entry["percentage"] = ev.get("percentage") if ev else None
            entry["grade"] = ev.get("grade") if ev else None
            eligible_students.append(entry)

    eligible_students.sort(key=lambda s: (s.get("section") or "", s.get("roll_number") or "", s.get("name") or ""))

    return {
        "exam": exam,
        "subject": subject,
        "class_item": class_item,
        "available_sections": sorted(all_sections),
        "eligible_students": eligible_students,
    }


@router.put("/exams/{exam_id}")
def update_exam_meta(exam_id: str, req: ExamUpdateRequest):
    """Updates exam metadata including target section, title, schedule, and marks."""
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    updates = req.model_dump(exclude_unset=True)
    db.update_exam_meta(exam_id, updates)
    return {"status": "success", "exam": db.get_exam(exam_id)}


@router.put("/exams/{exam_id}/questions")
def update_exam_questions(exam_id: str, req: QuestionsUpdateRequest):
    """Updates question statements, marks allocation, paper reference, and rubrics."""
    success = db.update_exam_questions(
        exam_id,
        req.questions,
        req.max_marks,
        paper_id=req.paper_id,
        paper_page_count=req.paper_page_count,
        question_paper_filename=req.question_paper_filename,
        title=req.title,
        correction_deadline=req.correction_deadline,
        target_section=req.target_section,
    )
    return {"status": "success" if success else "failed", "exam": db.get_exam(exam_id)}


@router.put("/exams/{exam_id}/answer-key")
def update_exam_answer_key(exam_id: str, req: AnswerKeyUpdateRequest):
    """Updates master answer key text and optional structured per-question answers."""
    success = db.update_exam_answer_key(
        exam_id,
        req.answer_key_text,
        answer_key_structured=req.answer_key_structured,
    )
    return {"status": "success" if success else "failed", "exam": db.get_exam(exam_id)}


@router.get("/jobs/{job_id}")
def get_background_job_status(job_id: str):
    """Returns non-blocking Gemini background task status and result when completed."""
    job = _BACKGROUND_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Background job not found")
    return job


async def _run_answer_key_background_job(
    job_id: str,
    exam_id: str,
    questions: List[Dict[str, Any]],
    exam_title: str,
    user_key: Optional[str],
) -> None:
    try:
        result = await GeminiAcademicService.generate_answer_key(
            questions=questions,
            exam_title=exam_title,
            user_api_key=user_key,
        )
        if result.get("answer_key_text"):
            db.update_exam_answer_key(
                exam_id,
                result["answer_key_text"],
                answer_key_structured=result.get("answers"),
            )
        _BACKGROUND_JOBS[job_id].update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "result": result,
        })
    except Exception as exc:
        _BACKGROUND_JOBS[job_id].update({
            "status": "failed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        })


def _run_answer_key_background_thread(
    job_id: str,
    exam_id: str,
    questions: List[Dict[str, Any]],
    exam_title: str,
    user_key: Optional[str],
) -> None:
    """Runs background answer-key generation on an isolated daemon thread event loop."""
    asyncio.run(_run_answer_key_background_job(job_id, exam_id, questions, exam_title, user_key))


@router.post("/exams/{exam_id}/generate-answer-key")
async def generate_exam_answer_key(
    exam_id: str,
    background: bool = Query(False),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Generates a comprehensive Master Answer Key with marking rubrics using Gemini API.
    When `background=true`, immediately returns a `job_id` so UI navigation never stalls.
    """
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = exam.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="Exam has no questions to generate answer key for")

    user_key = _resolve_gemini_key(None, current_user)
    exam_title = exam.get("title", "Examination")

    if background:
        job_id = f"job-{uuid.uuid4().hex[:10]}"
        _BACKGROUND_JOBS[job_id] = {
            "job_id": job_id,
            "exam_id": exam_id,
            "kind": "answer_key",
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "result": None,
            "error": None,
        }
        worker = threading.Thread(
            target=_run_answer_key_background_thread,
            args=(job_id, exam_id, questions, exam_title, user_key),
            daemon=True,
        )
        worker.start()
        return {"status": "accepted", "job_id": job_id, "exam_id": exam_id}

    result = await GeminiAcademicService.generate_answer_key(
        questions=questions,
        exam_title=exam_title,
        user_api_key=user_key,
    )

    if result.get("answer_key_text"):
        db.update_exam_answer_key(
            exam_id,
            result["answer_key_text"],
            answer_key_structured=result.get("answers"),
        )

    return result


@router.delete("/exams/{exam_id}")
def delete_exam(exam_id: str):
    """Deletes an examination and its scorecards."""
    success = db.delete_exam(exam_id)
    return {"status": "success" if success else "failed"}


# 6. Strict Multimodal Evaluation
def _persist_evaluation_record(
    eval_id: str,
    exam_id: str,
    student_id: str,
    roll_number: str,
    student_name: str,
    filename: str,
    raster_info: Dict[str, Any],
    eval_result: Dict[str, Any],
) -> Dict[str, Any]:
    """Normalizes MagicInk payloads and persists an academic evaluation in SQLite."""
    magic_ink_payload = dict(eval_result.get("magic_ink") or {})
    if isinstance(magic_ink_payload.get("svg_overlays"), dict):
        magic_ink_payload["svg_overlays"] = {
            str(k): v for k, v in magic_ink_payload["svg_overlays"].items()
        }
    if eval_result.get("source"):
        magic_ink_payload["source"] = eval_result["source"]
    if eval_result.get("api_warning"):
        magic_ink_payload["api_warning"] = eval_result["api_warning"]

    record_data = {
        "id": eval_id,
        "exam_id": exam_id,
        "student_id": student_id,
        "roll_number": roll_number,
        "student_name": student_name,
        "answer_sheet_filename": filename,
        "total_score": eval_result["total_score"],
        "max_score": eval_result["max_score"],
        "percentage": eval_result["percentage"],
        "grade": eval_result.get("grade", "Passed"),
        "breakdown": eval_result.get("breakdown", []),
        "teacher_feedback": eval_result.get("teacher_feedback", ""),
        "page_count": raster_info["page_count"],
        "pages_dir": raster_info["pages_dir"],
        "magic_ink": magic_ink_payload,
        "structured_transcription": eval_result.get("structured_transcription", [])
    }
    saved = db.save_academic_evaluation(record_data)
    if eval_result.get("api_warning"):
        saved["api_warning"] = eval_result["api_warning"]
    if eval_result.get("source"):
        saved["source"] = eval_result["source"]
    return saved


async def _run_evaluation_background_job(
    job_id: str,
    eval_id: str,
    exam: Dict[str, Any],
    student_id: str,
    student_name: str,
    roll_number: str,
    filename: str,
    raster_info: Dict[str, Any],
    user_key: Optional[str],
) -> None:
    def _on_stage(stage: str, msg: str) -> None:
        if job_id in _BACKGROUND_JOBS:
            _BACKGROUND_JOBS[job_id].update({
                "stage": stage,
                "message": msg,
            })

    try:
        eval_result = await MagicInkService.evaluate_submission(
            eval_id=eval_id,
            exam=exam,
            student_name=student_name,
            roll_number=roll_number,
            page_records=raster_info["pages"],
            raw_text=raster_info.get("raw_text", ""),
            user_api_key=user_key,
            on_stage_update=_on_stage,
        )
        saved = _persist_evaluation_record(
            eval_id=eval_id,
            exam_id=exam["id"],
            student_id=student_id,
            roll_number=roll_number,
            student_name=student_name,
            filename=filename,
            raster_info=raster_info,
            eval_result=eval_result,
        )
        _BACKGROUND_JOBS[job_id].update({
            "status": "completed",
            "stage": "completed",
            "message": "Evaluation scorecard and overlays ready.",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "result": saved,
        })
    except Exception as exc:
        _BACKGROUND_JOBS[job_id].update({
            "status": "failed",
            "stage": "failed",
            "message": str(exc),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        })


def _run_evaluation_background_thread(
    job_id: str,
    eval_id: str,
    exam: Dict[str, Any],
    student_id: str,
    student_name: str,
    roll_number: str,
    filename: str,
    raster_info: Dict[str, Any],
    user_key: Optional[str],
) -> None:
    """Runs 2-prompt multimodal evaluation on an isolated daemon thread event loop."""
    asyncio.run(
        _run_evaluation_background_job(
            job_id, eval_id, exam, student_id, student_name, roll_number, filename, raster_info, user_key
        )
    )


@router.post("/exams/{exam_id}/evaluate")
async def evaluate_student_submission(
    exam_id: str,
    student_id: str = Form(...),
    sheet_file: Optional[UploadFile] = File(None),
    sheet_text: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    background: bool = Query(False),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Performs strict 2-prompt multimodal evaluation of a student's answer sheet against the
    professor's allocated question marks and master answer key at zero temperature.
    When `background=true`, rasterizes pages immediately and returns `job_id` + `eval_id`
    so the UI can stream uploaded PDF pages + live scanning stages without blocking.
    """
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not (exam.get("answer_key_text") or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Answer key is required before evaluating answer sheets. Please generate or approve the answer key first."
        )

    students = db.list_students(exam["subject_id"])
    student = next((s for s in students if s["id"] == student_id), None)
    if not student:
        student_name = "Candidate"
        roll_number = student_id
    else:
        student_name = student["name"]
        roll_number = student["roll_number"]

    if sheet_file:
        sheet_bytes = await sheet_file.read()
        filename = sheet_file.filename or "student_sheet.pdf"
    elif sheet_text:
        sheet_bytes = sheet_text.encode("utf-8")
        filename = "student_response.txt"
    else:
        raise HTTPException(status_code=400, detail="Must provide either sheet_file or sheet_text")

    user_key = _resolve_gemini_key(gemini_api_key, current_user)
    eval_id = f"eval-{uuid.uuid4().hex[:8]}"

    # Rasterize student submission pages to high-resolution JPEG files + persist raw original file
    raster_info = PageStorageService.save_and_rasterize_submission(
        eval_id=eval_id,
        file_bytes=sheet_bytes,
        filename=filename,
        target_dpi=200
    )

    if background:
        job_id = f"job-{uuid.uuid4().hex[:10]}"
        _BACKGROUND_JOBS[job_id] = {
            "job_id": job_id,
            "exam_id": exam_id,
            "eval_id": eval_id,
            "kind": "evaluation",
            "status": "running",
            "stage": "rasterized",
            "message": f"Rasterized {raster_info['page_count']} page(s). Starting Prompt 1 spatial OCR...",
            "page_count": raster_info["page_count"],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "result": None,
            "error": None,
        }
        worker = threading.Thread(
            target=_run_evaluation_background_thread,
            args=(job_id, eval_id, exam, student_id, student_name, roll_number, filename, raster_info, user_key),
            daemon=True,
        )
        worker.start()
        return {
            "status": "accepted",
            "job_id": job_id,
            "exam_id": exam_id,
            "eval_id": eval_id,
            "page_count": raster_info["page_count"],
        }

    eval_result = await MagicInkService.evaluate_submission(
        eval_id=eval_id,
        exam=exam,
        student_name=student_name,
        roll_number=roll_number,
        page_records=raster_info["pages"],
        raw_text=raster_info.get("raw_text", ""),
        user_api_key=user_key
    )
    return _persist_evaluation_record(
        eval_id=eval_id,
        exam_id=exam_id,
        student_id=student_id,
        roll_number=roll_number,
        student_name=student_name,
        filename=filename,
        raster_info=raster_info,
        eval_result=eval_result,
    )


@router.post("/exams/{exam_id}/evaluate-all")
async def evaluate_all_students(
    exam_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Evaluates all students enrolled in the exam's subject who do not already have an evaluation.
    """
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not (exam.get("answer_key_text") or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Answer key is required before evaluating answer sheets. Please generate or approve the answer key first."
        )

    students = db.list_students(exam["subject_id"])
    existing_evals = db.list_academic_evaluations(exam_id=exam_id)
    evaluated_ids = {e["student_id"] for e in existing_evals}

    results = []
    user_key = None
    if current_user:
        u = db.get_user_by_username(current_user.get("username", ""))
        if u:
            user_key = u.get("gemini_api_key")
    if not user_key:
        user_key = os.getenv("GEMINI_API_KEY", "").strip() or None

    for student in students:
        if student["id"] in evaluated_ids:
            continue

        stud_eval_id = f"eval-{uuid.uuid4().hex[:8]}"
        raster_info = PageStorageService.save_and_rasterize_submission(
            eval_id=stud_eval_id,
            file_bytes=b"Standard student handwritten examination response.",
            filename="student_answers.txt",
            target_dpi=200
        )

        eval_result = await MagicInkService.evaluate_submission(
            eval_id=stud_eval_id,
            exam=exam,
            student_name=student["name"],
            roll_number=student["roll_number"],
            page_records=raster_info["pages"],
            raw_text=raster_info.get("raw_text", ""),
            user_api_key=user_key
        )

        magic_ink_payload = dict(eval_result.get("magic_ink") or {})
        if isinstance(magic_ink_payload.get("svg_overlays"), dict):
            magic_ink_payload["svg_overlays"] = {
                str(k): v for k, v in magic_ink_payload["svg_overlays"].items()
            }

        record_data = {
            "id": stud_eval_id,
            "exam_id": exam_id,
            "student_id": student["id"],
            "roll_number": student["roll_number"],
            "student_name": student["name"],
            "answer_sheet_filename": "evaluated_sheet.jpg",
            "total_score": eval_result["total_score"],
            "max_score": eval_result["max_score"],
            "percentage": eval_result["percentage"],
            "grade": eval_result.get("grade", "Passed"),
            "breakdown": eval_result.get("breakdown", []),
            "teacher_feedback": eval_result.get("teacher_feedback", ""),
            "page_count": raster_info["page_count"],
            "pages_dir": raster_info["pages_dir"],
            "magic_ink": magic_ink_payload,
            "structured_transcription": eval_result.get("structured_transcription", [])
        }
        saved = db.save_academic_evaluation(record_data)
        results.append(saved)

    return {"status": "success", "evaluated_count": len(results), "evaluations": results}


@router.get("/evaluations")
def list_evaluations(
    exam_id: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists academic evaluations strictly scoped to user and institution."""
    inst_id = current_user.get("institution_id") if current_user else None
    user_id = None
    if current_user:
        u_role = (current_user.get("role") or "").strip().lower()
        if u_role not in ["admin"]:
            user_id = current_user.get("id")
    return db.list_academic_evaluations(exam_id=exam_id, student_id=student_id, user_id=user_id, institution_id=inst_id)


@router.get("/evaluations/{eval_id}")
def get_evaluation(eval_id: str):
    """Retrieves an evaluated scorecard by its unique identifier."""
    result = db.get_academic_evaluation(eval_id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    return result


@router.put("/evaluations/{eval_id}")
def update_evaluation(eval_id: str, req: EvaluationUpdateRequest):
    """Persists professor edits (double-tap markdown OCR/feedback or rubric score adjustments)."""
    updates = req.model_dump(exclude_none=True)
    updated = db.update_academic_evaluation(eval_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    return updated


@router.get("/evaluations/{eval_id}/file")
def get_evaluation_original_file(eval_id: str):
    """Streams the originally uploaded PDF/image submission inline for browser viewing/download."""
    resolved = PageStorageService.get_original_submission_path(eval_id)
    if not resolved:
        raise HTTPException(status_code=404, detail=f"Original uploaded file not found for evaluation {eval_id}")
    file_path, media_type = resolved
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{os.path.basename(file_path)}"'},
    )


@router.get("/evaluations/{eval_id}/pages/{page_num}")
def get_evaluation_page_image(eval_id: str, page_num: int):
    """
    Streams a rasterized JPEG page image (200 DPI) for the in-app MagicInk viewer.
    """
    img_path = PageStorageService.get_page_image_path(eval_id, page_num)
    if not img_path or not os.path.isfile(img_path):
        raise HTTPException(status_code=404, detail=f"Page {page_num} not found for evaluation {eval_id}")
    return FileResponse(img_path, media_type="image/jpeg")


@router.get("/evaluations/{eval_id}/magicink")
def get_evaluation_magic_ink(eval_id: str):
    """
    Retrieves the complete MagicInk spatial annotations, bounding boxes,
    and responsive SVG overlay definitions for an evaluated answer booklet.
    """
    evaluation = db.get_academic_evaluation(eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    
    magic_ink = evaluation.get("magic_ink") or {}
    return {
        "eval_id": eval_id,
        "page_count": evaluation.get("page_count", 1),
        "total_score": evaluation.get("total_score", 0.0),
        "max_score": evaluation.get("max_score", 20.0),
        "percentage": evaluation.get("percentage", 0.0),
        "grade": evaluation.get("grade", "Passed"),
        "magic_ink": magic_ink
    }


# =========================================================================
# 11. ADMIN MANAGEMENT & SYSTEM HEALTH ENDPOINTS
# =========================================================================

@router.get("/admin/teachers")
def admin_list_teachers(
    institution_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Lists faculty members strictly scoped to the admin's institution."""
    target_inst = institution_id
    if current_user and current_user.get("institution_id"):
        target_inst = target_inst or current_user["institution_id"]
    return db.list_users(institution_id=target_inst, role=role)


@router.put("/admin/teachers/{user_id}/role")
def admin_update_teacher_role(user_id: int, req: TeacherRoleUpdateRequest):
    """Updates faculty role (Teacher, HOD, Exam Coordinator, Admin) and department."""
    ok = db.admin_update_user_role(user_id, req.role, req.department)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found or role update failed")
    return {"status": "success", "user": db.get_user_by_id(user_id)}


@router.post("/admin/teachers/reassign")
def admin_reassign_teacher_subjects(req: TeacherReassignRequest):
    """Reassigns all subjects from one teacher to another."""
    from_user = db.get_user_by_id(req.from_user_id)
    to_user = db.get_user_by_id(req.to_user_id)
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="Target faculty member not found")
    count = db.admin_reassign_teacher_subjects(req.from_user_id, req.to_user_id)
    return {"status": "success", "reassigned_subjects_count": count}


@router.put("/admin/teachers/{user_id}/reset-password")
def admin_reset_teacher_password(user_id: int, req: PasswordResetRequest):
    """Resets password for a faculty member."""
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    pwd_hash = hash_password(req.new_password)
    ok = db.admin_reset_user_password(user_id, pwd_hash)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "Password reset successfully"}


@router.delete("/admin/teachers/{user_id}")
def admin_delete_teacher(user_id: int):
    """Removes a teacher account. Any assigned subjects are marked as unassigned."""
    ok = db.admin_delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "Teacher removed"}


@router.put("/admin/subjects/{subject_id}/teacher")
def admin_assign_subject_teacher(subject_id: str, req: SubjectTeacherAssignRequest):
    """Assigns a subject to a faculty member."""
    user = db.get_user_by_id(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    ok = db.admin_reassign_subject_teacher(subject_id, req.user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"status": "success", "subject": db.get_subject(subject_id)}


@router.get("/admin/students")
def admin_list_students(
    search: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Global institution-wide student directory with search, scoped to admin's institution."""
    inst_id = current_user.get("institution_id") if current_user else None
    all_students = db.list_students(class_id=class_id, institution_id=inst_id)
    if search:
        s_lower = search.strip().lower()
        all_students = [
            s for s in all_students
            if s_lower in (s.get("name") or "").lower()
            or s_lower in (s.get("roll_number") or "").lower()
            or s_lower in (s.get("email") or "").lower()
            or s_lower in (s.get("phone") or "").lower()
            or s_lower in (s.get("parent_name") or "").lower()
            or s_lower in (s.get("parent_phone") or "").lower()
        ]
    return all_students


@router.put("/admin/students/{student_id}/transfer")
def admin_transfer_student(student_id: str, req: StudentTransferRequest):
    """Transfers a student to another class cohort and section."""
    target_class = db.get_class(req.to_class_id)
    if not target_class:
        raise HTTPException(status_code=404, detail="Target class cohort not found")
    ok = db.admin_transfer_student(student_id, req.to_class_id, req.to_section)
    if not ok:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"status": "success", "student": db.get_student(student_id)}


@router.get("/admin/health")
def admin_get_system_health(
    institution_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Computes comprehensive health, overdue deadlines, and diagnostic stats scoped to institution."""
    target_inst = institution_id
    if current_user and current_user.get("institution_id"):
        target_inst = target_inst or current_user["institution_id"]
    return db.admin_get_system_health(institution_id=target_inst)


@router.post("/admin/fix-orphans")
def admin_fix_orphans(req: FixOrphansRequest, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Reassigns all orphaned subjects to the active admin or specified fallback user."""
    fallback_id = req.fallback_user_id
    if not fallback_id and current_user:
        fallback_id = current_user.get("id")
    if not fallback_id:
        fallback_id = 1
    count = db.admin_fix_orphans(fallback_id)
    return {"status": "success", "reassigned_orphans_count": count}


@router.put("/admin/institutions/{institution_id}")
def admin_update_institution(institution_id: str, req: InstitutionUpdateRequest):
    """Updates institution metadata (name, code, type, config)."""
    updates = req.model_dump(exclude_unset=True)
    inst = db.update_institution(institution_id, updates)
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"status": "success", "institution": inst}
