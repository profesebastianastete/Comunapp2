"""Tests para endpoints de comunidad y cobranza."""
from datetime import date

from auth import hash_password, crear_token
from models import Usuario, Comunidad, MiembroComunidad, Cobro, Pago, Movimiento


def _setup_admin_user(db_session):
    """Configura un usuario ADMIN con una comunidad."""
    user = Usuario(
        nombre="Admin User",
        email="admin@example.com",
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
    
    return user, comunidad


def _setup_residente(db_session, comunidad_id):
    """Configura un usuario residente."""
    user = Usuario(
        nombre="Residente User",
        email="residente@example.com",
        password_hash=hash_password("password123"),
        rol_global=None,
        activo=True,
        email_confirmado=True
    )
    db_session.add(user)
    
    miembro = MiembroComunidad(
        usuario_id=user.id,
        comunidad_id=comunidad_id,
        rol="PROPIETARIO",
        unidad="102"
    )
    db_session.add(miembro)
    db_session.commit()
    
    return user


def test_datos_comunidad_success(client, db_session):
    """Prueba obtener datos de comunidad exitosamente."""
    user, comunidad = _setup_admin_user(db_session)
    token = crear_token(user.id, "ADMIN", comunidad.id, "101")
    
    response = client.get(
        f"/api/comunidades/{comunidad.id}/datos",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["comunidad"]["nombre"] == "Test Community"
    assert "miembros" in data
    assert "cobros" in data


def test_datos_comunidad_no_member(client, db_session):
    """Prueba acceso a comunidad sin ser miembro."""
    user, comunidad = _setup_admin_user(db_session)
    
    # Crear otra comunidad
    other_comunidad = Comunidad(nombre="Other Community")
    db_session.add(other_comunidad)
    db_session.commit()
    
    token = crear_token(user.id, "ADMIN", comunidad.id, "101")
    
    response = client.get(
        f"/api/comunidades/{other_comunidad.id}/datos",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403


def test_generar_cobros_mensual(client, db_session):
    """Prueba generación de cobros mensuales (rol ADMIN)."""
    user, comunidad = _setup_admin_user(db_session)
    
    # Agregar más unidades
    for unidad in ["102", "103"]:
        miembro = MiembroComunidad(
            usuario_id=user.id,
            comunidad_id=comunidad.id,
            rol="PROPIETARIO",
            unidad=unidad
        )
        db_session.add(miembro)
    db_session.commit()
    
    token = crear_token(user.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/cobros/generar",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "periodo": "2025-01",
            "monto": 50000,
            "motivo": "Gastos comunes"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["creados"] == 3  # 101, 102, 103
    assert data["periodo"] == "2025-01"
    
    # Verificar que se crearon los cobros
    cobros = db_session.query(Cobro).filter_by(comunidad_id=comunidad.id).all()
    assert len(cobros) == 3


def test_pagar_cobro_success(client, db_session):
    """Prueba pago de cobro exitoso."""
    admin, comunidad = _setup_admin_user(db_session)
    residente = _setup_residente(db_session, comunidad.id)
    
    # Crear un cobro
    cobro = Cobro(
        comunidad_id=comunidad.id,
        unidad="102",
        periodo="2025-01",
        concepto="Gastos comunes",
        monto=50000,
        vencimiento=date.today(),
        estado="PENDIENTE"
    )
    db_session.add(cobro)
    db_session.commit()
    
    token = crear_token(residente.id, "PROPIETARIO", comunidad.id, "102")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/pagos/cobro/{cobro.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    
    # Verificar que el cobro fue marcado como pagado
    db_session.refresh(cobro)
    assert cobro.estado == "PAGADO"
    
    # Verificar que se creó el pago y movimiento
    pago = db_session.query(Pago).filter_by(cobro_id=cobro.id).first()
    assert pago is not None
    
    movimiento = db_session.query(Movimiento).filter_by(
        comunidad_id=comunidad.id,
        tipo="INGRESO"
    ).first()
    assert movimiento is not None


def test_pagar_cobro_ya_pagado(client, db_session):
    """Prueba intentar pagar un cobro ya pagado."""
    admin, comunidad = _setup_admin_user(db_session)
    residente = _setup_residente(db_session, comunidad.id)
    
    cobro = Cobro(
        comunidad_id=comunidad.id,
        unidad="102",
        periodo="2025-01",
        concepto="Gastos comunes",
        monto=50000,
        vencimiento=date.today(),
        estado="PAGADO"  # Ya pagado
    )
    db_session.add(cobro)
    db_session.commit()
    
    token = crear_token(residente.id, "PROPIETARIO", comunidad.id, "102")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/pagos/cobro/{cobro.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400


def test_registrar_pago_admin(client, db_session):
    """Prueba registro de pago por administrador."""
    admin, comunidad = _setup_admin_user(db_session)
    
    cobro = Cobro(
        comunidad_id=comunidad.id,
        unidad="101",
        periodo="2025-01",
        concepto="Gastos comunes",
        monto=50000,
        vencimiento=date.today(),
        estado="PENDIENTE"
    )
    db_session.add(cobro)
    db_session.commit()
    
    token = crear_token(admin.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/pagos/registrar",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cobro_id": cobro.id,
            "metodo": "Transferencia",
            "folio": "FOLIO-123"
        }
    )
    
    assert response.status_code == 200
    
    db_session.refresh(cobro)
    assert cobro.estado == "PAGADO"


def test_crear_cobro_individual(client, db_session):
    """Prueba creación de cobro individual."""
    admin, comunidad = _setup_admin_user(db_session)
    
    token = crear_token(admin.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/cobros/individual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "unidad": "101",
            "motivo": "Multa por ruido",
            "monto": 25000,
            "fecha_vencimiento": "2025-02-01"
        }
    )
    
    assert response.status_code == 200
    
    cobros = db_session.query(Cobro).filter_by(
        comunidad_id=comunidad.id,
        concepto="Multa por ruido"
    ).all()
    assert len(cobros) == 1


def test_crear_cobro_unidad_inexistente(client, db_session):
    """Prueba crear cobro para unidad que no existe."""
    admin, comunidad = _setup_admin_user(db_session)
    token = crear_token(admin.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/cobros/individual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "unidad": "999",  # No existe
            "motivo": "Cobro prueba",
            "monto": 10000
        }
    )
    
    assert response.status_code == 404


def test_crear_movimiento(client, db_session):
    """Prueba creación de movimiento."""
    admin, comunidad = _setup_admin_user(db_session)
    token = crear_token(admin.id, "ADMIN", comunidad.id, "101")
    
    response = client.post(
        f"/api/comunidades/{comunidad.id}/movimientos",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "tipo": "EGRESO",
            "categoria": "Mantenimiento",
            "descripcion": "Reparación ascensor",
            "monto": 150000,
            "fecha": "2025-01-15"
        }
    )
    
    assert response.status_code == 200
    
    movimientos = db_session.query(Movimiento).filter_by(
        comunidad_id=comunidad.id,
        tipo="EGRESO"
    ).all()
    assert len(movimientos) == 1
