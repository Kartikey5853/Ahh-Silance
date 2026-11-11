"""
Unit and integration tests for the Academic Management & Strict Grading System.
"""

import io
import uuid
import pymupdf
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

AUTH_HEADERS = {}
TEST_USER = f"flow_prof_{uuid.uuid4().hex[:6]}"


def test_auth_and_profile():
    global AUTH_HEADERS
    # Register user
    reg = client.post("/api/v1/auth/register", json={
        "username": TEST_USER,
        "password": "flowpassword123",
        "full_name": "Dr. Rajesh Sharma",
        "email": f"{TEST_USER}@univ.edu",
        "role": "Professor"
    })
    assert reg.status_code == 200, reg.text
    token = reg.json()["access_token"]
    AUTH_HEADERS = {"Authorization": f"Bearer {token}"}

    # Verify Profile
    res = client.get("/api/v1/academic/profile", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == TEST_USER
    assert "Sharma" in data["full_name"]
    assert "Professor" in data["role"]


def test_academic_institutions_hierarchy():
    # Create College institution
    c_res = client.post("/api/v1/academic/institutions", json={
        "name": "ACE College of Engineering",
        "code": "ACE",
        "type": "college",
        "config": {"degree": "B.Tech", "semesters": ["Sem 1", "Sem 2", "Sem 6"]}
    }, headers=AUTH_HEADERS)
    assert c_res.status_code == 200

    # Create School institution
    s_res = client.post("/api/v1/academic/institutions", json={
        "name": "Delhi Public School",
        "code": "DPS",
        "type": "school",
        "config": {"board": "CBSE", "grades": ["Class 10", "Class 11", "Class 12"]}
    }, headers=AUTH_HEADERS)
    assert s_res.status_code == 200

    # Create Competitive institution
    j_res = client.post("/api/v1/academic/institutions", json={
        "name": "Apex JEE Academy",
        "code": "APEX",
        "type": "competitive",
        "config": {"target": "JEE Advanced", "pattern": "+4 / -1"}
    }, headers=AUTH_HEADERS)
    assert j_res.status_code == 200

    res = client.get("/api/v1/academic/institutions", headers=AUTH_HEADERS)
    assert res.status_code == 200
    insts = res.json()
    assert len(insts) >= 3
    types = [i["type"] for i in insts]
    assert "college" in types
    assert "school" in types
    assert "competitive" in types


def test_subjects_listing():
    insts = client.get("/api/v1/academic/institutions", headers=AUTH_HEADERS).json()
    college_inst = next((i for i in insts if i["type"] == "college"), None)
    if college_inst is None:
        college_inst = client.post(
            "/api/v1/academic/institutions",
            json={"name": "Test Engineering College", "code": "TEC", "type": "college"},
            headers=AUTH_HEADERS,
        ).json()

    # Create subject
    client.post("/api/v1/academic/subjects", json={
        "name": "Natural Language Processing",
        "code": "NLP-701",
        "institution_id": college_inst["id"],
        "institution_type": "college",
        "semester_or_grade": "Sem 6",
        "credits": 4,
        "academic_year": "2026-2027",
        "chapters": ["1. Tokenization", "2. Word Embeddings", "3. Transformers"]
    }, headers=AUTH_HEADERS)

    res = client.get("/api/v1/academic/subjects", headers=AUTH_HEADERS)
    assert res.status_code == 200
    subjs = res.json()
    assert len(subjs) >= 1
    nlp = next((s for s in subjs if "NLP" in s["name"] or "Natural Language" in s["name"]), None)
    assert nlp is not None
    assert nlp["credits"] == 4
    assert len(nlp["chapters"]) >= 3


def test_one_by_one_student_enrollment():
    subjs = client.get("/api/v1/academic/subjects", headers=AUTH_HEADERS).json()
    assert len(subjs) > 0
    subj_id = subjs[0]["id"]

    res = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Kavya Patel",
        "roll_number": "2026CS199",
        "email": "kavya.p@abccollege.edu",
        "section": "Section B"
    }, headers=AUTH_HEADERS)
    assert res.status_code == 200
    new_student = res.json()
    assert new_student["name"] == "Kavya Patel"
    assert new_student["roll_number"] == "2026CS199"

    # Verify listing
    res_list = client.get(f"/api/v1/academic/subjects/{subj_id}/students", headers=AUTH_HEADERS)
    assert res_list.status_code == 200
    students = res_list.json()
    assert any(s["roll_number"] == "2026CS199" for s in students)


