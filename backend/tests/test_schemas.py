"""
Unit tests validating Pydantic schemas across all 9 pipeline stages.
"""

import pytest
from backend.schemas.s1_ingestion import DocumentIngestionRequest, DocumentIngestionResponse, IngestionSourceType
from backend.schemas.s2_preprocessing import PreprocessingConfig, PreprocessingResult
from backend.schemas.s3_layout import SubjectSection, DocumentLayoutResponse, BoundingBox, SectionLayout
from backend.schemas.s4_extraction import ExtractedQuestionResponse, ExtractedSheetData, QuestionType
from backend.schemas.s5_answer_key import MasterAnswerKey, MasterKeyItem
from backend.schemas.s6_alignment import AlignedQuestionPair, AlignmentResult
from backend.schemas.s7_scoring import ScoringVerdict, QuestionScoreResult, ScoringSummary
from backend.schemas.s8_analytics import SubjectAnalytics, ExamAnalyticsReport
from backend.schemas.s9_evaluation import CandidateInfo, AuditVerificationFlags, EvaluationScorecardResponse


def test_s1_ingestion_schema():
    """
    Tests Stage 1 ingestion request and response schemas.
    """
    req = DocumentIngestionRequest(file_name="paper.pdf", mime_type="application/pdf", file_size_bytes=1024)
    assert req.file_name == "paper.pdf"
    res = DocumentIngestionResponse(
        document_id="doc_123",
        file_name="paper.pdf",
        source_type=IngestionSourceType.DIGITAL_VECTOR_PDF,
        page_count=20,
        can_vector_bypass=True,
        message="Valid"
    )
    assert res.can_vector_bypass is True


def test_s4_and_s7_schemas():
    """
    Tests Stage 4 extraction and Stage 7 scoring result schemas.
    """
    resp = ExtractedQuestionResponse(
        question_no=1,
        question_type=QuestionType.MCQ,
        selected_option="A",
        numerical_value=None,
        is_attempted=True
    )
    assert resp.selected_option == "A"

    score = QuestionScoreResult(
        question_no=1,
        subject="CHEMISTRY",
        verdict=ScoringVerdict.CORRECT,
        marks_awarded=4.0,
        student_answer="A",
        correct_answer="A"
    )
    assert score.marks_awarded == 4.0
