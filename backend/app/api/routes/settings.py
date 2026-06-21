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

import os
from app.models.dataset import Dataset
from app.models.report import Report
from app.models.dataset_forecast import DatasetForecast
from app.models.dataset_insight import DatasetInsight

@router.get("/storage")
def get_storage_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Dataset Count
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    dataset_count = len(datasets)
    
    # 2. Report Count
    reports = db.query(Report).filter(Report.user_id == current_user.id).all()
    report_count = len(reports)
    
    # 3. Forecast Cache Size (number of forecasts cached)
    dataset_ids = [d.id for d in datasets]
    forecast_count = db.query(DatasetForecast).filter(DatasetForecast.dataset_id.in_(dataset_ids)).count() if dataset_ids else 0
    
    # 4. Insight Cache Size (number of insights cached)
    insight_count = db.query(DatasetInsight).filter(DatasetInsight.dataset_id.in_(dataset_ids)).count() if dataset_ids else 0
    
    # 5. Disk Usage (sum of file sizes on disk)
    total_disk_usage = 0
    for d in datasets:
        if d.file_path and os.path.exists(d.file_path):
            try:
                total_disk_usage += os.path.getsize(d.file_path)
            except Exception:
                pass
                
    for r in reports:
        if r.report_path and os.path.exists(r.report_path):
            try:
                total_disk_usage += os.path.getsize(r.report_path)
            except Exception:
                pass
                
    return {
        "dataset_count": dataset_count,
        "report_count": report_count,
        "forecast_cache_size": forecast_count,
        "insight_cache_size": insight_count,
        "disk_usage": total_disk_usage
    }
