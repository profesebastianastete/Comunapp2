"""Elimina las comunidades demo (y sus datos) de la base.

El seed ya no crea demos, pero las que quedaron sembradas en Railway siguen en
PostgreSQL. Este script las borra para partir con comunidades reales.

Uso (con el .venv activo, dentro de backend/):
    python3 purge_demo.py --si
        Borra las comunidades demo: Los Álamos, Torres del Parque.
    python3 purge_demo.py --todo --si
        Borra TODAS las comunidades (cuidado: deja solo al superadmin).

Sin el flag --si no hace nada (protección contra ejecuciones accidentales).
"""
import sys

from database import SessionLocal, engine, Base
from models import (Aviso, Cobro, Comunidad, Factura, MiembroComunidad, Movimiento,
                    Pago, RegistroAcceso, Reserva, Suscripcion, Usuario, Votacion)

NOMBRES_DEMO = {"Los Álamos", "Torres del Parque"}


def main() -> None:
    args = sys.argv[1:]
    if "--si" not in args:
        print("No se hizo nada. Confirma con:  python3 purge_demo.py --si")
        print("(o --todo --si para borrar TODAS las comunidades)")
        return

    Base.metadata.create_all(bind=engine)
    s = SessionLocal()
    try:
        q = s.query(Comunidad)
        if "--todo" not in args:
            q = q.filter(Comunidad.nombre.in_(NOMBRES_DEMO))
        comunidades = q.all()
        if not comunidades:
            print("No hay comunidades que borrar.")
            return

        ids = [c.id for c in comunidades]
        # Borra los datos asociados (multi-tenant por comunidad_id)
        for modelo in (Cobro, Pago, Movimiento, Aviso, Reserva, Votacion,
                       RegistroAcceso, Suscripcion, Factura, MiembroComunidad):
            s.query(modelo).filter(modelo.comunidad_id.in_(ids)).delete(synchronize_session=False)
        for c in comunidades:
            print("  Borrando comunidad:", c.nombre)
            s.delete(c)
        s.commit()
        print("Listo. Se eliminaron %d comunidad(es) demo y sus datos." % len(ids))
        print("Quedan %d usuario(s) y %d comunidad(es)." % (
            s.query(Usuario).count(), s.query(Comunidad).count()))
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


if __name__ == "__main__":
    main()
