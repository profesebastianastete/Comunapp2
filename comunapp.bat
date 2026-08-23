@echo off
chcp 65001 >nul
title ComunApp - Instalador y lanzador (backend Python)
cd /d "%~dp0"
setlocal

REM ============================================================
REM  COMUNAPP.BAT  -  Todo el backend en un solo archivo
REM  Crea la estructura, escribe el codigo Python (FastAPI +
REM  SQLAlchemy + SQLite/PostgreSQL + JWT), instala dependencias,
REM  siembra datos demo y lanza la API con uvicorn.
REM
REM  Uso: doble click, o ejecutar desde CMD. Requiere Python 3.10+
REM  (marcar "Add Python to PATH" al instalarlo).
REM ============================================================

:menu
cls
echo.
echo   ======================================================================
echo.
echo        C O M U N A P P   -   Instalador y lanzador (Windows)
echo        Administracion de condominios y edificios - API Python/FastAPI
echo.
echo   ======================================================================
echo.
echo        [1]  Instalar backend completo (primera vez)
echo        [2]  Iniciar API  (uvicorn en http://127.0.0.1:8000)
echo        [3]  Sembrar datos de demostracion
echo        [4]  Abrir documentacion Swagger
echo        [5]  Ver estado del proyecto
echo        [6]  Preparar frontend  (npm install, si existe en esta carpeta)
echo        [0]  Salir
echo.
set "op="
set /p op="   Elige una opcion y presiona Enter: "
if "%op%"=="1" goto instalar
if "%op%"=="2" goto iniciar
if "%op%"=="3" goto sembrar
if "%op%"=="4" goto docs
if "%op%"=="5" goto estado
if "%op%"=="6" goto frontend
if "%op%"=="0" goto fin
goto menu

REM ------------------------------------------------------------
REM  INSTALACION COMPLETA
REM ------------------------------------------------------------
:instalar
cls
echo.
echo   === Instalacion de ComunApp (backend Python) ===
echo.
where python >nul 2>nul
if errorlevel 1 goto sin_python
python --version
echo.
echo   [1/5] Python detectado.
if not exist backend mkdir backend
if not exist backend\routers mkdir backend\routers
echo   [2/5] Escribiendo archivos del proyecto...
call :escribir_requerimientos
call :escribir_env
call :escribir_database
call :escribir_models
call :escribir_auth
call :escribir_main
call :escribir_router_init
call :escribir_router_auth
call :escribir_router_finanzas
call :escribir_router_comunidad
call :escribir_seed
call :escribir_readme
echo          archivos creados en .\backend
echo   [3/5] Creando entorno virtual (.venv)...
python -m venv backend\.venv
call backend\.venv\Scripts\activate.bat
echo   [4/5] Instalando dependencias (puede tardar unos minutos)...
python -m pip install --upgrade pip --quiet
pip install -r backend\requirements.txt
echo   [5/5] Listo.
echo.
echo   Instalacion completa. Siguientes pasos sugeridos:
echo     - Opcion [3] para sembrar los datos demo
echo     - Opcion [2] para iniciar la API
echo.
pause
goto menu

REM ------------------------------------------------------------
REM  INICIAR API
REM ------------------------------------------------------------
:iniciar
if not exist backend\.venv\Scripts\activate.bat goto falta_instalar
call backend\.venv\Scripts\activate.bat
cd backend
cls
echo.
echo   ======================================================================
echo        ComunApp API en linea
echo        Base ....... http://127.0.0.1:8000
echo        Swagger ..... http://127.0.0.1:8000/docs
echo        Detener ..... Ctrl + C
echo   ======================================================================
echo.
python -m uvicorn main:app --host 127.0.0.1 --port 8000
cd ..
goto menu

REM ------------------------------------------------------------
REM  SEMBRAR DATOS DEMO
REM ------------------------------------------------------------
:sembrar
if not exist backend\.venv\Scripts\activate.bat goto falta_instalar
call backend\.venv\Scripts\activate.bat
cd backend
echo.
python seed.py
echo.
cd ..
pause
goto menu

REM ------------------------------------------------------------
REM  DOCUMENTACION SWAGGER
REM ------------------------------------------------------------
:docs
start "" "http://127.0.0.1:8000/docs"
goto menu

REM ------------------------------------------------------------
REM  ESTADO DEL PROYECTO
REM ------------------------------------------------------------
:estado
cls
echo.
echo   === Estado del proyecto ===
echo.
if exist backend (echo   [OK] Carpeta backend) else (echo   [--] Carpeta backend no existe - ejecuta la opcion 1)
if exist backend\.venv (echo   [OK] Entorno virtual .venv) else (echo   [--] Entorno virtual ausente - ejecuta la opcion 1)
if exist backend\comunapp.db (echo   [OK] Base de datos SQLite comunapp.db) else (echo   [--] Base de datos sin crear - se crea al iniciar la API)
if exist package.json (echo   [OK] Frontend detectado en esta carpeta) else (echo   [--] Sin frontend en esta carpeta)
echo.
where python >nul 2>nul && python --version
echo.
pause
goto menu

REM ------------------------------------------------------------
REM  PREPARAR FRONTEND
REM ------------------------------------------------------------
:frontend
if not exist package.json (
  echo.
  echo   No hay package.json en esta carpeta. Copia aqui el frontend primero.
  echo.
  pause
  goto menu
)
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo   npm no encontrado. Instala Node.js desde https://nodejs.org
  echo.
  pause
  goto menu
)
echo.
echo   Instalando dependencias del frontend...
call npm install
echo.
echo   Listo. Ejecuta "npm run dev" y abre http://localhost:5173
echo.
pause
goto menu

