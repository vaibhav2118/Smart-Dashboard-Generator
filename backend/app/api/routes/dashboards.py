import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dashboard import Dashboard
from app.models.dataset import Dataset
from app.models.dataset_profile import DatasetProfile
from app.models.dataset_forecast import DatasetForecast
from app.core.security import get_password_hash, verify_password
from app.api.routes.datasets import get_dataset_kpis

router = APIRouter()

class ShareConfigReq(BaseModel):
    share_type: str = "live"  # "live" or "snapshot"
    expires_option: str = "never"  # "never", "24h", "7d", "30d", "custom"
    expires_at: Optional[str] = None  # ISO format string for custom date
    password: Optional[str] = None  # Optional plaintext password

@router.post("/api/dashboards/{id}/share")
async def enable_dashboard_share(
    id: str,
    req: ShareConfigReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        dashboard_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dashboard ID format")
        
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_uuid, Dashboard.user_id == current_user.id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    # Check/generate share token
    if not dashboard.share_token:
        dashboard.share_token = uuid.uuid4().hex
        
    # Set type
    dashboard.share_type = req.share_type
    
    # Calculate expiration date
    expires_dt = None
    if req.expires_option == "24h":
        expires_dt = datetime.utcnow() + timedelta(hours=24)
    elif req.expires_option == "7d":
        expires_dt = datetime.utcnow() + timedelta(days=7)
    elif req.expires_option == "30d":
        expires_dt = datetime.utcnow() + timedelta(days=30)
    elif req.expires_option == "custom" and req.expires_at:
        try:
            expires_dt = datetime.fromisoformat(req.expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid custom expiration date format")
            
    dashboard.expires_at = expires_dt
    
    # Password hashing
    if req.password:
        dashboard.password_hash = get_password_hash(req.password)
    else:
        # Keep existing password if not updated or clear if explicit empty
        if req.password == "":
            dashboard.password_hash = None
            
    # Compile snapshot if snapshot mode is enabled
    if req.share_type == "snapshot":
        try:
            from app.api.routes.datasets import get_dashboard as get_live_dashboard
            # 1. Fetch live charts & layouts using owner context
            dash_res = await get_live_dashboard(id=str(dashboard.dataset_id), db=db, current_user=current_user)
            # 2. Fetch KPIs
            kpi_res = await get_dataset_kpis(id=str(dashboard.dataset_id), db=db, current_user=current_user)
            # 3. Fetch Forecast
            forecast_row = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dashboard.dataset_id).first()
            forecast_json = None
            if forecast_row:
                fdata = json.loads(forecast_row.forecast_data)
                forecast_json = {
                    "model_used": forecast_row.model_used,
                    "date_column": forecast_row.date_column,
                    "target_column": forecast_row.target_column,
                    "forecast_horizon": forecast_row.forecast_horizon,
                    "actual_points": fdata.get("actual", []),
                    "forecast_points": fdata.get("forecast", []),
                    "reliability_score": forecast_row.reliability_score,
                    "trend_direction": forecast_row.trend_direction,
                    "growth_rate": forecast_row.growth_rate
                }
            # 4. Serialize snapshot
            snapshot_obj = {
                "dashboard_name": dashboard.dashboard_name,
                "theme": dashboard.theme,
                "description": dashboard.description,
                "layout_json": dashboard.layout_json,
                "charts": dash_res.get("charts", []),
                "kpis": kpi_res.get("kpis", []),
                "forecast": forecast_json
            }
            dashboard.snapshot_json = json.dumps(snapshot_obj)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate dashboard snapshot: {str(e)}")
    else:
        dashboard.snapshot_json = None
        
    dashboard.share_enabled = True
    db.commit()
    db.refresh(dashboard)
    
    return {
        "share_url": f"http://localhost:8000/share/{dashboard.share_token}",
        "token": dashboard.share_token,
        "expires_at": dashboard.expires_at,
        "share_type": dashboard.share_type
    }

@router.delete("/api/dashboards/{id}/share")
async def disable_dashboard_share(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        dashboard_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dashboard ID format")
        
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_uuid, Dashboard.user_id == current_user.id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    dashboard.share_enabled = False
    dashboard.password_hash = None
    dashboard.expires_at = None
    dashboard.snapshot_json = None
    db.commit()
    
    return {"status": "success", "message": "Dashboard sharing disabled."}

@router.post("/api/dashboards/share/disable-all")
async def disable_all_user_shares(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Dashboard).filter(Dashboard.user_id == current_user.id).update({
        Dashboard.share_enabled: False,
        Dashboard.password_hash: None,
        Dashboard.expires_at: None,
        Dashboard.snapshot_json: None
    })
    db.commit()
    return {"status": "success", "message": "All dashboard share links have been disabled."}

@router.post("/api/dashboards/{id}/share/regenerate")
async def regenerate_share_token(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        dashboard_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dashboard ID format")
        
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_uuid, Dashboard.user_id == current_user.id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    dashboard.share_token = uuid.uuid4().hex
    db.commit()
    db.refresh(dashboard)
    
    return {
        "share_url": f"http://localhost:8000/share/{dashboard.share_token}",
        "token": dashboard.share_token,
        "expires_at": dashboard.expires_at
    }

@router.get("/api/share/{token}")
async def get_public_dashboard_data(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    dashboard = db.query(Dashboard).filter(Dashboard.share_token == token, Dashboard.share_enabled == True).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Shared dashboard not found or deactivated.")
        
    # Check Expiration
    if dashboard.expires_at and dashboard.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This shared dashboard link has expired.")
        
    # Check Password Protection
    if dashboard.password_hash:
        client_password = request.headers.get("X-Share-Password")
        if not client_password:
            client_password = request.query_params.get("password")
            
        if not client_password or not verify_password(client_password, dashboard.password_hash):
            # Mismatch triggers unauthorized response
            raise HTTPException(status_code=401, detail="Incorrect password. Access denied.")
            
    # Track View Analytics (View Count, Unique Visitors, First/Last viewed times)
    client_ip = request.headers.get("X-Forwarded-For")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    if not client_ip:
        client_ip = request.headers.get("X-Real-IP")
    if not client_ip:
        client_ip = request.client.host if request.client else "unknown"
    now = datetime.utcnow()
    
    dashboard.view_count += 1
    dashboard.last_viewed_at = now
    if not dashboard.first_viewed_at:
        dashboard.first_viewed_at = now
        
    # Determine unique visitor
    try:
        visitor_ips = json.loads(dashboard.unique_visitor_ips or "[]")
    except Exception:
        visitor_ips = []
        
    if client_ip not in visitor_ips:
        visitor_ips.append(client_ip)
        dashboard.unique_visitor_ips = json.dumps(visitor_ips)
        dashboard.unique_visitors = len(visitor_ips)
        
    db.commit()
    db.refresh(dashboard)
    
    # Return read-only data
    if dashboard.share_type == "snapshot" and dashboard.snapshot_json:
        try:
            return json.loads(dashboard.snapshot_json)
        except Exception:
            pass  # Fallback to live if JSON load fails
            
    # Live mode: fetch current database records dynamically
    owner = db.query(User).filter(User.id == dashboard.user_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Dashboard owner not found.")
        
    # Fetch live charts
    from app.api.routes.datasets import get_dashboard as get_live_dashboard
    try:
        dash_res = await get_live_dashboard(id=str(dashboard.dataset_id), db=db, current_user=owner)
        kpi_res = await get_dataset_kpis(id=str(dashboard.dataset_id), db=db, current_user=owner)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load live dashboard: {e}")
        
    # Fetch forecast
    forecast_row = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dashboard.dataset_id).first()
    forecast_json = None
    if forecast_row:
        fdata = json.loads(forecast_row.forecast_data)
        forecast_json = {
            "model_used": forecast_row.model_used,
            "date_column": forecast_row.date_column,
            "target_column": forecast_row.target_column,
            "forecast_horizon": forecast_row.forecast_horizon,
            "actual_points": fdata.get("actual", []),
            "forecast_points": fdata.get("forecast", []),
            "reliability_score": forecast_row.reliability_score,
            "trend_direction": forecast_row.trend_direction,
            "growth_rate": forecast_row.growth_rate
        }
        
    return {
        "dashboard_name": dashboard.dashboard_name,
        "theme": dashboard.theme,
        "description": dashboard.description,
        "layout_json": dashboard.layout_json,
        "charts": dash_res.get("charts", []),
        "kpis": kpi_res.get("kpis", []),
        "forecast": forecast_json
    }

# Open Graph Meta Redirect Page
@router.get("/share/{token}", response_class=HTMLResponse)
async def public_og_meta_page(
    token: str,
    db: Session = Depends(get_db)
):
    dashboard = db.query(Dashboard).filter(Dashboard.share_token == token, Dashboard.share_enabled == True).first()
    
    title = dashboard.dashboard_name if dashboard else "Shared Dashboard"
    desc = dashboard.description if (dashboard and dashboard.description) else "Interactive analytics dashboard generated by SmartDG."
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SmartDG - {title}</title>
    <!-- Open Graph Metadata -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="SmartDG - {title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:image" content="https://smartdg.com/og-preview.png">
    
    <!-- LinkedIn, WhatsApp, Slack, Discord Preview Optimization -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="SmartDG - {title}">
    <meta name="twitter:description" content="{desc}">
    
    <!-- Redirect Javascript to react app -->
    <script type="text/javascript">
        window.location.href = "http://localhost:5173/share/{token}";
    </script>
</head>
<body>
    <p>Loading shared dashboard. If you are not redirected, <a href="http://localhost:5173/share/{token}">click here</a>.</p>
</body>
</html>
"""
    return HTMLResponse(content=html_content, status_code=200)
