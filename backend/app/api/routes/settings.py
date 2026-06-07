from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.settings import UserSettings
from app.schemas.settings import UserSettingsUpdate, UserSettingsResponse

router = APIRouter()

@router.get("/", response_model=UserSettingsResponse)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        # Create default settings for this user
        settings = UserSettings(
            user_id=current_user.id,
            openai_key="",
            email_notifications=True,
            analysis_alerts=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/", response_model=UserSettingsResponse)
def update_user_settings(
    settings_in: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    if settings_in.openai_key is not None:
        settings.openai_key = settings_in.openai_key
    if settings_in.email_notifications is not None:
        settings.email_notifications = settings_in.email_notifications
    if settings_in.analysis_alerts is not None:
        settings.analysis_alerts = settings_in.analysis_alerts
        
    db.commit()
    db.refresh(settings)
    return settings
