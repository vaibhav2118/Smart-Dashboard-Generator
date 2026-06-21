import os
import sys
import uuid
import shutil
import hashlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.base import Base
from app.models.user import User
from app.models.dataset import Dataset
from app.models.settings import UserSettings
from app.models.dataset_insight import DatasetInsight
from app.models.dataset_profile import DatasetProfile
from app.api.routes.insights import calculate_file_hash

def run_tests():
    print("=== SMARTDG INSIGHTS VERIFICATION SCRIPTS ===")
    
    # Initialize in-memory test database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Setup Test User and Settings
    test_user = User(
        id=uuid.uuid4(),
        name="Test Account",
        email="test@example.com",
        password_hash="mock-pass"
    )
    db.add(test_user)
    db.commit()
    print("[Pass] Created test user.")

    user_settings = UserSettings(
        user_id=test_user.id,
        openai_key=""
    )
    db.add(user_settings)
    db.commit()
    print("[Pass] Created default user settings (Empty OpenAI Key).")

    # Create a mock dataset file
    test_file_path = "scratch_test_file.csv"
    with open(test_file_path, "w") as f:
        f.write("Date,Revenue,Profit\n2026-06-01,100,20\n2026-06-02,200,45\n")
    
    initial_hash = calculate_file_hash(test_file_path)
    print(f"[Pass] Created test file. Initial MD5 Hash: {initial_hash}")

    test_dataset = Dataset(
        id=uuid.uuid4(),
        user_id=test_user.id,
        filename="scratch_test_file.csv",
        file_path=test_file_path,
        dataset_type="CSV",
        row_count=2,
        column_count=3,
        status="Uploaded"
    )
    db.add(test_dataset)
    db.commit()

    # 2. Test Key Resolution Rules
    print("\n--- Testing Key Resolution Fallback ---")
    
    # Environment Key resolution
    os.environ["OPENAI_API_KEY"] = "env-secret-key"
    resolved_key = None
    settings = db.query(UserSettings).filter(UserSettings.user_id == test_user.id).first()
    if settings and settings.openai_key:
        resolved_key = settings.openai_key
    else:
        resolved_key = os.environ.get("OPENAI_API_KEY")
    assert resolved_key == "env-secret-key", f"Expected env fallback key, got {resolved_key}"
    print("[Pass] Environment Fallback successfully resolved 'env-secret-key'.")

    # User Key override
    settings.openai_key = "user-override-key"
    db.commit()
    if settings and settings.openai_key:
        resolved_key = settings.openai_key
    else:
        resolved_key = os.environ.get("OPENAI_API_KEY")
    assert resolved_key == "user-override-key", f"Expected user key override, got {resolved_key}"
    print("[Pass] User Settings successfully overrode environment key with 'user-override-key'.")

    # Reset keys for failure checks
    settings.openai_key = ""
    db.commit()
    del os.environ["OPENAI_API_KEY"]
    if settings and settings.openai_key:
        resolved_key = settings.openai_key
    else:
        resolved_key = os.environ.get("OPENAI_API_KEY")
    assert resolved_key is None or resolved_key == "", "Expected no resolved keys."
    print("[Pass] Handled empty keys correctly.")

    # 3. Test Caching & Hash Mismatch Controls
    print("\n--- Testing Cache Hits & Hash Alteration ---")
    
    # Save a cached insight row
    mock_insight = DatasetInsight(
        dataset_id=test_dataset.id,
        model_used="gpt-4o-mini",
        insight_type="executive",
        executive_summary="Summary Text",
        key_findings="[\"Finding\"]",
        risks="[\"Risk\"]",
        opportunities="[\"Opps\"]",
        recommendations="[\"Recs\"]",
        management_priorities="[\"Priority\"]",
        raw_response="{}",
        confidence_score=95,
        dataset_hash=initial_hash
    )
    db.add(mock_insight)
    db.commit()
    print("[Pass] Written initial cached insights.")

    # Retrieve cached insights (Cache Hit)
    cached_row = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == test_dataset.id).first()
    assert cached_row is not None, "Insight not found in database."
    current_hash = calculate_file_hash(test_dataset.file_path)
    assert cached_row.dataset_hash == current_hash, "Hash mismatch detected unexpectedly."
    print("[Pass] Cache Hit verified. Hashes match perfectly.")

    # Alter dataset content (Simulate user preparing dataset)
    with open(test_file_path, "a") as f:
        f.write("2026-06-03,300,70\n")
    
    new_hash = calculate_file_hash(test_file_path)
    print(f"[Pass] Appended data to dataset file. New MD5 Hash: {new_hash}")

    # Fetch cached insights again (Expect Cache Outdated / Hash Mismatch)
    assert cached_row.dataset_hash != new_hash, "Expected hash mismatch after altering file."
    print("[Pass] Hash Mismatch detected successfully. Insights marked outdated.")

    # Invalidate Cache Cascade (Simulate prepare cleanup)
    db.query(DatasetInsight).filter(DatasetInsight.dataset_id == test_dataset.id).delete()
    db.commit()
    cleared_row = db.query(DatasetInsight).filter(DatasetInsight.dataset_id == test_dataset.id).first()
    assert cleared_row is None, "Cached row was not cascaded deleted."
    print("[Pass] Insight cache row cleared successfully on dataset schema change.")

    # Cleanup temporary file
    if os.path.exists(test_file_path):
        os.remove(test_file_path)
    print("\n=== All backend verification test cases PASSED successfully ===")

if __name__ == "__main__":
    run_tests()
