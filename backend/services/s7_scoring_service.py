"""
Stage 7 Service: JEE Scoring Engine Execution.

Supports both official JEE Main and JEE Advanced examination patterns:
- JEE Main: +4 for correct, -1 for incorrect, 0 for unattempted, with strict Section B First-5 attempt rule.
- JEE Advanced: Multi-tier scoring:
    * Single Correct Choice: +3, -1, 0
    * One or More than One Correct: +4 full, +3/+2/+1 partial marking, -2 for any wrong selection, 0 unattempted
    * Numerical Value: +3 (or +4) correct, 0 incorrect/unattempted (mandatory bubble verification).
Strictly validates that numerical answers must be bubbled to receive credit.
"""

from typing import List, Dict, Set, Optional, Tuple
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
    Evaluation engine supporting deterministic grading for JEE Main and JEE Advanced.
    """

    @classmethod
    def evaluate_numerical_match(cls, student_val_str: str, key_item) -> bool:
        """
        Validates a student numerical string against expected value or tolerance range.
        """
        try:
            cleaned = "".join([c for c in student_val_str if c in "0123456789.-+"])
            if not cleaned or cleaned in ["-", "+", "."]:
                return False
            val = float(cleaned)

            if key_item.numerical_min is not None and key_item.numerical_max is not None:
                return key_item.numerical_min <= val <= key_item.numerical_max

            if key_item.numerical_exact is not None:
                return abs(val - key_item.numerical_exact) < 1e-4

            return False
        except Exception:
            return False

    @classmethod
    def evaluate_jee_advanced_multi_correct(
        cls,
        student_options: List[str],
        correct_options: List[str]
    ) -> Tuple[ScoringVerdict, float, str]:
        """
        Calculates official JEE Advanced partial marking for Multi-Correct questions:
        - +4: If ONLY all correct options are darkened.
        - +3: If all 4 options are correct, but only 3 correct options are darkened.
        - +2: If 3 or more options are correct, but only 2 correct options are darkened.
        - +1: If 2 or more options are correct, but only 1 correct option is darkened.
        - 0: If unattempted.
        - -2: If ANY incorrect option is darkened!
        """
        if not student_options:
            return ScoringVerdict.UNATTEMPTED, 0.0, "Question left unattempted."

        s_set: Set[str] = set([o.strip().upper() for o in student_options if o.strip()])
        c_set: Set[str] = set([o.strip().upper() for o in correct_options if o.strip()])

        if not s_set:
            return ScoringVerdict.UNATTEMPTED, 0.0, "Question left unattempted."

        # If student marked ANY option not in correct set -> -2 marks penalty
        wrong_marked = s_set - c_set
        if wrong_marked:
            return (
                ScoringVerdict.INCORRECT,
                -2.0,
                f"Incorrect option(s) {sorted(list(wrong_marked))} marked. Penalized with -2 marks per JEE Advanced rules."
            )

        # Student marked only correct options (s_set is a subset of c_set)
        if s_set == c_set:
            return ScoringVerdict.CORRECT, 4.0, "All correct options identified (+4 marks)."
        elif len(c_set) == 4 and len(s_set) == 3:
            return ScoringVerdict.PARTIALLY_CORRECT, 3.0, "Partial credit (+3): 3 out of 4 correct options identified."
        elif len(c_set) >= 3 and len(s_set) == 2:
            return ScoringVerdict.PARTIALLY_CORRECT, 2.0, "Partial credit (+2): 2 correct options identified without incorrect choices."
        elif len(c_set) >= 2 and len(s_set) == 1:
            return ScoringVerdict.PARTIALLY_CORRECT, 1.0, "Partial credit (+1): 1 correct option identified without incorrect choices."
        else:
            return ScoringVerdict.INCORRECT, -2.0, "Invalid option combination."

    @classmethod
    def score_aligned_exam(cls, alignment: AlignmentResult) -> ScoringSummary:
        """
        Executes scoring across all questions in the paper.
        Automatically branches between JEE Main and JEE Advanced marking standards.
        """
        exam_type = getattr(alignment, "exam_type", "JEE_MAIN")
        is_advanced = (exam_type == "JEE_ADVANCED")

        question_scores: List[QuestionScoreResult] = []
        total_score = 0.0
        max_possible_score = 0.0
        correct_count = 0
        partially_correct_count = 0
        incorrect_count = 0
        unattempted_count = 0
        overflow_ignored_count = 0

        # Section B ranges for JEE Main first-5 attempt rule
        subject_section_b_ranges = {
            "CHEMISTRY": (21, 30),
            "PHYSICS": (51, 60),
            "MATHEMATICS": (81, 90)
        }
        section_b_attempt_counters = {
            "CHEMISTRY": 0,
            "PHYSICS": 0,
            "MATHEMATICS": 0
        }

        sorted_pairs = sorted(alignment.aligned_pairs, key=lambda p: p.question_no)

        for pair in sorted_pairs:
            q_no = pair.question_no
            key_item = pair.master_key
            subj = key_item.subject
            resp = pair.student_response
            is_attempted = pair.is_attempted and resp is not None

            # Calculate theoretical maximum marks for this question
            if is_advanced:
                if key_item.question_type == QuestionType.MULTI_MCQ:
                    max_q_marks = 4.0
                else:
                    max_q_marks = 3.0
            else:
                max_q_marks = 4.0

            # 1. Dropped Questions (Bonus to all)
            if key_item.is_dropped:
                ans_val = resp.selected_option if (resp and resp.selected_option) else (resp.numerical_value if resp else None)
                q_type_str = str(key_item.question_type.value)
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type=q_type_str,
                    verdict=ScoringVerdict.DROPPED_BONUS,
                    marks_awarded=max_q_marks,
                    student_answer=ans_val,
                    candidate_response=ans_val,
                    correct_answer="DROPPED (Full Bonus)",
                    is_ignored_by_first_5_rule=False,
                    audit_note="Question dropped by examination authority; full bonus awarded."
                ))
                total_score += max_q_marks
                max_possible_score += max_q_marks
                correct_count += 1
                continue

            max_possible_score += max_q_marks

            # 2. Unattempted Questions
            if not is_attempted or resp is None:
                q_type_str = str(key_item.question_type.value)
                correct_desc = ", ".join(key_item.correct_options) if key_item.correct_options else str(key_item.numerical_exact)
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type=q_type_str,
                    verdict=ScoringVerdict.UNATTEMPTED,
                    marks_awarded=0.0,
                    student_answer=None,
                    candidate_response=None,
                    correct_answer=correct_desc,
                    is_ignored_by_first_5_rule=False,
                    audit_note="Question left unattempted."
                ))
                unattempted_count += 1
                continue

            # 3. JEE Advanced Multi-Correct MCQ Evaluation
            is_multi_mcq = is_advanced and (
                key_item.question_type == QuestionType.MULTI_MCQ or
                len(key_item.correct_options or []) > 1
            )
            if is_multi_mcq:
                # Extract marked options
                student_opts = []
                if resp.selected_options:
                    student_opts = resp.selected_options
                elif resp.selected_option:
                    clean_s = resp.selected_option.strip()
                    if "," in clean_s or " " in clean_s:
                        student_opts = [x.strip() for x in clean_s.replace(" ", ",").split(",") if x.strip()]
                    elif len(clean_s) > 1 and clean_s.isalpha():
                        student_opts = list(clean_s)
                    else:
                        student_opts = [clean_s]

                verdict, marks, note = cls.evaluate_jee_advanced_multi_correct(
                    student_options=student_opts,
                    correct_options=key_item.correct_options or []
                )

                if verdict == ScoringVerdict.CORRECT:
                    correct_count += 1
                elif verdict == ScoringVerdict.PARTIALLY_CORRECT:
                    partially_correct_count += 1
                elif verdict == ScoringVerdict.INCORRECT:
                    incorrect_count += 1
                else:
                    unattempted_count += 1

                total_score += marks
                resp_display = ", ".join(sorted(student_opts)) if student_opts else None
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type="MULTI_MCQ",
                    verdict=verdict,
                    marks_awarded=marks,
                    student_answer=resp_display,
                    candidate_response=resp_display,
                    correct_answer=", ".join(sorted(key_item.correct_options or [])),
                    is_ignored_by_first_5_rule=False,
                    audit_note=note
                ))
                continue

            # 4. Numerical Value Questions (JEE Main Section B or JEE Advanced Section 3)
            is_numerical = (key_item.question_type == QuestionType.NUMERICAL) or (
                not is_advanced and any(r[0] <= q_no <= r[1] for r in subject_section_b_ranges.values())
            )
            if is_numerical:
                # CRITICAL VERIFICATION: Bubble Darkening Check
                # If student only wrote digits in box but did not bubble, award 0 marks
                if resp.digit_bubble_mismatch and not resp.numerical_value:
                    unattempted_count += 1
                    question_scores.append(QuestionScoreResult(
                        question_no=q_no,
                        subject=subj,
                        question_type="NUMERICAL",
                        verdict=ScoringVerdict.UNATTEMPTED,
                        marks_awarded=0.0,
                        student_answer=None,
                        candidate_response=None,
                        correct_answer=f"[{key_item.numerical_min}, {key_item.numerical_max}]" if key_item.numerical_min else str(key_item.numerical_exact),
                        is_ignored_by_first_5_rule=False,
                        audit_note="Written in box without darkening bubble circles. Invalid attempt per official JEE rules (0 marks)."
                    ))
                    continue

                # JEE Main Section B First-5 Rule Check
                if not is_advanced:
                    section_b_attempt_counters[subj] += 1
                    current_attempt_idx = section_b_attempt_counters[subj]
                    if current_attempt_idx > settings.section_b_max_allowed_attempts:
                        overflow_ignored_count += 1
                        question_scores.append(QuestionScoreResult(
                            question_no=q_no,
                            subject=subj,
                            question_type="NUMERICAL",
                            verdict=ScoringVerdict.IGNORED_BY_FIRST_5_RULE,
                            marks_awarded=0.0,
                            student_answer=resp.numerical_value,
                            candidate_response=resp.numerical_value,
                            correct_answer=f"[{key_item.numerical_min}, {key_item.numerical_max}]" if key_item.numerical_min else str(key_item.numerical_exact),
                            is_ignored_by_first_5_rule=True,
                            audit_note=f"Attempt #{current_attempt_idx} in {subj} Section B exceeds limit of 5. Discarded per NTA rules."
                        ))
                        continue

                # Evaluate Numerical Match
                is_correct = cls.evaluate_numerical_match(resp.numerical_value or "", key_item)
                correct_str = f"[{key_item.numerical_min}, {key_item.numerical_max}]" if key_item.numerical_min else str(key_item.numerical_exact)

                if is_correct:
                    marks = 3.0 if is_advanced else settings.jee_marks_correct
                    verdict = ScoringVerdict.CORRECT
                    correct_count += 1
                    audit_note = "Numerical answer matches master key."
                else:
                    marks = 0.0 if is_advanced else settings.jee_marks_incorrect
                    verdict = ScoringVerdict.INCORRECT
                    incorrect_count += 1
                    audit_note = "Numerical answer does not match master key."

                total_score += marks
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type="NUMERICAL",
                    verdict=verdict,
                    marks_awarded=marks,
                    student_answer=resp.numerical_value,
                    candidate_response=resp.numerical_value,
                    correct_answer=correct_str,
                    is_ignored_by_first_5_rule=False,
                    audit_note=audit_note
                ))
                continue

            # 5. Standard Single Choice MCQ Questions
            correct_opts_set = set([o.upper() for o in (key_item.correct_options or [])])
            if resp.has_multiple_marks:
                # In single choice, double-bubbling is invalid/penalized
                neg_marks = -1.0 if is_advanced else settings.jee_marks_incorrect
                total_score += neg_marks
                incorrect_count += 1
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type="MCQ",
                    verdict=ScoringVerdict.INCORRECT,
                    marks_awarded=neg_marks,
                    student_answer="MULTIPLE_BUBBLES",
                    candidate_response="MULTIPLE_BUBBLES",
                    correct_answer=", ".join(key_item.correct_options or []),
                    is_ignored_by_first_5_rule=False,
                    audit_note="Candidate shaded multiple bubbles in Single Choice MCQ."
                ))
            elif resp.selected_option and resp.selected_option.upper() in correct_opts_set:
                pos_marks = 3.0 if is_advanced else settings.jee_marks_correct
                total_score += pos_marks
                correct_count += 1
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type="MCQ",
                    verdict=ScoringVerdict.CORRECT,
                    marks_awarded=pos_marks,
                    student_answer=resp.selected_option.upper(),
                    candidate_response=resp.selected_option.upper(),
                    correct_answer=", ".join(key_item.correct_options or []),
                    is_ignored_by_first_5_rule=False,
                    audit_note="Correct option marked."
                ))
            else:
                neg_marks = -1.0 if is_advanced else settings.jee_marks_incorrect
                total_score += neg_marks
                incorrect_count += 1
                question_scores.append(QuestionScoreResult(
                    question_no=q_no,
                    subject=subj,
                    question_type="MCQ",
                    verdict=ScoringVerdict.INCORRECT,
                    marks_awarded=neg_marks,
                    student_answer=resp.selected_option,
                    candidate_response=resp.selected_option,
                    correct_answer=", ".join(key_item.correct_options or []),
                    is_ignored_by_first_5_rule=False,
                    audit_note="Incorrect option marked."
                ))

        if not is_advanced:
            max_possible_score = float(settings.jee_total_marks)

        return ScoringSummary(
            exam_type=exam_type,
            total_score=round(total_score, 2),
            max_possible_score=round(max_possible_score, 2),
            correct_count=correct_count,
            partially_correct_count=partially_correct_count,
            incorrect_count=incorrect_count,
            unattempted_count=unattempted_count,
            overflow_ignored_count=overflow_ignored_count,
            question_scores=question_scores
        )