:sin_python
echo.
echo   No se encontro Python en el PATH.
echo   Descargalo de https://www.python.org/downloads/
echo   IMPORTANTE: marca "Add Python to PATH" durante la instalacion.
echo.
pause
goto menu

:falta_instalar
echo.
echo   Falta la instalacion. Ejecuta primero la opcion [1] del menu.
echo.
pause
goto menu

:fin
echo.
echo   Gracias por usar ComunApp.
timeout /t 2 >nul
exit /b 0

REM ============================================================
REM  SUBRUTINAS: cada una escribe un archivo del backend
REM ============================================================

:escribir_requerimientos
echo.fastapi> backend\requirements.txt
echo.uvicorn[standard]>> backend\requirements.txt
echo.sqlalchemy>> backend\requirements.txt
echo.pyjwt>> backend\requirements.txt
echo.python-dotenv>> backend\requirements.txt
echo.httpx>> backend\requirements.txt
echo.psycopg2-binary>> backend\requirements.txt
goto :eof

:escribir_env
if exist backend\.env goto :eof
echo.DATABASE_URL=sqlite:///./comunapp.db> backend\.env
echo.JWT_SECRET=cambia-este-secreto-en-produccion>> backend\.env
echo.MP_WEBHOOK_SECRET=mp-demo-secret>> backend\.env
echo.CORS_ORIGINS=http://localhost:5173,http://localhost:4173,http://localhost:3000>> backend\.env
goto :eof

:escribir_database
echo import os> backend\database.py
echo from dotenv import load_dotenv>> backend\database.py
echo from sqlalchemy import create_engine>> backend\database.py
echo from sqlalchemy.orm import sessionmaker>> backend\database.py
echo.>> backend\database.py
echo load_dotenv()>> backend\database.py
echo.>> backend\database.py
echo URL = os.getenv("DATABASE_URL", "sqlite:///./comunapp.db")>> backend\database.py
echo.>> backend\database.py
echo if URL.startswith("sqlite"):>> backend\database.py
echo     engine = create_engine(URL, connect_args={"check_same_thread": False})>> backend\database.py
echo else:>> backend\database.py
echo     engine = create_engine(URL, pool_pre_ping=True)>> backend\database.py
echo.>> backend\database.py
echo SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)>> backend\database.py
echo.>> backend\database.py
echo def db():>> backend\database.py
echo     sesion = SessionLocal()>> backend\database.py
echo     try:>> backend\database.py
echo         yield sesion>> backend\database.py
echo     finally:>> backend\database.py
echo         sesion.close()>> backend\database.py
goto :eof

