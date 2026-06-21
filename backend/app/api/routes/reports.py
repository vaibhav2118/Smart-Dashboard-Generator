import os
import uuid
import json
import base64
import hashlib
from datetime import datetime
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

from app.api.deps import get_db, get_current_user, report_rate_limiter
from app.core.logging_helper import log_user_activity, log_application_error
from app.models.user import User
import functools
from app.models.report import Report
from app.models.dataset import Dataset
from app.models.dataset_profile import DatasetProfile
from app.models.dataset_insight import DatasetInsight
from app.models.dataset_forecast import DatasetForecast
from app.api.routes.datasets import get_dataset_kpis
from app.schemas.report import ReportCreate, ReportResponse

router = APIRouter()

REPORT_DIR = "uploads/reports"
if not os.path.exists(REPORT_DIR):
    os.makedirs(REPORT_DIR)

def calculate_file_hash(file_path: str) -> str:
    if not file_path or not os.path.exists(file_path):
        return ""
    hasher = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return ""

def save_base64_image(base64_str: str, filename: str) -> str:
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_data = base64.b64decode(base64_str)
    filepath = os.path.join(REPORT_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(img_data)
    return filepath

def generate_matplotlib_charts(dataset, profile_data, forecast_data) -> Dict[str, str]:
    chart_paths = {}
    try:
        df = pd.read_csv(dataset.file_path) if dataset.file_path.endswith('.csv') else pd.read_excel(dataset.file_path)
        
        # 1. Trend chart
        date_cols = profile_data.get("classification", {}).get("date", [])
        num_cols = profile_data.get("classification", {}).get("numerical", [])
        if date_cols and num_cols:
            dcol, ncol = date_cols[0], num_cols[0]
            tdf = df[[dcol, ncol]].copy().dropna()
            tdf[dcol] = pd.to_datetime(tdf[dcol], errors='coerce')
            tdf = tdf.dropna().sort_values(by=dcol)
            if len(tdf) > 0:
                tdf['month'] = tdf[dcol].dt.to_period("M").astype(str)
                grouped = tdf.groupby('month')[ncol].sum().reset_index()
                plt.figure(figsize=(6, 3))
                plt.plot(grouped['month'], grouped[ncol], marker='o', color='#6366f1', linewidth=2)
                plt.title(f"{ncol} Monthly Trend", fontsize=10, fontweight='bold', color='#1e293b')
                plt.grid(True, linestyle='--', alpha=0.5, color='#cbd5e1')
                plt.xticks(rotation=45, fontsize=8)
                plt.yticks(fontsize=8)
                plt.tight_layout()
                path = os.path.join(REPORT_DIR, f"temp_trend_{dataset.id}.png")
                plt.savefig(path, dpi=150)
                plt.close()
                chart_paths["trend"] = path
                
        # 2. Category chart
        cat_cols = profile_data.get("classification", {}).get("categorical", [])
        if cat_cols and num_cols:
            ccol, ncol = cat_cols[0], num_cols[0]
            tdf = df[[ccol, ncol]].copy().dropna()
            grouped = tdf.groupby(ccol)[ncol].sum().nlargest(10).reset_index()
            if len(grouped) > 0:
                plt.figure(figsize=(6, 3))
                plt.bar(grouped[ccol], grouped[ncol], color='#a855f7')
                plt.title(f"{ncol} by {ccol}", fontsize=10, fontweight='bold', color='#1e293b')
                plt.xticks(rotation=45, fontsize=8)
                plt.yticks(fontsize=8)
                plt.tight_layout()
                path = os.path.join(REPORT_DIR, f"temp_category_{dataset.id}.png")
                plt.savefig(path, dpi=150)
                plt.close()
                chart_paths["category"] = path
                
        # 3. Forecast chart
        if forecast_data:
            fdata = json.loads(forecast_data.forecast_data)
            actuals = fdata.get("actual", [])
            projections = fdata.get("forecast", [])
            if actuals and projections:
                plt.figure(figsize=(6, 3))
                act_x = [pt["Date"] for pt in actuals]
                act_y = [pt["Value"] for pt in actuals]
                proj_x = [pt["Date"] for pt in projections]
                proj_y = [pt["Value"] for pt in projections]
                upper = [pt.get("Upper", pt["Value"]) for pt in projections]
                lower = [pt.get("Lower", pt["Value"]) for pt in projections]
                
                # Plot
                plt.plot(act_x[-10:], act_y[-10:], label="Historical", color='#6366f1', linewidth=2)
                plt.plot([act_x[-1]] + proj_x, [act_y[-1]] + proj_y, label="Forecast", color='#a855f7', linestyle='--', linewidth=2)
                plt.fill_between([act_x[-1]] + proj_x, [act_y[-1]] + lower, [act_y[-1]] + upper, color='#6366f1', alpha=0.15, label="95% CI")
                plt.title("Forecast Projections", fontsize=10, fontweight='bold', color='#1e293b')
                plt.xticks(rotation=45, fontsize=8)
                plt.yticks(fontsize=8)
                plt.legend(fontsize=8, loc='best')
                plt.grid(True, linestyle='--', alpha=0.5)
                plt.tight_layout()
                path = os.path.join(REPORT_DIR, f"temp_forecast_{dataset.id}.png")
                plt.savefig(path, dpi=150)
                plt.close()
                chart_paths["forecast"] = path
    except Exception as e:
        print("Fallback matplotlib rendering failed:", e)
    return chart_paths

@router.get("/", response_model=List[ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).all()
    return reports

@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        report_uuid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    report = db.query(Report).filter(Report.id == report_uuid, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.report_path and os.path.exists(report.report_path):
        try:
            os.remove(report.report_path)
        except Exception:
            pass
            
    db.delete(report)
    db.commit()
    return {"status": "success", "message": "Report deleted successfully"}

@router.get("/download/{report_id}")
def download_report_file(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        report_uuid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    report = db.query(Report).filter(Report.id == report_uuid, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report record not found")
        
    if not report.report_path or not os.path.exists(report.report_path):
        raise HTTPException(status_code=404, detail="PDF report file does not exist on disk.")
        
    return FileResponse(
        path=report.report_path,
        media_type="application/pdf",
        filename=report.report_name
    )

@router.get("/preview/{dataset_id}")
async def get_report_preview_data(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        dataset_uuid = uuid.UUID(dataset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == dataset_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Get cached metrics
    profile_row = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset.id).first()
    profile_data = json.loads(profile_row.profile_json) if profile_row else None
    
    kpi_data = None
    if os.path.exists(dataset.file_path):
        try:
            kpi_data = await get_dataset_kpis(id=str(dataset.id), db=db, current_user=current_user)
        except Exception:
            pass
            
    insight_data = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == dataset.id).first()
    forecast_data = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset.id).first()
    
    return {
        "dataset_name": dataset.filename,
        "dataset_type": dataset.dataset_type,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "profile_available": profile_data is not None,
        "kpis": kpi_data.get("kpis", []) if kpi_data else [],
        "kpi_category": kpi_data.get("dataset_category", "General Dataset") if kpi_data else "General Dataset",
        "has_insights": insight_data is not None,
        "insight_summary": insight_data.executive_summary if insight_data else None,
        "has_forecast": forecast_data is not None,
        "forecast_model": forecast_data.model_used if forecast_data else None,
        "forecast_growth_rate": forecast_data.growth_rate if forecast_data else 0.0,
        "forecast_trend_direction": forecast_data.trend_direction if forecast_data else None,
        "forecast_reliability": forecast_data.reliability_score if forecast_data else 0,
        "insight_reliability": insight_data.confidence_score if insight_data else 0,
        "quality_score": next((k["value"] for k in kpi_data.get("kpis", []) if k["label"] == "Quality Score"), "100%") if kpi_data else "100%"
    }

def report_error_handler(func):
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        db_val = kwargs.get("db")
        user_val = kwargs.get("current_user")
        id_val = kwargs.get("dataset_id")
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            u_id = user_val.id if user_val else None
            log_application_error(db_val, u_id, f"/api/reports/{id_val}", "ReportGenerationError", f"Failed to generate report: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
    return wrapper

@router.post("/{dataset_id}", response_model=ReportResponse)
@report_error_handler
async def generate_pdf_report(
    dataset_id: str,
    req_body: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(report_rate_limiter)
):
    try:
        dataset_uuid = uuid.UUID(dataset_id)
    except ValueError:
        log_application_error(db, current_user.id, f"/api/reports/{dataset_id}", "InvalidIDError", "Invalid dataset ID format on Report generation.")
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == dataset_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        log_application_error(db, current_user.id, f"/api/reports/{dataset_id}", "NotFoundError", "Dataset not found on Report generation.")
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Fetch cached entries
    profile_row = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset.id).first()
    if not profile_row:
        raise HTTPException(status_code=400, detail="Dataset must be analyzed/profiled before generating reports.")
    profile_data = json.loads(profile_row.profile_json)
    
    kpi_data = None
    try:
        kpi_data = await get_dataset_kpis(id=str(dataset.id), db=db, current_user=current_user)
    except Exception:
        pass
        
    insight_data = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == dataset.id).first()
    forecast_data = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset.id).first()
    
    report_uuid = uuid.uuid4()
    pdf_filename = f"{dataset.filename.rsplit('.', 1)[0]}_{req_body.report_type.title()}_Report_{str(report_uuid)[:8]}.pdf"
    pdf_path = os.path.join(REPORT_DIR, pdf_filename)
    
    # Save base64 charts or generate fallback Matplotlib charts
    chart_files = {}
    temp_files = []
    
    if req_body.charts_base64:
        for key, val in req_body.charts_base64.items():
            if val:
                fname = f"chart_{key}_{report_uuid}.png"
                fpath = save_base64_image(val, fname)
                chart_files[key] = fpath
                temp_files.append(fpath)
    else:
        # Fallback to local rendering
        chart_files = generate_matplotlib_charts(dataset, profile_data, forecast_data)
        temp_files.extend(chart_files.values())
        
    # Document compilation via ReportLab
    try:
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
        story = []
        styles = getSampleStyleSheet()
        
        # Styles
        title_style = ParagraphStyle(
            'CoverTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=26,
            leading=32,
            textColor=colors.HexColor('#6366f1'),
            alignment=1,
            spaceAfter=15
        )
        
        subtitle_style = ParagraphStyle(
            'CoverSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1e293b'),
            alignment=1,
            spaceAfter=40
        )
        
        header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=15,
            leading=18,
            textColor=colors.HexColor('#6366f1'),
            spaceBefore=15,
            spaceAfter=10,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            'BodyTextCustom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=8
        )
        
        bullet_style = ParagraphStyle(
            'BulletCustom',
            parent=body_style,
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=5
        )

        # COVER PAGE
        story.append(Spacer(1, 120))
        story.append(Paragraph("SMARTDG BUSINESS INTELLIGENCE REPORT", title_style))
        story.append(Paragraph(f"Report Type: {req_body.report_type.upper()} REPORT", subtitle_style))
        
        meta_data = [
            [Paragraph("<b>Dataset Name:</b>", body_style), Paragraph(dataset.filename, body_style)],
            [Paragraph("<b>Report ID:</b>", body_style), Paragraph(str(report_uuid), body_style)],
            [Paragraph("<b>Generated Date:</b>", body_style), Paragraph(datetime.utcnow().strftime("%B %d, %Y"), body_style)],
            [Paragraph("<b>Platform Branding:</b>", body_style), Paragraph("SmartDG Data Intelligence Dashboard", body_style)]
        ]
        t = Table(meta_data, colWidths=[130, 300])
        t.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(t)
        story.append(PageBreak())
        
        # SECTIONS
        # 1. Dataset Summary & Quality Metrics
        if req_body.selected_sections.get("summary"):
            story.append(Paragraph("1. Dataset Summary & Quality Scorecards", header_style))
            summary_table = [
                [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Value</b>", body_style)],
                [Paragraph("Total Rows", body_style), Paragraph(f"{profile_data.get('total_rows', 0):,}", body_style)],
                [Paragraph("Total Schema Columns", body_style), Paragraph(str(profile_data.get('total_columns', 0)), body_style)],
                [Paragraph("Missing Values Count", body_style), Paragraph(f"{profile_data.get('missing_values_count', 0):,} ({profile_data.get('missing_percentage', 0.0):.2f}%)", body_style)],
                [Paragraph("Duplicate Records Count", body_style), Paragraph(str(profile_data.get('duplicate_records_count', 0)), body_style)],
                [Paragraph("Estimated Memory Footprint", body_style), Paragraph(profile_data.get('memory_usage', 'N/A'), body_style)]
            ]
            t = Table(summary_table, colWidths=[200, 230])
            t.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 10))
            
            # Quality score block
            quality_score = "100%"
            if kpi_data:
                for k in kpi_data.get("kpis", []):
                    if k.get("label") == "Quality Score":
                        quality_score = k.get("value")
                        
            forecast_rel = "N/A"
            if forecast_data:
                forecast_rel = f"{forecast_data.reliability_score}%"
                
            insight_rel = "N/A"
            if insight_data:
                insight_rel = f"{insight_data.confidence_score}%"
                
            quality_data = [
                [Paragraph("<b>Dataset Quality Score</b>", body_style), Paragraph(quality_score, body_style)],
                [Paragraph("<b>Forecast Model Reliability</b>", body_style), Paragraph(forecast_rel, body_style)],
                [Paragraph("<b>AI Insight Confidence</b>", body_style), Paragraph(insight_rel, body_style)]
            ]
            t = Table(quality_data, colWidths=[200, 230])
            t.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 15))

        # 2. Profiling Results
        if req_body.selected_sections.get("profiling"):
            story.append(Paragraph("2. Column Profiles & Statistical Summary", header_style))
            num_stats = profile_data.get("statistics", {}).get("numerical", {})
            if num_stats:
                stats_table = [
                    [Paragraph("<b>Column</b>", body_style), Paragraph("<b>Mean</b>", body_style), Paragraph("<b>Min</b>", body_style), Paragraph("<b>Max</b>", body_style), Paragraph("<b>Outliers</b>", body_style)]
                ]
                outliers = profile_data.get("outliers_by_column", {})
                for col, stats in num_stats.items():
                    stats_table.append([
                        Paragraph(col, body_style),
                        Paragraph(f"{stats.get('mean', 0.0):.2f}", body_style),
                        Paragraph(f"{stats.get('min', 0.0):.2f}", body_style),
                        Paragraph(f"{stats.get('max', 0.0):.2f}", body_style),
                        Paragraph(str(outliers.get(col, 0)), body_style)
                    ])
                t = Table(stats_table, colWidths=[120, 80, 80, 80, 70])
                t.setStyle(TableStyle([
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
                    ('PADDING', (0,0), (-1,-1), 5),
                ]))
                story.append(t)
                
            corr_matrix = profile_data.get("correlation_matrix", {})
            correlations = []
            seen = set()
            for col1, targets in corr_matrix.items():
                for col2, val in targets.items():
                    if col1 != col2 and val is not None:
                        pair = tuple(sorted([col1, col2]))
                        if pair not in seen:
                            seen.add(pair)
                            if abs(val) > 0.35:
                                correlations.append(f"Strong relation between <b>{col1}</b> and <b>{col2}</b> (Pearson r: {val:.3f})")
            if correlations:
                story.append(Spacer(1, 10))
                story.append(Paragraph("<b>Identified Key Column Correlations:</b>", body_style))
                for corr in correlations[:5]:
                    story.append(Paragraph(f"• {corr}", bullet_style))
            story.append(Spacer(1, 15))

        # 3. KPI Analysis
        if req_body.selected_sections.get("kpis") and kpi_data:
            story.append(Paragraph("3. Key Performance Indicators (KPIs)", header_style))
            kpi_table = [
                [Paragraph("<b>KPI Metric</b>", body_style), Paragraph("<b>Value</b>", body_style)]
            ]
            for k in kpi_data.get("kpis", []):
                kpi_table.append([Paragraph(k.get("label"), body_style), Paragraph(k.get("value"), body_style)])
            t = Table(kpi_table, colWidths=[200, 230])
            t.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 15))

        # 4. Dashboard Charts
        if req_body.selected_sections.get("charts"):
            story.append(Paragraph("4. Visualization Charts", header_style))
            has_chart = False
            if "trend" in chart_files:
                story.append(Paragraph("<b>Trend Line Chart (Monthly Sum):</b>", body_style))
                story.append(Image(chart_files["trend"], width=420, height=210))
                story.append(Spacer(1, 10))
                has_chart = True
            if "category" in chart_files:
                story.append(Paragraph("<b>Categorical Distribution Chart:</b>", body_style))
                story.append(Image(chart_files["category"], width=420, height=210))
                story.append(Spacer(1, 10))
                has_chart = True
            if not has_chart:
                story.append(Paragraph("No dashboard charts generated.", body_style))
            story.append(Spacer(1, 15))

        # 5. AI Insights
        if req_body.selected_sections.get("insights") and insight_data:
            story.append(Paragraph("5. AI Executive Insights & Findings", header_style))
            story.append(Paragraph("<b>AI Executive Summary:</b>", body_style))
            story.append(Paragraph(insight_data.executive_summary, body_style))
            
            try:
                findings = json.loads(insight_data.key_findings)
                if findings:
                    story.append(Spacer(1, 5))
                    story.append(Paragraph("<b>Key Findings:</b>", body_style))
                    for f in findings:
                        story.append(Paragraph(f"• {f}", bullet_style))
            except Exception:
                pass
                
            try:
                risks = json.loads(insight_data.risks)
                if risks:
                    story.append(Spacer(1, 5))
                    story.append(Paragraph("<b>Identified Risks:</b>", body_style))
                    for r in risks:
                        story.append(Paragraph(f"• {r}", bullet_style))
            except Exception:
                pass
                
            try:
                opps = json.loads(insight_data.opportunities)
                if opps:
                    story.append(Spacer(1, 5))
                    story.append(Paragraph("<b>Strategic Opportunities:</b>", body_style))
                    for o in opps:
                        story.append(Paragraph(f"• {o}", bullet_style))
            except Exception:
                pass
                
            try:
                priorities = json.loads(insight_data.management_priorities)
                if priorities:
                    story.append(Spacer(1, 5))
                    story.append(Paragraph("<b>Management Priorities:</b>", body_style))
                    for p in priorities:
                        story.append(Paragraph(f"• {p}", bullet_style))
            except Exception:
                pass
            story.append(Spacer(1, 15))

        # 6. Forecast Results
        if req_body.selected_sections.get("forecast") and forecast_data:
            story.append(Paragraph("6. Forecast Projections", header_style))
            forecast_meta = [
                [Paragraph("<b>Model Used</b>", body_style), Paragraph(forecast_data.model_used.upper(), body_style)],
                [Paragraph("<b>Target Column</b>", body_style), Paragraph(forecast_data.target_column, body_style)],
                [Paragraph("<b>Horizon</b>", body_style), Paragraph(f"{forecast_data.forecast_horizon} days", body_style)],
                [Paragraph("<b>Trend Direction</b>", body_style), Paragraph(forecast_data.trend_direction.title(), body_style)],
                [Paragraph("<b>Growth Rate Percentage</b>", body_style), Paragraph(f"{forecast_data.growth_rate:+.1f}%", body_style)]
            ]
            t = Table(forecast_meta, colWidths=[200, 230])
            t.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(t)
            story.append(Spacer(1, 10))
            
            if "forecast" in chart_files:
                story.append(Image(chart_files["forecast"], width=420, height=210))
                story.append(Spacer(1, 10))
                
            modelLabel = forecast_data.model_used.upper() if forecast_data.model_used != 'linear_regression' else 'Linear Regression'
            growthText = "an expansion" if forecast_data.growth_rate > 0 else "a contraction"
            if forecast_data.trend_direction == 'upward':
                desc = f"Using {modelLabel} calculations, {forecast_data.target_column} is expected to increase steadily over the next {forecast_data.forecast_horizon} days. Projections indicate {growthText} of +{forecast_data.growth_rate:.1f}% compared to the latest historical record."
            elif forecast_data.trend_direction == 'downward':
                desc = f"The forecasting engine identifies a declining trend direction. {forecast_data.target_column} is projected to contract by {forecast_data.growth_rate:.1f}% over the next {forecast_data.forecast_horizon} days."
            else:
                desc = f"Projections indicate a stable, flat trend direction for {forecast_data.target_column} (growth margin of {forecast_data.growth_rate:.1f}%) over the next {forecast_data.forecast_horizon} days."
            story.append(Paragraph(f"<b>Business interpretation summary:</b> {desc}", body_style))
            story.append(Spacer(1, 15))

        # 7. Recommendations
        if req_body.selected_sections.get("recommendations") and (insight_data or forecast_data):
            story.append(Paragraph("7. Tactical Business Recommendations", header_style))
            has_recs = False
            if insight_data:
                try:
                    recs = json.loads(insight_data.recommendations)
                    if recs:
                        for idx, rec in enumerate(recs):
                            story.append(Paragraph(f"<b>{idx+1}.</b> {rec}", bullet_style))
                        has_recs = True
                except Exception:
                    pass
            if not has_recs:
                story.append(Paragraph("1. Audit all missing cells to guarantee data completeness scorecards.", bullet_style))
                
        doc.build(story)
    except Exception as e:
        # Clean up temp files
        for f in temp_files:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
        raise HTTPException(status_code=500, detail=f"PDF Compilation failed: {str(e)}")
        
    # Clean up temp files
    for f in temp_files:
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass
                
    # Save Report record in database
    db_report = Report(
        id=report_uuid,
        user_id=current_user.id,
        dataset_id=dataset.id,
        report_type=req_body.report_type,
        report_name=pdf_filename,
        report_path=pdf_path,
        report_metadata=json.dumps(req_body.selected_sections)
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    log_user_activity(db, current_user.id, "Report Generation", f"Generated '{req_body.report_type}' report '{pdf_filename}' for dataset '{dataset.filename}'")
    return db_report
