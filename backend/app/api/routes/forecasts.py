import os
import uuid
import json
import hashlib
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np

from app.api.deps import get_db, get_current_active_user, forecast_rate_limiter
from app.core.logging_helper import log_user_activity, log_application_error
from app.models.user import User
from app.models.dataset import Dataset
from app.models.dataset_forecast import DatasetForecast
from app.schemas.forecasts import ForecastGenerateRequest, ForecastResponse

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

@router.get("/{dataset_id}", response_model=ForecastResponse)
def get_forecast(
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
        
    forecast = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset.id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="No forecast compiled for this dataset.")
        
    current_hash = calculate_file_hash(dataset.file_path)
    if forecast.dataset_hash != current_hash:
        raise HTTPException(status_code=409, detail="Forecast parameters are outdated.")
        
    fdata = json.loads(forecast.forecast_data)
    return {
        "id": forecast.id,
        "dataset_id": forecast.dataset_id,
        "model_used": forecast.model_used,
        "date_column": forecast.date_column,
        "target_column": forecast.target_column,
        "forecast_horizon": forecast.forecast_horizon,
        "actual_points": fdata.get("actual", []),
        "forecast_points": fdata.get("forecast", []),
        "reliability_score": forecast.reliability_score,
        "trend_direction": forecast.trend_direction,
        "growth_rate": forecast.growth_rate,
        "created_at": forecast.created_at,
        "updated_at": forecast.updated_at
    }

