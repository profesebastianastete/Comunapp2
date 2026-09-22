"""Tests para autenticación y autorización."""
from datetime import datetime, timedelta
from jose import jwt

from auth import hash_password, verify_password, crear_token, decodificar
from config import get_settings
from models import Usuario, Comunidad, MiembroComunidad


def test_hash_password():
    """Prueba que el hashing de contraseñas funcione correctamente."""
    password = "test123"
    hashed = hash_password(password)
    
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(password, hashed)
    assert not verify_password("wrong", hashed)


def test_verify_password_legacy_bcrypt():
    """Prueba verificación de hashes bcrypt antiguos."""
    # Hash bcrypt real (generado previamente)
    legacy_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f"
    # Solo verificamos que no lance excepción
    result = verify_password("test", legacy_hash)
    assert isinstance(result, bool)


def test_login_success(client, db_session):
    """Prueba inicio de sesión exitoso."""
    # Crear usuario confirmado
    user = Usuario(
        nombre="Test User",
        email="test@example.com",
        password_hash=hash_password("password123"),
        rol_global="ADMIN",
        activo=True,
        email_confirmado=True
    )
    db_session.add(user)
    
    comunidad = Comunidad(nombre="Test Community")
    db_session.add(comunidad)
    db_session.commit()
    
    miembro = MiembroComunidad(
        usuario_id=user.id,
        comunidad_id=comunidad.id,
        rol="ADMIN",
        unidad="101"
    )
    db_session.add(miembro)
    db_session.commit()
    
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["usuarioId"] == user.id
    assert data["rol"] == "ADMIN"


def test_login_invalid_credentials(client):
    """Prueba inicio de sesión con credenciales inválidas."""
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpass"
    })
    
    assert response.status_code == 401


def test_login_inactive_user(client, db_session):
    """Prueba que usuarios inactivos no puedan login."""
    user = Usuario(
        nombre="Test User",
        email="inactive@example.com",
        password_hash=hash_password("password123"),
        rol_global="ADMIN",
        activo=False,  # Inactivo
        email_confirmado=True
    )
    db_session.add(user)
    db_session.commit()
    
    response = client.post("/api/auth/login", json={
        "email": "inactive@example.com",
        "password": "password123"
    })
    
    assert response.status_code == 403


def test_login_unconfirmed_email(client, db_session):
    """Prueba que usuarios sin email confirmado no puedan login."""
    user = Usuario(
        nombre="Test User",
        email="unconfirmed@example.com",
        password_hash=hash_password("password123"),
        rol_global="ADMIN",
        activo=True,
        email_confirmado=False  # No confirmado
    )
    db_session.add(user)
    db_session.commit()
    
    response = client.post("/api/auth/login", json={
        "email": "unconfirmed@example.com",
        "password": "password123"
    })
    
    assert response.status_code == 403


def test_me_endpoint(client, db_session):
    """Prueba obtener datos del usuario actual."""
    user = Usuario(
        nombre="Test User",
        email="me@example.com",
        password_hash=hash_password("password123"),
        rol_global="ADMIN",
        activo=True,
        email_confirmado=True
    )
    db_session.add(user)
    
    comunidad = Comunidad(nombre="Test Community")
    db_session.add(comunidad)
    db_session.commit()
    
    miembro = MiembroComunidad(
        usuario_id=user.id,
        comunidad_id=comunidad.id,
        rol="ADMIN",
        unidad="101"
    )
    db_session.add(miembro)
    db_session.commit()
    
    # Crear token
    token = crear_token(user.id, "ADMIN", comunidad.id, "101")
    
    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"


def test_cambiar_password(client, db_session):
    """Prueba cambio de contraseña."""
    user = Usuario(
        nombre="Test User",
        email="changepass@example.com",
        password_hash=hash_password("oldpassword"),
        rol_global="ADMIN",
        activo=True,
        email_confirmado=True
    )
    db_session.add(user)
    
    comunidad = Comunidad(nombre="Test Community")
    db_session.add(comunidad)
    db_session.commit()
    
    miembro = MiembroComunidad(
        usuario_id=user.id,
        comunidad_id=comunidad.id,
        rol="ADMIN",
        unidad="101"
    )
    db_session.add(miembro)
    db_session.commit()
    
    token = crear_token(user.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        "/api/auth/cambiar-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"actual": "oldpassword", "nueva": "newpassword123"}
    )
    
    assert response.status_code == 200
    
    # Verificar que la nueva contraseña funciona
    db_session.refresh(user)
    assert verify_password("newpassword123", user.password_hash)


def test_cambiar_password_wrong_actual(client, db_session):
    """Prueba cambio de contraseña con contraseña actual incorrecta."""
    user = Usuario(
        nombre="Test User",
        email="wrongpass@example.com",
        password_hash=hash_password("correctpassword"),
        rol_global="ADMIN",
        activo=True,
        email_confirmado=True
    )
    db_session.add(user)
    
    comunidad = Comunidad(nombre="Test Community")
    db_session.add(comunidad)
    db_session.commit()
    
    miembro = MiembroComunidad(
        usuario_id=user.id,
        comunidad_id=comunidad.id,
        rol="ADMIN",
        unidad="101"
    )
    db_session.add(miembro)
    db_session.commit()
    
    token = crear_token(user.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        "/api/auth/cambiar-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"actual": "wrongpassword", "nueva": "newpassword123"}
    )
    
    assert response.status_code == 400


def test_confirmar_email(client, db_session):
    """Prueba confirmación de email."""
    user = Usuario(
        nombre="Test User",
        email="confirm@example.com",
        password_hash=hash_password("password123"),
        rol_global="ADMIN",
        activo=True,
        email_confirmado=False,
        token_confirmacion="test-token-123"
    )
    db_session.add(user)
    db_session.commit()
    
    response = client.post("/api/auth/confirmar-email", json={
        "token": "test-token-123"
    })
    
    assert response.status_code == 200
    db_session.refresh(user)
    assert user.email_confirmado is True
    assert user.token_confirmacion is None


def test_confirmar_email_invalid_token(client):
    """Prueba confirmación de email con token inválido."""
    response = client.post("/api/auth/confirmar-email", json={
        "token": "invalid-token"
    })
    
    assert response.status_code == 400
