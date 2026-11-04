"""
Stage 9 Service: Unified Evaluation Orchestration and Scorecard Generation.

Coordinates the complete 9-stage evaluation lifecycle from ingestion through
alignment and scoring to lightweight JSON scorecard compilation with audit flags.
"""

import time
import uuid
from typing import Dict, Any, Optional
from backend.schemas.s4_extraction import ExtractedSheetData
from backend.schemas.s5_answer_key import MasterAnswerKey
from backend.schemas.s9_evaluation import (
    CandidateInfo,
    AuditVerificationFlags,
    EvaluationScorecardResponse
)
from backend.models.scorecard_model import ScorecardModel
from backend.services.s4_extraction_service import ExtractionService
from backend.services.s5_answer_key_service import AnswerKeyService
from backend.services.s6_alignment_service import AlignmentService
from backend.services.s7_scoring_service import JEEScoringEngine
from backend.services.s8_analytics_service import AnalyticsService
from backend.core.database import db


class EvaluationOrchestratorService:
    """
    Orchestrates the entire evaluation pipeline and produces audit-ready scorecards.
    """

    @classmethod
    def evaluate_sheet_data(
        cls,
        document_id: str,
        sheet_data: ExtractedSheetData,
        exam_id: str = "JEE_Main_2025_Jan_22_Shift1",
        candidate_name: Optional[str] = "Student Candidate"
    ) -> EvaluationScorecardResponse:
        """
        Executes end-to-end evaluation pipeline and returns the final scorecard.
        """
        t0 = time.perf_counter()
        eval_id = f"eval_{uuid.uuid4().hex[:12]}"

        # 1. Retrieve or generate the master key for booklet set
        booklet_code = sheet_data.booklet_code or "SET A"
        master_key = AnswerKeyService.get_or_create_default_key(exam_id, booklet_code)

        # 2. Align student responses to key
        alignment = AlignmentService.align_responses_with_key(document_id, sheet_data, master_key)

        # 3. Execute JEE scoring engine
        scoring = JEEScoringEngine.score_aligned_exam(alignment)

        # 4. Generate analytics
        analytics = AnalyticsService.compile_analytics(eval_id, scoring)

        # 5. Compile quality control audit flags
        has_double = any(r.has_multiple_marks for r in sheet_data.responses)
        has_mismatch = any(r.digit_bubble_mismatch for r in sheet_data.responses)
        has_overflow = scoring.overflow_ignored_count > 0

        audit_flags = AuditVerificationFlags(
            has_double_marks=has_double,
            has_digit_bubble_mismatches=has_mismatch,
            has_faint_marks=False,
            has_section_b_overflow=has_overflow
        )

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        candidate_info = CandidateInfo(
            candidate_name=candidate_name,
            roll_number=sheet_data.roll_number,
            booklet_code=booklet_code,
            exam_title=master_key.exam_title
        )

        scorecard = EvaluationScorecardResponse(
            evaluation_id=eval_id,
            candidate=candidate_info,
            scoring=scoring,
            analytics=analytics,
            audit_flags=audit_flags,
            processed_in_milliseconds=elapsed_ms
        )

        # Persist scorecard model in database
        scorecard_model = ScorecardModel(
            evaluation_id=eval_id,
            document_id=document_id,
            candidate_name=candidate_name,
            roll_number=sheet_data.roll_number,
            exam_id=exam_id,
            total_score=scoring.total_score,
            payload=scorecard.model_dump()
        )
        db.save_scorecard(eval_id, scorecard_model.model_dump())

        return scorecard
