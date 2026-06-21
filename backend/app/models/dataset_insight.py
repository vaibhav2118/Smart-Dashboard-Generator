import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class DatasetInsight(Base):
    __tablename__ = "dataset_insights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), unique=True, nullable=False)
    model_used = Column(String, nullable=False)
    insight_type = Column(String, nullable=False) # e.g. executive, sales, finance, hr, inventory, operations
    executive_summary = Column(Text, nullable=False)
    key_findings = Column(Text, nullable=False) # JSON array of strings
    risks = Column(Text, nullable=False) # JSON array of strings
    opportunities = Column(Text, nullable=False) # JSON array of strings
    recommendations = Column(Text, nullable=False) # JSON array of strings
    management_priorities = Column(Text, nullable=False) # JSON array of strings
    raw_response = Column(Text, nullable=False) # raw OpenAI response JSON
    confidence_score = Column(Integer, default=100) # 0-100
    dataset_hash = Column(String, nullable=True) # MD5 checksum
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