:escribir_models
echo from datetime import datetime> backend\models.py
echo from uuid import uuid4>> backend\models.py
echo from sqlalchemy import (>> backend\models.py
echo     Column, String, Integer, Boolean, DateTime, Date, Numeric, Text,>> backend\models.py
echo     ForeignKey, UniqueConstraint,>> backend\models.py
echo )>> backend\models.py
echo from sqlalchemy.orm import declarative_base, relationship>> backend\models.py
echo.>> backend\models.py
echo Base = declarative_base()>> backend\models.py
echo.>> backend\models.py
echo def uid():>> backend\models.py
echo     return uuid4().hex>> backend\models.py
echo.>> backend\models.py
echo class Parcela(Base):>> backend\models.py
echo     __tablename__ = "parcelas">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     nombre = Column(String(120), nullable=False)>> backend\models.py
echo     direccion = Column(String(160), default="")>> backend\models.py
echo     ciudad = Column(String(80), default="")>> backend\models.py
echo     unidades = Column(Integer, default=24)>> backend\models.py
echo     creado = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo.>> backend\models.py
echo class Usuario(Base):>> backend\models.py
echo     __tablename__ = "usuarios">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     nombre = Column(String(120), nullable=False)>> backend\models.py
echo     email = Column(String(160), unique=True, nullable=False, index=True)>> backend\models.py
echo     password = Column(String(200), nullable=False)>> backend\models.py
echo     rol_global = Column(String(20), default="")>> backend\models.py
echo     activo = Column(Boolean, default=True)>> backend\models.py
echo     creado = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo     membresias = relationship("MiembroParcela", back_populates="usuario", cascade="all, delete-orphan")>> backend\models.py
echo.>> backend\models.py
echo class MiembroParcela(Base):>> backend\models.py
echo     __tablename__ = "miembros_parcela">> backend\models.py
echo     __table_args__ = (UniqueConstraint("usuario_id", "parcela_id", name="uq_miembro_parcela"),)>> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     usuario_id = Column(String(32), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False)>> backend\models.py
echo     rol = Column(String(20), nullable=False)>> backend\models.py
echo     unidad = Column(String(20), default="")>> backend\models.py
echo     usuario = relationship("Usuario", back_populates="membresias")>> backend\models.py
echo.>> backend\models.py
echo class Cobro(Base):>> backend\models.py
echo     __tablename__ = "cobros">> backend\models.py
echo     __table_args__ = (UniqueConstraint("parcela_id", "unidad", "periodo", "concepto", name="uq_cobro"),)>> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     unidad = Column(String(20), nullable=False)>> backend\models.py
echo     periodo = Column(String(7), nullable=False)>> backend\models.py
echo     concepto = Column(String(80), default="Gastos comunes")>> backend\models.py
echo     monto = Column(Numeric(12, 2), nullable=False)>> backend\models.py
echo     estado = Column(String(20), default="PENDIENTE")>> backend\models.py
echo     vencimiento = Column(Date, nullable=True)>> backend\models.py
echo     creado = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo.>> backend\models.py
echo class Pago(Base):>> backend\models.py
echo     __tablename__ = "pagos">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     cobro_id = Column(String(32), ForeignKey("cobros.id"), nullable=False)>> backend\models.py
echo     unidad = Column(String(20), nullable=False)>> backend\models.py
echo     monto = Column(Numeric(12, 2), nullable=False)>> backend\models.py
echo     metodo = Column(String(40), default="mercadopago")>> backend\models.py
echo     referencia = Column(String(80), default="")>> backend\models.py
echo     fecha = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo.>> backend\models.py
echo class Movimiento(Base):>> backend\models.py
echo     __tablename__ = "movimientos">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     fecha = Column(Date, nullable=False)>> backend\models.py
echo     tipo = Column(String(10), nullable=False)>> backend\models.py
echo     categoria = Column(String(80), default="")>> backend\models.py
echo     descripcion = Column(String(200), default="")>> backend\models.py
echo     monto = Column(Numeric(12, 2), nullable=False)>> backend\models.py
echo     conciliado = Column(Boolean, default=False)>> backend\models.py
echo.>> backend\models.py
echo class Aviso(Base):>> backend\models.py
echo     __tablename__ = "avisos">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     titulo = Column(String(160), nullable=False)>> backend\models.py
echo     cuerpo = Column(Text, default="")>> backend\models.py
echo     tipo = Column(String(20), default="INFORMATIVO")>> backend\models.py
echo     autor = Column(String(120), default="")>> backend\models.py
echo     creado = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo.>> backend\models.py
echo class Reserva(Base):>> backend\models.py
echo     __tablename__ = "reservas">> backend\models.py
echo     __table_args__ = (UniqueConstraint("parcela_id", "area", "fecha", "bloque", name="uq_reserva"),)>> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     area = Column(String(80), nullable=False)>> backend\models.py
echo     fecha = Column(Date, nullable=False)>> backend\models.py
echo     bloque = Column(String(20), nullable=False)>> backend\models.py
echo     unidad = Column(String(20), default="")>> backend\models.py
echo     residente = Column(String(120), default="")>> backend\models.py
echo.>> backend\models.py
echo class Votacion(Base):>> backend\models.py
echo     __tablename__ = "votaciones">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     titulo = Column(String(160), nullable=False)>> backend\models.py
echo     pregunta = Column(Text, default="")>> backend\models.py
echo     opciones = Column(Text, default="")>> backend\models.py
echo     abierta = Column(Boolean, default=True)>> backend\models.py
echo     creado = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo.>> backend\models.py
echo class Voto(Base):>> backend\models.py
echo     __tablename__ = "votos">> backend\models.py
echo     __table_args__ = (UniqueConstraint("votacion_id", "unidad", name="uq_voto"),)>> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     votacion_id = Column(String(32), ForeignKey("votaciones.id", ondelete="CASCADE"), nullable=False)>> backend\models.py
echo     unidad = Column(String(20), nullable=False)>> backend\models.py
echo     opcion = Column(String(120), nullable=False)>> backend\models.py
echo     fecha = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo.>> backend\models.py
echo class RegistroAcceso(Base):>> backend\models.py
echo     __tablename__ = "registros_acceso">> backend\models.py
echo     id = Column(String(32), primary_key=True, default=uid)>> backend\models.py
echo     parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)>> backend\models.py
echo     visitante = Column(String(120), nullable=False)>> backend\models.py
echo     documento = Column(String(30), default="")>> backend\models.py
echo     destino = Column(String(40), default="")>> backend\models.py
echo     tipo = Column(String(20), default="VISITA")>> backend\models.py
echo     entrada = Column(DateTime, default=datetime.utcnow)>> backend\models.py
echo     salida = Column(DateTime, nullable=True)>> backend\models.py
goto :eof

:escribir_auth
echo import hashlib> backend\auth.py
echo import os>> backend\auth.py
echo from datetime import datetime, timedelta>> backend\auth.py
echo import jwt>> backend\auth.py
echo from fastapi import HTTPException, Request>> backend\auth.py
echo from dotenv import load_dotenv>> backend\auth.py
echo.>> backend\auth.py
echo load_dotenv()>> backend\auth.py
echo.>> backend\auth.py
echo SECRET = os.getenv("JWT_SECRET", "cambia-este-secreto-en-produccion")>> backend\auth.py
echo SALT = "comunapp-v1">> backend\auth.py
echo.>> backend\auth.py
echo def hash_pwd(pwd):>> backend\auth.py
echo     return hashlib.pbkdf2_hmac("sha256", pwd.encode(), SALT.encode(), 50000).hex()>> backend\auth.py
echo.>> backend\auth.py
echo def crear_token(usuario_id, rol, parcela_id, unidad=""):>> backend\auth.py
echo     expira = datetime.utcnow() + timedelta(hours=12)>> backend\auth.py
echo     payload = {"sub": usuario_id, "rol": rol, "parcela_id": parcela_id, "unidad": unidad, "exp": expira}>> backend\auth.py
echo     return jwt.encode(payload, SECRET, algorithm="HS256")>> backend\auth.py
echo.>> backend\auth.py
echo def token_actual(request: Request):>> backend\auth.py
echo     cab = request.headers.get("authorization", "")>> backend\auth.py
echo     if not cab.startswith("Bearer "):>> backend\auth.py
echo         raise HTTPException(status_code=401, detail="Token ausente")>> backend\auth.py
echo     try:>> backend\auth.py
echo         return jwt.decode(cab[7:], SECRET, algorithms=["HS256"])>> backend\auth.py
echo     except Exception:>> backend\auth.py
echo         raise HTTPException(status_code=401, detail="Token invalido o expirado")>> backend\auth.py
echo.>> backend\auth.py
echo def require_roles(*roles):>> backend\auth.py
echo     def dependencia(request: Request):>> backend\auth.py
echo         tok = token_actual(request)>> backend\auth.py
echo         if tok.get("rol") != "SUPERADMIN" and tok.get("rol") not in roles:>> backend\auth.py
echo             raise HTTPException(status_code=403, detail="Rol insuficiente para esta ruta")>> backend\auth.py
echo         return tok>> backend\auth.py
echo     return dependencia>> backend\auth.py
goto :eof

