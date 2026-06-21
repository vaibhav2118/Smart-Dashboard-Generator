import sys
import os
import uuid
import json
import shutil

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.dataset import Dataset
from app.models.dataset_profile import DatasetProfile
from app.models.dataset_forecast import DatasetForecast
from app.models.dataset_insight import DatasetInsight
from app.models.report import Report
from app.models.dashboard import Dashboard
from app.core.security import get_password_hash

def main():
    print("==================================================")
    print("STARTING SMARTDG SECURITY & BOUNDARY TEST SUITE")
    print("==================================================\n")
    
    db = SessionLocal()
    client = TestClient(app)
    
    # Generate unique test user emails to avoid conflicts
    unique_suffix = str(uuid.uuid4())[:8]
    email_a = f"usera_{unique_suffix}@test.com"
    email_b = f"userb_{unique_suffix}@test.com"
    
    user_a = None
    user_b = None
    dataset_a = None
    report_a = None
    
    try:
        # 1. Create Test Users directly in database
        print("[+] Creating Test User A and User B in database...")
        password_hash = get_password_hash("testpassword123")
        
        user_a = User(
            id=uuid.uuid4(),
            name="User A (Security Test)",
            email=email_a,
            password_hash=password_hash,
            is_admin=False
        )
        user_b = User(
            id=uuid.uuid4(),
            name="User B (Security Test)",
            email=email_b,
            password_hash=password_hash,
            is_admin=False
        )
        
        db.add(user_a)
        db.add(user_b)
        db.commit()
        db.refresh(user_a)
        db.refresh(user_b)
        
        print(f"    User A: ID={user_a.id}, Email={email_a}")
        print(f"    User B: ID={user_b.id}, Email={email_b}")
        
        # Log in both users to obtain auth headers
        print("[+] Logging in via API to retrieve JWT auth tokens...")
        
        res_login_a = client.post("/api/auth/login", data={"username": email_a, "password": "testpassword123"})
        assert res_login_a.status_code == 200, f"User A login failed: {res_login_a.text}"
        token_a = res_login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        
        res_login_b = client.post("/api/auth/login", data={"username": email_b, "password": "testpassword123"})
        assert res_login_b.status_code == 200, f"User B login failed: {res_login_b.text}"
        token_b = res_login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        
        # 2. Seed User A's Dataset and related entities directly in DB
        print("[+] Seeding User A's dataset, profile, dashboard, forecast, insights, and report...")
        
        # Create a mock file on disk for the dataset
        mock_file_path = f"uploads/datasets/test_security_{unique_suffix}.csv"
        os.makedirs(os.path.dirname(mock_file_path), exist_ok=True)
        with open(mock_file_path, "w") as f:
            f.write("date,value,category\n2026-01-01,100,A\n2026-01-02,150,B\n")
            
        dataset_a = Dataset(
            id=uuid.uuid4(),
            user_id=user_a.id,
            filename=f"test_security_{unique_suffix}.csv",
            file_path=mock_file_path,
            dataset_type="csv",
            row_count=2,
            column_count=3
        )
        db.add(dataset_a)
        db.commit()
        db.refresh(dataset_a)
        
        # Profile
        profile_a = DatasetProfile(
            id=uuid.uuid4(),
            dataset_id=dataset_a.id,
            profile_json=json.dumps({"total_rows": 2, "total_columns": 3, "classification": {"numerical": ["value"], "categorical": ["category"], "date": ["date"]}})
        )
        db.add(profile_a)
        
        dashboard_a = Dashboard(
            id=uuid.uuid4(),
            user_id=user_a.id,
            dataset_id=dataset_a.id,
            dashboard_name="Dashboard User A",
            layout_json=json.dumps({"layout": "default"})
        )
        db.add(dashboard_a)
        
        # Forecast
        forecast_a = DatasetForecast(
            id=uuid.uuid4(),
            dataset_id=dataset_a.id,
            model_used="linear_regression",
            date_column="date",
            target_column="value",
            forecast_horizon=7,
            forecast_data=json.dumps({"actual": [], "forecast": []}),
            reliability_score=85,
            trend_direction="upward",
            growth_rate=5.0
        )
        db.add(forecast_a)
        
        # Insight
        insight_a = DatasetInsight(
            id=uuid.uuid4(),
            dataset_id=dataset_a.id,
            model_used="gpt-4o-mini",
            insight_type="comprehensive",
            executive_summary="Summary A",
            key_findings=json.dumps(["finding 1"]),
            risks=json.dumps(["risk 1"]),
            opportunities=json.dumps(["opp 1"]),
            recommendations=json.dumps(["rec 1"]),
            management_priorities=json.dumps(["prior 1"]),
            raw_response="Raw A",
            confidence_score=90,
            dataset_hash="hash_a"
        )
        db.add(insight_a)
        
        # Report
        report_a = Report(
            id=uuid.uuid4(),
            user_id=user_a.id,
            dataset_id=dataset_a.id,
            report_type="executive",
            report_name=f"report_a_{unique_suffix}.pdf",
            report_path=f"uploads/reports/report_a_{unique_suffix}.pdf",
            report_metadata=json.dumps({"sections": ["summary"]})
        )
        db.add(report_a)
        
        # Create empty report pdf on disk
        os.makedirs("uploads/reports", exist_ok=True)
        with open(report_a.report_path, "w") as f:
            f.write("%PDF-1.4 mock pdf data")
            
        db.commit()
        print("    Data seeded successfully.")
        
        # 3. Perform Boundary Checks
        print("\n[+] RUNNING UNAUTHORIZED ACCESS TESTS (USER B ACCESSING USER A'S RESOURCES)...")
        
        # Route 1: Dataset Details
        url = f"/api/datasets/{dataset_a.id}"
        print(f"    Testing GET {url} ...")
        res = client.get(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset Not Found)")
        
        # Route 2: Dashboard Save Layout
        url = f"/api/datasets/{dataset_a.id}/dashboard/layout"
        print(f"    Testing POST {url} ...")
        res = client.post(url, headers=headers_b, json={"layout_json": "{}"})
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset/Dashboard Not Found)")
        
        # Route 3: Dashboard Save Metadata
        url = f"/api/datasets/{dataset_a.id}/dashboard/metadata"
        print(f"    Testing PUT {url} ...")
        res = client.put(url, headers=headers_b, json={"dashboard_name": "Hack Dashboard"})
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset/Dashboard Not Found)")
        
        # Route 4: Forecast Get Cached
        url = f"/api/forecast/{dataset_a.id}"
        print(f"    Testing GET {url} ...")
        res = client.get(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset/Forecast Not Found)")
        
        # Route 5: Forecast Train/Generate
        url = f"/api/forecast/{dataset_a.id}"
        print(f"    Testing POST {url} ...")
        res = client.post(url, headers=headers_b, json={"date_column": "date", "target_column": "value", "model": "linear_regression", "horizon": 5})
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset Not Found)")
        
        # Route 6: AI Insights Get Cached
        url = f"/api/insights/{dataset_a.id}"
        print(f"    Testing GET {url} ...")
        res = client.get(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset/Insight Not Found)")
        
        # Route 7: AI Insights Generate
        url = f"/api/insights/{dataset_a.id}"
        print(f"    Testing POST {url} ...")
        res = client.post(url, headers=headers_b, json={"insight_type": "comprehensive", "model": "gpt-4o-mini"})
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset Not Found)")
        
        # Route 8: Report Preview Data
        url = f"/api/reports/preview/{dataset_a.id}"
        print(f"    Testing GET {url} ...")
        res = client.get(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset Not Found)")
        
        # Route 9: Report PDF Generate
        url = f"/api/reports/{dataset_a.id}"
        print(f"    Testing POST {url} ...")
        res = client.post(url, headers=headers_b, json={"report_type": "executive", "selected_sections": {"summary": True}, "charts_base64": {}})
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset Not Found)")
        
        # Route 10: Report Download PDF
        url = f"/api/reports/download/{report_a.id}"
        print(f"    Testing GET {url} ...")
        res = client.get(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Report Not Found)")
        
        # Route 11: Report Delete
        url = f"/api/reports/{report_a.id}"
        print(f"    Testing DELETE {url} ...")
        res = client.delete(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Report Not Found)")
        
        # Route 12: Dataset Delete
        url = f"/api/datasets/{dataset_a.id}"
        print(f"    Testing DELETE {url} ...")
        res = client.delete(url, headers=headers_b)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("    -> PASS (HTTP 404 - Dataset Not Found)")
        
        print("\n[+] ALL BOUNDARY SECURITY TESTS PASSED SUCCESSFULLY! No cross-user leakage occurs.")
        
    except Exception as ex:
        print(f"\n[!] TEST FAILED: Exception raised: {ex}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        # 4. Clean up seeded data and files
        print("\n[+] Starting cleanup of generated test databases records & files...")
        
        # Delete report record & file
        if report_a:
            r = db.query(Report).filter(Report.id == report_a.id).first()
            if r:
                db.delete(r)
            if report_a.report_path and os.path.exists(report_a.report_path):
                try:
                    os.remove(report_a.report_path)
                except Exception:
                    pass
                    
        # Delete dataset, profile, dashboard, forecast, insights records
        if dataset_a:
            db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset_a.id).delete()
            db.query(Dashboard).filter(Dashboard.dataset_id == dataset_a.id).delete()
            db.query(DatasetForecast).filter(DatasetForecast.dataset_id == dataset_a.id).delete()
            db.query(DatasetInsight).filter(DatasetInsight.dataset_id == dataset_a.id).delete()
            
            d = db.query(Dataset).filter(Dataset.id == dataset_a.id).first()
            if d:
                db.delete(d)
                
            if dataset_a.file_path and os.path.exists(dataset_a.file_path):
                try:
                    os.remove(dataset_a.file_path)
                except Exception:
                    pass
                    
        # Delete test users
        if user_a:
            db.query(User).filter(User.id == user_a.id).delete()
        if user_b:
            db.query(User).filter(User.id == user_b.id).delete()
            
        db.commit()
        db.close()
        print("    Cleanup finished successfully.\n")
        print("==================================================")
        print("SMARTDG SECURITY & BOUNDARY TEST SUITE: COMPLETE")
        print("==================================================")

if __name__ == "__main__":
    main()
