import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=True)
    report_name = Column(String, nullable=False)
    report_type = Column(String, nullable=True)
    report_path = Column(String, nullable=True)
    report_url = Column(String, nullable=True)
    generated_date = Column(DateTime, default=datetime.utcnow)