:escribir_main
echo import os> backend\main.py
echo from fastapi import FastAPI>> backend\main.py
echo from fastapi.middleware.cors import CORSMiddleware>> backend\main.py
echo from dotenv import load_dotenv>> backend\main.py
echo from database import engine>> backend\main.py
echo from models import Base>> backend\main.py
echo import routers.auth_routes as auth_routes>> backend\main.py
echo import routers.finanzas as finanzas>> backend\main.py
echo import routers.comunidad as comunidad>> backend\main.py
echo.>> backend\main.py
echo load_dotenv()>> backend\main.py
echo.>> backend\main.py
echo Base.metadata.create_all(bind=engine)>> backend\main.py
echo.>> backend\main.py
echo origenes = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")>> backend\main.py
echo.>> backend\main.py
echo app = FastAPI(title="ComunApp API", version="1.0.0", description="Administracion de condominios multi-tenant")>> backend\main.py
echo.>> backend\main.py
echo app.add_middleware(>> backend\main.py
echo     CORSMiddleware,>> backend\main.py
echo     allow_origins=origenes,>> backend\main.py
echo     allow_credentials=True,>> backend\main.py
echo     allow_methods=["*"],>> backend\main.py
echo     allow_headers=["*"],>> backend\main.py
echo )>> backend\main.py
echo.>> backend\main.py
echo app.include_router(auth_routes.router)>> backend\main.py
echo app.include_router(finanzas.router)>> backend\main.py
echo app.include_router(comunidad.router)>> backend\main.py
echo.>> backend\main.py
echo @app.get("/")>> backend\main.py
echo def raiz():>> backend\main.py
echo     return {"app": "ComunApp API", "docs": "/docs", "estado": "en linea"}>> backend\main.py
goto :eof

:escribir_router_init
echo.> backend\routers\__init__.py
goto :eof

