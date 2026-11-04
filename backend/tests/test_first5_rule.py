"""
Unit tests for Section B 'First-5 Attempt' Rule Enforcement.

Strictly verifies that when a candidate attempts more than 5 numerical questions
in a subject, only the first 5 in ascending chronological order are evaluated,
and subsequent attempts are discarded with 0 marks even if correct.
"""

import pytest
from backend.schemas.s4_extraction import ExtractedQuestionResponse, ExtractedSheetData, QuestionType
from backend.schemas.s5_answer_key import MasterAnswerKey, MasterKeyItem
from backend.services.s6_alignment_service import AlignmentService
from backend.services.s7_scoring_service import JEEScoringEngine
from backend.schemas.s7_scoring import ScoringVerdict


def test_section_b_first_5_rule_strictly_discards_overflow():
    """
    Verifies that attempts beyond the first 5 in Section B are discarded per NTA rules.
    """
    # 1. Create a master key for Chemistry (Q1-30)
    key_items = []
    for q in range(1, 91):
        is_num = 21 <= q <= 30
        key_items.append(MasterKeyItem(
            question_no=q,
            subject="CHEMISTRY" if q <= 30 else ("PHYSICS" if q <= 60 else "MATHEMATICS"),
            question_type=QuestionType.NUMERICAL if is_num else QuestionType.MCQ,
            correct_options=["A"] if not is_num else [],
            numerical_exact=42.0 if is_num else None,
            numerical_min=40.0 if is_num else None,
            numerical_max=44.0 if is_num else None
        ))

    master_key = MasterAnswerKey(
        exam_id="TEST_EXAM",
        exam_title="Test Exam",
        booklet_code="SET A",
        total_questions=90,
        items=key_items
    )

    # 2. Simulate candidate attempting 7 questions in Chemistry Section B (Q21 to Q27)
    # All 7 attempts have the exact correct answer (42.0)
    student_responses = []
    for q in range(1, 91):
        if 21 <= q <= 27:
            # Attempted with correct answer
            student_responses.append(ExtractedQuestionResponse(
                question_no=q,
                question_type=QuestionType.NUMERICAL,
                selected_option=None,
                numerical_value="42.0",
                is_attempted=True
            ))
        else:
            # Unattempted
            student_responses.append(ExtractedQuestionResponse(
                question_no=q,
                question_type=QuestionType.NUMERICAL if (21 <= q <= 30 or 51 <= q <= 60 or 81 <= q <= 90) else QuestionType.MCQ,
                selected_option=None,
                numerical_value=None,
                is_attempted=False
            ))

    sheet_data = ExtractedSheetData(
        document_id="doc_overflow_test",
        roll_number="2403109999",
        booklet_code="SET A",
        responses=student_responses
    )

    # 3. Align and Score
    alignment = AlignmentService.align_responses_with_key("doc_overflow_test", sheet_data, master_key)
    scoring = JEEScoringEngine.score_aligned_exam(alignment)

    # 4. Verify outcomes:
    # Q21 to Q25 must be CORRECT (+4 marks each = +20)
    for q_no in range(21, 26):
        q_res = next(r for r in scoring.question_scores if r.question_no == q_no)
        assert q_res.verdict == ScoringVerdict.CORRECT, f"Q{q_no} should be CORRECT"
        assert q_res.marks_awarded == 4.0
        assert q_res.is_ignored_by_first_5_rule is False

    # Q26 and Q27 must be IGNORED_BY_FIRST_5_RULE (0 marks), despite having correct answer 42.0!
    for q_no in [26, 27]:
        q_res = next(r for r in scoring.question_scores if r.question_no == q_no)
        assert q_res.verdict == ScoringVerdict.IGNORED_BY_FIRST_5_RULE, f"Q{q_no} must be ignored"
        assert q_res.marks_awarded == 0.0, f"Q{q_no} must receive 0 marks"
        assert q_res.is_ignored_by_first_5_rule is True

    # Total score should be exactly 20.0 (5 * 4 = 20, not 7 * 4 = 28)
    assert scoring.total_score == 20.0
    assert scoring.overflow_ignored_count == 2
