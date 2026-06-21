from typing import Optional, List
from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
import json

class ForecastGenerateRequest(BaseModel):
    date_column: str
    target_column: str
    model: str # arima, prophet, linear_regression
    horizon: int # step count

class ForecastDataPoint(BaseModel):
    Date: str
    Value: float
    Upper: Optional[float] = None
    Lower: Optional[float] = None

class ForecastResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    model_used: str
    date_column: str
    target_column: str
    forecast_horizon: int
    actual_points: List[ForecastDataPoint] = []
    forecast_points: List[ForecastDataPoint] = []
    reliability_score: int
    trend_direction: str
    growth_rate: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('actual_points', 'forecast_points', mode='before')
    @classmethod
    def parse_data_arrays(cls, v, info):
        # If parsing from database, forecast_data field holds the JSON dict containing 'actual' and 'forecast' arrays.
        # When from_attributes=True, the mapper accesses individual properties.
        # We will write a custom getter on the response dict in the router, OR handle it here if passed as string.
        if isinstance(v, str):
            try:
                data = json.loads(v)
                return data.get(info.field_name.split('_')[0], [])
            except Exception:
                return []
        return v