@router.post("/{dataset_id}", response_model=ForecastResponse)
async def generate_forecast(
    dataset_id: str,
    req_body: ForecastGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(forecast_rate_limiter)
):
    try:
        dataset_uuid = uuid.UUID(dataset_id)
    except ValueError:
        log_application_error(db, current_user.id, f"/api/forecast/{dataset_id}", "InvalidIDError", "Invalid dataset ID format on forecast generation.")
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == dataset_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        log_application_error(db, current_user.id, f"/api/forecast/{dataset_id}", "NotFoundError", "Dataset not found on forecast generation.")
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if not os.path.exists(dataset.file_path):
        log_application_error(db, current_user.id, f"/api/forecast/{dataset_id}", "DiskFileNotFound", f"Dataset file not found at path {dataset.file_path}")
        raise HTTPException(status_code=404, detail="Dataset file not found on disk")
        
    try:
        # Read file
        try:
            ext = os.path.splitext(dataset.file_path)[1].lower()
            if ext == '.csv':
                df = pd.read_csv(dataset.file_path)
            else:
                df = pd.read_excel(dataset.file_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read dataset file: {str(e)}")
            
        # Column validations
        if req_body.date_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Date column '{req_body.date_column}' not found in dataset.")
        if req_body.target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{req_body.target_column}' not found in dataset.")
            
        # Clean data
        clean_df = df[[req_body.date_column, req_body.target_column]].copy()
        clean_df = clean_df.dropna()
        
        clean_df[req_body.date_column] = pd.to_datetime(clean_df[req_body.date_column], errors='coerce')
        clean_df = clean_df.dropna(subset=[req_body.date_column])
        
        clean_df[req_body.target_column] = pd.to_numeric(clean_df[req_body.target_column], errors='coerce')
        clean_df = clean_df.dropna(subset=[req_body.target_column])
        
        if len(clean_df) < 5:
            raise HTTPException(status_code=400, detail="Insufficient valid data points (minimum 5 required) after cleaning.")
            
        # Aggregate values by date to avoid duplicate index issues in forecasting
        time_df = clean_df.groupby(req_body.date_column)[req_body.target_column].sum().reset_index()
        time_df = time_df.sort_values(by=req_body.date_column)
        
        if len(time_df) < 5:
            raise HTTPException(status_code=400, detail="Insufficient unique date intervals (minimum 5 required) for forecasting.")
            
        actual_points = []
        for _, row in time_df.iterrows():
            actual_points.append({
                "Date": row[req_body.date_column].strftime("%Y-%m-%d"),
                "Value": float(row[req_body.target_column])
            })
            
        # Determine date intervals (frequency)
        if len(time_df) > 1:
            delta = time_df[req_body.date_column].iloc[1] - time_df[req_body.date_column].iloc[0]
        else:
            import datetime
            delta = datetime.timedelta(days=1)
            
        forecast_points = []
        model_name = req_body.model.lower()
        
        # Check for automatic model downgrades on small datasets
        if len(time_df) < 10 and model_name in ["arima", "prophet"]:
            model_name = "linear_regression"
            
        y = time_df[req_body.target_column].values
        last_date = time_df[req_body.date_column].max()
        
        if model_name == "linear_regression":
            from sklearn.linear_model import LinearRegression
            X = np.arange(len(time_df)).reshape(-1, 1)
            reg = LinearRegression().fit(X, y)
            
            residuals = y - reg.predict(X)
            std_error = np.std(residuals) if len(residuals) > 0 else 1.0
            
            for i in range(1, req_body.horizon + 1):
                future_idx = len(time_df) + i - 1
                pred_val = float(reg.predict([[future_idx]])[0])
                future_date = last_date + delta * i
                
                margin = 1.96 * std_error
                forecast_points.append({
                    "Date": future_date.strftime("%Y-%m-%d"),
                    "Value": pred_val,
                    "Upper": pred_val + margin,
                    "Lower": pred_val - margin
                })
                
        elif model_name == "arima":
            from statsmodels.tsa.arima.model import ARIMA
            try:
                model_fit = ARIMA(y, order=(1, 1, 1)).fit()
                pred = model_fit.get_forecast(steps=req_body.horizon)
                forecast_values = pred.predicted_mean
                conf_int = pred.conf_int(alpha=0.05)
                
                for i in range(req_body.horizon):
                    future_date = last_date + delta * (i + 1)
                    forecast_points.append({
                        "Date": future_date.strftime("%Y-%m-%d"),
                        "Value": float(forecast_values[i]),
                        "Upper": float(conf_int[i, 1]),
                        "Lower": float(conf_int[i, 0])
                    })
            except Exception:
                model_name = "linear_regression"
                from sklearn.linear_model import LinearRegression
                X = np.arange(len(time_df)).reshape(-1, 1)
                reg = LinearRegression().fit(X, y)
                residuals = y - reg.predict(X)
                std_error = np.std(residuals) if len(residuals) > 0 else 1.0
                for i in range(1, req_body.horizon + 1):
                    future_idx = len(time_df) + i - 1
                    pred_val = float(reg.predict([[future_idx]])[0])
                    future_date = last_date + delta * i
                    margin = 1.96 * std_error
                    forecast_points.append({
                        "Date": future_date.strftime("%Y-%m-%d"),
                        "Value": pred_val,
                        "Upper": pred_val + margin,
                        "Lower": pred_val - margin
                    })
                    
        elif model_name == "prophet":
            from prophet import Prophet
            import logging
            logging.getLogger('prophet').setLevel(logging.ERROR)
            try:
                prophet_df = time_df.rename(columns={req_body.date_column: 'ds', req_body.target_column: 'y'})
                prophet_df['ds'] = prophet_df['ds'].dt.tz_localize(None)
                
                m = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False)
                if len(time_df) > 30:
                    m.weekly_seasonality = True
                m.fit(prophet_df)
                
                future_dates = [last_date + delta * i for i in range(1, req_body.horizon + 1)]
                future = pd.DataFrame({'ds': future_dates})
                forecast = m.predict(future)
                
                for _, row in forecast.iterrows():
                    forecast_points.append({
                        "Date": row['ds'].strftime("%Y-%m-%d"),
                        "Value": float(row['yhat']),
                        "Upper": float(row['yhat_upper']),
                        "Lower": float(row['yhat_lower'])
                    })
            except Exception:
                model_name = "linear_regression"
                from sklearn.linear_model import LinearRegression
                X = np.arange(len(time_df)).reshape(-1, 1)
                reg = LinearRegression().fit(X, y)
                residuals = y - reg.predict(X)
                std_error = np.std(residuals) if len(residuals) > 0 else 1.0
                for i in range(1, req_body.horizon + 1):
                    future_idx = len(time_df) + i - 1
                    pred_val = float(reg.predict([[future_idx]])[0])
                    future_date = last_date + delta * i
                    margin = 1.96 * std_error
                    forecast_points.append({
                        "Date": future_date.strftime("%Y-%m-%d"),
                        "Value": pred_val,
                        "Upper": pred_val + margin,
                        "Lower": pred_val - margin
                    })

        last_actual_val = actual_points[-1]["Value"]
        last_forecast_val = forecast_points[-1]["Value"]
        growth_rate = ((last_forecast_val - last_actual_val) / last_actual_val * 100) if last_actual_val != 0 else 0.0
        
        if growth_rate > 1.5:
            trend_direction = "upward"
        elif growth_rate < -1.5:
            trend_direction = "downward"
        else:
            trend_direction = "flat"
            
        base_score = 95 if model_name == "prophet" else (90 if model_name == "arima" else 80)
        missing_ratio = df[req_body.target_column].isna().sum() / len(df) if len(df) > 0 else 0.0
        completeness_penalty = min(20, missing_ratio * 100)
        
        continuity_penalty = 0
        if len(time_df) > 2:
            deltas = time_df[req_body.date_column].diff().dropna().dt.total_seconds()
            if deltas.mean() > 0:
                cv = deltas.std() / deltas.mean()
                continuity_penalty = min(15, cv * 10)
                
        mape = 0.0
        if len(time_df) >= 5:
            try:
                from sklearn.linear_model import LinearRegression
                from statsmodels.tsa.arima.model import ARIMA
                split_idx = int(len(time_df) * 0.8)
                train_y = time_df[req_body.target_column].iloc[:split_idx].values
                test_y = time_df[req_body.target_column].iloc[split_idx:].values
                
                if model_name == "linear_regression":
                    reg_test = LinearRegression().fit(np.arange(len(train_y)).reshape(-1, 1), train_y)
                    preds = reg_test.predict(np.arange(len(train_y), len(time_df)).reshape(-1, 1))
                else:
                    model_test = ARIMA(train_y, order=(1, 1, 0)).fit()
                    preds = model_test.forecast(steps=len(test_y))
                    
                absolute_percentage_errors = np.abs((test_y - preds) / test_y)
                absolute_percentage_errors = absolute_percentage_errors[np.isfinite(absolute_percentage_errors)]
                if len(absolute_percentage_errors) > 0:
                    mape = np.mean(absolute_percentage_errors)
            except Exception:
                mape = 0.15
        else:
            mape = 0.1
        mape_penalty = min(30, mape * 100)
        reliability_score = max(0, min(100, round(base_score - completeness_penalty - mape_penalty - continuity_penalty)))
        
        current_hash = calculate_file_hash(dataset.file_path)
        forecast_payload = {
            "actual": actual_points,
            "forecast": forecast_points,
            "growth_rate": growth_rate,
            "trend_direction": trend_direction
        }
        
        forecast = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset.id).first()
        if not forecast:
            forecast = DatasetForecast(
                dataset_id=dataset.id,
                model_used=model_name,
                date_column=req_body.date_column,
                target_column=req_body.target_column,
                forecast_horizon=req_body.horizon,
                forecast_data=json.dumps(forecast_payload),
                reliability_score=reliability_score,
                trend_direction=trend_direction,
                growth_rate=growth_rate,
                dataset_hash=current_hash
            )
            db.add(forecast)
        else:
            forecast.model_used = model_name
            forecast.date_column = req_body.date_column
            forecast.target_column = req_body.target_column
            forecast.forecast_horizon = req_body.horizon
            forecast.forecast_data = json.dumps(forecast_payload)
            forecast.reliability_score = reliability_score
            forecast.trend_direction = trend_direction
            forecast.growth_rate = growth_rate
            forecast.dataset_hash = current_hash
            forecast.updated_at = datetime.utcnow()
            
        db.commit()
        db.refresh(forecast)
        
        # Log successful audit
        log_user_activity(db, current_user.id, "Forecast Generation", f"Generated forecast using '{model_name}' model on target '{req_body.target_column}' of '{dataset.filename}' (growth: {growth_rate:+.2f}%)")
        
        return {
            "id": forecast.id,
            "dataset_id": forecast.dataset_id,
            "model_used": forecast.model_used,
            "date_column": forecast.date_column,
            "target_column": forecast.target_column,
            "forecast_horizon": forecast.forecast_horizon,
            "actual_points": actual_points,
            "forecast_points": forecast_points,
            "reliability_score": forecast.reliability_score,
            "trend_direction": forecast.trend_direction,
            "growth_rate": forecast.growth_rate,
            "created_at": forecast.created_at,
            "updated_at": forecast.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        log_application_error(db, current_user.id, f"/api/forecast/{dataset_id}", "ForecastCalculationError", f"Failed to compute forecasting metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Forecasting calculations failed: {str(e)}")
