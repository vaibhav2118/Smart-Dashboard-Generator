import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class UserSettings(Base):
    __tablename__ = "settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    openai_key = Column(String, nullable=True)
    email_notifications = Column(Boolean, default=True)
    analysis_alerts = Column(Boolean, default=True)