def test_modify_exam_questions_and_marks():
    subjs = client.get("/api/v1/academic/subjects", headers=AUTH_HEADERS).json()
    subj_id = subjs[0]["id"]

    # Create an exam first
    created_exam = client.post("/api/v1/academic/exams", json={
        "subject_id": subj_id,
        "title": "NLP Mid-Sem Examination 2026",
        "exam_type": "Mid-Sem",
        "max_marks": 50.0,
        "passing_marks": 20.0,
        "academic_year": "2026-2027",
        "answer_key_text": "Answer key for NLP questions.",
        "questions": [
            {
                "id": "q-1",
                "q_no": "Q1",
                "text": "Explain CBOW vs Skip-gram.",
                "marks": 10.0,
                "rubric": "4 pts architecture, 3 pts rare words, 3 pts complexity.",
                "ideal_answer": "CBOW averages context to predict target."
            },
            {
                "id": "q-2",
                "q_no": "Q2",
                "text": "Derive Scaled Dot-Product Attention.",
                "marks": 10.0,
                "rubric": "4 pts formula, 3 pts sqrt scaling, 3 pts saturation.",
                "ideal_answer": "Softmax(QK^T / sqrt(d_k)) * V"
            }
        ]
    }, headers=AUTH_HEADERS).json()

    exam_id = created_exam["id"]
    exam_res = client.get(f"/api/v1/academic/exams/{exam_id}", headers=AUTH_HEADERS)
    assert exam_res.status_code == 200
    exam = exam_res.json()
    questions = exam["questions"]
    assert len(questions) >= 2

    # Professor modifies marks of Q1 from 10 to 15
    questions[0]["marks"] = 15.0
    total_marks = sum(q["marks"] for q in questions)

    put_res = client.put(f"/api/v1/academic/exams/{exam_id}/questions", json={
        "questions": questions,
        "max_marks": total_marks
    }, headers=AUTH_HEADERS)
    assert put_res.status_code == 200
    updated_exam = put_res.json()["exam"]
    assert updated_exam["max_marks"] == total_marks
    assert updated_exam["questions"][0]["marks"] == 15.0


