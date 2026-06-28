import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import fastapi_app
from app.db.session import Base, get_db

# Use in-memory SQLite database for testing
DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Enforce foreign keys in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

@pytest.fixture(name="db")
def db_fixture():
    # Recreate tables before each test
    Base.metadata.create_all(bind=engine)
    connection = engine.connect()
    transaction = connection.begin()
    db = TestingSessionLocal(bind=connection)
    
    yield db
    
    db.close()
    transaction.rollback()
    connection.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(name="client")
def client_fixture(db):
    # Override get_db dependency
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as client:
        yield client
    fastapi_app.dependency_overrides.clear()
