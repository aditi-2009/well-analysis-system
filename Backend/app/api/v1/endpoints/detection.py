from fastapi import APIRouter

from app.services.detection_service import detect_wells

router = APIRouter(
    prefix="/wells",
    tags=["Wells"]
)


@router.get("/")
def get_wells():

    wells = detect_wells()

    return {
        "status": "success",
        "count": len(wells),
        "data": wells
    }