:escribir_router_auth
echo from fastapi import APIRouter, Depends, HTTPException> backend\routers\auth_routes.py
echo from pydantic import BaseModel>> backend\routers\auth_routes.py
echo from sqlalchemy.orm import Session>> backend\routers\auth_routes.py
echo from database import db>> backend\routers\auth_routes.py
echo from models import Usuario, MiembroParcela, Parcela>> backend\routers\auth_routes.py
echo from auth import hash_pwd, crear_token, require_roles>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo router = APIRouter(prefix="/api", tags=["auth"])>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo class LoginIn(BaseModel):>> backend\routers\auth_routes.py
echo     email: str>> backend\routers\auth_routes.py
echo     password: str>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo class UsuarioIn(BaseModel):>> backend\routers\auth_routes.py
echo     nombre: str>> backend\routers\auth_routes.py
echo     email: str>> backend\routers\auth_routes.py
echo     password: str = "">> backend\routers\auth_routes.py
echo     rol_global: str = "">> backend\routers\auth_routes.py
echo     membresias: list = []>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo @router.post("/auth/login")>> backend\routers\auth_routes.py
echo def login(datos: LoginIn, s: Session = Depends(db)):>> backend\routers\auth_routes.py
echo     u = s.query(Usuario).filter(Usuario.email == datos.email.lower()).first()>> backend\routers\auth_routes.py
echo     if not u or u.password != hash_pwd(datos.password):>> backend\routers\auth_routes.py
echo         raise HTTPException(status_code=401, detail="Credenciales invalidas")>> backend\routers\auth_routes.py
echo     if not u.activo:>> backend\routers\auth_routes.py
echo         raise HTTPException(status_code=403, detail="Cuenta desactivada")>> backend\routers\auth_routes.py
echo     if u.rol_global == "SUPERADMIN":>> backend\routers\auth_routes.py
echo         return {"token": crear_token(u.id, "SUPERADMIN", ""), "rol": "SUPERADMIN"}>> backend\routers\auth_routes.py
echo     if not u.membresias:>> backend\routers\auth_routes.py
echo         raise HTTPException(status_code=403, detail="Usuario sin condominios asignados")>> backend\routers\auth_routes.py
echo     m = u.membresias[0]>> backend\routers\auth_routes.py
echo     return {"token": crear_token(u.id, m.rol, m.parcela_id, m.unidad), "rol": m.rol, "parcela_id": m.parcela_id}>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo @router.get("/usuarios")>> backend\routers\auth_routes.py
echo def listar_usuarios(s: Session = Depends(db), tok=Depends(require_roles("SUPERADMIN", "ADMIN", "COMITE"))):>> backend\routers\auth_routes.py
echo     salida = []>> backend\routers\auth_routes.py
echo     for u in s.query(Usuario).all():>> backend\routers\auth_routes.py
echo         salida.append({>> backend\routers\auth_routes.py
echo             "id": u.id,>> backend\routers\auth_routes.py
echo             "nombre": u.nombre,>> backend\routers\auth_routes.py
echo             "email": u.email,>> backend\routers\auth_routes.py
echo             "activo": u.activo,>> backend\routers\auth_routes.py
echo             "rol_global": u.rol_global,>> backend\routers\auth_routes.py
echo             "membresias": [{"parcela_id": m.parcela_id, "rol": m.rol, "unidad": m.unidad} for m in u.membresias],>> backend\routers\auth_routes.py
echo         })>> backend\routers\auth_routes.py
echo     return salida>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo @router.post("/usuarios")>> backend\routers\auth_routes.py
echo def crear_usuario(datos: UsuarioIn, s: Session = Depends(db), tok=Depends(require_roles("SUPERADMIN", "ADMIN"))):>> backend\routers\auth_routes.py
echo     existe = s.query(Usuario).filter(Usuario.email == datos.email.lower()).first()>> backend\routers\auth_routes.py
echo     if existe:>> backend\routers\auth_routes.py
echo         raise HTTPException(status_code=409, detail="Ese correo ya esta registrado")>> backend\routers\auth_routes.py
echo     u = Usuario(nombre=datos.nombre, email=datos.email.lower(), password=hash_pwd(datos.password), rol_global=datos.rol_global)>> backend\routers\auth_routes.py
echo     s.add(u)>> backend\routers\auth_routes.py
echo     s.flush()>> backend\routers\auth_routes.py
echo     for m in datos.membresias:>> backend\routers\auth_routes.py
echo         s.add(MiembroParcela(usuario_id=u.id, parcela_id=m.get("parcela_id"), rol=m.get("rol"), unidad=m.get("unidad", "")))>> backend\routers\auth_routes.py
echo     s.commit()>> backend\routers\auth_routes.py
echo     return {"id": u.id, "nombre": u.nombre}>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo @router.get("/parcelas")>> backend\routers\auth_routes.py
echo def listar_parcelas(s: Session = Depends(db), tok=Depends(require_roles("SUPERADMIN", "ADMIN", "COMITE"))):>> backend\routers\auth_routes.py
echo     return s.query(Parcela).all()>> backend\routers\auth_routes.py
echo.>> backend\routers\auth_routes.py
echo @router.post("/parcelas")>> backend\routers\auth_routes.py
echo def crear_parcela(nombre: str, direccion: str = "", ciudad: str = "", unidades: int = 24, s: Session = Depends(db), tok=Depends(require_roles("SUPERADMIN"))):>> backend\routers\auth_routes.py
echo     p = Parcela(nombre=nombre, direccion=direccion, ciudad=ciudad, unidades=unidades)>> backend\routers\auth_routes.py
echo     s.add(p)>> backend\routers\auth_routes.py
echo     s.commit()>> backend\routers\auth_routes.py
echo     return {"id": p.id, "nombre": p.nombre}>> backend\routers\auth_routes.py
goto :eof

