from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, datasets, settings as settings_routes, reports as reports_routes
from app.core.config import settings
from app.core.database import engine
from app.models import Base

# Generate database tables automatically on app startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(settings_routes.router, prefix="/api/settings", tags=["settings"])
app.include_router(reports_routes.router, prefix="/api/reports", tags=["reports"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
