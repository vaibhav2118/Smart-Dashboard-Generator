import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class Dashboard(Base):
    __tablename__ = "dashboards"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False)
    dashboard_name = Column(String, nullable=False)
    dashboard_type = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    theme = Column(String, default='dark')
    layout_json = Column(Text, nullable=True)
    share_token = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
