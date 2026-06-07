import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class DatasetProfile(Base):
    __tablename__ = "dataset_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, unique=True)
    profile_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
