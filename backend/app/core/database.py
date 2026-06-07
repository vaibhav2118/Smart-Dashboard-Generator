from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger("uvicorn.error")

try:
    # Attempt to connect to PostgreSQL with a 2-second timeout
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, pool_pre_ping=True, connect_args={'connect_timeout': 2})
    with engine.connect() as conn:
        pass
    logger.info("Successfully connected to PostgreSQL database.")
except Exception as e:
    logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite local database: sqlite:///./smartdg.db")
    engine = create_engine("sqlite:///./smartdg.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
