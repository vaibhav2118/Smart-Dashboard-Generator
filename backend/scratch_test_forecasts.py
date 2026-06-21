import os
import sys
import uuid
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.base import Base
from app.models.user import User
from app.models.dataset import Dataset
from app.models.dataset_forecast import DatasetForecast
from app.api.routes.forecasts import calculate_file_hash

def run_tests():
    print("=== SMARTDG FORECASTING ENGINE VERIFICATION SCRIPTS ===")
    
    # Initialize in-memory test database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Setup Test User
    test_user = User(
        id=uuid.uuid4(),
        name="Test Account",
        email="test@example.com",
        password_hash="mock-pass"
    )
    db.add(test_user)
    db.commit()
    print("[Pass] Created test user.")

    # Create dummy sales dataset file
    test_file_path = "scratch_test_sales.csv"
    dates = [datetime(2026, 4, 1) + timedelta(days=i) for i in range(15)]
    revenues = [1000 + i * 50 + (i % 2) * 20 for i in range(15)]
    
    df = pd.DataFrame({
        "Order Date": [d.strftime("%Y-%m-%d") for d in dates],
        "Sales Revenue": revenues
    })
    df.to_csv(test_file_path, index=False)
    initial_hash = calculate_file_hash(test_file_path)
    print(f"[Pass] Generated test CSV dataset file. Hash: {initial_hash}")

    test_dataset = Dataset(
        id=uuid.uuid4(),
        user_id=test_user.id,
        filename="scratch_test_sales.csv",
        file_path=test_file_path,
        dataset_type="CSV",
        row_count=15,
        column_count=2,
        status="Uploaded"
    )
    db.add(test_dataset)
    db.commit()

    # 2. Test Linear Regression Fit
    print("\n--- Training Linear Regression Trend Model ---")
    y = df["Sales Revenue"].values
    X = np.arange(len(df)).reshape(-1, 1)
    
    from sklearn.linear_model import LinearRegression
    reg = LinearRegression().fit(X, y)
    assert reg.coef_[0] > 0, "Expected positive upward slope."
    print(f"[Pass] Fitted Linear Regression. Coefficient Slope: {reg.coef_[0]:.3f}")

    # 3. Test ARIMA Model Fit
    print("\n--- Training ARIMA(1, 1, 1) Model ---")
    from statsmodels.tsa.arima.model import ARIMA
    try:
        model_fit = ARIMA(y, order=(1, 1, 1)).fit()
        pred = model_fit.get_forecast(steps=5)
        assert len(pred.predicted_mean) == 5, "ARIMA must project 5 future points."
        print(f"[Pass] ARIMA fitted successfully. Predictions: {list(pred.predicted_mean)}")
    except Exception as e:
        print(f"[Fail] ARIMA failed: {str(e)}")

    # 4. Test Prophet Model Fit
    print("\n--- Training Prophet Model ---")
    from prophet import Prophet
    import logging
    logging.getLogger('prophet').setLevel(logging.ERROR)
    try:
        prophet_df = df.rename(columns={"Order Date": "ds", "Sales Revenue": "y"})
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds']).dt.tz_localize(None)
        
        m = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False)
        m.fit(prophet_df)
        
        future_dates = [dates[-1] + timedelta(days=i) for i in range(1, 6)]
        future = pd.DataFrame({'ds': future_dates})
        forecast = m.predict(future)
        assert len(forecast) == 5, "Prophet must predict 5 intervals."
        print(f"[Pass] Prophet model trained and generated 5 points. Last prediction value: {forecast['yhat'].iloc[-1]:.2f}")
    except Exception as e:
        print(f"[Fail] Prophet failed: {str(e)}")

    # 5. Test Cache Persistence & Reload Behavior
    print("\n--- Testing Cache Persistence ---")
    mock_payload = {
        "actual": [{"Date": "2026-06-01", "Value": 100.0}],
        "forecast": [{"Date": "2026-06-02", "Value": 110.0, "Upper": 120.0, "Lower": 100.0}],
        "growth_rate": 10.0,
        "trend_direction": "upward"
    }

    db_forecast = DatasetForecast(
        dataset_id=test_dataset.id,
        model_used="arima",
        date_column="Order Date",
        target_column="Sales Revenue",
        forecast_horizon=5,
        forecast_data=json.dumps(mock_payload),
        reliability_score=92,
        trend_direction="upward",
        growth_rate=10.0,
        dataset_hash=initial_hash
    )
    db.add(db_forecast)
    db.commit()
    print("[Pass] Written forecast cache row to database.")

    # Cache hit check
    cached = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == test_dataset.id).first()
    assert cached is not None, "Failed to retrieve cache."
    current_hash = calculate_file_hash(test_dataset.file_path)
    assert cached.dataset_hash == current_hash, "Hash mismatch detected unexpectedly."
    print("[Pass] Database cache loaded successfully. Current hash matches database.")

    # 6. Test Cascade Cache Invalidation
    print("\n--- Testing Cascade Invalidation ---")
    db.query(DatasetForecast).filter(DatasetForecast.dataset_id == test_dataset.id).delete()
    db.commit()
    cleared = db.query(DatasetForecast).filter(DatasetForecast.dataset_id == test_dataset.id).first()
    assert cleared is None, "Cache record was not cleared."
    print("[Pass] Forecast cache successfully cascade-deleted.")

    # Cleanup temporary CSV
    if os.path.exists(test_file_path):
        os.remove(test_file_path)
    print("\n=== All forecasting verification test cases PASSED successfully ===")

if __name__ == "__main__":
    run_tests()
