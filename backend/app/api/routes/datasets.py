import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.dataset import Dataset
import pandas as pd

router = APIRouter()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    allowed_extensions = [".csv", ".xls", ".xlsx"]
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are allowed.")
    
    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    with open(save_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    try:
        if ext == '.csv':
            df = pd.read_csv(save_path)
        else:
            df = pd.read_excel(save_path)
    except Exception as e:
        os.remove(save_path)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    row_count, col_count = df.shape
    
    new_dataset = Dataset(
        user_id=current_user.id,
        filename=file.filename,
        file_path=save_path,
        row_count=row_count,
        column_count=col_count,
        status="Raw"
    )
    
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    
    return {"message": "Dataset uploaded successfully", "dataset_id": new_dataset.id, "rows": row_count, "columns": col_count}

@router.get("/")
def get_datasets(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    return datasets
