from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import ALGORITHM
from app.models.user import User
from app.schemas.token import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Support mock token bypass for local development & guest demo workflow
    if token == "mock-jwt-token":
        guest_email = "guest@example.com"
        user = db.query(User).filter(User.email == guest_email).first()
        if not user:
            user = User(
                name="Guest User",
                email=guest_email,
                password_hash="mock-password-hash",
                is_admin=False
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    # Here we could add logic to check if user is active, etc.
    return current_user

import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, requests_limit: int = 5, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history = defaultdict(list)
        
    def __call__(self, current_user: User = Depends(get_current_user)):
        user_id = str(current_user.id)
        now = time.time()
        
        # Clean history to keep only timestamps in the current window
        user_history = self.history[user_id]
        self.history[user_id] = [t for t in user_history if now - t < self.window_seconds]
        
        if len(self.history[user_id]) >= self.requests_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {self.requests_limit} requests per {self.window_seconds} seconds are allowed."
            )
            
        self.history[user_id].append(now)
        return current_user

# Pre-defined rate limiters for specific operations
ai_rate_limiter = RateLimiter(requests_limit=5, window_seconds=60)
forecast_rate_limiter = RateLimiter(requests_limit=5, window_seconds=60)
report_rate_limiter = RateLimiter(requests_limit=5, window_seconds=60)
