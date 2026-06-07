from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse

router = APIRouter()

@router.get("/", response_model=List[ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.generated_date.desc()).all()
    return reports

@router.post("/", response_model=ReportResponse)
def create_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_report = Report(
        user_id=current_user.id,
        dataset_id=report_in.dataset_id,
        report_name=report_in.report_name,
        report_type=report_in.report_type or "Executive Summary",
        report_url=report_in.report_url or f"/api/reports/download/{report_in.report_name}",
        report_path=report_in.report_path or f"uploads/reports/{report_in.report_name}"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    db.delete(report)
    db.commit()
    return {"status": "success", "message": "Report deleted successfully"}
