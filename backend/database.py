"""Conexión SQLAlchemy. Railway entrega DATABASE_URL (PostgreSQL)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import get_settings

s = get_settings()
url = s.database_url

# SQLite necesita check_same_thread; PostgreSQL no.
kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}

engine = create_engine(url, pool_pre_ping=True, **kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependencia de FastAPI: una sesión por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
