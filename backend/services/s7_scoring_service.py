"""
Stage 7 Service: JEE Scoring Engine Execution.

Applies official JEE Mains marking scheme (+4 for correct, -1 for incorrect, 0 for blank)
and strictly enforces the Section B 'First-5 Attempt' rule by discarding any numerical
attempts beyond the first 5 in ascending chronological question order.
"""

from typing import List, Dict, Tuple
from backend.schemas.s4_extraction import QuestionType
from backend.schemas.s6_alignment import AlignmentResult, AlignedQuestionPair
from backend.schemas.s7_scoring import (
    ScoringVerdict,
    QuestionScoreResult,
    ScoringSummary
)
from backend.core.config import settings


class JEEScoringEngine:
    """
    Strategy pattern implementation for deterministic JEE examination evaluation.
    """

    @classmethod
    def evaluate_numerical_match(cls, student_val_str: str, key_item) -> bool:
        """
        Validates a student numerical string against expected value or tolerance range.
        """
        try:
            # Clean non-numeric characters e.g. '12.5 m/s' -> 12.5
            cleaned = "".join([c for c in student_val_str if c in "0123456789.-+"])
            if not cleaned or cleaned in ["-", "+", "."]:
                return False
            val = float(cleaned)

            # Check min-max range if provided
            if key_item.numerical_min is not None and key_item.numerical_max is not None:
                return key_item.numerical_min <= val <= key_item.numerical_max

            # Fallback to exact equality with floating tolerance
            if key_item.numerical_exact is not None:
                return abs(val - key_item.numerical_exact) < 1e-4

            return False
        except Exception:
            return False

    @classmethod
    def score_aligned_exam(cls, alignment: AlignmentResult) -> ScoringSummary:
        """
        Executes scoring across all 90 questions with strict Section B first-5 rule enforcement.
        """
        question_scores: List[QuestionScoreResult] = []

        total_score = 0.0
        correct_count = 0
        incorrect_count = 0
        unattempted_count = 0
        overflow_ignored_count = 0

        # Section B question ranges per subject
        subject_section_b_ranges = {
            "CHEMISTRY": (21, 30),
            "PHYSICS": (51, 60),
            "MATHEMATICS": (81, 90)
        }

        # Track attempt counts in Section B per subject
        section_b_attempt_counters = {
            "CHEMISTRY": 0,
            "PHYSICS": 0,
            "MATHEMATICS": 0
        }

        # Iterate in strict ascending question order
        sorted_pairs = sorted(alignment.aligned_pairs, key=lambda p: p.question_no)

        for pair in sorted_pairs:
            q_no = pair.question_no
            key_item = pair.master_key
            subj = key_item.subject
            resp = pair.student_response
            is_attempted = pair.is_attempted and resp is not None

            # Handle Dropped Questions (Bonus to all students)
            if key_item.is_dropped:
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    verdict=ScoringVerdict.DROPPED_BONUS,
                    marks_awarded=settings.jee_marks_correct,
                    student_answer=resp.selected_option if resp else None,
                    correct_answer="DROPPED (Bonus +4)",
                    is_ignored_by_first_5_rule=False,
                    audit_note="Question dropped by NTA; full bonus awarded to all candidates."
                ))
                total_score += settings.jee_marks_correct
                correct_count += 1
                continue

            # Handle Unattempted Questions
            if not is_attempted:
                correct_desc = ", ".join(key_item.correct_options) if key_item.question_type == QuestionType.MCQ else str(key_item.numerical_exact)
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    verdict=ScoringVerdict.UNATTEMPTED,
                    marks_awarded=settings.jee_marks_unattempted,
                    student_answer=None,
                    correct_answer=correct_desc,
                    is_ignored_by_first_5_rule=False,
                    audit_note="Question left unattempted."
                ))
                unattempted_count += 1
                continue

            # Process Section B (Numerical) Questions
            b_range = subject_section_b_ranges.get(subj, (0, 0))
            is_section_b = b_range[0] <= q_no <= b_range[1]

            if is_section_b:
                section_b_attempt_counters[subj] += 1
                current_attempt_idx = section_b_attempt_counters[subj]

                # STRICT FIRST-5 ATTEMPT RULE
                if current_attempt_idx > settings.section_b_max_allowed_attempts:
                    overflow_ignored_count += 1
                    question_scores.append(QuestionScoreResult(
                        question_no=q_no,
                        subject=subj,
                        verdict=ScoringVerdict.IGNORED_BY_FIRST_5_RULE,
                        marks_awarded=0.0,
                        student_answer=resp.numerical_value,
                        correct_answer=f"[{key_item.numerical_min}, {key_item.numerical_max}]" if key_item.numerical_min else str(key_item.numerical_exact),
                        is_ignored_by_first_5_rule=True,
                        audit_note=f"Attempt #{current_attempt_idx} in {subj} Section B exceeds limit of 5. Discarded per NTA rules."
                    ))
                    continue

                # Evaluate within the allowed first 5 attempts
                is_correct = cls.evaluate_numerical_match(resp.numerical_value or "", key_item)
                if is_correct:
                    total_score += settings.jee_marks_correct
                    correct_count += 1
                    verdict = ScoringVerdict.CORRECT
                    marks = settings.jee_marks_correct
                else:
                    total_score += settings.jee_marks_incorrect
                    incorrect_count += 1
                    verdict = ScoringVerdict.INCORRECT
                    marks = settings.jee_marks_incorrect

                correct_str = f"[{key_item.numerical_min}, {key_item.numerical_max}]" if key_item.numerical_min else str(key_item.numerical_exact)
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    verdict=verdict,
                    marks_awarded=marks,
                    student_answer=resp.numerical_value,
                    correct_answer=correct_str,
                    is_ignored_by_first_5_rule=False,
                    audit_note="Section B evaluated attempt."
                ))
                continue

            # Process Section A (MCQ) Questions
            if resp.has_multiple_marks:
                # Double bubbling is penalized as incorrect
                total_score += settings.jee_marks_incorrect
                incorrect_count += 1
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    verdict=ScoringVerdict.INCORRECT,
                    marks_awarded=settings.jee_marks_incorrect,
                    student_answer="MULTIPLE_BUBBLES",
                    correct_answer=", ".join(key_item.correct_options),
                    is_ignored_by_first_5_rule=False,
                    audit_note="Candidate shaded multiple bubbles in Section A MCQ."
                ))
            elif resp.selected_option and resp.selected_option in key_item.correct_options:
                total_score += settings.jee_marks_correct
                correct_count += 1
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    verdict=ScoringVerdict.CORRECT,
                    marks_awarded=settings.jee_marks_correct,
                    student_answer=resp.selected_option,
                    correct_answer=", ".join(key_item.correct_options),
                    is_ignored_by_first_5_rule=False,
                    audit_note="Correct option marked."
                ))
            else:
                total_score += settings.jee_marks_incorrect
                incorrect_count += 1
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    verdict=ScoringVerdict.INCORRECT,
                    marks_awarded=settings.jee_marks_incorrect,
                    student_answer=resp.selected_option,
                    correct_answer=", ".join(key_item.correct_options),
                    is_ignored_by_first_5_rule=False,
                    audit_note="Incorrect option marked."
                ))

        return ScoringSummary(
            total_score=round(total_score, 2),
            max_possible_score=float(settings.jee_total_marks),
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            unattempted_count=unattempted_count,
            overflow_ignored_count=overflow_ignored_count,
            question_scores=question_scores
        )