:escribir_router_finanzas
echo import hashlib> backend\routers\finanzas.py
echo import hmac>> backend\routers\finanzas.py
echo import os>> backend\routers\finanzas.py
echo from datetime import date>> backend\routers\finanzas.py
echo from fastapi import APIRouter, Depends, HTTPException, Request>> backend\routers\finanzas.py
echo from pydantic import BaseModel>> backend\routers\finanzas.py
echo from sqlalchemy.orm import Session>> backend\routers\finanzas.py
echo from database import db>> backend\routers\finanzas.py
echo from models import Cobro, Pago, Movimiento>> backend\routers\finanzas.py
echo from auth import require_roles>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo router = APIRouter(prefix="/api", tags=["finanzas"])>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo MP_SECRET = os.getenv("MP_WEBHOOK_SECRET", "mp-demo-secret")>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo class CobroIn(BaseModel):>> backend\routers\finanzas.py
echo     parcela_id: str>> backend\routers\finanzas.py
echo     unidades: list>> backend\routers\finanzas.py
echo     periodo: str>> backend\routers\finanzas.py
echo     monto: float>> backend\routers\finanzas.py
echo     concepto: str = "Gastos comunes">> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo class PagoIn(BaseModel):>> backend\routers\finanzas.py
echo     parcela_id: str>> backend\routers\finanzas.py
echo     cobro_id: str>> backend\routers\finanzas.py
echo     unidad: str>> backend\routers\finanzas.py
echo     monto: float>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo @router.get("/cobros")>> backend\routers\finanzas.py
echo def listar_cobros(parcela_id: str, s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"))):>> backend\routers\finanzas.py
echo     q = s.query(Cobro).filter(Cobro.parcela_id == parcela_id)>> backend\routers\finanzas.py
echo     if tok.get("rol") in ("PROPIETARIO", "ARRENDATARIO"):>> backend\routers\finanzas.py
echo         q = q.filter(Cobro.unidad == tok.get("unidad", ""))>> backend\routers\finanzas.py
echo     return q.order_by(Cobro.periodo.desc()).all()>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo @router.post("/cobros/generar-mes")>> backend\routers\finanzas.py
echo def generar_mes(datos: CobroIn, s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "COMITE"))):>> backend\routers\finanzas.py
echo     creados = 0>> backend\routers\finanzas.py
echo     for unidad in datos.unidades:>> backend\routers\finanzas.py
echo         existe = s.query(Cobro).filter(>> backend\routers\finanzas.py
echo             Cobro.parcela_id == datos.parcela_id,>> backend\routers\finanzas.py
echo             Cobro.unidad == unidad,>> backend\routers\finanzas.py
echo             Cobro.periodo == datos.periodo,>> backend\routers\finanzas.py
echo             Cobro.concepto == datos.concepto,>> backend\routers\finanzas.py
echo         ).first()>> backend\routers\finanzas.py
echo         if existe:>> backend\routers\finanzas.py
echo             continue>> backend\routers\finanzas.py
echo         s.add(Cobro(parcela_id=datos.parcela_id, unidad=unidad, periodo=datos.periodo, monto=datos.monto, concepto=datos.concepto))>> backend\routers\finanzas.py
echo         creados += 1>> backend\routers\finanzas.py
echo     s.commit()>> backend\routers\finanzas.py
echo     return {"creados": creados, "periodo": datos.periodo}>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo @router.post("/pagos/preferencia")>> backend\routers\finanzas.py
echo def crear_preferencia(datos: PagoIn, tok=Depends(require_roles("PROPIETARIO", "ARRENDATARIO"))):>> backend\routers\finanzas.py
echo     # Aqui iria el SDK oficial de Mercado Pago; se devuelve una preferencia simulada>> backend\routers\finanzas.py
echo     return {"id": "PREF-" + datos.cobro_id[:8], "monto": datos.monto, "pasarela": "mercadopago"}>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo @router.post("/webhooks/mercadopago")>> backend\routers\finanzas.py
echo async def webhook_mercadopago(request: Request, s: Session = Depends(db)):>> backend\routers\finanzas.py
echo     firma = request.headers.get("x-signature", "")>> backend\routers\finanzas.py
echo     cuerpo = await request.body()>> backend\routers\finanzas.py
echo     esperada = hmac.new(MP_SECRET.encode(), cuerpo, hashlib.sha256).hexdigest()>> backend\routers\finanzas.py
echo     if not hmac.compare_digest(firma, esperada):>> backend\routers\finanzas.py
echo         raise HTTPException(status_code=400, detail="Firma HMAC invalida")>> backend\routers\finanzas.py
echo     evento = await request.json()>> backend\routers\finanzas.py
echo     cobro = s.query(Cobro).filter(Cobro.id == evento.get("cobro_id", "")).first()>> backend\routers\finanzas.py
echo     if not cobro:>> backend\routers\finanzas.py
echo         raise HTTPException(status_code=404, detail="Cobro no encontrado")>> backend\routers\finanzas.py
echo     cobro.estado = "PAGADO">> backend\routers\finanzas.py
echo     s.add(Pago(parcela_id=cobro.parcela_id, cobro_id=cobro.id, unidad=cobro.unidad, monto=float(cobro.monto), referencia=evento.get("payment_id", "")))>> backend\routers\finanzas.py
echo     s.add(Movimiento(parcela_id=cobro.parcela_id, fecha=date.today(), tipo="INGRESO", categoria="Gastos comunes", descripcion="Pago unidad " + cobro.unidad, monto=float(cobro.monto)))>> backend\routers\finanzas.py
echo     s.commit()>> backend\routers\finanzas.py
echo     return {"ok": True}>> backend\routers\finanzas.py
echo.>> backend\routers\finanzas.py
echo @router.get("/reporte")>> backend\routers\finanzas.py
echo def reporte_mensual(parcela_id: str, periodo: str, s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "COMITE"))):>> backend\routers\finanzas.py
echo     cobros = s.query(Cobro).filter(Cobro.parcela_id == parcela_id, Cobro.periodo == periodo).all()>> backend\routers\finanzas.py
echo     total = sum(float(c.monto) for c in cobros)>> backend\routers\finanzas.py
echo     pagado = sum(float(c.monto) for c in cobros if c.estado == "PAGADO")>> backend\routers\finanzas.py
echo     pct = round(pagado / total * 100, 1) if total else 0>> backend\routers\finanzas.py
echo     return {"periodo": periodo, "total_cobrado": total, "total_pagado": pagado, "recaudacion_pct": pct}>> backend\routers\finanzas.py
goto :eof

