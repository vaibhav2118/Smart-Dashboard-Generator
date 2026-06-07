import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from app.core.config import settings

try:
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, connect_args={'connect_timeout': 3})
    conn = engine.connect()
    print("SUCCESS: Connected to database")
    conn.close()
except Exception as e:
    print("ERROR:", str(e))
