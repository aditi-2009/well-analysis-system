"""
db/models/district.py

ORM model for District (admin level 2).
"""

from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.base import Base


class District(Base):
    """Administrative district (e.g., Wardha)."""

    __tablename__ = "district"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    state_id = Column(Integer, ForeignKey("state.id"), nullable=False)
    code = Column(String(10), nullable=True)

    def __repr__(self) -> str:
        return f"<District(id={self.id}, name={self.name}, state_id={self.state_id})>"
