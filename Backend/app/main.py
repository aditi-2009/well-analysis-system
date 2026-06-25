from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.wells import router as wells_router

app = FastAPI(
    title="Automated Agricultural Well Detection System",
    version="0.1.0"
)

app.include_router(health_router)
app.include_router(wells_router)


@app.get("/")
def root():
    return {
        "message": "Well Detection Backend Running"
    }