from fastapi import APIRouter, UploadFile, File

router = APIRouter(
    prefix="/images",
    tags=["Images"]
)


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):

    return {
        "filename": file.filename,
        "content_type": file.content_type
    }