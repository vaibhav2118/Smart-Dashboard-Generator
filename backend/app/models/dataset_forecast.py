import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class DatasetForecast(Base):
    __tablename__ = "dataset_forecasts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), unique=True, nullable=False)
    model_used = Column(String, nullable=False) # prophet, arima, linear_regression
    date_column = Column(String, nullable=False)
    target_column = Column(String, nullable=False)
    forecast_horizon = Column(Integer, nullable=False)
    forecast_data = Column(Text, nullable=False) # JSON serialized actual and forecast coordinates
    reliability_score = Column(Integer, default=100) # 0-100 score
    trend_direction = Column(String, nullable=False) # upward, downward, flat
    growth_rate = Column(Float, default=0.0) # growth pct float
    dataset_hash = Column(String, nullable=True) # MD5 checksum of file
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