:escribir_router_comunidad
echo from fastapi import APIRouter, Depends, HTTPException> backend\routers\comunidad.py
echo from pydantic import BaseModel>> backend\routers\comunidad.py
echo from sqlalchemy.orm import Session>> backend\routers\comunidad.py
echo from database import db>> backend\routers\comunidad.py
echo from models import Aviso, Reserva, Votacion, Voto, RegistroAcceso>> backend\routers\comunidad.py
echo from auth import token_actual, require_roles>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo router = APIRouter(prefix="/api", tags=["comunidad"])>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo class AvisoIn(BaseModel):>> backend\routers\comunidad.py
echo     parcela_id: str>> backend\routers\comunidad.py
echo     titulo: str>> backend\routers\comunidad.py
echo     cuerpo: str = "">> backend\routers\comunidad.py
echo     tipo: str = "INFORMATIVO">> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo class ReservaIn(BaseModel):>> backend\routers\comunidad.py
echo     parcela_id: str>> backend\routers\comunidad.py
echo     area: str>> backend\routers\comunidad.py
echo     fecha: str>> backend\routers\comunidad.py
echo     bloque: str>> backend\routers\comunidad.py
echo     unidad: str>> backend\routers\comunidad.py
echo     residente: str = "">> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo class VotoIn(BaseModel):>> backend\routers\comunidad.py
echo     votacion_id: str>> backend\routers\comunidad.py
echo     unidad: str>> backend\routers\comunidad.py
echo     opcion: str>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.get("/avisos")>> backend\routers\comunidad.py
echo def listar_avisos(parcela_id: str, s: Session = Depends(db), tok=Depends(token_actual)):>> backend\routers\comunidad.py
echo     return s.query(Aviso).filter(Aviso.parcela_id == parcela_id).order_by(Aviso.creado.desc()).all()>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.post("/avisos")>> backend\routers\comunidad.py
echo def crear_aviso(datos: AvisoIn, s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "COMITE"))):>> backend\routers\comunidad.py
echo     a = Aviso(parcela_id=datos.parcela_id, titulo=datos.titulo, cuerpo=datos.cuerpo, tipo=datos.tipo, autor=tok.get("sub", ""))>> backend\routers\comunidad.py
echo     s.add(a)>> backend\routers\comunidad.py
echo     s.commit()>> backend\routers\comunidad.py
echo     return {"id": a.id}>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.get("/reservas")>> backend\routers\comunidad.py
echo def listar_reservas(parcela_id: str, s: Session = Depends(db), tok=Depends(token_actual)):>> backend\routers\comunidad.py
echo     return s.query(Reserva).filter(Reserva.parcela_id == parcela_id).all()>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.post("/reservas")>> backend\routers\comunidad.py
echo def crear_reserva(datos: ReservaIn, s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "PROPIETARIO"))):>> backend\routers\comunidad.py
echo     choque = s.query(Reserva).filter(>> backend\routers\comunidad.py
echo         Reserva.parcela_id == datos.parcela_id,>> backend\routers\comunidad.py
echo         Reserva.area == datos.area,>> backend\routers\comunidad.py
echo         Reserva.fecha == datos.fecha,>> backend\routers\comunidad.py
echo         Reserva.bloque == datos.bloque,>> backend\routers\comunidad.py
echo     ).first()>> backend\routers\comunidad.py
echo     if choque:>> backend\routers\comunidad.py
echo         raise HTTPException(status_code=409, detail="Ese bloque ya esta reservado")>> backend\routers\comunidad.py
echo     r = Reserva(parcela_id=datos.parcela_id, area=datos.area, fecha=datos.fecha, bloque=datos.bloque, unidad=datos.unidad, residente=datos.residente)>> backend\routers\comunidad.py
echo     s.add(r)>> backend\routers\comunidad.py
echo     s.commit()>> backend\routers\comunidad.py
echo     return {"id": r.id}>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.get("/votaciones")>> backend\routers\comunidad.py
echo def listar_votaciones(parcela_id: str, s: Session = Depends(db), tok=Depends(token_actual)):>> backend\routers\comunidad.py
echo     return s.query(Votacion).filter(Votacion.parcela_id == parcela_id).all()>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.post("/votaciones/{votacion_id}/votar")>> backend\routers\comunidad.py
echo def votar(votacion_id: str, datos: VotoIn, s: Session = Depends(db), tok=Depends(require_roles("PROPIETARIO"))):>> backend\routers\comunidad.py
echo     ya = s.query(Voto).filter(Voto.votacion_id == votacion_id, Voto.unidad == datos.unidad).first()>> backend\routers\comunidad.py
echo     if ya:>> backend\routers\comunidad.py
echo         raise HTTPException(status_code=409, detail="Esta unidad ya voto")>> backend\routers\comunidad.py
echo     s.add(Voto(votacion_id=votacion_id, unidad=datos.unidad, opcion=datos.opcion))>> backend\routers\comunidad.py
echo     s.commit()>> backend\routers\comunidad.py
echo     return {"ok": True}>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.get("/bitacora")>> backend\routers\comunidad.py
echo def bitacora(parcela_id: str, s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "COMITE"))):>> backend\routers\comunidad.py
echo     return s.query(RegistroAcceso).filter(RegistroAcceso.parcela_id == parcela_id).order_by(RegistroAcceso.entrada.desc()).all()>> backend\routers\comunidad.py
echo.>> backend\routers\comunidad.py
echo @router.post("/bitacora")>> backend\routers\comunidad.py
echo def registrar(visitante: str, parcela_id: str, documento: str = "", destino: str = "", s: Session = Depends(db), tok=Depends(require_roles("ADMIN", "COMITE"))):>> backend\routers\comunidad.py
echo     r = RegistroAcceso(parcela_id=parcela_id, visitante=visitante, documento=documento, destino=destino)>> backend\routers\comunidad.py
echo     s.add(r)>> backend\routers\comunidad.py
echo     s.commit()>> backend\routers\comunidad.py
echo     return {"id": r.id}>> backend\routers\comunidad.py
goto :eof

