"""
Unit and integration tests for the Academic Management & Strict Grading System.
"""

# import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import db

client = TestClient(app)


def test_academic_profile_endpoint():
    res = client.get("/api/v1/academic/profile")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] in ["test", "professor"]
    assert "Professor" in data["role"]
    assert "ACE" in data["institution_name"]


def test_academic_institutions_hierarchy():
    res = client.get("/api/v1/academic/institutions")
    assert res.status_code == 200
    insts = res.json()
    assert len(insts) >= 3
    types = [i["type"] for i in insts]
    assert "college" in types
    assert "school" in types
    assert "competitive" in types


def test_subjects_listing():
    res = client.get("/api/v1/academic/subjects")
    assert res.status_code == 200
    subjs = res.json()
    assert len(subjs) >= 1
    nlp = next((s for s in subjs if "NLP" in s["name"] or "Natural Language" in s["name"]), None)
    assert nlp is not None
    assert nlp["credits"] == 4
    assert len(nlp["chapters"]) >= 3


def test_one_by_one_student_enrollment():
    subjs = client.get("/api/v1/academic/subjects").json()
    assert len(subjs) > 0
    subj_id = subjs[0]["id"]

    res = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Kavya Patel",
        "roll_number": "2026CS199",
        "email": "kavya.p@abccollege.edu",
        "section": "Section B"
    })
    assert res.status_code == 200
    new_student = res.json()
    assert new_student["name"] == "Kavya Patel"
    assert new_student["roll_number"] == "2026CS199"

    # Verify listing
    res_list = client.get(f"/api/v1/academic/subjects/{subj_id}/students")
    assert res_list.status_code == 200
    students = res_list.json()
    assert any(s["roll_number"] == "2026CS199" for s in students)


def test_modify_exam_questions_and_marks():
    subjs = client.get("/api/v1/academic/subjects").json()
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
                "q_no": "Q1",
                "text": "Explain CBOW vs Skip-gram.",
                "marks": 10.0,
                "rubric": "4 pts architecture, 3 pts rare words, 3 pts complexity.",
                "ideal_answer": "CBOW averages context to predict target."
            },
            {
                "q_no": "Q2",
                "text": "Derive Scaled Dot-Product Attention.",
                "marks": 10.0,
                "rubric": "4 pts formula, 3 pts sqrt scaling, 3 pts saturation.",
                "ideal_answer": "Softmax(QK^T / sqrt(d_k)) * V"
            }
        ]
    }).json()

    exam_id = created_exam["id"]
    exam_res = client.get(f"/api/v1/academic/exams/{exam_id}")
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
    })
    assert put_res.status_code == 200
    updated_exam = put_res.json()["exam"]
    assert updated_exam["max_marks"] == total_marks
    assert updated_exam["questions"][0]["marks"] == 15.0


def test_strict_student_evaluation_with_rubric():
    subjs = client.get("/api/v1/academic/subjects").json()
    subj_id = subjs[0]["id"]
    exams = client.get(f"/api/v1/academic/exams?subject_id={subj_id}").json()
    assert len(exams) > 0
    exam_id = exams[0]["id"]

    students = client.get(f"/api/v1/academic/subjects/{subj_id}/students").json()
    assert len(students) > 0
    student_id = students[0]["id"]

    student_text = (
        "ANS TO Q1: CBOW predicts center word from context sum, fast on frequent words. "
        "Skip-gram predicts context from center word, handles rare words better.\n"
        "ANS TO Q2: Attention scales by sqrt(d_k) to prevent dot product growth causing softmax saturation and vanishing gradient."
    )

    res = client.post(
        f"/api/v1/academic/exams/{exam_id}/evaluate",
        data={"student_id": student_id, "sheet_text": student_text}
    )
    assert res.status_code == 200
    card = res.json()
    assert card["student_id"] == student_id
    assert card["total_score"] > 0
    assert len(card["breakdown"]) >= 1
    first_q = card["breakdown"][0]
    assert "awarded_marks" in first_q
    assert "evidence_quote" in first_q
    assert len(first_q["rubric_checks"]) >= 1


if __name__ == "__main__":
    test_academic_profile_endpoint()
    test_academic_institutions_hierarchy()
    test_subjects_listing()
    test_one_by_one_student_enrollment()
    test_modify_exam_questions_and_marks()
    test_strict_student_evaluation_with_rubric()
    print("ALL ACADEMIC FLOW TESTS PASSED!")
