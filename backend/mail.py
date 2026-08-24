"""Envío de correo transaccional de ComunApp.

Si SMTP está configurado (smtp_host + smtp_user) envía por SMTP/TLS. Si no,
registra el mensaje en el log y devuelve False. Nunca lanza excepciones hacia
el llamador: el envío de correo es "mejor esfuerzo" y no debe tumbar la API.
"""
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import get_settings

s = get_settings()


def _smtp_configurado() -> bool:
    return bool(s.smtp_host and s.smtp_user)


def _enviar_smtp(destinatarios: list[str], asunto: str, html: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = asunto
        msg["From"] = s.smtp_from
        msg["To"] = ", ".join(destinatarios)
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as srv:
            srv.starttls()
            srv.login(s.smtp_user, s.smtp_pass)
            srv.sendmail(s.smtp_from, destinatarios, msg.as_string())
        return True
    except Exception as exc:  # noqa: BLE001 — correo nunca debe romper la API
        print(f"[mail] ERROR SMTP: {exc!r}")
        return False


def enviar(destinatarios: list[str], asunto: str, html: str) -> bool:
    """Envía un correo. Devuelve True si se envió, False si solo se registró."""
    destinatarios = [d for d in destinatarios if d]
    if not destinatarios:
        return False
    if _smtp_configurado():
        # Se envía en un hilo para no retrasar la respuesta HTTP.
        t = threading.Thread(target=_enviar_smtp, args=(destinatarios, asunto, html), daemon=True)
        t.start()
        return True
    # Sin SMTP: se deja constancia en el log (modo desarrollo).
    print(f"[mail] (sin SMTP, solo log) Para: {destinatarios} · Asunto: {asunto}")
    return False


# ── plantillas ────────────────────────────────────────────────
def _base(titulo: str, cuerpo_html: str) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:#f4f8f1;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border:1px solid #dde8dc;border-radius:16px;overflow:hidden;">
  <div style="background:#0c3b2e;padding:22px 28px;">
    <span style="color:#c9f24b;font-weight:800;font-size:20px;">ComunApp</span>
    <span style="color:#ffffff;opacity:.7;font-size:13px;margin-left:10px;">{titulo}</span>
  </div>
  <div style="padding:28px;color:#3e5a4e;font-size:15px;line-height:1.6;">{cuerpo_html}</div>
  <div style="padding:16px 28px;border-top:1px dashed #dde8dc;color:#7b9186;font-size:12px;">
    Este mensaje fue enviado automáticamente por ComunApp. No respondas a este correo.
  </div>
</div></body></html>"""


def correo_confirmacion(destinatario: str, nombre: str, token: str) -> bool:
    url = f"{s.frontend_url}/#/entrar?confirmar={token}" if s.frontend_url else f"(token: {token})"
    html = _base("Confirma tu correo", f"""
    <p>Hola <strong>{nombre}</strong>,</p>
    <p>Tu cuenta en ComunApp fue creada. Confirma tu correo para activarla:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="{url}" style="background:#c9f24b;color:#071f17;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:999px;">Confirmar mi correo</a>
    </p>
    <p style="font-size:13px;">Si el botón no funciona, usa este token: <code>{token}</code></p>""")
    return enviar([destinatario], "Confirma tu correo · ComunApp", html)


def correo_nuevo_cobro(destinatarios: list[str], comunidad: str, periodo: str, monto: str) -> bool:
    html = _base("Nuevo cobro generado", f"""
    <p>La administración de <strong>{comunidad}</strong> generó un nuevo cobro.</p>
    <p style="background:#f4f8f1;border:1px solid #dde8dc;border-radius:12px;padding:16px;">
      <strong>Periodo:</strong> {periodo}<br/>
      <strong>Monto:</strong> {monto}
    </p>
    <p>Ingresa a tu cuenta para ver el detalle y pagar en línea.</p>""")
    return enviar(destinatarios, f"Nuevo cobro · {comunidad}", html)


def correo_aviso(destinatarios: list[str], comunidad: str, titulo: str, cuerpo: str) -> bool:
    html = _base("Nuevo aviso", f"""
    <p><strong>{comunidad}</strong> publicó un aviso:</p>
    <h3 style="color:#0c3b2e;margin:16px 0 6px;">{titulo}</h3>
    <p>{cuerpo}</p>""")
    return enviar(destinatarios, f"Aviso · {titulo}", html)


def correo_credenciales(destinatario: str, nombre: str, password: str) -> bool:
    html = _base("Tu contraseña fue restablecida", f"""
    <p>Hola <strong>{nombre}</strong>,</p>
    <p>El administrador restableció tu contraseña. Tu nueva clave temporal es:</p>
    <p style="background:#f4f8f1;border:1px solid #dde8dc;border-radius:12px;padding:16px;font-family:monospace;font-size:18px;letter-spacing:2px;">{password}</p>
    <p>Te recomendamos cambiarla al iniciar sesión.</p>""")
    return enviar([destinatario], "Contraseña restablecida · ComunApp", html)


def correo_informe_mensual(destinatarios: list[str], comunidad: str, periodo: str, resumen_html: str) -> bool:
    html = _base("Informe mensual de finanzas y transparencia", f"""
    <p>Adjunto encontrarás el resumen del informe de <strong>{comunidad}</strong> para <strong>{periodo}</strong>.</p>
    {resumen_html}
    <p style="font-size:13px;color:#7b9186;">El informe completo en PDF está disponible en tu panel, sección Transparencia.</p>""")
    return enviar(destinatarios, f"Informe mensual · {comunidad} · {periodo}", html)
