"""
db/models/state.py

ORM model for State (admin level 1).
"""

from sqlalchemy import Column, Integer, String

from app.db.base import Base


class State(Base):
    """Administrative state (e.g., Maharashtra)."""

    __tablename__ = "state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(10), nullable=True)

    def __repr__(self) -> str:
        return f"<State(id={self.id}, name={self.name})>"
