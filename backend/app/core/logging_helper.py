import logging
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.application_log import ApplicationLog
from app.models.audit_log import AuditLog

logger = logging.getLogger("uvicorn.error")

def log_application_error(
    db: Session,
    user_id: Optional[uuid.UUID],
    endpoint: Optional[str],
    error_type: str,
    error_message: str
):
    try:
        log_entry = ApplicationLog(
            user_id=user_id,
            endpoint=endpoint,
            error_type=error_type,
            error_message=error_message
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[Logging Failure] Failed to write error log to database: {e}. Original Error: {error_type} - {error_message}")

def log_user_activity(
    db: Session,
    user_id: Optional[uuid.UUID],
    activity_type: str,
    description: str,
    ip_address: Optional[str] = None
):
    try:
        audit_entry = AuditLog(
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            ip_address=ip_address
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[Logging Failure] Failed to write audit activity to database: {e}. Original Activity: {activity_type} - {description}")
