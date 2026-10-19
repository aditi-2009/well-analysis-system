"""
ml/schemas.py

Model-agnostic raw detection (pixel space). Whatever model sits in
ml/bridge.py must produce this shape.
"""

from pydantic import BaseModel, Field


class PixelDetection(BaseModel):
    x1: float = Field(ge=0)
    y1: float = Field(ge=0)
    x2: float = Field(ge=0)
    y2: float = Field(ge=0)
    confidence: float = Field(ge=0, le=1)
    class_id: int = 0
    class_name: str = "well"
