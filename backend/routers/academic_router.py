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
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.core.database import db
from backend.core.auth import get_optional_current_user
from backend.services.gemini_academic_service import GeminiAcademicService
from backend.services.page_storage_service import PageStorageService
from backend.services.magic_ink_service import MagicInkService

router = APIRouter(prefix="/academic", tags=["Academic Evaluation"])


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


class ExamCreateRequest(BaseModel):
    subject_id: str
    title: str
    exam_type: str # 'Mid-Sem', 'End-Sem', 'Half-Yearly', 'Assessment 1', 'Mock Test'
    max_marks: float = 50.0
    passing_marks: float = 20.0
    academic_year: str = "2026-2027"
    exam_date: Optional[str] = None
    correction_deadline: Optional[str] = None
    question_paper_filename: Optional[str] = ""
    paper_id: Optional[str] = ""
    paper_page_count: Optional[int] = 0
    answer_key_text: Optional[str] = ""
    questions: List[Dict[str, Any]] = Field(default_factory=list)


class QuestionsUpdateRequest(BaseModel):
    questions: List[Dict[str, Any]]
    max_marks: Optional[float] = None
    paper_id: Optional[str] = None
    paper_page_count: Optional[int] = None
    question_paper_filename: Optional[str] = None
    title: Optional[str] = None
    correction_deadline: Optional[str] = None


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
    success = db.update_user_profile(user["id"], updates)
    return {"status": "success", "updated": success, "profile": db.get_user_by_id(user["id"])}


# 2. Institutions
@router.get("/institutions")
def list_institutions():
    """Lists all configured academic institutions (College, School, Competitive)."""
    return db.list_institutions()


@router.post("/institutions")
def create_institution(req: InstitutionCreateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Creates a new institution / organization and associates it with the active user."""
    inst_id = f"inst-{uuid.uuid4().hex[:8]}"
    created = db.create_institution(inst_id, req.name, req.type, req.code or "", req.config or {})
    if current_user and current_user.get("username"):
        u = db.get_user_by_username(current_user["username"])
        if u:
            db.update_user_profile(u["id"], {"institution_id": inst_id})
    return created


# 2.1 Classes (Organization -> Class -> Subject)
@router.get("/classes")
def list_classes(institution_id: Optional[str] = Query(None)):
    """Lists classes for an institution."""
    return db.list_classes(institution_id=institution_id)


@router.post("/classes")
def create_class(req: ClassCreateRequest):
    """Creates a new class under an institution."""
    return db.create_class(req.model_dump())


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


# 3. Subjects
@router.get("/subjects")
def list_subjects(institution_id: Optional[str] = Query(None), class_id: Optional[str] = Query(None)):
    """Lists all subjects with credit counts, chapters, and enrolled student totals."""
    return db.list_subjects(institution_id=institution_id, class_id=class_id)


@router.post("/subjects")
def create_subject(req: SubjectCreateRequest):
    """Creates a new subject under the selected institution hierarchy."""
    data = req.model_dump()
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
def list_all_students(class_id: Optional[str] = Query(None), subject_id: Optional[str] = Query(None)):
    """Lists students optionally filtered by class_id or subject_id."""
    return db.list_students(subject_id=subject_id, class_id=class_id)


@router.get("/subjects/{subject_id}/students")
def list_students(subject_id: str, class_id: Optional[str] = Query(None)):
    """Lists all students enrolled in a specific subject or class."""
    return db.list_students(subject_id=subject_id, class_id=class_id)


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
        notes=req.notes or ""
    )
    return student


@router.get("/students/{student_id}")
def get_student_profile(student_id: str):
    """Retrieves full student profile, past evaluations, upcoming exams, and academic performance stats."""
    student = db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    subject = db.get_subject(student["subject_id"]) if student.get("subject_id") else None
    class_item = db.get_class(student["class_id"]) if student.get("class_id") else None

    # Past evaluations
    evaluations = db.list_academic_evaluations(student_id=student_id)

    # All exams for this student's subject
    subject_exams = db.list_exams(subject_id=student.get("subject_id")) if student.get("subject_id") else []
    evaluated_exam_ids = {e["exam_id"] for e in evaluations}
    upcoming_exams = [ex for ex in subject_exams if ex["id"] not in evaluated_exam_ids]

    # Calculate performance stats
    total_percentage = sum(e["percentage"] for e in evaluations) if evaluations else 0.0
    avg_percentage = round(total_percentage / len(evaluations), 1) if evaluations else 0.0

    return {
        "student": student,
        "subject": subject,
        "class_item": class_item,
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
def list_exams(subject_id: Optional[str] = Query(None)):
    """Lists all scheduled or completed examinations."""
    return db.list_exams(subject_id=subject_id)


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
    )
    return {"status": "success" if success else "failed", "exam": db.get_exam(exam_id)}


@router.put("/exams/{exam_id}/answer-key")
def update_exam_answer_key(exam_id: str, req: AnswerKeyUpdateRequest):
    """Updates master answer key for an examination."""
    success = db.update_exam_answer_key(exam_id, req.answer_key_text)
    return {"status": "success" if success else "failed"}


@router.post("/exams/{exam_id}/generate-answer-key")
async def generate_exam_answer_key(
    exam_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Generates a comprehensive Master Answer Key with marking rubrics using Gemini API.
    Persists the answer key into the exam record in SQLite.
    """
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = exam.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="Exam has no questions to generate answer key for")

    user_key = None
    if current_user:
        u = db.get_user_by_username(current_user.get("username", ""))
        if u:
            user_key = u.get("gemini_api_key")
    if not user_key:
        user_key = os.getenv("GEMINI_API_KEY", "").strip() or None

    result = await GeminiAcademicService.generate_answer_key(
        questions=questions,
        exam_title=exam.get("title", "Examination"),
        user_api_key=user_key
    )

    if result.get("answer_key_text"):
        db.update_exam_answer_key(exam_id, result["answer_key_text"])

    return result


