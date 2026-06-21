import uuid
import json
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.models.dataset import Dataset
from app.models.dataset_profile import DatasetProfile
from app.models.dataset_forecast import DatasetForecast
from app.models.dataset_insight import DatasetInsight
from app.models.dashboard import Dashboard
from app.models.report import Report

logger = logging.getLogger("uvicorn.error")

def classify_question_type(question: str) -> str:
    q = question.lower()
    
    # Check for Forecast keywords
    forecast_keywords = ["forecast", "predict", "projection", "quarter", "future", "trend", "horizon", "model"]
    if any(kw in q for kw in forecast_keywords):
        return "forecast"
        
    # Check for Risk keywords
    risk_keywords = ["risk", "threat", "problem", "danger", "issue", "anomaly", "weakness"]
    if any(kw in q for kw in risk_keywords):
        return "risk"
        
    # Check for KPI keywords
    kpi_keywords = ["kpi", "metric", "total", "margin", "score", "average", "sum", "count", "quality", "profit", "revenue"]
    if any(kw in q for kw in kpi_keywords):
        return "kpi"
        
    return "general"

def compile_compressed_context(
    dataset_id: uuid.UUID,
    db: Session,
    current_user: User,
    question: str,
    widget_id: Optional[str] = None
) -> str:
    # 1. Fetch Dataset (assert ownership)
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
        
    # 2. Classify Question Type
    q_type = classify_question_type(question)
    
    # 3. Retrieve All Available Intelligence Sources
    # Source A: Profile
    profile_row = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset.id).first()
    profile_data = json.loads(profile_row.profile_json) if profile_row else {}
    
    # Source B: KPIs (retrieve classification and generate standard info)
    kpis = []
    category = dataset.dataset_category or "General Dataset"
    
    # If profile exists, we can reconstruct basic KPIs dynamically
    total_rows = dataset.row_count or 0
    total_cols = dataset.column_count or 0
    kpis.append(f"Total Records: {total_rows}")
    kpis.append(f"Total Columns: {total_cols}")
    kpis.append(f"Dataset Category: {category}")
    
    # Source C: Dashboard Metadata
    dashboard = db.query(Dashboard).filter(Dashboard.dataset_id == dataset.id).first()
    
    # Source D: Forecast Cache
    forecast_row = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset.id).first()
    
    # Source E: AI Insights Cache
    insight_row = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == dataset.id).first()
    
    # Source F: Reports List
    reports = db.query(Report).filter(Report.dataset_id == dataset.id).all()
    
    # 4. Construct Individual Text Sections
    
    # Section 1: Profile Analysis
    profile_sec = []
    profile_sec.append("### Source: Profile Analysis")
    profile_sec.append(f"Filename: {dataset.filename}")
    profile_sec.append(f"Data Category: {category}")
    profile_sec.append(f"Shape: {total_rows} rows x {total_cols} columns")
    if profile_data:
        classification = profile_data.get("classification", {})
        profile_sec.append(f"Numerical Columns: {', '.join(classification.get('numerical', []))}")
        profile_sec.append(f"Categorical Columns: {', '.join(classification.get('categorical', []))}")
        profile_sec.append(f"Date Columns: {', '.join(classification.get('date', []))}")
    profile_sec_text = "\n".join(profile_sec)
    
    # Section 2: KPI Analysis
    kpi_sec = []
    kpi_sec.append("### Source: KPI Analysis")
    for k in kpis:
        kpi_sec.append(f"- {k}")
    # Add category-specific dynamic metrics if forecast or insights exist
    if forecast_row:
        kpi_sec.append(f"- Core Target Metric: {forecast_row.target_column}")
        kpi_sec.append(f"- Growth Rate: {forecast_row.growth_rate}%")
    if insight_row and insight_row.confidence_score:
        kpi_sec.append(f"- Analytical Confidence Score: {insight_row.confidence_score}%")
    kpi_sec_text = "\n".join(kpi_sec)
    
    # Section 3: Dashboard Metadata
    dash_sec = []
    dash_sec.append("### Source: Dashboard Layout & Charts")
    if dashboard:
        dash_sec.append(f"Dashboard Name: {dashboard.dashboard_name}")
        if dashboard.description:
            dash_sec.append(f"Dashboard Description: {dashboard.description}")
        if dashboard.layout_json:
            try:
                widgets = json.loads(dashboard.layout_json)
                dash_sec.append("Active Dashboard Visual Widgets:")
                for w in widgets:
                    if w.get("visible", True):
                        dash_sec.append(f"  - Widget ID: {w.get('id')} | Title: '{w.get('title')}' | Type: {w.get('type')}")
            except Exception:
                pass
    else:
        dash_sec.append("No active dashboard generated for this dataset.")
    dash_sec_text = "\n".join(dash_sec)
    
    # Section 4: Forecast Results
    forecast_sec = []
    forecast_sec.append("### Source: Forecast Results")
    if forecast_row:
        forecast_sec.append(f"Model Engine Used: {forecast_row.model_used.upper()}")
        forecast_sec.append(f"Date Column: {forecast_row.date_column} | Target Column: {forecast_row.target_column}")
        forecast_sec.append(f"Horizon Period: {forecast_row.forecast_horizon} days")
        forecast_sec.append(f"Trend direction: {forecast_row.trend_direction.upper()}")
        forecast_sec.append(f"Projected Growth Rate: {forecast_row.growth_rate:+.2f}%")
        forecast_sec.append(f"Engine Reliability Rating: {forecast_row.reliability_score}%")
    else:
        forecast_sec.append("No forecast projections have been trained/run for this dataset.")
    forecast_sec_text = "\n".join(forecast_sec)
    
    # Section 5: AI Insights
    insight_sec = []
    insight_sec.append("### Source: AI Insights")
    if insight_row:
        insight_sec.append(f"Model used for analysis: {insight_row.model_used}")
        insight_sec.append(f"Executive Summary: {insight_row.executive_summary}")
        
        def format_json_list(label, json_str):
            try:
                lst = json.loads(json_str)
                if isinstance(lst, list) and len(lst) > 0:
                    # Truncate lists to keep context compact (< 3 elements)
                    items = "\n  - ".join(lst[:3])
                    return f"{label}:\n  - {items}"
            except Exception:
                pass
            return f"{label}: None cached."
            
        insight_sec.append(format_json_list("Key Findings", insight_row.key_findings))
        insight_sec.append(format_json_list("Key Risks", insight_row.risks))
        insight_sec.append(format_json_list("Key Opportunities", insight_row.opportunities))
        insight_sec.append(format_json_list("Business Recommendations", insight_row.recommendations))
    else:
        insight_sec.append("No comprehensive AI insights summaries are currently cached.")
    insight_sec_text = "\n".join(insight_sec)
    
    # Section 6: Reports
    reports_sec = []
    reports_sec.append("### Source: Reports")
    if len(reports) > 0:
        reports_sec.append("Generated PDF Deliverable Reports:")
        for r in reports[:3]:  # Max 3 reports to optimize token cost
            reports_sec.append(f"  - Report: '{r.report_name}' | Template: {r.report_type} | Generated: {r.created_at.strftime('%Y-%m-%d')}")
    else:
        reports_sec.append("No official report deliverables generated yet.")
    reports_sec_text = "\n".join(reports_sec)
    
    # Explaining Dashboard Foundation: If widget_id is provided, prioritize specific chart explanation context
    widget_sec_text = ""
    if widget_id and dashboard and dashboard.layout_json:
        try:
            widgets = json.loads(dashboard.layout_json)
            target_widget = next((w for w in widgets if str(w.get("id")) == str(widget_id)), None)
            if target_widget:
                widget_sec = []
                widget_sec.append("### Primary Visual Widget Target Focus (Explanation Mode)")
                widget_sec.append(f"Target Widget Title: '{target_widget.get('title')}'")
                widget_sec.append(f"Chart Visual Type: {target_widget.get('type')}")
                
                # Truncate data points to prevent token bloat
                plot_data = target_widget.get("plotData", [])
                truncated_traces = []
                for trace in plot_data:
                    x_vals = trace.get("x", [])[:10]  # first 10 data points
                    y_vals = trace.get("y", [])[:10]
                    name = trace.get("name", "Value")
                    truncated_traces.append({
                        "name": name,
                        "x_sample": x_vals,
                        "y_sample": y_vals,
                        "total_points": len(trace.get("x", []))
                    })
                widget_sec.append(f"Widget Data Points (Sample): {json.dumps(truncated_traces)}")
                widget_sec_text = "\n".join(widget_sec)
        except Exception as e:
            logger.warning(f"Failed to compile dashboard explain foundation context: {e}")
            
    # 5. Context Ranking Engine
    # Build ordered list of sections based on question type
    if q_type == "forecast":
        # Prioritize Forecast + Insights + KPIs
        ranked_sections = [forecast_sec_text, insight_sec_text, kpi_sec_text, profile_sec_text, dash_sec_text, reports_sec_text]
    elif q_type == "risk":
        # Prioritize Insights + KPIs + Reports
        ranked_sections = [insight_sec_text, kpi_sec_text, reports_sec_text, profile_sec_text, dash_sec_text, forecast_sec_text]
    elif q_type == "kpi":
        # Prioritize KPIs + Profiles
        ranked_sections = [kpi_sec_text, profile_sec_text, insight_sec_text, dash_sec_text, forecast_sec_text, reports_sec_text]
    else:
        # General / Default: Profile + Insights + KPIs + Forecasts + Reports
        ranked_sections = [profile_sec_text, insight_sec_text, kpi_sec_text, forecast_sec_text, reports_sec_text, dash_sec_text]
        
    # Prepend target widget explanation section if provided (explain foundation gets top priority)
    if widget_sec_text:
        ranked_sections.insert(0, widget_sec_text)
        
    # 6. Concatenate context ensuring it does not exceed the token constraint
    # Limit combined context character size to ~8,000 characters (~2,000 GPT tokens)
    max_char_limit = 8000
    combined_context = []
    curr_len = 0
    
    for sec in ranked_sections:
        if curr_len + len(sec) + 2 > max_char_limit:
            # Skip appending if it breaks the token boundary
            continue
        combined_context.append(sec)
        curr_len += len(sec) + 2
        
    return "\n\n".join(combined_context)
