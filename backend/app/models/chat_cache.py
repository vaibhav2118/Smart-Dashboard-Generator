import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class DatasetChatCache(Base):
    __tablename__ = "dataset_chat_caches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question = Column(String, nullable=False, index=True)
    dataset_hash = Column(String, nullable=False, index=True)
    context_hash = Column(String, nullable=False, index=True)
    response_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
