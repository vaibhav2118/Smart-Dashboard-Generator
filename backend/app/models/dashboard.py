import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer
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
    
    # Sharing columns
    share_enabled = Column(Boolean, default=False)
    share_token = Column(String, unique=True, index=True)
    share_type = Column(String, nullable=True)  # "live" or "snapshot"
    snapshot_json = Column(Text, nullable=True)  # captures charts and layout as static freeze
    expires_at = Column(DateTime, nullable=True)
    password_hash = Column(String, nullable=True)
    
    # Sharing Analytics
    view_count = Column(Integer, default=0)
    unique_visitors = Column(Integer, default=0)
    unique_visitor_ips = Column(Text, default="[]")  # JSON list of unique IP strings
    first_viewed_at = Column(DateTime, nullable=True)
    last_viewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
