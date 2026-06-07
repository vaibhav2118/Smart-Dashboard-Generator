from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class UserSettingsBase(BaseModel):
    openai_key: Optional[str] = None
    email_notifications: bool = True
    analysis_alerts: bool = True

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettingsResponse(UserSettingsBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True
