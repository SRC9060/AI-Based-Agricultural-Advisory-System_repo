import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///users.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    try:
        engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    except ValueError:
        engine_kwargs["pool_recycle"] = 1800

    pool_size = os.getenv("DB_POOL_SIZE")
    if pool_size is not None:
        try:
            engine_kwargs["pool_size"] = int(pool_size)
        except ValueError:
            pass

    max_overflow = os.getenv("DB_MAX_OVERFLOW")
    if max_overflow is not None:
        try:
            engine_kwargs["max_overflow"] = int(max_overflow)
        except ValueError:
            pass

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    """
    Standard FastAPI dependency that yields a database session and guarantees
    closure on success, early return, or unhandled exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
