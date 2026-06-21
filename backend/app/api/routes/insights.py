import os
import uuid
import json
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import openai

from app.api.deps import get_db, get_current_active_user, ai_rate_limiter
from app.core.logging_helper import log_user_activity, log_application_error
from app.models.user import User
from app.models.dataset import Dataset
from app.models.settings import UserSettings
from app.models.dataset_insight import DatasetInsight
from app.schemas.insights import InsightGenerateRequest, InsightResponse
from app.api.routes.datasets import get_dataset_profile, get_dataset_kpis

router = APIRouter()

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

@router.get("/{dataset_id}", response_model=InsightResponse)
async def get_insights(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        dataset_uuid = uuid.UUID(dataset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == dataset_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    insight = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == dataset.id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="No insights found for this dataset.")
        
    current_hash = calculate_file_hash(dataset.file_path)
    if insight.dataset_hash != current_hash:
        raise HTTPException(status_code=409, detail="Insights are outdated.")
        
    return insight

@router.post("/{dataset_id}", response_model=InsightResponse)
async def generate_insights(
    dataset_id: str,
    req_body: InsightGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(ai_rate_limiter)
):
    try:
        dataset_uuid = uuid.UUID(dataset_id)
    except ValueError:
        log_application_error(db, current_user.id, f"/api/insights/{dataset_id}", "InvalidIDError", "Invalid dataset ID format on AI Insights generation.")
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == dataset_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        log_application_error(db, current_user.id, f"/api/insights/{dataset_id}", "NotFoundError", "Dataset not found on AI Insights generation.")
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    api_key = None
    if settings and settings.openai_key:
        api_key = settings.openai_key
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        
    if not api_key:
        log_application_error(db, current_user.id, f"/api/insights/{dataset_id}", "MissingAPIKey", "No OpenAI API key configured.")
        raise HTTPException(status_code=400, detail="No OpenAI API key configured.")
        
    try:
        try:
            profile = get_dataset_profile(dataset_id=str(dataset.id), db=db, current_user=current_user)
            kpi_res = await get_dataset_kpis(id=str(dataset.id), db=db, current_user=current_user)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to profile dataset for insights: {str(e)}")
            
        rows = profile.get("total_rows", 0)
        cols = profile.get("total_columns", 0)
        if rows == 0:
            raise HTTPException(status_code=400, detail="Dataset contains no rows to analyze.")
            
        missing_pct = profile.get("missing_percentage", 0.0)
        duplicates_count = profile.get("duplicate_records_count", 0)
        duplicates_pct = (duplicates_count / rows * 100) if rows > 0 else 0.0
        
        quality_score = "100%"
        for k in kpi_res.get("kpis", []):
            if k.get("label") == "Quality Score":
                quality_score = k.get("value")
                
        kpi_summary = [f"{k['label']}: {k['value']}" for k in kpi_res.get("kpis", [])]
        
        corr_matrix = profile.get("correlation_matrix", {})
        correlations = []
        seen_pairs = set()
        for col1, targets in corr_matrix.items():
            for col2, val in targets.items():
                if col1 != col2 and val is not None:
                    pair_key = tuple(sorted([col1, col2]))
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        if abs(val) > 0.35:
                            correlations.append({"var1": col1, "var2": col2, "r": round(val, 3)})
        correlations.sort(key=lambda x: abs(x["r"]), reverse=True)
        correlations = correlations[:10]
        
        outliers = profile.get("outliers_by_column", {})
        outlier_summary = {col: count for col, count in outliers.items() if count > 0}
        
        numerical_cols = profile.get("classification", {}).get("numerical", [])
        num_stats = {}
        for col in numerical_cols:
            col_stats = profile.get("statistics", {}).get("numerical", {}).get(col, {})
            num_stats[col] = {
                "mean": col_stats.get("mean"),
                "min": col_stats.get("min"),
                "max": col_stats.get("max")
            }
            
        from app.models.dataset_forecast import DatasetForecast
        forecast = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset.id).first()
        forecast_metrics = None
        if forecast:
            forecast_metrics = {
                "model_used": forecast.model_used,
                "date_column": forecast.date_column,
                "target_column": forecast.target_column,
                "forecast_horizon": forecast.forecast_horizon,
                "reliability_score": forecast.reliability_score,
                "trend_direction": forecast.trend_direction,
                "growth_rate_percentage": round(forecast.growth_rate, 2)
            }

        compressed_payload = {
            "dataset_name": dataset.filename,
            "dataset_type": dataset.dataset_type,
            "row_count": rows,
            "column_count": cols,
            "quality_score": quality_score,
            "kpi_summary": kpi_summary,
            "missing_percentage": round(missing_pct, 2),
            "duplicate_percentage": round(duplicates_pct, 2),
            "strong_correlations": correlations,
            "outlier_summary": outlier_summary,
            "numerical_column_stats": num_stats,
            "forecast_metrics": forecast_metrics
        }
        
        try:
            qs_int = int(quality_score.replace("%", ""))
        except ValueError:
            qs_int = 100
            
        total_outliers = sum(outlier_summary.values())
        outlier_ratio = (total_outliers / rows) if rows > 0 else 0.0
        outlier_penalty = min(15, outlier_ratio * 50)
        missing_penalty = min(15, missing_pct)
        
        conf = qs_int - outlier_penalty - missing_penalty
        if len(correlations) > 0:
            conf += 5
        else:
            conf -= 5
            
        confidence_score = max(0, min(100, round(conf)))
        
        req_model = req_body.model if req_body.model in ["gpt-4o-mini", "gpt-4o"] else "gpt-4o-mini"
        insight_type = req_body.insight_type if req_body.insight_type in ["executive", "sales", "finance", "hr", "inventory", "operations"] else "executive"
        
        try:
            client = openai.OpenAI(api_key=api_key)
            system_prompt = (
                "You are a senior business analyst.\n"
                f"Analyze the provided dataset summary and generate executive-level business intelligence matching the insight type '{insight_type}'.\n"
                "Return a valid JSON object matching the following structure:\n"
                "{\n"
                '  "executive_summary": "Paragraph summarizing performance, insights, and high-level health...",\n'
                '  "key_findings": ["Finding 1", "Finding 2", ...],\n'
                '  "risks": ["Risk 1", "Risk 2", ...],\n'
                '  "opportunities": ["Opportunity 1", "Opportunity 2", ...],\n'
                '  "recommended_actions": ["Action 1", "Action 2", ...],\n'
                '  "management_priority_ranking": ["Priority 1", "Priority 2", ...]\n'
                "}\n"
                "Focus on business value, trends, anomalies, and decision-making."
            )
            user_prompt = f"Analyze the following dataset profile payload:\n{json.dumps(compressed_payload, indent=2)}"
            
            response = client.chat.completions.create(
                model=req_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            ai_output = json.loads(response.choices[0].message.content)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"OpenAI service failure: {str(e)}")
            
        exec_summary = ai_output.get("executive_summary", "")
        key_findings = json.dumps(ai_output.get("key_findings", []))
        risks = json.dumps(ai_output.get("risks", []))
        opps = json.dumps(ai_output.get("opportunities", []))
        recs = json.dumps(ai_output.get("recommended_actions", []))
        priorities = json.dumps(ai_output.get("management_priority_ranking", []))
        raw_response = response.choices[0].message.content
        
        current_hash = calculate_file_hash(dataset.file_path)
        
        insight = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == dataset.id).first()
        if not insight:
            insight = DatasetInsight(
                dataset_id=dataset.id,
                model_used=req_model,
                insight_type=insight_type,
                executive_summary=exec_summary,
                key_findings=key_findings,
                risks=risks,
                opportunities=opps,
                recommendations=recs,
                management_priorities=priorities,
                raw_response=raw_response,
                confidence_score=confidence_score,
                dataset_hash=current_hash
            )
            db.add(insight)
        else:
            insight.model_used = req_model
            insight.insight_type = insight_type
            insight.executive_summary = exec_summary
            insight.key_findings = key_findings
            insight.risks = risks
            insight.opportunities = opps
            insight.recommendations = recs
            insight.management_priorities = priorities
            insight.raw_response = raw_response
            insight.confidence_score = confidence_score
            insight.dataset_hash = current_hash
            insight.updated_at = datetime.utcnow()
            
        db.commit()
        db.refresh(insight)
        
        log_user_activity(db, current_user.id, "AI Insight Generation", f"Generated '{insight_type}' AI Insights using model '{req_model}' for dataset '{dataset.filename}' (Confidence: {confidence_score}%)")
        return insight
    except HTTPException:
        raise
    except Exception as e:
        log_application_error(db, current_user.id, f"/api/insights/{dataset_id}", "OpenAIInsightGenerationError", f"Failed to generate AI insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI insights: {str(e)}")
