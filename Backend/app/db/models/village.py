"""
db/models/village.py

ORM model for Village (finest-grain admin level).
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Float, Text

from app.db.base import Base


class Village(Base):
    """Village — user-selectable location for detection."""

    __tablename__ = "village"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    taluka_id = Column(Integer, ForeignKey("taluka.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("district.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("state.id"), nullable=False)
    # Geographic boundary (GeoJSON string)
    geom_geojson = Column(Text, nullable=True)
    # Metadata
    population = Column(Integer, nullable=True)
    area_km2 = Column(Float, nullable=True)

    def __repr__(self) -> str:
        return f"<Village(id={self.id}, name={self.name})>"
