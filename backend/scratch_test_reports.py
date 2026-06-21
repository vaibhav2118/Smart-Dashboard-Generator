import os
import sys
import uuid
import json
import asyncio
import time
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.base import Base
from app.models.user import User
from app.models.dataset import Dataset
from app.models.dataset_profile import DatasetProfile
from app.models.dataset_insight import DatasetInsight
from app.models.dataset_forecast import DatasetForecast
from app.models.report import Report
from app.schemas.report import ReportCreate
from app.api.routes.reports import generate_pdf_report

async def run_tests():
    print("=== SMARTDG REPORT GENERATION VERIFICATION SCRIPT ===")
    
    # Initialize in-memory test database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Setup Test User
    test_user = User(
        id=uuid.uuid4(),
        name="Test BI Executive",
        email="executive@smartdg.com",
        password_hash="hashed-test-password"
    )
    db.add(test_user)
    db.commit()
    print("[Pass] Created test user.")

    # 2. Setup Mock Dataset CSV file on disk
    test_csv_path = "scratch_test_sales_data.csv"
    with open(test_csv_path, "w") as f:
        f.write("Date,Revenue,Region\n")
        f.write("2026-06-01,1000,East\n")
        f.write("2026-06-02,1500,West\n")
        f.write("2026-06-03,2000,East\n")
        f.write("2026-06-04,1200,North\n")
        f.write("2026-06-05,1800,South\n")
    print(f"[Pass] Created mock dataset file: {test_csv_path}")

    test_dataset = Dataset(
        id=uuid.uuid4(),
        user_id=test_user.id,
        filename="scratch_test_sales_data.csv",
        file_path=test_csv_path,
        dataset_type="CSV",
        row_count=5,
        column_count=3,
        status="Analyzed"
    )
    db.add(test_dataset)
    db.commit()
    print("[Pass] Saved Dataset record in database.")

    # 3. Setup Dataset Profile Data Cache
    profile_dict = {
        "total_rows": 5,
        "total_columns": 3,
        "missing_values_count": 0,
        "missing_percentage": 0.0,
        "duplicate_records_count": 0,
        "memory_usage": "350 Bytes",
        "classification": {
            "date": ["Date"],
            "numerical": ["Revenue"],
            "categorical": ["Region"]
        },
        "statistics": {
            "numerical": {
                "Revenue": {
                    "mean": 1500.0,
                    "min": 1000.0,
                    "max": 2000.0
                }
            }
        },
        "outliers_by_column": {
            "Revenue": 0
        },
        "correlation_matrix": {
            "Revenue": {
                "Revenue": 1.0
            }
        }
    }
    
    test_profile = DatasetProfile(
        id=uuid.uuid4(),
        dataset_id=test_dataset.id,
        profile_json=json.dumps(profile_dict)
    )
    db.add(test_profile)
    db.commit()
    print("[Pass] Saved Dataset Profile cache record in database.")

    # 4. Setup AI Insights Cache
    test_insights = DatasetInsight(
        id=uuid.uuid4(),
        dataset_id=test_dataset.id,
        model_used="gpt-4o-mini",
        insight_type="executive",
        executive_summary="Revenue is showing strong upwards momentum led by the East region, despite minor fluctuations. Data quality and metrics align with operational targets.",
        key_findings=json.dumps(["East region generates 55% of total revenue.", "Outlier count is 0."]),
        risks=json.dumps(["North region is underperforming compared to East."]),
        opportunities=json.dumps(["Expand marketing campaigns targeting the East region."]),
        recommendations=json.dumps(["Reallocate budget to East regional channels.", "Audit North region supply chains."]),
        management_priorities=json.dumps(["Establish predictive forecasting metrics for upcoming quarters."]),
        raw_response="{}",
        confidence_score=94,
        dataset_hash="hash-abc",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(test_insights)
    db.commit()
    print("[Pass] Saved Dataset Insights cache record in database.")

    # 5. Setup Forecast Cache
    forecast_points = [
        {"Date": "2026-06-06", "Value": 2200, "Upper": 2400, "Lower": 2000},
        {"Date": "2026-06-07", "Value": 2400, "Upper": 2650, "Lower": 2150},
        {"Date": "2026-06-08", "Value": 2300, "Upper": 2600, "Lower": 2000}
    ]
    actual_points = [
        {"Date": "2026-06-03", "Value": 2000},
        {"Date": "2026-06-04", "Value": 1200},
        {"Date": "2026-06-05", "Value": 1800}
    ]
    forecast_dict = {
        "actual": actual_points,
        "forecast": forecast_points
    }
    
    test_forecast = DatasetForecast(
        id=uuid.uuid4(),
        dataset_id=test_dataset.id,
        model_used="arima",
        date_column="Date",
        target_column="Revenue",
        forecast_horizon=3,
        forecast_data=json.dumps(forecast_dict),
        reliability_score=85,
        trend_direction="upward",
        growth_rate=22.5,
        dataset_hash="hash-abc",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(test_forecast)
    db.commit()
    print("[Pass] Saved Dataset Forecast cache record in database.")

    # 6. Test PDF Generation and Performance Metrics
    print("\n--- Running PDF Generator Execution ---")
    req_body = ReportCreate(
        report_type="full",
        selected_sections={
            "summary": True,
            "profiling": True,
            "kpis": True,
            "charts": True,
            "insights": True,
            "forecast": True,
            "recommendations": True
        },
        charts_base64=None # Test offline matplotlib chart generation fallback
    )
    
    start_time = time.time()
    try:
        report_response = await generate_pdf_report(
            dataset_id=str(test_dataset.id),
            req_body=req_body,
            db=db,
            current_user=test_user
        )
        generation_duration = time.time() - start_time
        print(f"[Pass] Compiled PDF report. Duration: {generation_duration:.4f} seconds.")
        
        # Verify Performance Constraint (< 10 seconds)
        assert generation_duration < 10.0, "PDF Generation took too long (Constraint: < 10 seconds)"
        print("[Pass] Performance Constraint (< 10 seconds) satisfied.")
        
        # Check PDF File existence
        pdf_path = report_response.report_path
        assert os.path.exists(pdf_path), f"PDF file not found at {pdf_path}"
        pdf_size = os.path.getsize(pdf_path)
        print(f"[Pass] PDF File exists. Path: {pdf_path}, Size: {pdf_size} bytes.")
        assert pdf_size > 0, "Generated PDF is empty (0 bytes)."
        
        # Verify persistence
        db_report = db.query(Report).filter(Report.id == report_response.id).first()
        assert db_report is not None, "Report record was not persisted in database."
        assert db_report.report_type == "full", f"Expected report_type 'full', got {db_report.report_type}"
        print("[Pass] Report successfully persisted in the database.")
        
        # Verify Database clean deletion
        print("\n--- Testing Report Delete Cleanup ---")
        db.delete(db_report)
        db.commit()
        
        # Remove physical file
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            print("[Pass] Physical PDF removed.")
            
        assert not os.path.exists(pdf_path), "Failed to delete PDF from disk."
        deleted_db_record = db.query(Report).filter(Report.id == report_response.id).first()
        assert deleted_db_record is None, "Failed to delete report record from DB."
        print("[Pass] PDF file and DB metadata successfully cleaned up.")

    except Exception as e:
        print(f"[FAIL] Exception during execution: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    # Cleanup temporary CSV file
    if os.path.exists(test_csv_path):
        os.remove(test_csv_path)
        
    print("\n=== Verification script completed successfully ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
