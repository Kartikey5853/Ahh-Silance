"""
End-to-end integration test verifying clean user registration and academic workflow:
1. User registers a brand new account (no pre-seeded data)
2. User creates Organization (College vs School vs JEE)
3. User creates Class
4. User creates Subject (Natural Language Processing)
5. Enrolls 3 students (Ram, Sham, Gyan)
6. Verifies persistence in SQLite database
"""

import uuid
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_ace_professor_workflow():
    uid = uuid.uuid4().hex[:6]
    test_user = f"ace_prof_{uid}"

    # 1. Register brand new user account
    reg_res = client.post("/api/v1/auth/register", json={
        "username": test_user,
        "password": "password123",
        "full_name": "Professor Sharma",
        "email": f"{test_user}@ace.edu",
        "role": "Professor",
        "department": "Computer Science & Engineering"
    })
    assert reg_res.status_code == 200, reg_res.text
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Organization: ACE College of Engineering
    org_res = client.post("/api/v1/academic/institutions", json={
        "name": "ACE College of Engineering",
        "code": "ACE",
        "type": "college",
        "config": {
            "degree": "B.Tech",
            "department": "Computer Science",
            "semesters": ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"],
            "exam_types": ["Mid-Sem", "End-Sem", "Class Test"]
        }
    }, headers=headers)
    assert org_res.status_code == 200
    org = org_res.json()
    org_id = org["id"]

    # Verify Profile reflects new institution
    prof_res = client.get("/api/v1/academic/profile", headers=headers)
    assert prof_res.status_code == 200
    p = prof_res.json()
    assert p["role"] == "Professor"
    assert "ACE" in p["institution_name"]

    # 3. Create Class: Semester 6 - CSE
    class_res = client.post("/api/v1/academic/classes", json={
        "name": "Semester 6 - CSE",
        "code": "CSE-SEM6",
        "institution_id": org_id,
        "department": "Computer Science",
        "academic_year": "2026-2027"
    }, headers=headers)
    assert class_res.status_code == 200
    cls_obj = class_res.json()
    class_id = cls_obj["id"]

    # 4. Add Subject: Natural Language Processing
    subj_res = client.post("/api/v1/academic/subjects", json={
        "name": "Natural Language Processing",
        "code": "NLP-701",
        "institution_id": org_id,
        "class_id": class_id,
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

    # 5. Add 3 Students: Ram, Sham, Gyan
    r1 = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Ram",
        "roll_number": "ACE-101",
        "email": "ram@ace.edu",
        "section": "A",
        "class_id": class_id
    }, headers=headers)
    assert r1.status_code == 200
    assert r1.json()["name"] == "Ram"

    r2 = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Sham",
        "roll_number": "ACE-102",
        "email": "sham@ace.edu",
        "section": "A",
        "class_id": class_id
    }, headers=headers)
    assert r2.status_code == 200
    assert r2.json()["name"] == "Sham"

    r3 = client.post(f"/api/v1/academic/subjects/{subj_id}/students", json={
        "name": "Gyan",
        "roll_number": "ACE-103",
        "email": "gyan@ace.edu",
        "section": "A",
        "class_id": class_id
    }, headers=headers)
    assert r3.status_code == 200
    assert r3.json()["name"] == "Gyan"

    # 6. Verify real persistence in SQLite database
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
