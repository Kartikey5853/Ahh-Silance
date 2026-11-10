"""
Unit and integration tests for the Academic Management & Strict Grading System.
"""

import uuid
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
    college_inst = next((i for i in insts if i["type"] == "college"), insts[0])

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


if __name__ == "__main__":
    test_auth_and_profile()
    test_academic_institutions_hierarchy()
    test_subjects_listing()
    test_one_by_one_student_enrollment()
    test_modify_exam_questions_and_marks()
    test_strict_student_evaluation_with_rubric()
    test_student_profile_and_update()
    print("ALL ACADEMIC FLOW TESTS PASSED!")
