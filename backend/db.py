from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.config import Settings


def session_factory(settings: Settings) -> sessionmaker[Session]:
    kwargs = (
        {"connect_args": {"check_same_thread": False}}
        if settings.database_url.startswith("sqlite")
        else {}
    )
    engine = create_engine(settings.database_url, pool_pre_ping=True, **kwargs)
    return sessionmaker(engine, expire_on_commit=False)
