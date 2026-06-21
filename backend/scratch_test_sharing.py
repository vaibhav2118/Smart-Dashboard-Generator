import sys
import os
import uuid
import json
from datetime import datetime, timedelta

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
from app.models.dashboard import Dashboard
from app.core.security import get_password_hash, verify_password

def run_tests():
    print("==================================================")
    print("STARTING SMARTDG DASHBOARD SHARING TEST SUITE")
    print("==================================================\n")
    
    db = SessionLocal()
    client = TestClient(app)
    
    unique_suffix = str(uuid.uuid4())[:8]
    email_owner = f"owner_{unique_suffix}@test.com"
    email_attacker = f"attacker_{unique_suffix}@test.com"
    
    user_owner = None
    user_attacker = None
    dataset_owner = None
    dashboard_owner = None
    
    try:
        # 1. Create Test Users
        print("[+] Creating Owner and Attacker Users in database...")
        pwd_hash = get_password_hash("testpassword123")
        
        user_owner = User(
            id=uuid.uuid4(),
            name="Dashboard Owner",
            email=email_owner,
            password_hash=pwd_hash,
            is_admin=False
        )
        user_attacker = User(
            id=uuid.uuid4(),
            name="Dashboard Attacker",
            email=email_attacker,
            password_hash=pwd_hash,
            is_admin=False
        )
        db.add(user_owner)
        db.add(user_attacker)
        db.commit()
        db.refresh(user_owner)
        db.refresh(user_attacker)
        
        print(f"    Owner: ID={user_owner.id}, Email={email_owner}")
        print(f"    Attacker: ID={user_attacker.id}, Email={email_attacker}")
        
        # Log in users
        print("[+] Logging in users to obtain auth headers...")
        res_login_o = client.post("/api/auth/login", data={"username": email_owner, "password": "testpassword123"})
        assert res_login_o.status_code == 200, f"Owner login failed: {res_login_o.text}"
        token_o = res_login_o.json()["access_token"]
        headers_o = {"Authorization": f"Bearer {token_o}"}
        
        res_login_a = client.post("/api/auth/login", data={"username": email_attacker, "password": "testpassword123"})
        assert res_login_a.status_code == 200, f"Attacker login failed: {res_login_a.text}"
        token_a = res_login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        
        # 2. Seed owner's dataset and dashboard
        print("[+] Seeding Owner's dataset and dashboard in DB...")
        mock_file_path = f"uploads/datasets/test_sharing_{unique_suffix}.csv"
        os.makedirs(os.path.dirname(mock_file_path), exist_ok=True)
        with open(mock_file_path, "w") as f:
            f.write("date,value,category\n2026-06-01,100,A\n2026-06-02,150,B\n2026-06-03,200,A\n")
            
        dataset_owner = Dataset(
            id=uuid.uuid4(),
            user_id=user_owner.id,
            filename=f"test_sharing_{unique_suffix}.csv",
            file_path=mock_file_path,
            dataset_type="csv",
            row_count=3,
            column_count=3
        )
        db.add(dataset_owner)
        db.commit()
        db.refresh(dataset_owner)
        
        # Add KPI details directly inside Database (mock profiling results to generate dashboard metrics)
        profile_owner = DatasetProfile(
            id=uuid.uuid4(),
            dataset_id=dataset_owner.id,
            profile_json=json.dumps({
                "total_rows": 3,
                "total_columns": 3,
                "classification": {
                    "numerical": ["value"],
                    "categorical": ["category"],
                    "date": ["date"]
                }
            })
        )
        db.add(profile_owner)
        
        # Seed a forecast for live/snapshot dashboard to fetch
        forecast_owner = DatasetForecast(
            id=uuid.uuid4(),
            dataset_id=dataset_owner.id,
            model_used="arima",
            date_column="date",
            target_column="value",
            forecast_horizon=7,
            forecast_data=json.dumps({
                "actual": [{"Date": "2026-06-01", "Value": 100}, {"Date": "2026-06-02", "Value": 150}],
                "forecast": [{"Date": "2026-06-03", "Value": 200}]
            }),
            reliability_score=92,
            trend_direction="upward",
            growth_rate=15.0
        )
        db.add(forecast_owner)
        
        dashboard_owner = Dashboard(
            id=uuid.uuid4(),
            user_id=user_owner.id,
            dataset_id=dataset_owner.id,
            dashboard_name="Sales Performance Dashboard",
            description="Highly confidential sales analytics.",
            layout_json=json.dumps([
                {
                    "id": "widget_1",
                    "title": "Sales Revenue Trend",
                    "type": "line",
                    "visible": True,
                    "plotData": [{"x": ["2026-06-01", "2026-06-02"], "y": [100, 150]}]
                }
            ])
        )
        db.add(dashboard_owner)
        db.commit()
        db.refresh(dashboard_owner)
        
        dashboard_id = str(dashboard_owner.id)
        print(f"    Dashboard seeded: ID={dashboard_id}")
        
        # 3. Test: Verify sharing is disabled by default
        print("[+] Test case 3: Default Sharing Status check...")
        assert not dashboard_owner.share_enabled
        assert dashboard_owner.share_token is None
        
        # Attempt to access sharing info or generate a token with attacker account (should fail)
        res_share_att = client.post(f"/api/dashboards/{dashboard_id}/share", json={"share_type": "live"}, headers=headers_a)
        assert res_share_att.status_code == 404, f"Attacker should get 404. Got: {res_share_att.status_code}"
        
        # 4. Test: Enable Sharing (Live mode, No password)
        print("[+] Test case 4: Enable Live Share (No password)...")
        res_enable_share = client.post(
            f"/api/dashboards/{dashboard_id}/share",
            json={"share_type": "live", "expires_option": "never"},
            headers=headers_o
        )
        assert res_enable_share.status_code == 200, res_enable_share.text
        share_data = res_enable_share.json()
        assert "token" in share_data
        assert share_data["share_type"] == "live"
        token = share_data["token"]
        print(f"    Share generated. Token={token}")
        
        # Verify db is updated
        db.refresh(dashboard_owner)
        assert dashboard_owner.share_enabled
        assert dashboard_owner.share_token == token
        assert dashboard_owner.share_type == "live"
        
        # 5. Test: Access Live Dashboard Publicly (No password)
        print("[+] Test case 5: Fetch Live Dashboard Data Publicly (No password)...")
        res_pub_fetch = client.get(f"/api/share/{token}")
        assert res_pub_fetch.status_code == 200, res_pub_fetch.text
        pub_data = res_pub_fetch.json()
        assert pub_data["dashboard_name"] == "Sales Performance Dashboard"
        assert isinstance(pub_data["charts"], list)
        assert pub_data["forecast"]["model_used"] == "arima"
        
        # Verify Analytics Tracks Views correctly
        db.refresh(dashboard_owner)
        assert dashboard_owner.view_count == 1
        assert dashboard_owner.unique_visitors == 1
        assert dashboard_owner.first_viewed_at is not None
        assert dashboard_owner.last_viewed_at is not None
        
        # 6. Test: Analytics Tracking (Multiple Views / Unique IPs)
        print("[+] Test case 6: Analytics Tracking (Unique IP vs Repeated view)...")
        # Repeated view from same IP (default TestClient IP)
        res_pub_fetch2 = client.get(f"/api/share/{token}")
        assert res_pub_fetch2.status_code == 200
        db.refresh(dashboard_owner)
        assert dashboard_owner.view_count == 2
        assert dashboard_owner.unique_visitors == 1 # remains 1
        
        # Fetch from unique IP using X-Forwarded-For header
        res_unique_ip = client.get(f"/api/share/{token}", headers={"X-Forwarded-For": "8.8.8.8"})
        assert res_unique_ip.status_code == 200
        db.refresh(dashboard_owner)
        assert dashboard_owner.view_count == 3
        assert dashboard_owner.unique_visitors == 2 # incremented!
        
        # 7. Test: Password Protected Link
        print("[+] Test case 7: Password Protection (Enable password)...")
        res_password_share = client.post(
            f"/api/dashboards/{dashboard_id}/share",
            json={"share_type": "live", "expires_option": "never", "password": "securePass123"},
            headers=headers_o
        )
        assert res_password_share.status_code == 200
        
        db.refresh(dashboard_owner)
        assert dashboard_owner.password_hash is not None
        assert verify_password("securePass123", dashboard_owner.password_hash)
        
        # Access publicly without password header (should fail)
        res_fail_pw = client.get(f"/api/share/{token}")
        assert res_fail_pw.status_code == 401
        
        # Access publicly with wrong password header (should fail)
        res_fail_pw2 = client.get(f"/api/share/{token}", headers={"X-Share-Password": "wrongpassword"})
        assert res_fail_pw2.status_code == 401
        
        # Access publicly with correct password header (should succeed)
        res_success_pw = client.get(f"/api/share/{token}", headers={"X-Share-Password": "securePass123"})
        assert res_success_pw.status_code == 200
        assert res_success_pw.json()["dashboard_name"] == "Sales Performance Dashboard"
        
        # Access publicly with correct password via query params (should succeed)
        res_success_pw_qp = client.get(f"/api/share/{token}?password=securePass123")
        assert res_success_pw_qp.status_code == 200
        
        # 8. Test: Expired Link
        print("[+] Test case 8: Expired Link...")
        # Enable with past date custom expiration
        past_expiry = (datetime.utcnow() - timedelta(minutes=10)).isoformat() + "Z"
        res_expire_share = client.post(
            f"/api/dashboards/{dashboard_id}/share",
            json={"share_type": "live", "expires_option": "custom", "expires_at": past_expiry},
            headers=headers_o
        )
        assert res_expire_share.status_code == 200
        
        # Try to access (should return 410 Gone)
        res_expired_fetch = client.get(f"/api/share/{token}")
        assert res_expired_fetch.status_code == 410, f"Expected 410. Got {res_expired_fetch.status_code}"
        
        # 9. Test: Revoked / Disabled Link
        print("[+] Test case 9: Disabling / Revoking Link...")
        res_disable = client.delete(f"/api/dashboards/{dashboard_id}/share", headers=headers_o)
        assert res_disable.status_code == 200
        
        # Check database
        db.refresh(dashboard_owner)
        assert not dashboard_owner.share_enabled
        assert dashboard_owner.password_hash is None
        
        # Access public link (should return 404)
        res_revoked_fetch = client.get(f"/api/share/{token}")
        assert res_revoked_fetch.status_code == 404, f"Expected 404. Got {res_revoked_fetch.status_code}"
        
        # 10. Test: Disable All Links (Global Owner Control)
        print("[+] Test case 10: Disable All Links...")
        # Create second dashboard for owner
        dashboard_owner2 = Dashboard(
            id=uuid.uuid4(),
            user_id=user_owner.id,
            dataset_id=dataset_owner.id,
            dashboard_name="Marketing Dashboard"
        )
        db.add(dashboard_owner2)
        db.commit()
        db.refresh(dashboard_owner2)
        
        # Enable sharing on both dashboards
        res_sh1 = client.post(f"/api/dashboards/{dashboard_id}/share", json={"share_type": "live"}, headers=headers_o)
        res_sh2 = client.post(f"/api/dashboards/{str(dashboard_owner2.id)}/share", json={"share_type": "live"}, headers=headers_o)
        assert res_sh1.status_code == 200
        assert res_sh2.status_code == 200
        
        t1 = res_sh1.json()["token"]
        t2 = res_sh2.json()["token"]
        
        # Both should be active
        assert client.get(f"/api/share/{t1}").status_code == 200
        assert client.get(f"/api/share/{t2}").status_code == 200
        
        # Disable all user shares
        res_disable_all = client.post("/api/dashboards/share/disable-all", headers=headers_o)
        assert res_disable_all.status_code == 200
        
        # Verify both return 404
        assert client.get(f"/api/share/{t1}").status_code == 404
        assert client.get(f"/api/share/{t2}").status_code == 404
        print("    Successfully disabled all active shares.")
        
        # 11. Test: Regenerate Link
        print("[+] Test case 11: Regenerate Share Link...")
        # Enable share again
        client.post(f"/api/dashboards/{dashboard_id}/share", json={"share_type": "live"}, headers=headers_o)
        db.refresh(dashboard_owner)
        old_tok = dashboard_owner.share_token
        
        # Regenerate
        res_regen = client.post(f"/api/dashboards/{dashboard_id}/share/regenerate", headers=headers_o)
        assert res_regen.status_code == 200
        new_tok = res_regen.json()["token"]
        assert old_tok != new_tok
        
        # Old link returns 404, new link returns 200
        assert client.get(f"/api/share/{old_tok}").status_code == 404
        assert client.get(f"/api/share/{new_tok}").status_code == 200
        
        # 12. Test: Snapshot mode vs Live mode
        print("[+] Test case 12: Snapshot Mode serialization...")
        res_snap = client.post(
            f"/api/dashboards/{dashboard_id}/share",
            json={"share_type": "snapshot"},
            headers=headers_o
        )
        assert res_snap.status_code == 200
        db.refresh(dashboard_owner)
        assert dashboard_owner.share_type == "snapshot"
        assert dashboard_owner.snapshot_json is not None
        
        # Parse and verify snapshot layout contains correct info
        snap_obj = json.loads(dashboard_owner.snapshot_json)
        assert snap_obj["dashboard_name"] == "Sales Performance Dashboard"
        assert snap_obj["forecast"]["model_used"] == "arima"
        # Confirm public retrieval returns static snapshot json
        res_pub_snap = client.get(f"/api/share/{new_tok}")
        assert res_pub_snap.status_code == 200
        assert res_pub_snap.json()["dashboard_name"] == "Sales Performance Dashboard"
        
        # 13. Test: Embed and Open Graph metadata redirects
        print("[+] Test case 13: Open Graph Meta Redirect Page and Embed iframe validation...")
        res_og = client.get(f"/share/{new_tok}")
        assert res_og.status_code == 200
        assert "og:title" in res_og.text
        assert "og:description" in res_og.text
        assert "twitter:title" in res_og.text
        assert f"window.location.href = \"http://localhost:5173/share/{new_tok}\";" in res_og.text
        print("    Open Graph tags and dynamic JS redirect scripts verified successfully.")
        
        # 14. Test: Public Viewer Restrictions (strict security enforcement)
        print("[+] Test case 14: Enforcing Strict Public Viewer Restrictions...")
        # A public viewer must NOT be able to access dataset management, settings, forecasts trigger, reports compile, or AI insights using sharing context.
        # Since we use fastapi routing, let's verify that without authentication header, all other endpoints raise 401 Unauthorized.
        
        # Disallowed actions check (should raise 401)
        disallowed_routes = [
            ("/api/datasets", "GET"),
            (f"/api/datasets/{dataset_owner.id}/dashboard/layout", "POST"),
            (f"/api/datasets/{dataset_owner.id}/dashboard/metadata", "PUT"),
            (f"/api/forecast/{dataset_owner.id}", "POST"),
            (f"/api/insights/{dataset_owner.id}", "POST"),
            (f"/api/reports/generate", "POST"),
        ]
        
        for route, method in disallowed_routes:
            if method == "GET":
                r = client.get(route)
            elif method == "POST":
                r = client.post(route, json={})
            elif method == "PUT":
                r = client.put(route, json={})
            assert r.status_code in [401, 307], f"Expected 401 for anonymous access to {route}. Got {r.status_code}"
            
        print("    All public viewer restrictions enforced successfully.")
        
        # Cleanup
        print("[+] Cleaning up test database records and mock files...")
        db.delete(dashboard_owner)
        if db.query(Dashboard).filter(Dashboard.id == dashboard_owner2.id).first():
            db.delete(dashboard_owner2)
        db.delete(profile_owner)
        db.delete(forecast_owner)
        db.delete(dataset_owner)
        db.delete(user_owner)
        db.delete(user_attacker)
        db.commit()
        
        if os.path.exists(mock_file_path):
            os.remove(mock_file_path)
            
        print("\nALL DASHBOARD SHARING TESTS COMPLETED SUCCESSFULLY! [PASSED]")
        
    except Exception as e:
        import traceback
        print(f"\n[!] TEST SUITE FAILED: {str(e)}")
        traceback.print_exc()
        # Cleanup to stay tidy
        try:
            db.rollback()
            if dashboard_owner and db.query(Dashboard).filter(Dashboard.id == dashboard_owner.id).first():
                db.delete(dashboard_owner)
            if dataset_owner and db.query(Dataset).filter(Dataset.id == dataset_owner.id).first():
                db.delete(dataset_owner)
            if user_owner and db.query(User).filter(User.id == user_owner.id).first():
                db.delete(user_owner)
            if user_attacker and db.query(User).filter(User.id == user_attacker.id).first():
                db.delete(user_attacker)
            db.commit()
            if 'mock_file_path' in locals() and os.path.exists(mock_file_path):
                os.remove(mock_file_path)
        except Exception:
            pass
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
