"""
db/models/user.py

ORM model for users (authentication).

WHO IMPORTS THIS FILE: db/models/__init__.py, auth/dependencies.py,
api/v1/endpoints/auth.py, scripts/create_admin.py.
WHAT IT IMPORTS: only db/base.py (Base).
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
    func,
    text,
)

from app.db.base import Base


class User(Base):
    """System user with JWT authentication."""

    __tablename__ = "users"
    __table_args__ = (
        # The DATABASE itself refuses mixed-case emails, so "A@x.com" and
        # "a@x.com" can never become two accounts, even via raw SQL.
        CheckConstraint("email = lower(email)", name="email_lowercase"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(500), nullable=False)
    full_name = Column(String(255), nullable=True)
    mobile = Column(String(20), nullable=True)
    organization = Column(String(255), nullable=True)

    # NOT NULL + server_default: a row can never have NULL here.
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    is_admin = Column(Boolean, nullable=False, server_default=text("false"))

    # timezone=True -> PostgreSQL "timestamptz": stored unambiguously in UTC.
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
