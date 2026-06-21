from typing import Optional, Dict
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class ReportCreate(BaseModel):
    report_type: str # executive, analytics, forecast, full
    selected_sections: Dict[str, bool] # e.g. {"summary": True, "profiling": True}
    charts_base64: Optional[Dict[str, str]] = None # base64 chart exports from frontend

class ReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    dataset_id: Optional[UUID] = None
    report_type: str
    report_name: str
    report_path: str
    report_metadata: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
