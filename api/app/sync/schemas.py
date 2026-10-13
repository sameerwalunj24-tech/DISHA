"""
schemas.py - Offline Sync Schemas
==================================
Data models for batch synchronization of offline outbox events.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class SyncItemRequest(BaseModel):
    id: str = Field(..., description="Unique client UUID for idempotency")
    type: str = Field(..., description="Event type: discovery_answer, offline_quiz_result, pathway_progress, profile_save")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event data without sensitive fields")
    updated_at: str = Field(..., description="Client ISO timestamp for last-write-wins conflict resolution")
    attempts: int = Field(0, description="Retry attempt count")


class SyncBatchRequest(BaseModel):
    items: List[SyncItemRequest] = Field(..., max_length=100, description="Batch of outbox events (capped at 100 per call)")


class SyncItemResult(BaseModel):
    id: str
    status: str  # "synced", "failed", "conflict_ignored"
    student_id: Optional[str] = None
    message: Optional[str] = None


class SyncBatchResponse(BaseModel):
    results: List[SyncItemResult]
    processed_count: int
    failed_count: int
