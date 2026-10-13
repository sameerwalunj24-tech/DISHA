"""
schemas.py - Pathway API Schemas
================================
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class PathwayGenerateRequest(BaseModel):
    language: Optional[str] = Field("mr", description="Language code: mr, hi, en")

class PathwayStepResponse(BaseModel):
    id: str
    day: int
    estimated_minutes: int = 15
    icon: str = "CheckCircle"
    title: Dict[str, str]
    description: Dict[str, str]
    practical_action: Optional[Dict[str, str]] = None
    resource_url: Optional[str] = None
    needs_verification: bool = True
    completed: bool = False

class PathwayResponse(BaseModel):
    id: str
    student_id: str
    template_id: str
    career_cluster: str
    title: Dict[str, str]
    description: Optional[Dict[str, str]] = None
    stages: Dict[str, Any]
    vocational_alternative: Optional[Dict[str, Any]] = None
    status: str = "ACTIVE"
    created_at: Optional[str] = None
