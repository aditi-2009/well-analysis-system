"""
alembic/env.py

Alembic's runtime script: Alembic executes this file on every
"alembic <command>".

IMPORTS: app.core.config (database URL), app.db.base (Base),
app.db.models (registers every table with Base.metadata).
It deliberately does NOT import app.main, so GIS/ML/API import errors
can never block a migration.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.db.base import Base
import app.db.models  # noqa: F401  (side effect: registers all tables)

config = context.config

# 1) The database URL comes from the app's settings (.env), never from
#    alembic.ini. This MUST run before anything below reads
#    "sqlalchemy.url". "%" is doubled because Alembic's config parser
#    treats a single "%" specially (URL-encoded passwords contain it).
config.set_main_option(
    "sqlalchemy.url", get_settings().DATABASE_URL.replace("%", "%%")
)

# 2) Logging from alembic.ini. disable_existing_loggers=False keeps the
#    app's own loggers alive.
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# 3) What Alembic compares the real database against.
target_metadata = Base.metadata

# Tables Alembic must never create, alter or drop.
EXCLUDED_TABLES = {
    "spatial_ref_sys",  # owned by PostGIS
    "wells",  # replaced by detected_wells in phase 2
    "prediction",  # replaced by detection_jobs in phase 2
}


def include_object(obj, name, type_, reflected, compare_to):
    """Return False to hide an object from autogenerate."""
    if type_ == "table" and name in EXCLUDED_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    """'--sql' mode: print SQL, no database connection."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Normal mode: connect to PostgreSQL and run migrations."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
