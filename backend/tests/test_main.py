"""Tests básicos de los endpoints del sistema."""
from models import Usuario, Comunidad


def test_health_check(client):
    """Prueba el endpoint de health check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "comunapp-api"


def test_root_endpoint(client):
    """Prueba el endpoint raíz."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "ComunApp API"
    assert data["docs"] == "/docs"
    assert data["health"] == "/health"


def test_diagnostico_endpoint(client, db_session):
    """Prueba el endpoint de diagnóstico con DB vacía."""
    response = client.get("/api/diagnostico")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["usuarios"] == 0
    assert data["comunidades"] == 0
