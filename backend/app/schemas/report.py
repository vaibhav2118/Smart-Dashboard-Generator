from typing import Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class ReportBase(BaseModel):
    report_name: str
    report_type: Optional[str] = None
    report_url: Optional[str] = None
    report_path: Optional[str] = None
    dataset_id: Optional[UUID] = None

class ReportCreate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: UUID
    user_id: UUID
    generated_date: datetime

    class Config:
        from_attributes = True
