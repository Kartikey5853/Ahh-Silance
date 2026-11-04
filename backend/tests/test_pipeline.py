"""
End-to-end integration tests for FastAPI application and evaluation endpoints.
"""

import os
import json
import pytest
from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """
    Tests /health endpoint for server responsiveness and metadata.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["pipeline_stages"] == 9


def test_end_to_end_evaluation_pipeline():
    """
    Tests full evaluation pipeline using authentic synthetic JEE OMR sheet.
    """
    sample_json = r"f:\neira\Dataset\synthetically_generated\jee_main_authentic_omrs\jee_mains_omr_01.json"
    if not os.path.exists(sample_json):
        pytest.skip("Sample authentic OMR file not present")

    with open(sample_json, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # 1. Test extraction endpoint
    extract_resp = client.post(
        "/api/v1/extract?document_id=doc_sample_01",
        json=meta
    )
    assert extract_resp.status_code == 200
    sheet_data = extract_resp.json()
    expected_roll = meta.get("roll_no") or meta.get("test_metadata", {}).get("roll_no")
    assert sheet_data["roll_number"] == expected_roll
    assert len(sheet_data["responses"]) == 90

    # 2. Test evaluation endpoint
    eval_resp = client.post(
        "/api/v1/evaluate?exam_id=JEE_Main_2025_Jan_22_Shift1&candidate_name=TestCandidate",
        json=sheet_data
    )
    assert eval_resp.status_code == 200
    scorecard = eval_resp.json()

    assert "evaluation_id" in scorecard
    assert "scoring" in scorecard
    assert "analytics" in scorecard
    assert "audit_flags" in scorecard
    assert scorecard["scoring"]["total_score"] is not None
    assert scorecard["processed_in_milliseconds"] < 1000.0  # Under 1 second target!
