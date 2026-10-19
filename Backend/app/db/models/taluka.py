"""
db/models/taluka.py

ORM model for Taluka (admin level 3).
"""

from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.base import Base


class Taluka(Base):
    """Administrative taluka (subdivision of district)."""

    __tablename__ = "taluka"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    district_id = Column(Integer, ForeignKey("district.id"), nullable=False)
    code = Column(String(10), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Taluka(id={self.id}, name={self.name}, district_id={self.district_id})>"
        )
