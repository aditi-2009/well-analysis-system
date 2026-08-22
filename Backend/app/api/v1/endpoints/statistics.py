from fastapi import APIRouter

router = APIRouter(
    prefix="/statistics",
    tags=["Statistics"]
)


@router.get("/")
def get_statistics():

    return {
        "total_wells": 250,
        "districts": 10,
        "villages": 85
    }