:escribir_seed
echo from datetime import datetime> backend\seed.py
echo from database import engine, SessionLocal>> backend\seed.py
echo from models import Base, Parcela, Usuario, MiembroParcela, Cobro, Aviso, Votacion>> backend\seed.py
echo from auth import hash_pwd>> backend\seed.py
echo.>> backend\seed.py
echo Base.metadata.create_all(bind=engine)>> backend\seed.py
echo s = SessionLocal()>> backend\seed.py
echo.>> backend\seed.py
echo parcela = s.query(Parcela).filter(Parcela.nombre == "Torres del Parque").first()>> backend\seed.py
echo if not parcela:>> backend\seed.py
echo     parcela = Parcela(nombre="Torres del Parque", direccion="Av. Providencia 1234", ciudad="Santiago", unidades=48)>> backend\seed.py
echo     s.add(parcela)>> backend\seed.py
echo     s.flush()>> backend\seed.py
echo.>> backend\seed.py
echo def asegurar(email, nombre, pwd, rol_global="", rol_parcela="", unidad=""):>> backend\seed.py
echo     u = s.query(Usuario).filter(Usuario.email == email).first()>> backend\seed.py
echo     if u:>> backend\seed.py
echo         return u>> backend\seed.py
echo     u = Usuario(nombre=nombre, email=email, password=hash_pwd(pwd), rol_global=rol_global)>> backend\seed.py
echo     s.add(u)>> backend\seed.py
echo     s.flush()>> backend\seed.py
echo     if rol_parcela:>> backend\seed.py
echo         s.add(MiembroParcela(usuario_id=u.id, parcela_id=parcela.id, rol=rol_parcela, unidad=unidad))>> backend\seed.py
echo     return u>> backend\seed.py
echo.>> backend\seed.py
echo asegurar("plataforma@comunapp.cl", "Sebastian Astete", "admin123", rol_global="SUPERADMIN")>> backend\seed.py
echo asegurar("admin@torresdelparque.cl", "Rodrigo Fuentes", "admin123", rol_parcela="ADMIN")>> backend\seed.py
echo asegurar("comite@torresdelparque.cl", "Carla Mendez", "comite123", rol_parcela="COMITE")>> backend\seed.py
echo asegurar("maria@demo.cl", "Maria Lopez", "demo123", rol_parcela="PROPIETARIO", unidad="A-42")>> backend\seed.py
echo asegurar("jorge@demo.cl", "Jorge Salas", "demo123", rol_parcela="ARRENDATARIO", unidad="B-12")>> backend\seed.py
echo.>> backend\seed.py
echo periodo = datetime.utcnow().strftime("%%Y-%%m")>> backend\seed.py
echo for unidad in ("A-42", "B-12", "C-07", "D-31"):>> backend\seed.py
echo     existe = s.query(Cobro).filter(Cobro.parcela_id == parcela.id, Cobro.unidad == unidad, Cobro.periodo == periodo).first()>> backend\seed.py
echo     if not existe:>> backend\seed.py
echo         s.add(Cobro(parcela_id=parcela.id, unidad=unidad, periodo=periodo, monto=85000))>> backend\seed.py
echo.>> backend\seed.py
echo if not s.query(Aviso).filter(Aviso.parcela_id == parcela.id).first():>> backend\seed.py
echo     s.add(Aviso(parcela_id=parcela.id, titulo="Mantencion de ascensores", cuerpo="El jueves 12 entre 10:00 y 13:00 el ascensor B estara detenido.", tipo="INFORMATIVO"))>> backend\seed.py
echo     s.add(Votacion(parcela_id=parcela.id, titulo="Pintura de fachada", pregunta="Se aprueba el presupuesto de pintura?", opciones="Si^|No^|Abstencion"))>> backend\seed.py
echo.>> backend\seed.py
echo s.commit()>> backend\seed.py
echo s.close()>> backend\seed.py
echo print("Datos demo sembrados correctamente.")>> backend\seed.py
echo print("Credenciales: admin@torresdelparque.cl / admin123")>> backend\seed.py
goto :eof

:escribir_readme
echo # ComunApp API> backend\README.md
echo.>> backend\README.md
echo Backend en Python: FastAPI + SQLAlchemy + SQLite (por defecto) o PostgreSQL.>> backend\README.md
echo.>> backend\README.md
echo ## Ejecutar>> backend\README.md
echo.>> backend\README.md
echo     cd backend>> backend\README.md
echo     .venv\Scripts\activate>> backend\README.md
echo     python -m uvicorn main:app --port 8000>> backend\README.md
echo.>> backend\README.md
echo Documentacion interactiva: http://127.0.0.1:8000/docs>> backend\README.md
echo.>> backend\README.md
echo ## Base de datos>> backend\README.md
echo.>> backend\README.md
echo Por defecto usa SQLite (comunapp.db), sin instalar nada.>> backend\README.md
echo Para PostgreSQL cambia DATABASE_URL en backend\.env>> backend\README.md
echo.>> backend\README.md
echo ## Credenciales demo (tras ejecutar seed.py)>> backend\README.md
echo.>> backend\README.md
echo - plataforma@comunapp.cl / admin123  (SUPERADMIN)>> backend\README.md
echo - admin@torresdelparque.cl / admin123  (ADMIN)>> backend\README.md
echo - comite@torresdelparque.cl / comite123  (COMITE)>> backend\README.md
echo - maria@demo.cl / demo123  (PROPIETARIO)>> backend\README.md
echo - jorge@demo.cl / demo123  (ARRENDATARIO)>> backend\README.md
goto :eof