def test_strict_student_evaluation_with_rubric():
    subjs = client.get("/api/v1/academic/subjects", headers=AUTH_HEADERS).json()
    subj_id = subjs[0]["id"]
    exams = client.get(f"/api/v1/academic/exams?subject_id={subj_id}", headers=AUTH_HEADERS).json()
    assert len(exams) > 0
    exam_id = exams[0]["id"]

    students = client.get(f"/api/v1/academic/subjects/{subj_id}/students", headers=AUTH_HEADERS).json()
    assert len(students) > 0
    student_id = students[0]["id"]

    student_text = (
        "ANS TO Q1: CBOW predicts center word from context sum, fast on frequent words. "
        "Skip-gram predicts context from center word, handles rare words better.\n"
        "ANS TO Q2: Attention scales by sqrt(d_k) to prevent dot product growth causing softmax saturation and vanishing gradient."
    )

    res = client.post(
        f"/api/v1/academic/exams/{exam_id}/evaluate",
        data={"student_id": student_id, "sheet_text": student_text},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    card = res.json()
    assert card["student_id"] == student_id
    assert card["total_score"] > 0
    assert len(card["breakdown"]) >= 1
    first_q = card["breakdown"][0]
    assert "awarded_marks" in first_q
    assert "evidence_quote" in first_q


def test_student_profile_and_update():
    subjs = client.get("/api/v1/academic/subjects", headers=AUTH_HEADERS).json()
    subj_id = subjs[0]["id"]
    students = client.get(f"/api/v1/academic/subjects/{subj_id}/students", headers=AUTH_HEADERS).json()
    assert len(students) > 0
    student_id = students[0]["id"]

    # 1. Update Student Profile
    update_res = client.put(f"/api/v1/academic/students/{student_id}", json={
        "phone": "+91 98765 43210",
        "parent_name": "R. K. Sharma",
        "parent_phone": "+91 98765 00000",
        "attendance_percentage": 92.5,
        "cgpa_or_percentage": 8.8,
        "status": "Active",
        "notes": "Consistently strong performance in coursework."
    }, headers=AUTH_HEADERS)
    assert update_res.status_code == 200
    updated_student = update_res.json()
    assert updated_student["phone"] == "+91 98765 43210"
    assert updated_student["parent_name"] == "R. K. Sharma"
    assert updated_student["attendance_percentage"] == 92.5

    # 2. Get Student Full Profile
    prof_res = client.get(f"/api/v1/academic/students/{student_id}", headers=AUTH_HEADERS)
    assert prof_res.status_code == 200
    profile_data = prof_res.json()
    assert profile_data["student"]["id"] == student_id
    assert len(profile_data["evaluations"]) >= 1
    assert "stats" in profile_data
    assert profile_data["stats"]["total_exams_taken"] >= 1


def test_review_paper_overlays_and_question_refine():
    # 1. Generate a real 2-page PDF question paper and upload to scan-paper
    doc = pymupdf.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text(
        (50, 70),
        "ATCD Mid-Semester Paper\n\nQ1.a (5 Marks): Construct SLR Parsing table for:\nS -> (L) | a\nL -> L,S | S\n",
        fontsize=12,
    )
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text(
        (50, 70),
        "Q2 (10 Marks): Explain syntax-directed translation for arithmetic expressions.\n",
        fontsize=12,
    )
    pdf_bytes = doc.tobytes()
    doc.close()

    scan_res = client.post(
        "/api/v1/academic/exams/scan-paper",
        files={"file": ("review_test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=AUTH_HEADERS,
    )
    assert scan_res.status_code == 200, scan_res.text
    scan_data = scan_res.json()
    assert scan_data["paper_id"]
    assert scan_data["paper_page_count"] == 2
    assert len(scan_data["questions"]) >= 1
    first_q = scan_data["questions"][0]
    assert isinstance(first_q.get("page"), int)
    assert isinstance(first_q.get("box_2d"), list) and len(first_q["box_2d"]) == 4

    # 2. Verify both rasterized paper pages are served via API
    for page_num in (1, 2):
        img_res = client.get(f"/api/v1/academic/papers/{scan_data['paper_id']}/pages/{page_num}", headers=AUTH_HEADERS)
        assert img_res.status_code == 200
        assert img_res.headers["content-type"].startswith("image/jpeg")
        assert len(img_res.content) > 1000

    # 3. Verify persisting paper_id & paper_page_count on exam update
    subjs = client.get("/api/v1/academic/subjects", headers=AUTH_HEADERS).json()
    exams = client.get(f"/api/v1/academic/exams?subject_id={subjs[0]['id']}", headers=AUTH_HEADERS).json()
    exam_id = exams[0]["id"]
    upd_res = client.put(
        f"/api/v1/academic/exams/{exam_id}/questions",
        json={
            "questions": scan_data["questions"],
            "max_marks": scan_data["total_marks"],
            "paper_id": scan_data["paper_id"],
            "paper_page_count": scan_data["paper_page_count"],
            "question_paper_filename": "review_test.pdf",
        },
        headers=AUTH_HEADERS,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["exam"]["paper_id"] == scan_data["paper_id"]
    assert upd_res.json()["exam"]["paper_page_count"] == 2

    # 4. Verify interactive Refine / Auto-Generate same-topic questions endpoint
    ref_res = client.post(
        "/api/v1/academic/exams/refine-question",
        json={
            "question_text": "Construct SLR Parsing table for S -> (L) | a, L -> L,S | S",
            "q_no": "Q1.a",
            "marks": 5.0,
            "subject_name": "ATCD",
            "action": "auto_generate",
            "target_level": "Hard",
        },
        headers=AUTH_HEADERS,
    )
    assert ref_res.status_code == 200, ref_res.text
    ref_data = ref_res.json()
    assert len(ref_data["suggestions"]) >= 3
    assert all("question_text" in s and "difficulty_level" in s for s in ref_data["suggestions"])


def test_multi_subject_student_dedup_semester_records_and_exam_details():
    import time

    insts = client.get("/api/v1/academic/institutions", headers=AUTH_HEADERS).json()
    college_inst = next((i for i in insts if i["type"] == "college"), None)
    if college_inst is None:
        college_inst = client.post(
            "/api/v1/academic/institutions",
            json={"name": "Test Engineering College", "code": "TEC", "type": "college"},
            headers=AUTH_HEADERS,
        ).json()

    # Create a dedicated class cohort + two subjects
    cls = client.post(
        "/api/v1/academic/classes",
        json={
            "name": "CSD-Test Sem 5",
            "code": "CSD-T5",
            "institution_id": college_inst["id"],
            "department": "CSE (DS)",
            "academic_year": "2026-2027",
        },
        headers=AUTH_HEADERS,
    ).json()

    s1 = client.post(
        "/api/v1/academic/subjects",
        json={
            "name": "NLP Core",
            "code": "NLP-T1",
            "institution_id": college_inst["id"],
            "class_id": cls["id"],
            "institution_type": "college",
            "semester_or_grade": "Sem 5",
            "credits": 4,
            "academic_year": "2026-2027",
        },
        headers=AUTH_HEADERS,
    ).json()
    s2 = client.post(
        "/api/v1/academic/subjects",
        json={
            "name": "Compiler Theory",
            "code": "ATCD-T2",
            "institution_id": college_inst["id"],
            "class_id": cls["id"],
            "institution_type": "college",
            "semester_or_grade": "Sem 5",
            "credits": 4,
            "academic_year": "2026-2027",
        },
        headers=AUTH_HEADERS,
    ).json()

    # Enroll same student (same roll number) in both subjects across Section A and Section B
    stud_a = client.post(
        f"/api/v1/academic/subjects/{s1['id']}/students",
        json={
            "name": "Arjun MultiSubj",
            "roll_number": "24K91A6799",
            "section": "A",
            "class_id": cls["id"],
            "cgpa_or_percentage": 8.75,
            "semester_records": [
                {"semester": "Semester 1", "sgpa": 8.5, "cgpa": 8.5, "credits": 20, "status": "Completed"},
                {"semester": "Semester 2", "sgpa": 9.0, "cgpa": 8.75, "credits": 22, "status": "Completed"},
            ],
        },
        headers=AUTH_HEADERS,
    ).json()
    stud_b = client.post(
        f"/api/v1/academic/subjects/{s2['id']}/students",
        json={
            "name": "Arjun MultiSubj",
            "roll_number": "24K91A6799",
            "section": "B",
            "class_id": cls["id"],
        },
        headers=AUTH_HEADERS,
    ).json()

    # Enroll another student only in Section B
    client.post(
        f"/api/v1/academic/subjects/{s1['id']}/students",
        json={
            "name": "Meera SectionB",
            "roll_number": "24K91A6788",
            "section": "B",
            "class_id": cls["id"],
        },
        headers=AUTH_HEADERS,
    )

    # Update semester_records on stud_a and verify it syncs across both rows and returns both subjects
    upd = client.put(
        f"/api/v1/academic/students/{stud_a['id']}",
        json={
            "cgpa_or_percentage": 8.9,
            "semester_records": [
                {"semester": "Semester 1", "sgpa": 8.5, "cgpa": 8.5, "credits": 20, "status": "Completed"},
                {"semester": "Semester 3", "sgpa": 9.3, "cgpa": 8.9, "credits": 21, "status": "Completed"},
            ],
        },
        headers=AUTH_HEADERS,
    )
    assert upd.status_code == 200
    assert len(upd.json()["semester_records"]) == 2

    prof = client.get(f"/api/v1/academic/students/{stud_b['id']}", headers=AUTH_HEADERS).json()
    assert len(prof["enrolled_subjects"]) == 2
    assert prof["student"]["cgpa_or_percentage"] == 8.9
    assert len(prof["student"]["semester_records"]) == 2

    # Create Exam under s1, check exam details filtering & non-blocking background answer key job
    ex = client.post(
        "/api/v1/academic/exams",
        json={
            "subject_id": s1["id"],
            "title": "ATCD Section Filter & Background Key Exam",
            "exam_type": "Assignment",
            "max_marks": 10.0,
            "passing_marks": 4.0,
            "academic_year": "2026-2027",
            "target_section": "A",
            "questions": [
                {
                    "id": "q-1",
                    "q_no": "Q1",
                    "text": "Construct **SLR** parsing table for `S -> (L) | a, L -> L,S | S`.",
                    "marks": 10.0,
                    "rubric": "Award 4M LR(0), 6M parsing table.",
                }
            ],
        },
        headers=AUTH_HEADERS,
    ).json()

    det_a = client.get(f"/api/v1/academic/exams/{ex['id']}/details", headers=AUTH_HEADERS).json()
    assert det_a["exam"]["target_section"] == "A"
    # Arjun is in Section A (under s1), Meera is Section B only -> only Arjun qualifies for Section A
    rolls_a = [s["roll_number"] for s in det_a["eligible_students"]]
    assert "24K91A6799" in rolls_a
    assert "24K91A6788" not in rolls_a

    # Switch exam target_section to "" (All Sections) -> both unique students qualify (deduplicated)
    meta_res = client.put(
        f"/api/v1/academic/exams/{ex['id']}",
        json={"target_section": ""},
        headers=AUTH_HEADERS,
    )
    assert meta_res.status_code == 200
    det_all = client.get(f"/api/v1/academic/exams/{ex['id']}/details", headers=AUTH_HEADERS).json()
    rolls_all = [s["roll_number"] for s in det_all["eligible_students"]]
    assert rolls_all.count("24K91A6799") == 1
    assert "24K91A6788" in rolls_all

    # Manual answer key + structured save
    ak_put = client.put(
        f"/api/v1/academic/exams/{ex['id']}/answer-key",
        json={
            "answer_key_text": "[Q1] Manual canonical key",
            "answer_key_structured": [
                {"q_no": "Q1", "marks": 10.0, "model_answer": "Construct canonical LR(0) items I0..I8."}
            ],
        },
        headers=AUTH_HEADERS,
    )
    assert ak_put.status_code == 200
    assert ak_put.json()["exam"]["answer_key_structured"][0]["q_no"] == "Q1"

    # Non-blocking background generation returns job_id immediately
    bg_res = client.post(
        f"/api/v1/academic/exams/{ex['id']}/generate-answer-key?background=true",
        headers=AUTH_HEADERS,
    )
    assert bg_res.status_code == 200
    job_id = bg_res.json()["job_id"]
    assert bg_res.json()["status"] == "accepted"

    final_job = None
    for _ in range(90):
        j_res = client.get(f"/api/v1/academic/jobs/{job_id}", headers=AUTH_HEADERS)
        assert j_res.status_code == 200
        final_job = j_res.json()
        if final_job["status"] in ("completed", "failed"):
            break
        time.sleep(0.5)
    assert final_job is not None and final_job["status"] == "completed", final_job
    assert final_job["result"]["answer_key_text"]


if __name__ == "__main__":
    test_auth_and_profile()
    test_academic_institutions_hierarchy()
    test_subjects_listing()
    test_one_by_one_student_enrollment()
    test_modify_exam_questions_and_marks()
    test_strict_student_evaluation_with_rubric()
    test_student_profile_and_update()
    test_review_paper_overlays_and_question_refine()
    test_multi_subject_student_dedup_semester_records_and_exam_details()
    print("ALL ACADEMIC FLOW TESTS PASSED!")
