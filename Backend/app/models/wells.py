from pydantic import BaseModel


class Well(BaseModel):
    well_id: str
    latitude: float
    longitude: float
    confidence: float