"""
db/session.py

Database session factory. FastAPI route handlers get a session via
dependency injection.

WHY THIS FILE EXISTS
-----------------------
SQLAlchemy requires a session (connection) per request. This creates
one SessionLocal factory that route handlers call to get a session.

WHO IMPORTS THIS FILE
------------------------
api/v1/endpoints/*.py (route handlers ask for a session via Depends())
services/*.py (services need DB access)

WHAT THIS FILE IMPORTS
------------------------
db/base.py (engine, Base), sqlalchemy.orm (sessionmaker)
"""

from sqlalchemy.orm import sessionmaker
from app.db.base import engine

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """
    Dependency injection function. FastAPI calls this for every request.
    Returns a database session that route handlers can use.

    Usage in a route handler:
        from app.db.session import get_db

        @app.post("/detect")
        def detect_wells(file: UploadFile, db: Session = Depends(get_db)):
            # Use db here: db.query(...), db.add(...), db.commit()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
