"""
Main Application Entry Point for Ahh-Silance JEE Evaluation Backend.

Mounts all 9 modular pipeline routers under /api/v1, configures CORS,
and provides root health-check and metadata endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings

# Import the 9 modular routers
from backend.routers.s1_ingestion_router import router as s1_router
from backend.routers.s2_preprocessing_router import router as s2_router
from backend.routers.s3_layout_router import router as s3_router
from backend.routers.s4_extraction_router import router as s4_router
from backend.routers.s5_answer_key_router import router as s5_router
from backend.routers.s6_alignment_router import router as s6_router
from backend.routers.s7_scoring_router import router as s7_router
from backend.routers.s8_analytics_router import router as s8_router
from backend.routers.s9_evaluation_router import router as s9_router
from backend.routers.auth_router import router as auth_router


def create_app() -> FastAPI:
    """
    Initializes and configures the FastAPI application instance.
    """
    app = FastAPI(
        title=settings.app_name,
        description="Automated High-Precision JEE Test Paper and OMR Sheet Evaluation Platform",
        version="1.0.0"
    )

    # Enable CORS for frontend/client integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount the 9 pipeline routers
    prefix = settings.api_prefix
    app.include_router(s1_router, prefix=prefix)
    app.include_router(s2_router, prefix=prefix)
    app.include_router(s3_router, prefix=prefix)
    app.include_router(s4_router, prefix=prefix)
    app.include_router(s5_router, prefix=prefix)
    app.include_router(s6_router, prefix=prefix)
    app.include_router(s7_router, prefix=prefix)
    app.include_router(s8_router, prefix=prefix)
    app.include_router(s9_router, prefix=prefix)
    app.include_router(auth_router, prefix=prefix)

    @app.get("/health", tags=["System"])
    async def health_check() -> dict:
        """
        Health check endpoint confirming backend operational status.
        """
        return {
            "status": "HEALTHY",
            "service": settings.app_name,
            "version": "1.0.0",
            "pipeline_stages": 9
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
