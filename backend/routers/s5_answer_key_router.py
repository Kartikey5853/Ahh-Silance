"""
Stage 5 Router: Master Answer Key Management Endpoints.

Retrieves official JEE answer keys by exam identifier and booklet set,
or accepts custom answer key registrations with numerical tolerance windows.
"""

from typing import List
from fastapi import APIRouter, Query
from backend.schemas.s5_answer_key import MasterAnswerKey
from backend.services.s5_answer_key_service import AnswerKeyService
from backend.core.database import db

router = APIRouter(prefix="/answer-keys", tags=["Stage 5: Answer Key Ingestion"])


@router.get("", response_model=List[str])
async def list_available_keys() -> List[str]:
    """
    Returns a list of all registered exam master keys.
    """
    return db.list_master_keys()


@router.get("/{exam_id}", response_model=MasterAnswerKey)
async def get_master_key(exam_id: str, booklet_code: str = Query("SET A")) -> MasterAnswerKey:
    """
    Retrieves or synthesizes official master key for an exam session and booklet code.
    """
    return AnswerKeyService.get_or_create_default_key(exam_id, booklet_code)


@router.post("", response_model=dict)
async def register_custom_key(key_payload: MasterAnswerKey) -> dict:
    """
    Registers a new custom teacher master key into the database.
    """
    AnswerKeyService.register_custom_key(key_payload)
    return {"status": "SUCCESS", "message": f"Answer key for {key_payload.exam_id} registered successfully"}
