"""
scripts/create_admin.py

Create an admin user for testing.

Run:
    python scripts/create_admin.py
"""

import logging
import getpass
# from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models.user import User
from app.auth.password import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_admin_user(email: str, password: str) -> None:
    """Create an admin user (email is stored lowercase)."""
    email = email.strip().lower()
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            logger.info("Admin user already exists: %s", email)
            return
        db.add(
            User(
                email=email,
                hashed_password=hash_password(password),
                full_name="Admin User",
                is_active=True,
                is_admin=True,
            )
        )
        db.commit()
        logger.info("Admin user created: %s", email)  # never log the password
    except Exception as e:
        logger.error("Failed to create admin: %s", e)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    admin_email = input("Admin email: ")
    admin_password = getpass.getpass("Password (min 8 chars): ")
    create_admin_user(admin_email, admin_password)
