from typing import Optional, List
from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
import json

class InsightGenerateRequest(BaseModel):
    model: Optional[str] = "gpt-4o-mini"
    insight_type: Optional[str] = "executive" # executive, sales, finance, hr, inventory, operations

class InsightResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    model_used: str
    insight_type: str
    executive_summary: str
    key_findings: List[str]
    risks: List[str]
    opportunities: List[str]
    recommendations: List[str]
    management_priorities: List[str]
    confidence_score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('key_findings', 'risks', 'opportunities', 'recommendations', 'management_priorities', mode='before')
    @classmethod
    def parse_json_string(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v