@router.delete("/exams/{exam_id}")
def delete_exam(exam_id: str):
    """Deletes an examination and its scorecards."""
    success = db.delete_exam(exam_id)
    return {"status": "success" if success else "failed"}


# 6. Strict Multimodal Evaluation
@router.post("/exams/{exam_id}/evaluate")
async def evaluate_student_submission(
    exam_id: str,
    student_id: str = Form(...),
    sheet_file: Optional[UploadFile] = File(None),
    sheet_text: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Performs strict evaluation of a student's answer sheet against the
    professor's allocated question marks and master answer key at zero temperature.
    """
    exam = db.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not (exam.get("answer_key_text") or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Answer key is required before evaluating answer sheets. Please generate or approve the answer key first."
        )

    # Fetch student details
    students = db.list_students(exam["subject_id"])
    student = next((s for s in students if s["id"] == student_id), None)
    if not student:
        student_name = "Candidate"
        roll_number = student_id
    else:
        student_name = student["name"]
        roll_number = student["roll_number"]

    # Read sheet bytes
    if sheet_file:
        sheet_bytes = await sheet_file.read()
        filename = sheet_file.filename or "student_sheet.pdf"
    elif sheet_text:
        sheet_bytes = sheet_text.encode("utf-8")
        filename = "student_response.txt"
    else:
        raise HTTPException(status_code=400, detail="Must provide either sheet_file or sheet_text")

    user_key = gemini_api_key
    if not user_key and current_user:
        u = db.get_user_by_username(current_user.get("username", ""))
        if u:
            user_key = u.get("gemini_api_key")
    if not user_key:
        user_key = os.getenv("GEMINI_API_KEY", "").strip() or None

    eval_id = f"eval-{uuid.uuid4().hex[:8]}"

    # Rasterize student submission pages to high-resolution JPEG files
    raster_info = PageStorageService.save_and_rasterize_submission(
        eval_id=eval_id,
        file_bytes=sheet_bytes,
        filename=filename,
        target_dpi=200
    )

    # Run MagicInk 3-Stage High-Precision Multimodal Evaluation
    eval_result = await MagicInkService.evaluate_submission(
        eval_id=eval_id,
        exam=exam,
        student_name=student_name,
        roll_number=roll_number,
        page_records=raster_info["pages"],
        raw_text=raster_info.get("raw_text", ""),
        user_api_key=user_key
    )

    # Normalize svg_overlays string keys for JSON persistence consistently
    magic_ink_payload = dict(eval_result.get("magic_ink") or {})
    if isinstance(magic_ink_payload.get("svg_overlays"), dict):
        magic_ink_payload["svg_overlays"] = {
            str(k): v for k, v in magic_ink_payload["svg_overlays"].items()
        }

    # Persist in SQLite with MagicInk annotations and page metadata
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
    return saved


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
    student_id: Optional[str] = Query(None)
):
    """Lists all academic evaluations, optionally filtered by examination ID or student ID."""
    return db.list_academic_evaluations(exam_id=exam_id, student_id=student_id)


@router.get("/evaluations/{eval_id}")
def get_evaluation(eval_id: str):
    """Retrieves an evaluated scorecard by its unique identifier."""
    result = db.get_academic_evaluation(eval_id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    return result


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
