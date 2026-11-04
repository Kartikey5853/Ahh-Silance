"""
Stage 8 Service: Performance Analytics and Statistics Compilation.

Aggregates subject-level performance metrics, computes precision and accuracy
percentages, and audits Section B attempt distribution across Chemistry,
Physics, and Mathematics.
"""

from typing import Dict, List
from backend.schemas.s7_scoring import ScoringSummary, ScoringVerdict
from backend.schemas.s8_analytics import ExamAnalyticsReport, SubjectAnalytics


class AnalyticsService:
    """
    Computes subject breakdowns, attempt rates, and Section B attempt statistics.
    """

    @classmethod
    def compile_analytics(cls, evaluation_id: str, scoring: ScoringSummary) -> ExamAnalyticsReport:
        """
        Processes question scores to construct detailed analytical metrics.
        """
        subjects = ["CHEMISTRY", "PHYSICS", "MATHEMATICS"]
        subj_stats = {s: {
            "score": 0.0,
            "attempted": 0,
            "correct": 0,
            "incorrect": 0,
            "sec_b_attempts": 0,
            "sec_b_ignored": 0
        } for s in subjects}

        for q in scoring.question_scores:
            s = q.subject
            if s not in subj_stats:
                continue

            subj_stats[s]["score"] += q.marks_awarded

            # Check if this is a Section B numerical question
            is_sec_b = (
                (s == "CHEMISTRY" and 21 <= q.question_no <= 30) or
                (s == "PHYSICS" and 51 <= q.question_no <= 60) or
                (s == "MATHEMATICS" and 81 <= q.question_no <= 90)
            )

            if q.verdict == ScoringVerdict.CORRECT or q.verdict == ScoringVerdict.DROPPED_BONUS:
                subj_stats[s]["attempted"] += 1
                subj_stats[s]["correct"] += 1
                if is_sec_b:
                    subj_stats[s]["sec_b_attempts"] += 1
            elif q.verdict == ScoringVerdict.INCORRECT:
                subj_stats[s]["attempted"] += 1
                subj_stats[s]["incorrect"] += 1
                if is_sec_b:
                    subj_stats[s]["sec_b_attempts"] += 1
            elif q.verdict == ScoringVerdict.IGNORED_BY_FIRST_5_RULE:
                subj_stats[s]["sec_b_attempts"] += 1
                subj_stats[s]["sec_b_ignored"] += 1

        breakdown: List[SubjectAnalytics] = []
        total_attempted = 0
        total_correct = 0

        for s in subjects:
            st = subj_stats[s]
            att = st["attempted"]
            corr = st["correct"]
            acc = round((corr / att * 100.0), 2) if att > 0 else 0.0

            total_attempted += att
            total_correct += corr

            breakdown.append(SubjectAnalytics(
                subject_name=s,
                score=round(st["score"], 2),
                total_marks=100.0,
                attempted=att,
                correct=corr,
                incorrect=st["incorrect"],
                accuracy_percentage=acc,
                section_b_attempts=st["sec_b_attempts"],
                section_b_ignored=st["sec_b_ignored"]
            ))

        overall_acc = round((total_correct / total_attempted * 100.0), 2) if total_attempted > 0 else 0.0

        return ExamAnalyticsReport(
            evaluation_id=evaluation_id,
            overall_accuracy_percentage=overall_acc,
            total_attempted=total_attempted,
            subject_breakdown=breakdown
        )
