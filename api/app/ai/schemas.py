from typing import List, Optional
from pydantic import BaseModel, Field

class StructuredProfile(BaseModel):
    grade_level: int = Field(10, ge=9, le=16, description="Standard 9 to 16 (Graduation)")
    state: str = Field("Maharashtra", description="State in India")
    district: Optional[str] = Field("Satara", description="District or region")
    primary_interests: List[str] = Field(default_factory=list, description="Top 2-4 interest tags")
    practical_skills: List[str] = Field(default_factory=list, description="Demonstrated or desired practical skills")
    career_aspirations: List[str] = Field(default_factory=list, description="Aspirational job or vocational roles")
    is_vocational_recommended: bool = Field(True, description="True if vocational/non-STEM pathway is highlighted")
    mobility_preference: str = Field("DISTRICT", description="LOCAL, DISTRICT, or STATE_WIDE")
    family_livelihood_context: Optional[str] = Field(None, description="Family occupation context")
    confidence_score: float = Field(0.9, ge=0.0, le=1.0)
