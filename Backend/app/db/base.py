"""
db/base.py

SQLAlchemy setup: Base (all ORM models inherit from this) and engine
(connection to PostgreSQL).

WHY THIS FILE EXISTS
-----------------------
Every SQLAlchemy ORM model (User, Prediction, SatelliteImage, etc.)
must inherit from Base. We create it once here so all models use the
same Base. The engine is the actual connection to PostgreSQL.

WHO IMPORTS THIS FILE
------------------------
db/session.py (imports engine, creates SessionLocal)
db/models/*.py (imports Base, inherits from it)

WHAT THIS FILE IMPORTS
------------------------
sqlalchemy (third-party), app.core.config (get_settings)
"""

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base

from app.core.config import get_settings

settings = get_settings()

# Create the SQLAlchemy engine (connection pool to PostgreSQL)
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Print SQL queries to console if DEBUG=True
    pool_pre_ping=True,
)

# Base class all ORM models inherit from
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
Base = declarative_base(metadata=MetaData(naming_convention=NAMING_CONVENTION))
