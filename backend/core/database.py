"""
In-memory and file-backed database storage for official answer keys and scorecards.

This module provides thread-safe in-memory stores for ingested answer keys,
active evaluations, and processed scorecards with query helper functions.
"""

from typing import Dict, Optional, List, Any


class InMemoryDatabase:
    """
    Lightweight state store for evaluation sessions and master answer keys.
    """
    def __init__(self):
        """
        Initializes storage containers for keys, documents, and scorecards.
        """
        self.master_keys: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.evaluation_results: Dict[str, Dict[str, Any]] = {}

    def save_master_key(self, exam_id: str, key_data: Dict[str, Any]) -> None:
        """
        Saves a master answer key indexed by its unique exam identifier.
        """
        self.master_keys[exam_id] = key_data

    def get_master_key(self, exam_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a master answer key by exam identifier.
        """
        return self.master_keys.get(exam_id)

    def list_master_keys(self) -> List[str]:
        """
        Returns a list of all registered exam identifiers in the database.
        """
        return list(self.master_keys.keys())

    def save_scorecard(self, evaluation_id: str, scorecard_data: Dict[str, Any]) -> None:
        """
        Saves a generated student scorecard by evaluation identifier.
        """
        self.evaluation_results[evaluation_id] = scorecard_data

    def get_scorecard(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves an evaluation scorecard by evaluation identifier.
        """
        return self.evaluation_results.get(evaluation_id)


db = InMemoryDatabase()
