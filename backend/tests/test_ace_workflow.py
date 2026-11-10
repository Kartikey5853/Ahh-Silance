"""
End-to-end integration test verifying the exact professor workflow at ACE College:
1. User logs in with real credentials (professor / ace123)
2. Fetches profile showing 'Professor' at 'ACE College of Engineering'
3. Creates subject 'Natural Language Processing' via backend API
4. Enrolls 3 students 'Ram', 'Sham', 'Gyan' via backend API
5. Verifies all 3 students are persisted in the SQLite database
"""

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import db

client = TestClient(app)


def test_ace_professor_workflow():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "username": "professor",
        "password": "ace123"
    })
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify Profile
    prof_res = client.get("/api/v1/academic/profile", headers=headers)
    assert prof_res.status_code == 200
    p = prof_res.json()
    assert p["role"] == "Professor"
    assert "ACE" in p["institution_name"]

    # 3. Add Subject: Natural Language Processing
    subj_res = client.post("/api/v1/academic/subjects", json={
        "name": "Natural Language Processing",
        "code": "NLP-701",
        "institution_id": "inst-ace",
        "institution_type": "college",
        "semester_or_grade": "Sem 6",
        "credits": 4,
        "academic_year": "2026-2027",
        "chapters": [
            "1. Text Preprocessing & Tokenization",
            "2. N-gram Language Modeling",
            "3. Word Embeddings (Word2Vec, GloVe)",
            "4. Transformers & Self-Attention"
        ]
    }, headers=headers)
    assert subj_res.status_code == 200
    subj = subj_res.json()
    subj_id = subj["id"]
    assert subj["name"] == "Natural Language Processing"
    assert subj["code"] == "NLP-701"

    # 4. Add 3 Students: Ram, Sham, Gyan
    r1 = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Ram",
        "roll_number": "ACE-101",
        "email": "ram@ace.edu",
        "section": "A"
    }, headers=headers)
    assert r1.status_code == 200
    assert r1.json()["name"] == "Ram"

    r2 = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Sham",
        "roll_number": "ACE-102",
        "email": "sham@ace.edu",
        "section": "A"
    }, headers=headers)
    assert r2.status_code == 200
    assert r2.json()["name"] == "Sham"

    r3 = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Gyan",
        "roll_number": "ACE-103",
        "email": "gyan@ace.edu",
        "section": "A"
    }, headers=headers)
    assert r3.status_code == 200
    assert r3.json()["name"] == "Gyan"

    # 5. Verify real persistence in SQLite database
    students_res = client.get(f"/api/v1/academic/subjects/{subj_id}/students", headers=headers)
    assert students_res.status_code == 200
    enrolled = students_res.json()
    enrolled_names = [s["name"] for s in enrolled]
    assert "Ram" in enrolled_names
    assert "Sham" in enrolled_names
    assert "Gyan" in enrolled_names
    assert len(enrolled) >= 3


if __name__ == "__main__":
    test_ace_professor_workflow()
    print("ALL ACE PROFESSOR WORKFLOW TESTS PASSED!")
