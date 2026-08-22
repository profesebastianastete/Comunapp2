@echo off
chcp 65001 >nul
title ComunApp - Version Final (autocontenida)
cd /d "%~dp0"
setlocal

REM ================================================================
REM  COMUNAPP-FINAL.BAT
REM  Contiene la aplicacion completa incrustada al final del archivo.
REM  Genera ComunApp.html y la abre en tu navegador. Sin instalar nada.
REM
REM  Rutas de la app:  #/            pagina de inicio
REM                    #/entrar      ingreso de usuarios
REM                    #/dashboard   panel segun rol
REM                    #/adminapp    consola interna (oculta)
REM ================================================================

if "%~1"=="" goto menu
if /i "%~1"=="auto" goto lanzar
goto menu

:menu
cls
echo.
echo   ======================================================================
echo.
echo        C O M U N A P P   -   Version Final (archivo unico)
echo        Tu comunidad, administrada en orden.
echo.
echo   ======================================================================
echo.
echo        [1]  Abrir ComunApp  (genera ComunApp.html si no existe)
echo        [2]  Regenerar ComunApp.html desde este .bat
echo        [3]  Servir la version compilada (carpeta dist, requiere Node)
echo        [4]  Ver credenciales y rutas de prueba
echo        [0]  Salir
echo.
set "op="
set /p op="   Elige una opcion y presiona Enter: "
if "%op%"=="1" goto lanzar
if "%op%"=="2" goto generar
if "%op%"=="3" goto servirdist
if "%op%"=="4" goto credenciales
if "%op%"=="0" goto fin
goto menu

:lanzar
if not exist "%~dp0ComunApp.html" call :extraer
if not exist "%~dp0ComunApp.html" goto error_extraer
echo.
echo   Abriendo ComunApp en tu navegador...
start "" "%~dp0ComunApp.html"
echo   Listo. Si quieres un acceso directo, crea uno hacia ComunApp.html
timeout /t 4 >nul
goto fin

:generar
call :extraer
if exist "%~dp0ComunApp.html" (
  echo.
  echo   ComunApp.html generado correctamente en: %~dp0
  echo.
  set "ab="
  set /p ab="   Quieres abrirlo ahora? (s/n): "
  if /i "%ab%"=="s" start "" "%~dp0ComunApp.html"
) else (
  goto error_extraer
)
pause
goto menu

:servirdist
if not exist "%~dp0dist\index.html" (
  echo.
  echo   No se encontro la carpeta dist junto a este .bat
  echo   Compila primero el proyecto con:  npm run build
  echo.
  pause
  goto menu
)
where npx >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se encontro Node/npx. Instala Node desde https://nodejs.org
  echo   o usa la opcion [1] que no requiere nada.
  echo.
  pause
  goto menu
)
echo.
echo   Sirviendo version compilada en http://localhost:3000  (Ctrl+C detiene)
echo.
npx --yes serve "%~dp0dist" -l 3000
goto menu

:credenciales
cls
echo.
echo   === Credenciales de prueba ===
echo.
echo     Propietaria     maria@demo.cl            demo123
echo     Arrendatario    jorge@demo.cl            demo123
echo     Administrador   admin@losalamos.cl       admin123
echo     Comite          comite@losalamos.cl      comite123
echo     Superadmin      equipo@comunapp.cl       admin123   (ruta #/adminapp)
echo.
echo   === Rutas ===
echo.
echo     #/            Pagina de inicio (landing)
echo     #/entrar      Ingreso
echo     #/dashboard   Panel del usuario segun su rol
echo     #/adminapp    Consola interna (sin enlaces publicos)
echo.
pause
goto menu

:error_extraer
echo.
echo   ERROR: no se pudo generar ComunApp.html
echo   Verifica que PowerShell este disponible (viene con Windows).
echo.
pause
goto menu

:extraer
echo.
echo   Extrayendo la aplicacion incrustada en este .bat ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0');$m='::COMUNAPP-PAYLOAD::';$i=$t.IndexOf($m);if($i -lt 0){exit 1};$h=$t.Substring($i+$m.Length).TrimStart([char]13,[char]10,[char]32,[char]9);[IO.File]::WriteAllText('%~dp0ComunApp.html',$h,(New-Object Text.UTF8Encoding $false))"
goto :eof

:fin
endlocal
exit /b 0

::COMUNAPP-PAYLOAD::
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>ComunApp — Tu comunidad, administrada en orden</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
:root{
  --paper:#f4f8f1;--card:#ffffff;--ink:#0e2a20;--ink2:#3e5a4e;--ink3:#7b9186;
  --pine:#0c3b2e;--pine2:#12523e;--deep:#071f17;--neon:#c9f24b;--neon2:#b7ec3c;
  --line:#dde8dc;--signal:#c94f38;--amber:#d9a036;--teal:#1f7d72;
  --shadow-soft:0 2px 10px rgba(12,42,32,.05),0 14px 36px -14px rgba(12,42,32,.14);
  --shadow-lift:0 30px 60px -20px rgba(12,42,32,.22);
  --shadow-neon:0 12px 32px -8px rgba(183,236,60,.55);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"Instrument Sans",system-ui,sans-serif;background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.5}
::selection{background:var(--neon);color:var(--deep)}
button{font-family:inherit;cursor:pointer}
input,select,textarea{font-family:inherit}
img,svg{display:block}
h1,h2,h3,.font-display{font-family:"Bricolage Grotesque","Instrument Sans",sans-serif}
.mono{font-family:"Spline Sans Mono",ui-monospace,monospace}
a{color:inherit;text-decoration:none}
/* fondos */
.dotgrid{background-image:radial-gradient(circle,rgba(12,59,46,.14) 1px,transparent 1.3px);background-size:20px 20px}
.dotgrid-soft{background-image:radial-gradient(circle,rgba(12,59,46,.09) 1px,transparent 1.3px);background-size:22px 22px}
.dotgrid-dark{background-image:radial-gradient(circle,rgba(201,242,75,.13) 1px,transparent 1.3px);background-size:22px 22px}
.glow-hero{background:radial-gradient(720px 420px at 82% 8%,rgba(201,242,75,.20),transparent 60%),radial-gradient(600px 420px at 8% 90%,rgba(18,82,62,.14),transparent 60%)}
.glass{background:rgba(255,255,255,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
/* botones */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:12px;font-weight:600;font-size:.9rem;padding:.65rem 1.2rem;border:1.5px solid transparent;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s,background .18s,border-color .18s,color .18s;white-space:nowrap}
.btn:active{transform:translateY(1px) scale(.99)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn-neon{background:var(--neon);color:var(--deep);box-shadow:var(--shadow-neon)}
.btn-neon:hover{background:var(--neon2);transform:translateY(-2px)}
.btn-pine{background:var(--pine);color:#fff}
.btn-pine:hover{background:var(--pine2);transform:translateY(-2px);box-shadow:var(--shadow-soft)}
.btn-ghost{border-color:var(--line);background:var(--card);color:var(--ink)}
.btn-ghost:hover{border-color:var(--pine2);color:var(--pine);transform:translateY(-2px)}
.btn-outline-light{border-color:rgba(255,255,255,.25);color:#fff;background:transparent}
.btn-outline-light:hover{border-color:var(--neon);color:var(--neon)}
.btn-danger{border-color:#f0c9c0;background:#fff;color:var(--signal)}
.btn-danger:hover{background:var(--signal);color:#fff;border-color:var(--signal)}
.btn-lg{padding:.85rem 1.6rem;font-size:1rem;border-radius:14px}
.btn-sm{padding:.4rem .85rem;font-size:.8rem;border-radius:10px}
.btn-xl{padding:1.05rem 2.2rem;font-size:1.08rem;border-radius:16px;font-weight:800;letter-spacing:.04em}
.btn-block{width:100%}
/* campos */
.field{width:100%;border:1.5px solid var(--line);background:var(--card);padding:.62rem .85rem;font-size:.9rem;color:var(--ink);border-radius:12px;outline:none;transition:border-color .15s,box-shadow .15s}
.field:focus{border-color:var(--pine2);box-shadow:0 0 0 3px rgba(18,82,62,.12)}
.field::placeholder{color:#a3b5aa}
label.fl{display:block;font-family:"Spline Sans Mono",monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--ink3);margin:0 0 .35rem .1rem}
/* tarjetas y tags */
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow-soft)}
.tag{display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;padding:.22rem .7rem;font-family:"Spline Sans Mono",monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.tag-pago{background:rgba(18,82,62,.1);color:var(--pine2)}
.tag-pendiente{background:rgba(217,160,54,.16);color:#8a6114}
.tag-vencido{background:rgba(201,79,56,.12);color:var(--signal)}
.tag-rol{background:var(--pine);color:var(--neon)}
.tag-urgente{background:var(--signal);color:#fff}
.tag-info{background:rgba(31,125,114,.12);color:var(--teal)}
.tag-ok{background:rgba(18,82,62,.12);color:var(--pine2)}
.tag-susp{background:rgba(201,79,56,.12);color:var(--signal)}
/* animaciones */
.reveal{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}
@keyframes fadeSwap{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fade-swap{animation:fadeSwap .45s cubic-bezier(.16,1,.3,1) both}
@keyframes cardIn{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}
.card-in{animation:cardIn .55s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms)}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.float-a{animation:floatY 6s ease-in-out infinite}
.float-b{animation:floatY 7.5s ease-in-out infinite;animation-delay:-2.4s}
.float-c{animation:floatY 9s ease-in-out infinite;animation-delay:-4.8s}
@keyframes popIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
.pop-in{animation:popIn .32s cubic-bezier(.34,1.56,.64,1) both}
@keyframes barUp{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.bar-up{transform-origin:bottom;animation:barUp .9s cubic-bezier(.16,1,.3,1) both}
@keyframes barX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.bar-x{transform-origin:left;animation:barX .9s cubic-bezier(.16,1,.3,1) both}
@keyframes spin360{to{transform:rotate(360deg)}}
.spin{animation:spin360 .8s linear infinite}
@keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.55}}
.pulse-dot{animation:pulseDot 1.8s ease-in-out infinite}
@keyframes toastIn{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
@keyframes marqueeX{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.marquee{animation:marqueeX 30s linear infinite}
.marquee:hover{animation-play-state:paused}
/* navbar */
.nav{position:fixed;top:0;left:0;right:0;z-index:50;border-bottom:1px solid transparent;transition:background .25s,border-color .25s,box-shadow .25s}
.nav.scrolled{background:rgba(244,248,241,.85);backdrop-filter:blur(12px);border-color:var(--line);box-shadow:0 6px 24px -18px rgba(12,42,32,.3)}
.nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:2rem;padding:.9rem 1.5rem}
.nav-links{display:flex;gap:1.8rem;margin-left:auto}
.nav-links a{font-family:"Spline Sans Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.16em;color:var(--ink2);position:relative;padding:.25rem 0}
.nav-links a::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:0;background:var(--neon2);transition:width .25s}
.nav-links a:hover{color:var(--ink)}
.nav-links a:hover::after{width:100%}
@media(max-width:760px){.nav-links{display:none}}
/* hero */
.hero{min-height:100vh;display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:3rem;max-width:1200px;margin:0 auto;padding:8rem 1.5rem 5rem}
@media(max-width:980px){.hero{grid-template-columns:1fr;padding-top:7rem}}
.kicker{display:inline-flex;align-items:center;gap:.5rem;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:.4rem .9rem;font-family:"Spline Sans Mono",monospace;font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--pine2);box-shadow:var(--shadow-soft)}
.hero h1{font-size:clamp(2.6rem,6vw,4.6rem);font-weight:800;line-height:1.02;letter-spacing:-.02em;margin:1.4rem 0 1.2rem}
.hero h1 em{font-style:normal;position:relative;white-space:nowrap}
.hero h1 em::after{content:"";position:absolute;left:-.05em;right:-.05em;bottom:.04em;height:.34em;background:var(--neon);z-index:-1;transform:skewX(-6deg)}
.hero p.sub{font-size:1.13rem;color:var(--ink2);max-width:34rem;line-height:1.65}
/* panel flotante tus pagos */
.pay-panel{position:relative;transform:rotate(2deg)}
.pay-card{background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow-lift);overflow:hidden}
.pay-head{background:var(--pine);color:#fff;padding:1.1rem 1.4rem;display:flex;align-items:center;justify-content:space-between}
.pay-row{display:flex;align-items:center;gap:.9rem;padding:.85rem 1.4rem;border-bottom:1px dashed var(--line);transition:background .15s}
.pay-row:last-child{border-bottom:0}
.pay-row:hover{background:#f7fbf2}
.chip{position:absolute;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-soft);padding:.55rem .9rem;font-family:"Spline Sans Mono",monospace;font-size:11px;font-weight:700;display:flex;align-items:center;gap:.45rem;color:var(--ink2)}
/* secciones */
.section{max-width:1200px;margin:0 auto;padding:5.5rem 1.5rem}
.sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;margin-bottom:2.6rem;flex-wrap:wrap}
.sec-head h2{font-size:clamp(1.9rem,3.6vw,2.9rem);font-weight:800;letter-spacing:-.015em;line-height:1.06;max-width:34rem}
.sec-num{font-family:"Spline Sans Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.2em;color:var(--pine2);text-transform:uppercase;display:block;margin-bottom:.7rem}
/* servicios */
.srv{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:1.7rem;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,border-color .25s;position:relative;overflow:hidden}
.srv::before{content:"";position:absolute;inset:auto 0 0 0;height:3px;background:var(--neon2);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.srv:hover{transform:translateY(-6px);box-shadow:var(--shadow-lift);border-color:var(--pine2)}
.srv:hover::before{transform:scaleX(1)}
.srv-ico{width:46px;height:46px;border-radius:14px;background:rgba(12,59,46,.08);color:var(--pine);display:grid;place-items:center;margin-bottom:1.1rem;transition:background .25s,color .25s}
.srv:hover .srv-ico{background:var(--pine);color:var(--neon)}
.srv h3{font-size:1.15rem;font-weight:700;margin-bottom:.45rem}
.srv p{font-size:.9rem;color:var(--ink2);line-height:1.6}
.grid6{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem}
@media(max-width:900px){.grid6{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.grid6{grid-template-columns:1fr}}
/* pasos */
.step{display:flex;gap:1.4rem;padding:1.6rem;border:1px solid var(--line);background:var(--card);border-radius:18px;transition:transform .25s,box-shadow .25s}
.step:hover{transform:translateX(6px);box-shadow:var(--shadow-soft)}
.step-n{font-family:"Bricolage Grotesque",sans-serif;font-size:2.6rem;font-weight:800;color:transparent;-webkit-text-stroke:1.5px var(--pine2);line-height:1}
/* planes */
.plan{border:1.5px solid var(--line);background:var(--card);border-radius:20px;padding:2rem;display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s,border-color .25s}
.plan:hover{transform:translateY(-6px);box-shadow:var(--shadow-lift)}
.plan-feat{border:1.5px solid var(--pine);box-shadow:var(--shadow-lift);position:relative}
.plan-feat:hover{border-color:var(--pine)}
.plan-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--neon);color:var(--deep);font-family:"Spline Sans Mono",monospace;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:.3rem .85rem;border-radius:999px}
.plan ul{list-style:none;margin:1.3rem 0 1.8rem;display:grid;gap:.6rem}
.plan li{display:flex;gap:.55rem;font-size:.9rem;color:var(--ink2)}
.plan li svg{color:var(--pine2);flex-shrink:0;margin-top:2px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4rem;align-items:stretch}
@media(max-width:900px){.grid3{grid-template-columns:1fr}}
/* marquee */
.mq{overflow:hidden;border-block:1px solid var(--line);background:var(--card);padding:.85rem 0}
.mq-track{display:flex;gap:2.6rem;width:max-content;align-items:center}
.mq span{font-family:"Spline Sans Mono",monospace;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);display:flex;gap:2.6rem;align-items:center;white-space:nowrap}
.mq b{color:var(--neon2)}
/* app shell */
.shell{min-height:100vh;display:grid;grid-template-columns:250px 1fr}
@media(max-width:900px){.shell{grid-template-columns:1fr}}
.side{background:var(--pine);color:#fff;padding:1.4rem 1rem;display:flex;flex-direction:column;gap:.35rem;position:sticky;top:0;height:100vh}
@media(max-width:900px){.side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center}}
.side-item{display:flex;align-items:center;gap:.7rem;padding:.7rem .9rem;border-radius:12px;font-size:.88rem;font-weight:600;color:rgba(255,255,255,.72);border:1px solid transparent;transition:all .18s;text-align:left;background:none;width:100%}
.side-item:hover{background:rgba(255,255,255,.08);color:#fff}
.side-item.on{background:var(--neon);color:var(--deep);box-shadow:var(--shadow-neon)}
.side-foot{margin-top:auto;padding:.9rem;border-radius:14px;background:rgba(255,255,255,.06)}
@media(max-width:900px){.side-foot{margin-top:0;width:100%}}
.topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:1rem;padding:.8rem 1.8rem;border-bottom:1px solid var(--line);background:rgba(244,248,241,.88);backdrop-filter:blur(10px)}
.main{padding:1.8rem;max-width:1180px;width:100%;margin:0 auto}
@media(max-width:640px){.main{padding:1.1rem}.topbar{padding:.8rem 1.1rem}}
.stat{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:1.1rem 1.2rem;box-shadow:var(--shadow-soft);transition:transform .2s,box-shadow .2s}
.stat:hover{transform:translateY(-3px);box-shadow:var(--shadow-lift)}
.stat-acc{background:var(--pine);border-color:var(--pine);color:#fff}
.stat-acc .st-l{color:var(--neon)}
.stat-acc .st-s{color:rgba(255,255,255,.65)}
.st-l{font-family:"Spline Sans Mono",monospace;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:var(--ink3)}
.st-v{font-family:"Bricolage Grotesque",sans-serif;font-size:1.55rem;font-weight:800;margin-top:.35rem;letter-spacing:-.01em}
.st-s{font-size:.78rem;color:var(--ink3);margin-top:.15rem}
.tbl{width:100%;border-collapse:collapse;font-size:.88rem}
.tbl th{font-family:"Spline Sans Mono",monospace;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--ink3);text-align:left;padding:.7rem 1rem;border-bottom:1.5px solid var(--line)}
.tbl td{padding:.75rem 1rem;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl tr:last-child td{border-bottom:0}
.tbl tbody tr{transition:background .15s}
.tbl tbody tr:hover{background:#f7fbf2}
.tnum{font-variant-numeric:tabular-nums}
.dropzone{border:2px dashed rgba(18,82,62,.35);background:rgba(244,248,241,.7);border-radius:18px;padding:3rem 1.5rem;text-align:center;cursor:pointer;transition:all .2s}
.dropzone:hover,.dropzone.over{border-color:var(--neon2);background:rgba(201,242,75,.14);box-shadow:var(--shadow-neon);transform:scale(1.01)}
/* modal y toasts */
.modal-bg{position:fixed;inset:0;z-index:80;background:rgba(7,31,23,.5);backdrop-filter:blur(4px);display:grid;place-items:center;padding:1rem;animation:fadeSwap .25s both}
.modal{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow-lift);width:100%;max-width:520px;max-height:90vh;overflow:auto;padding:1.6rem}
.modal.wide{max-width:760px}
.toast-wrap{position:fixed;bottom:1.2rem;right:1.2rem;z-index:90;display:grid;gap:.6rem;max-width:min(380px,90vw)}
.toast{background:var(--deep);color:#fff;border-radius:14px;padding:.85rem 1.1rem;font-size:.87rem;display:flex;gap:.6rem;align-items:flex-start;box-shadow:var(--shadow-lift);animation:toastIn .35s cubic-bezier(.34,1.56,.64,1) both;border-left:4px solid var(--neon)}
.toast.warn{border-left-color:var(--amber)}
.toast.err{border-left-color:var(--signal)}
/* adminapp oscuro */
.dark{background:var(--deep);color:#fff;min-height:100vh}
.dark .tbl th{color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.12)}
.dark .tbl td{border-color:rgba(255,255,255,.06)}
.dark .tbl tbody tr:hover{background:rgba(255,255,255,.04)}
.dcard{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);border-radius:14px;padding:1.2rem}
.dcard-acc{border-color:rgba(201,242,75,.5);background:rgba(201,242,75,.1)}
.foot{border-top:1px solid var(--line);padding:2.2rem 1.5rem;text-align:center;font-family:"Spline Sans Mono",monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)}
::-webkit-scrollbar{width:9px;height:9px}
::-webkit-scrollbar-thumb{background:#b9c9ba;border-radius:8px}
.dark ::-webkit-scrollbar-thumb{background:#2c5546}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  html{scroll-behavior:auto}
  .reveal{opacity:1!important;transform:none!important}
  .marquee,.float-a,.float-b,.float-c{animation:none!important}
}
</style>
</head>
<body>
<div id="app"></div>
<div class="toast-wrap" id="toasts"></div>
<div id="modal-root"></div>

<script>
(function(){
"use strict";
/* ============ utilidades ============ */
var LS="comunapp_final_v1", LSS="comunapp_final_sesion";
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
var uid=function(p){return (p||"id")+"_"+Math.random().toString(36).slice(2,10);};
var hoy=function(){return new Date().toISOString().slice(0,10);};
var ahora=function(){return new Date().toISOString();};
var mesActual=function(){return new Date().toISOString().slice(0,7);};
var MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
var mesAnterior=function(){var d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);};
var fmt=function(n){return "$"+Math.round(n||0).toLocaleString("es-CL");};
var fmtFecha=function(iso){return new Date(iso).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"});};
var fmtMes=function(p){var pp=p.split("-");return MESES[parseInt(pp[1],10)-1]+" "+pp[0];};
var esc=function(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");};

/* ============ iconos (trazos estilo lucide) ============ */
var IC={
home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/>',
receipt:'<path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
pie:'<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9.5h18"/>',
vote:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="m8.7 12.2 2.3 2.3 4.6-4.9"/>',
mega:'<path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
door:'<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M13 20V4L6 6v14"/><path d="M10 11.5v1"/>',
link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
upload:'<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
check:'<path d="M20 6 9 17l-5-5"/>',
x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9z"/>',
building:'<rect x="4" y="2" width="16" height="20" rx="1.5"/><path d="M9 6h1.5M13.5 6H15M9 10h1.5M13.5 10H15M9 14h1.5M13.5 14H15"/><path d="M10 22v-4h4v4"/>',
shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
chart:'<path d="M3 3v18h18"/><path d="M7 15v-4M12 15V7M17 15v-6"/>',
lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
arrow:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
coins:'<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/>',
bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
sheet:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2M8 17h2M14 13h2M14 17h2"/>',
power:'<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
trend:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
ballot:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="m8.7 12.2 2.3 2.3 4.6-4.9"/>'
};
var ic=function(n,s,cls){s=s||18;return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'+(cls?' class="'+cls+'"':'')+' aria-hidden="true">'+(IC[n]||"")+"</svg>";};
var logo=function(dark){return '<a href="#/" style="display:flex;align-items:center;gap:.6rem;text-decoration:none"><span style="width:34px;height:34px;border-radius:10px;background:'+(dark?"#c9f24b":"#0c3b2e")+';color:'+(dark?"#071f17":"#c9f24b")+';display:grid;place-items:center;font-family:Bricolage Grotesque,sans-serif;font-weight:800;font-size:18px">C</span><span class="font-display" style="font-weight:800;font-size:1.25rem;letter-spacing:-.02em;color:'+(dark?"#fff":"#0e2a20")+'">Comun<span style="color:'+(dark?"#c9f24b":"#12523e")+'">App</span></span></a>';};

/* ============ datos semilla ============ */
function seed(){
  var ma=mesActual(), ma1=mesAnterior();
  var d=new Date(); var dm=function(off){var x=new Date();x.setDate(x.getDate()+off);return x.toISOString().slice(0,10);};
  return {
    comunidad:{id:"c_alamos",nombre:"Los Álamos de Chicureo",direccion:"Av. Los Álamos 1250",ciudad:"Colina",unidades:48,plan:"PARCELAS",creada:"2024-03-10",estado:"ACTIVA",
      vinculacion:{conectada:false,email:null,fecha:null}},
    usuarios:[
      {id:"u_admin",nombre:"Rodrigo Fuentes",email:"admin@losalamos.cl",pass:"admin123",activo:true,rolGlobal:null},
      {id:"u_comite",nombre:"Carla Méndez",email:"comite@losalamos.cl",pass:"comite123",activo:true,rolGlobal:null},
      {id:"u_maria",nombre:"María López",email:"maria@demo.cl",pass:"demo123",activo:true,rolGlobal:null},
      {id:"u_jorge",nombre:"Jorge Salas",email:"jorge@demo.cl",pass:"demo123",activo:true,rolGlobal:null},
      {id:"u_super",nombre:"Valeria Soto",email:"equipo@comunapp.cl",pass:"admin123",activo:true,rolGlobal:"SUPERADMIN"}
    ],
    membresias:[
      {usuarioId:"u_admin",rol:"ADMIN",unidad:null},
      {usuarioId:"u_comite",rol:"COMITE",unidad:null},
      {usuarioId:"u_maria",rol:"PROPIETARIO",unidad:"P-14"},
      {usuarioId:"u_jorge",rol:"ARRENDATARIO",unidad:"P-22"}
    ],
    cobros:[
      {id:"cb1",unidad:"P-14",periodo:ma,concepto:"Pagos del mes",monto:55000,estado:"PAGADO",pagoRef:"MP-88213"},
      {id:"cb2",unidad:"P-14",periodo:ma1,concepto:"Pagos del mes",monto:55000,estado:"PAGADO",pagoRef:"MP-77120"},
      {id:"cb3",unidad:"P-22",periodo:ma,concepto:"Pagos del mes",monto:55000,estado:"PENDIENTE",pagoRef:null},
      {id:"cb4",unidad:"P-22",periodo:ma1,concepto:"Pagos del mes",monto:55000,estado:"VENCIDO",pagoRef:null},
      {id:"cb5",unidad:"P-07",periodo:ma,concepto:"Pagos del mes",monto:55000,estado:"PAGADO",pagoRef:"MP-90341"},
      {id:"cb6",unidad:"P-31",periodo:ma,concepto:"Pagos del mes",monto:55000,estado:"PENDIENTE",pagoRef:null},
      {id:"cb7",unidad:"P-22",periodo:ma,concepto:"Multa · estacionamiento",monto:15000,estado:"PENDIENTE",pagoRef:null}
    ],
    movimientos:[
      {id:"mv1",fecha:dm(-2),tipo:"INGRESO",categoria:"Pagos del mes",descripcion:"Recaudación parcial del mes",monto:165000},
      {id:"mv2",fecha:dm(-4),tipo:"GASTO",categoria:"Mantención",descripcion:"Reparación luminarias acceso norte",monto:86000},
      {id:"mv3",fecha:dm(-9),tipo:"GASTO",categoria:"Servicios",descripcion:"Agua y electricidad áreas comunes",monto:142000},
      {id:"mv4",fecha:dm(-16),tipo:"GASTO",categoria:"Personal",descripcion:"Conserjería y aseo (quincena)",monto:380000},
      {id:"mv5",fecha:dm(-23),tipo:"INGRESO",categoria:"Pagos del mes",descripcion:"Recaudación del mes anterior",monto:2310000},
      {id:"mv6",fecha:dm(-31),tipo:"GASTO",categoria:"Áreas verdes",descripcion:"Jardinería y riego mensual",monto:120000},
      {id:"mv7",fecha:dm(-38),tipo:"GASTO",categoria:"Seguridad",descripcion:"Mantención portón y cámaras",monto:95000},
      {id:"mv8",fecha:dm(-47),tipo:"INGRESO",categoria:"Fondo de reserva",descripcion:"Aporte mensual fondo",monto:240000}
    ],
    avisos:[
      {id:"av1",titulo:"Mantención del agua · martes 10:00 a 13:00",cuerpo:"Se cortará el suministro en el sector norte mientras se repara la matriz. Recomendamos juntar agua con anticipación.",tipo:"URGENTE",autor:"Administración",creado:dm(-1)},
      {id:"av2",titulo:"Ya está disponible el reporte del mes",cuerpo:"El detalle de ingresos y gastos del mes pasado ya se puede revisar en la sección Transparencia.",tipo:"INFORMATIVO",autor:"Comité",creado:dm(-5)},
      {id:"av3",titulo:"Censo de mascotas para el nuevo reglamento",cuerpo:"Cuéntanos qué mascotas viven en tu parcela para preparar los espacios comunes. Responde en la próxima votación.",tipo:"INFORMATIVO",autor:"Comité",creado:dm(-9)}
    ],
    votaciones:[
      {id:"vo1",titulo:"Pintura de fachadas fase 2",pregunta:"¿Apruebas el presupuesto de $3,8 MM para pintar los accesos y cierres perimetrales?",opciones:["Sí, aprobar","No, postergar","Abstención"],abierta:true,creado:dm(-3),
        votos:[{unidad:"P-07",opcion:"Sí, aprobar"},{unidad:"P-31",opcion:"Sí, aprobar"},{unidad:"P-19",opcion:"Abstención"},{unidad:"P-25",opcion:"No, postergar"}]},
      {id:"vo2",titulo:"Cámaras en accesos",pregunta:"¿Instalamos 4 cámaras nuevas en los accesos vehiculares?",opciones:["Sí","No"],abierta:false,creado:dm(-30),
        votos:[{unidad:"P-07",opcion:"Sí"},{unidad:"P-31",opcion:"Sí"},{unidad:"P-14",opcion:"Sí"},{unidad:"P-19",opcion:"Sí"},{unidad:"P-25",opcion:"No"}]}
    ],
    reservas:[
      {id:"re1",area:"Quincho central",fecha:dm(3),bloque:"19:00 – 23:00",unidad:"P-14",quien:"María López"},
      {id:"re2",area:"Sala multiuso",fecha:dm(6),bloque:"10:00 – 13:00",unidad:"P-31",quien:"Pedro Núñez"}
    ],
    bitacora:[
      {id:"bi1",visitante:"Carlos Reyes (Gasco)",tipo:"PROVEEDOR",unidad:"general",entrada:dm(-1)+"T09:12",salida:dm(-1)+"T10:05"},
      {id:"bi2",visitante:"Fernanda Paz",tipo:"VISITA",unidad:"P-22",entrada:hoy()+"T18:40",salida:null},
      {id:"bi3",visitante:"Jardines SpA",tipo:"PROVEEDOR",unidad:"general",entrada:hoy()+"T08:30",salida:null}
    ],
    eventos:[
      {id:"ev1",fecha:ahora(),texto:"Comunidad «Los Álamos de Chicureo» inició sesión (ADMIN)."},
      {id:"ev2",fecha:ahora(),texto:"Se generaron los pagos del mes para 48 unidades."},
      {id:"ev3",fecha:ahora(),texto:"Pago en línea recibido de P-14 vía Mercado Pago ($55.000)."},
      {id:"ev4",fecha:ahora(),texto:"Nueva votación creada: «Pintura de fachadas fase 2»."}
    ]
  };
}
function load(){
  try{var raw=localStorage.getItem(LS);if(raw)return JSON.parse(raw);}catch(e){}
  var db=seed();localStorage.setItem(LS,JSON.stringify(db));return db;
}
function save(db){localStorage.setItem(LS,JSON.stringify(db));}
function ev(db,txt){db.eventos.unshift({id:uid("ev"),fecha:ahora(),texto:txt});db.eventos=db.eventos.slice(0,40);}

/* ============ API simulada ============ */
var api={
  login:function(email,pass){return sleep(500).then(function(){
    var db=load();
    var u=null;for(var i=0;i<db.usuarios.length;i++){if(db.usuarios[i].email.toLowerCase()===String(email).toLowerCase())u=db.usuarios[i];}
    if(!u||u.pass!==pass)throw new Error("Correo o contraseña incorrectos.");
    if(!u.activo)throw new Error("Esta cuenta está suspendida. Contacta a la administración.");
    var s={usuarioId:u.id,nombre:u.nombre,email:u.email};
    if(u.rolGlobal==="SUPERADMIN"){s.rol="SUPERADMIN";s.comunidadId=null;s.unidad=null;}
    else{var m=db.membresias.filter(function(x){return x.usuarioId===u.id;})[0];
      if(!m)throw new Error("Tu cuenta no pertenece a ninguna comunidad.");
      s.rol=m.rol;s.comunidadId=db.comunidad.id;s.unidad=m.unidad||null;}
    ev(db,"Inicio de sesión: "+u.nombre+" ("+s.rol+").");save(db);
    return s;
  });},
  datos:function(){return sleep(250).then(function(){var db=load();return JSON.parse(JSON.stringify(db));});},
  generarMes:function(monto){return sleep(650).then(function(){var db=load();var per=mesActual();var creados=0;
    for(var i=0;i<db.membresias.length;i++){var m=db.membresias[i];
      if(m.rol!=="PROPIETARIO"&&m.rol!=="ARRENDATARIO")continue;
      var ex=db.cobros.some(function(c){return c.periodo===per&&c.unidad===m.unidad&&c.concepto==="Pagos del mes";});
      if(!ex){db.cobros.push({id:uid("cb"),unidad:m.unidad,periodo:per,concepto:"Pagos del mes",monto:monto,estado:"PENDIENTE",pagoRef:null});creados++;}}
    ev(db,"Se generaron los pagos del mes ("+fmtMes(per)+") para "+creados+" unidades.");save(db);return {creados:creados,periodo:per};});},
  pagarOnline:function(cobroId){return sleep(900).then(function(){var db=load();
    var c=db.cobros.filter(function(x){return x.id===cobroId;})[0];if(!c)throw new Error("Cobro no encontrado.");
    if(c.estado==="PAGADO")throw new Error("Este pago ya fue pagado.");
    c.estado="PAGADO";c.pagoRef="MP-"+Math.floor(10000+Math.random()*89999);
    db.movimientos.unshift({id:uid("mv"),fecha:hoy(),tipo:"INGRESO",categoria:"Pagos del mes",descripcion:"Pago en línea "+c.unidad+" ("+c.pagoRef+")",monto:c.monto});
    ev(db,"Pago en línea de "+c.unidad+" vía Mercado Pago ("+fmt(c.monto)+").");save(db);return JSON.parse(JSON.stringify(c));});},
  registrarPago:function(cobroId){return sleep(500).then(function(){var db=load();
    var c=db.cobros.filter(function(x){return x.id===cobroId;})[0];if(!c)throw new Error("Cobro no encontrado.");
    c.estado="PAGADO";c.pagoRef="CAJA-"+Math.floor(1000+Math.random()*8999);
    db.movimientos.unshift({id:uid("mv"),fecha:hoy(),tipo:"INGRESO",categoria:"Pagos del mes",descripcion:"Pago en caja "+c.unidad,monto:c.monto});
    ev(db,"Pago registrado en caja para "+c.unidad+" ("+fmt(c.monto)+").");save(db);return c;});},
  nuevoMov:function(d){return sleep(450).then(function(){var db=load();
    db.movimientos.unshift({id:uid("mv"),fecha:d.fecha,tipo:d.tipo,categoria:d.categoria,descripcion:d.descripcion,monto:d.monto});
    ev(db,(d.tipo==="GASTO"?"Gasto":"Ingreso")+" registrado: "+d.descripcion+" ("+fmt(d.monto)+").");save(db);});},
  nuevoAviso:function(d){return sleep(450).then(function(){var db=load();
    db.avisos.unshift({id:uid("av"),titulo:d.titulo,cuerpo:d.cuerpo,tipo:d.tipo,autor:d.autor,creado:hoy()});
    ev(db,"Aviso publicado: «"+d.titulo+"».");save(db);});},
  reservar:function(d){return sleep(450).then(function(){var db=load();
    var choque=db.reservas.some(function(r){return r.area===d.area&&r.fecha===d.fecha&&r.bloque===d.bloque;});
    if(choque)throw new Error("Ese horario ya está reservado. Elige otro bloque.");
    db.reservas.push({id:uid("re"),area:d.area,fecha:d.fecha,bloque:d.bloque,unidad:d.unidad,quien:d.quien});
    ev(db,"Reserva de "+d.area+" por "+d.unidad+" ("+d.fecha+" "+d.bloque+").");save(db);});},
  cancelarReserva:function(id){return sleep(350).then(function(){var db=load();
    db.reservas=db.reservas.filter(function(r){return r.id!==id;});ev(db,"Se canceló una reserva de área común.");save(db);});},
  votar:function(votId,opcion,unidad){return sleep(400).then(function(){var db=load();
    var v=db.votaciones.filter(function(x){return x.id===votId;})[0];if(!v)throw new Error("Votación no encontrada.");
    if(!v.abierta)throw new Error("Esta votación ya está cerrada.");
    var ya=v.votos.some(function(x){return x.unidad===unidad;});if(ya)throw new Error("Tu parcela ya votó en esta asamblea.");
    v.votos.push({unidad:unidad,opcion:opcion});ev(db,"Voto registrado en «"+v.titulo+"» ("+unidad+").");save(db);});},
  nuevaVotacion:function(d){return sleep(450).then(function(){var db=load();
    db.votaciones.unshift({id:uid("vo"),titulo:d.titulo,pregunta:d.pregunta,opciones:d.opciones,abierta:true,creado:hoy(),votos:[]});
    ev(db,"Nueva votación creada: «"+d.titulo+"».");save(db);});},
  nuevoVecino:function(d){return sleep(550).then(function(){var db=load();
    if(db.usuarios.some(function(u){return u.email.toLowerCase()===d.email.toLowerCase();}))throw new Error("Ya existe una cuenta con ese correo.");
    var u={id:uid("u"),nombre:d.nombre,email:d.email,pass:d.password,activo:true,rolGlobal:null};
    db.usuarios.push(u);db.membresias.push({usuarioId:u.id,rol:d.rol,unidad:d.unidad||null});
    ev(db,"Nuevo vecino creado: "+d.nombre+" ("+d.rol+(d.unidad?", "+d.unidad:"")+").");save(db);});},
  importar:function(filas){return sleep(1100).then(function(){var db=load();var vecinos=0,cargos=0;
    filas.forEach(function(f){
      var ex=db.membresias.some(function(m){return m.unidad===f.parcela;});
      if(!ex){
        var email=f.correo;var k=2;
        while(db.usuarios.some(function(u){return u.email.toLowerCase()===email.toLowerCase();})){email=f.correo.replace("@",k+++"@");}
        var u={id:uid("u"),nombre:f.propietario,email:email,pass:"vecino123",activo:true,rolGlobal:null};
        db.usuarios.push(u);db.membresias.push({usuarioId:u.id,rol:"PROPIETARIO",unidad:f.parcela});vecinos++;
        if(f.deuda>0){db.cobros.push({id:uid("cb"),unidad:f.parcela,periodo:mesActual(),concepto:"Deuda inicial importada",monto:f.deuda,estado:"PENDIENTE",pagoRef:null});cargos++;}
      }
    });
    db.comunidad.unidades+=filas.filter(function(f){return !db.membresias.some(function(m){return m.unidad===f.parcela;});}).length;
    ev(db,"Importación CSV: "+vecinos+" vecinos nuevos y "+cargos+" deudas cargadas.");save(db);
    return {parcelas:filas.length,vecinos:vecinos,cargos:cargos};});},
  vincularMP:function(email){return sleep(900).then(function(){var db=load();
    db.comunidad.vinculacion={conectada:true,email:email,fecha:hoy()};
    ev(db,"Comunidad vinculada a Mercado Pago ("+email+").");save(db);});},
  desvincularMP:function(){return sleep(400).then(function(){var db=load();
    db.comunidad.vinculacion={conectada:false,email:null,fecha:null};
    ev(db,"Se desconectó la cuenta de Mercado Pago.");save(db);});},
  acceso:function(d){return sleep(350).then(function(){var db=load();
    db.bitacora.unshift({id:uid("bi"),visitante:d.visitante,tipo:d.tipo,unidad:d.unidad||"general",entrada:ahora().slice(0,16),salida:null});
    ev(db,"Ingreso registrado: "+d.visitante+" ("+d.tipo+").");save(db);});},
  salida:function(id){return sleep(300).then(function(){var db=load();
    for(var i=0;i<db.bitacora.length;i++){if(db.bitacora[i].id===id)db.bitacora[i].salida=ahora().slice(0,16);}
    save(db);});},
  toggleTenant:function(){return sleep(500).then(function(){var db=load();
    db.comunidad.estado=db.comunidad.estado==="ACTIVA"?"SUSPENDIDA":"ACTIVA";
    ev(db,"Tenant "+(db.comunidad.estado==="ACTIVA"?"reactivado":"suspendido")+" por superadmin.");save(db);return db.comunidad.estado;});}
};

/* ============ estado y sesion ============ */
var sesion=null;try{sesion=JSON.parse(localStorage.getItem(LSS)||"null");}catch(e){}
function setSesion(s){sesion=s;if(s)localStorage.setItem(LSS,JSON.stringify(s));else localStorage.removeItem(LSS);}
var S={datos:null,modulo:"inicio",pagoFase:null,pagoCobro:null,previewCSV:null};
var ROL_LABEL={SUPERADMIN:"Superadmin",ADMIN:"Administrador",COMITE:"Comité",PROPIETARIO:"Propietario",ARRENDATARIO:"Arrendatario"};

/* ============ toasts y modal ============ */
function toast(msg,tipo){
  var w=document.getElementById("toasts");
  var t=document.createElement("div");t.className="toast"+(tipo==="warn"?" warn":tipo==="err"?" err":"");
  t.innerHTML=ic(tipo==="warn"?"alert":tipo==="err"?"x":"check",16)+"<span>"+esc(msg)+"</span>";
  w.appendChild(t);
  setTimeout(function(){t.style.transition="opacity .4s,transform .4s";t.style.opacity="0";t.style.transform="translateY(10px)";setTimeout(function(){t.remove();},420);},3600);
}
function openModal(titulo,cuerpo,wide){
  document.getElementById("modal-root").innerHTML=
    '<div class="modal-bg" data-act="cerrar-modal-fondo"><div class="modal pop-in'+(wide?" wide":"")+'" data-stop>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem">'+
    '<h3 class="font-display" style="font-size:1.3rem;font-weight:800">'+esc(titulo)+"</h3>"+
    '<button class="btn btn-ghost btn-sm" data-act="cerrar-modal" aria-label="Cerrar">'+ic("x",16)+"</button></div>"+
    "<div>"+cuerpo+"</div></div></div>";
}
function closeModal(){document.getElementById("modal-root").innerHTML="";}

/* ============ helpers de render ============ */
function tagEstado(e){
  var c=e==="PAGADO"||e==="ACTIVA"?"tag-pago":e==="PENDIENTE"?"tag-pendiente":"tag-vencido";
  return '<span class="tag '+c+'">'+esc(e.toLowerCase())+"</span>";
}
function statCard(l,v,s,acc,d){
  return '<div class="stat card-in'+(acc?" stat-acc":"")+'" style="--d:'+(d||0)+'ms"><div class="st-l">'+esc(l)+'</div><div class="st-v tnum">'+v+"</div>"+(s?'<div class="st-s">'+esc(s)+"</div>":"")+"</div>";
}
function graficoMovs(movs){
  var map={};
  movs.forEach(function(m){var p=m.fecha.slice(0,7);if(!map[p])map[p]={g:0,i:0};if(m.tipo==="GASTO")map[p].g+=m.monto;else map[p].i+=m.monto;});
  var keys=Object.keys(map).sort();
  var max=1;keys.forEach(function(k){max=Math.max(max,map[k].g,map[k].i);});
  var bars=keys.map(function(k,i){
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:56px">'+
    '<div style="display:flex;gap:4px;align-items:flex-end;height:130px;width:100%;justify-content:center">'+
    '<div class="bar-up" title="Ingresos '+fmtMes(k)+": "+fmt(map[k].i)+'" style="width:22px;height:'+Math.max(4,map[k].i/max*100)+'%;background:#12523e;border-radius:6px 6px 2px 2px;animation-delay:'+(i*70)+'ms"></div>'+
    '<div class="bar-up" title="Gastos '+fmtMes(k)+": "+fmt(map[k].g)+'" style="width:22px;height:'+Math.max(4,map[k].g/max*100)+'%;background:#c9f24b;border-radius:6px 6px 2px 2px;animation-delay:'+(i*70+90)+'ms"></div></div>'+
    '<span class="mono" style="font-size:9.5px;color:var(--ink3);text-transform:uppercase">'+fmtMes(k).split(" ")[0].slice(0,3)+"</span></div>";
  }).join("");
  return '<div style="display:flex;gap:.6rem;align-items:flex-end;overflow-x:auto;padding-bottom:.4rem">'+bars+"</div>"+
  '<div style="display:flex;gap:1.4rem;margin-top:.9rem;font-family:Spline Sans Mono,monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3)">'+
  '<span style="display:flex;align-items:center;gap:.4rem"><i style="width:10px;height:10px;background:#12523e;border-radius:3px;display:inline-block"></i>Ingresos</span>'+
  '<span style="display:flex;align-items:center;gap:.4rem"><i style="width:10px;height:10px;background:#c9f24b;border-radius:3px;display:inline-block"></i>Gastos</span></div>';
}
function seriePagos(cobros){
  var dias=[];for(var i=13;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);dias.push(d.toISOString().slice(0,10));}
  var out=dias.map(function(dia){
    var rel=cobros.filter(function(c){return c.estado==="PAGADO";});
    var monto=0,pagos=0;
    rel.forEach(function(c,k){if((k*3)%14===dias.indexOf(dia)%14||dia===hoy()){}});
    return {dia:dia.slice(8),monto:((parseInt(dia.slice(8),10)*7919)%4+1)*46000+18000,pagos:((parseInt(dia.slice(8),10)*31)%3)+1};
  });
  return out;
}

/* ============ VISTA: landing ============ */
function viewLanding(){
  var servicios=[
    ["coins","Cobranza inteligente","Recibe los pagos del mes, cuotas y multas automáticamente. Todo en línea, sin perseguir a nadie."],
    ["door","Control de acceso","Registro de visitas y proveedores, con historial detallado de entradas y salidas."],
    ["calendar","Reservas de espacios","Quinchos, salas y áreas comunes con calendario. Sin listas de cuaderno ni dobles reservas."],
    ["vote","Votaciones de vecinos","Asambleas y decisiones con voto digital. Un voto por parcela, resultados al instante."],
    ["mega","Muro de avisos","Comunicados y avisos de emergencia que llegan a todos. Se acabó el grupo de chat saturado."],
    ["pie","Transparencia total","Cada ingreso y gasto a la vista de toda la comunidad, con reportes claros mes a mes."]
  ];
  var srvHtml=servicios.map(function(s,i){
    return '<div class="srv card-in" style="--d:'+(i*70)+'ms"><div class="srv-ico">'+ic(s[0],22)+"</div><h3>"+s[1]+"</h3><p>"+s[2]+"</p></div>";
  }).join("");
  var pasos=[
    ["Configura tu espacio","El administrador crea la comunidad con su nombre y unidades. Todo queda seguro y organizado."],
    ["Invita a tu gente","Vecinos, comité y arrendatarios entran con su cuenta. Cada quien ve exactamente lo que le corresponde."],
    ["Todo en orden","Pagos del mes, reservas, votaciones y avisos funcionando desde el primer día."]
  ];
  var pasosHtml=pasos.map(function(p,i){
    return '<div class="step card-in" style="--d:'+(i*90)+'ms"><div class="step-n">'+(i+1)+'</div><div><h3 class="font-display" style="font-size:1.15rem;font-weight:700;margin-bottom:.3rem">'+p[0]+"</h3><p style='font-size:.9rem;color:var(--ink2)'>"+p[1]+"</p></div></div>";
  }).join("");
  var demoPagos='<div class="pay-card"><div class="pay-head"><div><div class="mono" style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;opacity:.75">Tus Pagos</div><div class="font-display" style="font-weight:800;font-size:1.15rem;margin-top:.15rem">Pagos del mes</div></div><span class="tag" style="background:rgba(201,242,75,.15);color:#c9f24b">al día</span></div>'+
  '<div class="pay-row"><div style="width:38px;height:38px;border-radius:11px;background:rgba(18,82,62,.1);color:#12523e;display:grid;place-items:center">'+ic("home",18)+'</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.9rem">Parcela P-14 · '+esc(fmtMes(mesActual()))+'</div><div class="mono" style="font-size:10px;color:var(--ink3);text-transform:uppercase">vence el 10</div></div><div class="tnum mono" style="font-weight:700">$55.000</div><button class="btn btn-neon btn-sm" data-act="demo-pagar">Pagar</button></div>'+
  '<div class="pay-row"><div style="width:38px;height:38px;border-radius:11px;background:rgba(217,160,54,.15);color:#8a6114;display:grid;place-items:center">'+ic("alert",18)+'</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.9rem">Multa estacionamiento</div><div class="mono" style="font-size:10px;color:var(--ink3);text-transform:uppercase">registro 204</div></div><div class="tnum mono" style="font-weight:700">$15.000</div><button class="btn btn-ghost btn-sm" data-act="demo-pagar">Ver</button></div>'+
  '<div class="pay-row"><div style="width:38px;height:38px;border-radius:11px;background:rgba(18,82,62,.1);color:#12523e;display:grid;place-items:center">'+ic("check",18)+'</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.9rem">Parcela P-14 · '+esc(fmtMes(mesAnterior()))+'</div><div class="mono" style="font-size:10px;color:var(--ink3);text-transform:uppercase">pagado con Mercado Pago</div></div><div class="tnum mono" style="font-weight:700;color:#12523e">$55.000</div><span class="tag tag-pago">pagado</span></div>'+
  '<div style="padding:1rem 1.4rem;background:#f7fbf2;display:flex;justify-content:space-between;align-items:center"><span class="mono" style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)">Total del mes</span><span class="tnum font-display" style="font-weight:800;font-size:1.2rem">$70.000</span></div></div>'+
  '<div class="chip float-a" style="top:-22px;right:-14px">'+ic("check",13)+'<span style="color:#12523e">Pago recibido</span></div>'+
  '<div class="chip float-b" style="bottom:38px;left:-30px">'+ic("calendar",13)+" Quincho · sábado 20:00</div>"+
  '<div class="chip float-c" style="bottom:-16px;right:36px">'+ic("vote",13)+" 12 votos · Pintura fase 2</div>";

  return '<div class="dotgrid-soft glow-hero">'+
  '<header class="nav" id="nav"><div class="nav-inner">'+logo(false)+
  '<nav class="nav-links"><a href="#/" data-scroll="comunidad">TU COMUNIDAD</a><a href="#/" data-scroll="servicios">SERVICIOS</a><a href="#/" data-scroll="planes">PLANES</a></nav>'+
  (sesion?'<a href="#/dashboard" class="btn btn-pine btn-sm" style="margin-left:auto">Mi panel '+ic("arrow",14)+"</a>"
        :'<a href="#/entrar" class="btn btn-pine btn-sm" style="margin-left:auto">Entrar</a>')+
  "</div></header>"+
  '<section class="hero"><div class="reveal in"><span class="kicker">'+ic("spark",14)+" Administración de comunidades</span>"+
  "<h1>TU COMUNIDAD,<br>ADMINISTRADA EN <em>ORDEN.</em></h1>"+
  '<p class="sub">Centraliza pagos, reservas y comunicación. ComunApp simplifica la vida con tus vecinos.</p>'+
  '<div style="display:flex;gap:.9rem;margin-top:2rem;flex-wrap:wrap"><a href="#/entrar" class="btn btn-neon btn-lg">Probar gratis '+ic("arrow",17)+"</a>"+
  '<a href="#/" class="btn btn-ghost btn-lg" data-scroll="servicios">Ver servicios</a></div>'+
  '<div style="display:flex;gap:1.6rem;margin-top:2.6rem;flex-wrap:wrap">'+
  '<div><div class="tnum font-display" style="font-weight:800;font-size:1.5rem">98%</div><div class="mono" style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink3)">recaudación al día</div></div>'+
  '<div><div class="tnum font-display" style="font-weight:800;font-size:1.5rem">+120</div><div class="mono" style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink3)">comunidades activas</div></div>'+
  '<div><div class="tnum font-display" style="font-weight:800;font-size:1.5rem">24/7</div><div class="mono" style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink3)">pagos disponibles</div></div></div></div>'+
  '<div class="reveal in pay-panel" style="justify-self:center;width:min(400px,100%)">'+demoPagos+"</div></section>"+
  '<div class="mq"><div class="mq-track"><span>Pagos del mes <b>◆</b> Reservas <b>◆</b> Votaciones <b>◆</b> Avisos <b>◆</b> Control de acceso <b>◆</b> Transparencia <b>◆</b> Mercado Pago <b>◆</b>&nbsp;</span><span>Pagos del mes <b>◆</b> Reservas <b>◆</b> Votaciones <b>◆</b> Avisos <b>◆</b> Control de acceso <b>◆</b> Transparencia <b>◆</b> Mercado Pago <b>◆</b>&nbsp;</span></div></div>'+
  '<section class="section" id="comunidad"><div class="sec-head"><div class="reveal"><span class="sec-num">01 · Tu comunidad</span><h2>Un solo lugar para todo lo que pasa entre vecinos.</h2></div>'+
  '<p class="reveal" style="max-width:26rem;color:var(--ink2);font-size:.95rem">Cada comunidad es un espacio privado con su propia gente, sus pagos y su historial. Nadie se cruza con nadie.</p></div>'+
  '<div class="grid3">'+
  '<div class="card card-in" style="padding:1.7rem"><div class="srv-ico">'+ic("building",22)+'</div><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.4rem">Tu Espacio</h3><p style="font-size:.9rem;color:var(--ink2)">Parcelas, unidades, vecinos y sus cuentas. La base ordenada de tu comunidad.</p></div>'+
  '<div class="card card-in" style="padding:1.7rem;--d:90ms"><div class="srv-ico">'+ic("shield",22)+'</div><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.4rem">Equipo Administrador</h3><p style="font-size:.9rem;color:var(--ink2)">Administrador y comité con roles claros: quién cobra, quién supervisa, quién decide.</p></div>'+
  '<div class="card card-in" style="padding:1.7rem;--d:180ms"><div class="srv-ico">'+ic("ballot",22)+'</div><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.4rem">Votación de Vecinos</h3><p style="font-size:.9rem;color:var(--ink2)">Las decisiones importantes se votan en línea, con un voto por parcela y resultado inmediato.</p></div></div></section>'+
  '<section class="section" id="servicios" style="padding-top:2rem"><div class="sec-head"><div class="reveal"><span class="sec-num">02 · Servicios</span><h2>Todo lo que tu comunidad necesita. Nada que sobre.</h2></div></div>'+
  '<div class="grid6">'+srvHtml+"</div></section>"+
  '<section class="section" style="padding-top:2rem"><div class="sec-head"><div class="reveal"><span class="sec-num">03 · Cómo funciona</span><h2>De la gestión manual a la simplicidad en tres pasos.</h2></div></div>'+
  '<div style="display:grid;gap:1rem;max-width:52rem">'+pasosHtml+"</div></section>"+
  '<section class="section" id="planes" style="padding-top:2rem"><div class="sec-head"><div class="reveal"><span class="sec-num">04 · Planes</span><h2>Precios simples, sin letra chica.</h2></div></div>'+
  '<div class="grid3">'+
  '<div class="plan card-in"><h3 class="font-display" style="font-size:1.3rem;font-weight:800">Comité</h3><p style="color:var(--ink3);font-size:.85rem;margin-top:.2rem">para partir ordenados</p><div style="margin-top:1.1rem"><span class="tnum font-display" style="font-size:2.4rem;font-weight:800">$0</span><span style="color:var(--ink3);font-size:.85rem"> / mes</span></div>'+
  "<ul><li>"+ic("check",15)+" Hasta 20 unidades</li><li>"+ic("check",15)+" Muro de avisos y votaciones</li><li>"+ic("check",15)+" Reservas de espacios</li><li>"+ic("check",15)+" 1 administrador</li></ul>"+
  '<a href="#/entrar" class="btn btn-ghost" style="margin-top:auto">Empezar gratis</a></div>'+
  '<div class="plan plan-feat card-in" style="--d:90ms"><span class="plan-badge">Más elegido</span><h3 class="font-display" style="font-size:1.3rem;font-weight:800">Comunidad de Parcelas</h3><p style="color:var(--ink3);font-size:.85rem;margin-top:.2rem">para comunidades en crecimiento</p><div style="margin-top:1.1rem"><span class="tnum font-display" style="font-size:2.4rem;font-weight:800">$29.900</span><span style="color:var(--ink3);font-size:.85rem"> / mes</span></div>'+
  "<ul><li>"+ic("check",15)+" Unidades ilimitadas</li><li>"+ic("check",15)+" Cobranza con Mercado Pago</li><li>"+ic("check",15)+" Transparencia y reportes</li><li>"+ic("check",15)+" Comité + administrador</li><li>"+ic("check",15)+" Control de acceso</li></ul>"+
  '<a href="#/entrar" class="btn btn-neon" style="margin-top:auto">Elegir este plan</a></div>'+
  '<div class="plan card-in" style="--d:180ms"><h3 class="font-display" style="font-size:1.3rem;font-weight:800">Personalizado</h3><p style="color:var(--ink3);font-size:.85rem;margin-top:.2rem">a tu medida</p><div style="margin-top:1.1rem"><span class="tnum font-display" style="font-size:2.4rem;font-weight:800">Hablemos</span></div>'+
  "<ul><li>"+ic("check",15)+" Para comunidades con necesidades específicas</li><li>"+ic("check",15)+" Soporte Premium</li><li>"+ic("check",15)+" Integraciones personalizadas y más</li></ul>"+
  '<button class="btn btn-pine" style="margin-top:auto" data-act="cotizar">Cotizar</button></div></div>'+
  '<div class="reveal" style="text-align:center;margin-top:3rem"><button class="btn btn-neon btn-xl" data-act="cotizar">COTIZA TU PLAN A LA MEDIDA</button>'+
  '<p class="mono" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--ink3);margin-top:.9rem">Respuesta en menos de 24 horas · sin compromiso</p></div></section>'+
  '<footer class="foot">ComunApp · tu comunidad, administrada en orden · <a href="#/entrar" style="color:var(--pine2)">entrar</a></footer></div>';
}

/* ============ VISTA: entrar ============ */
var QUICK=[
  ["Propietaria","maria@demo.cl","demo123","#e09a31"],
  ["Arrendatario","jorge@demo.cl","demo123","#b0793a"],
  ["Administrador","admin@losalamos.cl","admin123","#12523e"],
  ["Comité","comite@losalamos.cl","comite123","#1f7d72"],
  ["Superadmin","equipo@comunapp.cl","admin123","#c9f24b"]
];
function viewEntrar(){
  var qs=QUICK.map(function(q){
    return '<button class="btn btn-ghost" style="justify-content:flex-start;font-family:Spline Sans Mono,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.06em" data-act="entrar-rapido" data-email="'+esc(q[1])+'" data-pass="'+esc(q[2])+'" data-label="'+esc(q[0])+'"><i style="width:9px;height:9px;border-radius:50%;background:'+q[3]+';flex-shrink:0"></i>'+q[0]+"</button>";
  }).join("");
  return '<div class="dotgrid" style="min-height:100vh;display:grid;grid-template-columns:1fr 1fr">'+
  '<aside class="dotgrid-dark" style="background:var(--pine);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:2.6rem;position:relative;overflow:hidden">'+
  "<div>"+logo(true)+"</div>"+
  '<div style="position:relative;z-index:1"><span class="mono" style="font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--neon)">— Acceso a tu comunidad</span>'+
  '<h1 class="font-display" style="font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;line-height:1.05;margin-top:1.2rem">La comunidad<br>te <span style="color:var(--neon)">espera.</span></h1>'+
  '<p style="margin-top:1.2rem;max-width:24rem;color:rgba(255,255,255,.72);font-size:.95rem">Cada rol entra a su propio panel: quien administra, quien supervisa y cada vecino ven exactamente lo que les corresponde.</p>'+
  '<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.6rem">'+QUICK.map(function(q){return '<span class="mono" style="display:flex;align-items:center;gap:.4rem;border:1px solid rgba(255,255,255,.25);padding:.35rem .7rem;border-radius:999px;font-size:10px;text-transform:uppercase;letter-spacing:.1em"><i style="width:7px;height:7px;background:'+q[3]+';border-radius:50%"></i>'+q[0]+"</span>";}).join("")+"</div></div>"+
  '<div class="mono" style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5);display:flex;justify-content:space-between;position:relative;z-index:1"><span>sesión segura</span><span style="display:flex;align-items:center;gap:.5rem"><i class="pulse-dot" style="width:8px;height:8px;border-radius:50%;background:var(--neon)"></i>en línea</span></div>'+
  '<svg style="position:absolute;right:-40px;bottom:-40px;width:340px;height:340px;color:rgba(201,242,75,.1)" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2"><path d="M30 180V60l50-30 50 30v120M130 180V90l40-24v114M10 180h180M50 80h14m18 0h14M50 110h14m18 0h14M50 140h14m18 0h14M65 180v-28h22v28"/></svg></aside>'+
  '<main style="display:grid;place-items:center;padding:2.5rem 1.5rem"><div style="width:100%;max-width:26rem" class="fade-swap">'+
  '<div class="card" style="padding:2rem;border-width:1.5px;border-color:var(--pine);box-shadow:var(--shadow-lift)">'+
  '<span class="mono" style="font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--pine2)">— Iniciar sesión</span>'+
  '<h2 class="font-display" style="font-size:1.7rem;font-weight:800;margin-top:.4rem">Bienvenido de vuelta</h2>'+
  '<p style="font-size:.88rem;color:var(--ink3);margin-top:.3rem">Entra con tu cuenta de la comunidad.</p>'+
  '<form data-form="login" style="margin-top:1.5rem;display:grid;gap:1rem">'+
  '<div><label class="fl">Correo electrónico</label><input class="field" type="email" name="email" placeholder="tu@correo.cl" autocomplete="username"></div>'+
  '<div><label class="fl">Contraseña</label><input class="field" type="password" name="pass" placeholder="••••••••" autocomplete="current-password"></div>'+
  '<div id="login-error"></div>'+
  '<button class="btn btn-neon btn-lg btn-block" type="submit" id="login-btn">Ingresar '+ic("arrow",16)+"</button></form>"+
  '<div style="margin-top:1.6rem"><p class="mono" style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--ink3);margin-bottom:.6rem">Acceso rápido · demo</p>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">'+qs+"</div>"+
  '<p style="margin-top:.9rem;font-size:.8rem;color:var(--ink3)">Ambiente de demostración: los datos viven en tu navegador.</p></div></div>'+
  '<a href="#/" class="mono" style="display:inline-flex;align-items:center;gap:.5rem;margin-top:1.4rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--ink2)">← volver al sitio</a>'+
  "</div></main></div>";
}

/* ============ VISTA: dashboard ============ */
function modulosDe(rol){
  var base=[
    ["inicio","Inicio","home"],
    ["tuspagos","Tus Pagos","wallet"],
    ["historial","Pagos del mes","receipt"]
  ];
  if(rol==="ADMIN"||rol==="COMITE"){
    base=[["inicio","Inicio","home"],["historial","Pagos del mes","receipt"],["cobranza","Cobros en línea","link"],["transparencia","Transparencia","pie"],["avisos","Avisos","mega"],["vecinos","Vecinos","users"]];
    if(rol==="ADMIN"){base.push(["acceso","Control de acceso","door"]);}
    base.push(["votaciones","Votaciones","vote"]);
  }else{
    base.push(["transparencia","Transparencia","pie"],["avisos","Avisos","mega"]);
    if(rol==="PROPIETARIO"){base.push(["reservas","Reservas","calendar"],["votaciones","Votaciones","vote"]);}
  }
  return base;
}
function viewDashboard(){
  if(!sesion)return viewEntrar();
  var d=S.datos;
  var rol=sesion.rol;
  var mods=modulosDe(rol);
  var side=mods.map(function(m){
    return '<button class="side-item'+(S.modulo===m[0]?" on":"")+'" data-act="modulo" data-mod="'+m[0]+'">'+ic(m[2],17)+"<span>"+m[1]+"</span></button>";
  }).join("");
  return '<div class="shell"><aside class="side"><div style="padding:.4rem .9rem 1rem">'+logo(true)+"</div>"+side+
  '<div class="side-foot"><div style="display:flex;align-items:center;gap:.6rem"><span style="width:34px;height:34px;border-radius:10px;background:var(--neon);color:var(--deep);display:grid;place-items:center;font-family:Bricolage Grotesque,sans-serif;font-weight:800;font-size:13px;flex-shrink:0">'+esc(sesion.nombre.split(" ").map(function(p){return p[0];}).slice(0,2).join(""))+"</span>"+
  '<div style="min-width:0"><div style="font-size:.85rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(sesion.nombre)+"</div>"+
  '<div class="mono" style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--neon)">'+esc(ROL_LABEL[rol])+"</div></div></div>"+
  '<button class="btn btn-outline-light btn-sm btn-block" style="margin-top:.8rem" data-act="salir">'+ic("logout",13)+" Salir</button></div></aside>"+
  '<div style="min-width:0"><div class="topbar"><div>'+
  '<div class="mono" style="font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink3)">'+esc(d.comunidad.nombre)+" · "+esc(d.comunidad.ciudad)+"</div>"+
  '<div class="font-display" style="font-weight:800;font-size:1.15rem">'+tituloModulo(S.modulo,rol)+"</div></div>"+
  '<div style="margin-left:auto;display:flex;align-items:center;gap:.7rem">'+
  '<span class="tag tag-rol">'+esc(ROL_LABEL[rol])+"</span>"+
  (sesion.unidad?'<span class="tag tag-info">'+esc(sesion.unidad)+"</span>":"")+
  "</div></div>"+
  '<main class="main">'+renderModulo()+"</main></div></div>";
}
function tituloModulo(m,rol){
  var t={inicio:"Hola, "+sesion.nombre.split(" ")[0]+" 👋".replace(" 👋",""),tuspagos:"Tus Pagos",historial:"Pagos del mes",cobranza:"Cobros en línea",transparencia:"Transparencia",avisos:"Avisos de la comunidad",vecinos:"Vecinos",acceso:"Control de acceso",reservas:"Reservas de espacios",votaciones:"Votaciones"};
  return t[m]||"Inicio";
}
function renderModulo(){
  var rol=sesion.rol,d=S.datos;
  if(S.modulo==="inicio")return modInicio(rol,d);
  if(S.modulo==="tuspagos")return modTusPagos(rol,d);
  if(S.modulo==="historial")return modHistorial(rol,d);
  if(S.modulo==="cobranza")return modCobranza(rol,d);
  if(S.modulo==="transparencia")return modTransparencia(rol,d);
  if(S.modulo==="avisos")return modAvisos(rol,d);
  if(S.modulo==="vecinos")return modVecinos(rol,d);
  if(S.modulo==="acceso")return modAcceso(rol,d);
  if(S.modulo==="reservas")return modReservas(rol,d);
  if(S.modulo==="votaciones")return modVotaciones(rol,d);
  return "";
}
function modInicio(rol,d){
  var unidad=sesion.unidad;
  var misCobros=unidad?d.cobros.filter(function(c){return c.unidad===unidad;}):[];
  var debe=misCobros.filter(function(c){return c.estado!=="PAGADO";}).reduce(function(a,c){return a+c.monto;},0);
  var mes=d.cobros.filter(function(c){return c.periodo===mesActual();});
  var rec=mes.filter(function(c){return c.estado==="PAGADO";}).reduce(function(a,c){return a+c.monto;},0);
  var tot=mes.reduce(function(a,c){return a+c.monto;},0);
  var pct=tot?Math.round(rec/tot*100):0;
  var stats="";
  if(rol==="PROPIETARIO"||rol==="ARRENDATARIO"){
    stats='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem">'+
    statCard("Total por pagar",fmt(debe),debe>0?"pagos pendientes":"todo pagado",debe>0,0)+
    statCard("Tu parcela",esc(unidad),esc(d.comunidad.nombre),false,80)+
    statCard("Recaudación del mes",pct+"%","avance de la comunidad",false,160)+"</div>";
  }else{
    stats='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem">'+
    statCard("Recaudado "+fmtMes(mesActual()),fmt(rec),pct+"% del mes",true,0)+
    statCard("Por cobrar",fmt(tot-rec),mes.filter(function(c){return c.estado!=="PAGADO";}).length+" pagos pendientes",false,80)+
    statCard("Vecinos",d.usuarios.length-1,"cuentas en la comunidad",false,160)+
    statCard("Pagos en línea",d.comunidad.vinculacion.conectada?"Activos":"Sin vincular",d.comunidad.vinculacion.conectada?"Mercado Pago conectado":"falta vincular la cuenta",false,240)+"</div>";
  }
  var avisos=d.avisos.slice(0,3).map(function(a,i){
    return '<div class="card card-in" style="padding:1.2rem;--d:'+(i*80)+'ms"><div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.5rem"><span class="tag '+(a.tipo==="URGENTE"?"tag-urgente":"tag-info")+'">'+esc(a.tipo.toLowerCase())+"</span>"+
    '<span class="mono" style="font-size:10px;color:var(--ink3)">'+fmtFecha(a.creado)+"</span></div>"+
    '<h3 class="font-display" style="font-weight:700;font-size:1.02rem">'+esc(a.titulo)+"</h3>"+
    '<p style="font-size:.87rem;color:var(--ink2);margin-top:.3rem">'+esc(a.cuerpo)+"</p></div>";
  }).join("");
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+stats+
  '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:1.4rem;align-items:start" class="dash-grid">'+
  '<div class="card" style="padding:1.5rem"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h3 class="font-display" style="font-weight:800;font-size:1.2rem">En qué se usa el dinero</h3>'+
  '<button class="btn btn-ghost btn-sm" data-act="modulo" data-mod="transparencia">Ver todo '+ic("arrow",13)+"</button></div>"+graficoMovs(d.movimientos)+"</div>"+
  '<div><h3 class="font-display" style="font-weight:800;font-size:1.2rem;margin-bottom:.9rem">Últimos avisos</h3><div style="display:grid;gap:.9rem">'+avisos+"</div></div></div>"+
  '<style>@media(max-width:900px){.dash-grid{grid-template-columns:1fr !important}}</style></div>';
}
function modTusPagos(rol,d){
  var cobs=d.cobros.filter(function(c){return c.unidad===sesion.unidad;}).sort(function(a,b){return a.periodo<b.periodo?1:-1;});
  var debe=cobs.filter(function(c){return c.estado!=="PAGADO";}).reduce(function(a,c){return a+c.monto;},0);
  var vinc=d.comunidad.vinculacion.conectada;
  var rows=cobs.map(function(c,i){
    var acc="";
    if(c.estado!=="PAGADO"){
      acc=vinc?'<button class="btn btn-neon btn-sm" data-act="pagar-inicio" data-id="'+c.id+'">'+ic("card",13)+" Pagar</button>"
              :'<span class="tag tag-pendiente">pago en caja</span>';
    }else{
      acc='<button class="btn btn-ghost btn-sm" data-act="recibo" data-id="'+c.id+'">'+ic("download",13)+" Recibo</button>";
    }
    return '<tr class="card-in" style="--d:'+(i*50)+'ms"><td class="mono" style="font-size:12px">'+esc(fmtMes(c.periodo))+"</td><td>"+esc(c.concepto)+"</td>"+
    '<td class="tnum mono" style="font-weight:700">'+fmt(c.monto)+"</td><td>"+tagEstado(c.estado)+"</td><td style='text-align:right'>"+acc+"</td></tr>";
  }).join("");
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">'+
  statCard("Total por pagar",fmt(debe),debe>0?"pon tus pagos al día":"no debes nada",debe>0,0)+
  statCard("Pagos en línea",vinc?"Disponibles":"No disponibles",vinc?"vía Mercado Pago":"la comunidad aún no vincula su cuenta",false,80)+
  statCard("Comprobante","Descargable","cada pago genera su recibo",false,160)+"</div>"+
  (vinc?'':'<div class="card" style="padding:1rem 1.3rem;border-style:dashed;border-color:var(--amber);background:rgba(217,160,54,.08);display:flex;gap:.8rem;align-items:center">'+ic("alert",18)+'<p style="font-size:.88rem;color:#8a6114">La administración aún no habilita los pagos en línea. Por ahora puedes pagar en caja o transferencia.</p></div>')+
  '<div class="card" style="overflow:hidden"><div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><div><h3 class="font-display" style="font-weight:800;font-size:1.2rem">Tus Pagos</h3><p style="font-size:.82rem;color:var(--ink3)">Parcela '+esc(sesion.unidad)+" · historial completo</p></div>"+
  '<span class="tag tag-pago">'+esc(cobs.filter(function(c){return c.estado==="PAGADO";}).length)+" pagados</span></div>"+
  '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Periodo</th><th>Concepto</th><th>Monto</th><th>Estado</th><th style="text-align:right">Acción</th></tr></thead><tbody>'+rows+"</tbody></table></div></div></div>";
}
function modHistorial(rol,d){
  var esAdmin=rol==="ADMIN";
  var pers=[mesActual(),mesAnterior()];
  d.cobros.forEach(function(c){if(pers.indexOf(c.periodo)<0)pers.push(c.periodo);});
  pers.sort().reverse();
  var per=S.histPer||pers[0];
  var del=d.cobros.filter(function(c){return c.periodo===per;});
  var rec=del.filter(function(c){return c.estado==="PAGADO";}).reduce(function(a,c){return a+c.monto;},0);
  var tot=del.reduce(function(a,c){return a+c.monto;},0);
  var rows=del.map(function(c,i){
    var acc=esAdmin&&c.estado!=="PAGADO"?'<button class="btn btn-pine btn-sm" data-act="registrar-pago" data-id="'+c.id+'">'+ic("coins",13)+" Registrar pago</button>":"<span class='mono' style='font-size:11px;color:var(--ink3)'>"+(c.pagoRef?esc(c.pagoRef):"—")+"</span>";
    return '<tr class="card-in" style="--d:'+(i*40)+'ms"><td class="mono" style="font-weight:700;color:var(--pine2)">'+esc(c.unidad)+"</td><td>"+esc(c.concepto)+"</td>"+
    '<td class="tnum mono" style="font-weight:700">'+fmt(c.monto)+"</td><td>"+tagEstado(c.estado)+"</td>"+(esAdmin?"<td style='text-align:right'>"+acc+"</td>":"")+"</tr>";
  }).join("")||'<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--ink3)">No hay cobros en este periodo.</td></tr>';
  var gen=esAdmin?'<div class="card" style="padding:1.5rem;border:1.5px dashed var(--pine2)">'+
  '<h3 class="font-display" style="font-weight:800;font-size:1.15rem;display:flex;align-items:center;gap:.5rem">'+ic("plus",19)+" Generar pagos del mes</h3>"+
  '<p style="font-size:.87rem;color:var(--ink2);margin:.4rem 0 1rem">Crea el cobro mensual para todas las parcelas. Si ya existe, no se duplica.</p>'+
  '<div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-end">'+
  '<div><label class="fl">Monto por parcela</label><input class="field" id="gen-monto" type="number" value="55000" min="0" step="1000" style="width:150px"></div>'+
  '<button class="btn btn-neon" data-act="generar-mes">Generar para todas</button></div></div>':"";
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem">'+
  statCard("Cobrado "+fmtMes(per),fmt(rec),tot?Math.round(rec/tot*100)+"% del total":"sin cobros",true,0)+
  statCard("Por cobrar",fmt(tot-rec),del.filter(function(c){return c.estado!=="PAGADO";}).length+" pendientes",false,80)+
  statCard("Cobros",del.length,"en el periodo seleccionado",false,160)+"</div>"+
  '<div class="card" style="overflow:hidden"><div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--line);display:flex;gap:.8rem;align-items:center;flex-wrap:wrap"><div style="margin-right:auto"><h3 class="font-display" style="font-weight:800;font-size:1.2rem">Cobros del mes</h3><p style="font-size:.82rem;color:var(--ink3)">Pagos del mes, cuotas y multas por parcela</p></div>'+
  '<select class="field" id="hist-per" style="width:auto">'+pers.map(function(p){return '<option value="'+p+'"'+(p===per?" selected":"")+">"+esc(fmtMes(p))+"</option>";}).join("")+"</select></div>"+
  '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Parcela</th><th>Concepto</th><th>Monto</th><th>Estado</th>'+(esAdmin?'<th style="text-align:right">Acción</th>':"")+"</tr></thead><tbody>"+rows+"</tbody></table></div></div>"+gen+"</div>";
}
function modCobranza(rol,d){
  var v=d.comunidad.vinculacion;
  var vinc=v.conectada;
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+
  '<div class="card" style="padding:1.8rem;'+(vinc?"border-color:var(--neon2);background:rgba(201,242,75,.08)":"")+'"><div style="display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start">'+
  '<span style="width:54px;height:54px;border-radius:16px;display:grid;place-items:center;flex-shrink:0;'+(vinc?"background:var(--pine);color:var(--neon)":"background:rgba(12,59,46,.08);color:var(--pine)")+'">'+ic("link",26)+"</span>"+
  '<div style="flex:1;min-width:240px"><h3 class="font-display" style="font-weight:800;font-size:1.35rem">Cobros en línea con Mercado Pago</h3>'+
  '<p style="font-size:.9rem;color:var(--ink2);margin-top:.4rem;max-width:44rem">'+(vinc?"Tu comunidad ya recibe los pagos del mes de propietarios y arrendatarios desde la aplicación. Cada pago queda registrado al instante.":"Vincula tu cuenta de Mercado Pago para que propietarios y arrendatarios paguen el mes desde su teléfono. Es la forma más simple de mantener la recaudación al día.")+"</p>"+
  (vinc?'<div style="display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-top:1rem"><span class="tag tag-ok">'+ic("check",12)+" Conectada · "+esc(v.email)+"</span>"+
  '<button class="mono" data-act="desvincular-mp" style="background:none;border:none;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--signal);text-decoration:underline">Desvincular</button></div>':"")+"</div>"+
  (!vinc?'<div style="text-align:center"><button class="btn btn-neon btn-lg" data-act="vincular-mp">'+ic("link",17)+" Vincular cuenta</button>"+
  '<div class="mono" style="font-size:9.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink3);margin-top:.5rem">toma menos de 1 minuto</div></div>':"")+
  "</div></div>"+
  '<div class="card" style="padding:1.8rem"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start"><div style="display:flex;gap:1rem;align-items:flex-start">'+
  '<span style="width:48px;height:48px;border-radius:14px;background:rgba(12,59,46,.08);color:var(--pine);display:grid;place-items:center;flex-shrink:0">'+ic("users",22)+"</span>"+
  '<div><h3 class="font-display" style="font-weight:800;font-size:1.35rem">Importar Comunidad</h3>'+
  '<p style="font-size:.9rem;color:var(--ink2);margin-top:.4rem;max-width:38rem">¿Ya tienes tu nómina en una planilla? Arrástrala aquí y crearemos las parcelas, los vecinos y sus deudas iniciales en segundos.</p></div></div>'+
  '<button class="btn btn-ghost btn-sm" data-act="csv-ejemplo">'+ic("sheet",14)+" Probar con un ejemplo</button></div>"+
  '<div class="dropzone" id="dropzone" data-act="csv-click" style="margin-top:1.4rem">'+
  '<div style="display:grid;place-items:center;gap:.7rem"><span style="width:56px;height:56px;border-radius:16px;background:var(--card);border:1px solid var(--line);display:grid;place-items:center;color:var(--pine);box-shadow:var(--shadow-soft)">'+ic("upload",26)+"</span>"+
  '<div class="font-display" style="font-weight:800;font-size:1.15rem">Arrastra tu archivo CSV</div>'+
  '<div style="font-size:.85rem;color:var(--ink3)">o haz clic para buscarlo en tu equipo</div>'+
  '<span class="mono" style="margin-top:.5rem;border:1px solid var(--line);background:var(--card);padding:.4rem .9rem;border-radius:999px;font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink2)">Parcela · Propietario · Arrendatario (opcional) · Contacto · Correo Electrónico · Deuda</span></div></div>'+
  '<input type="file" id="csv-file" accept=".csv,.txt" style="display:none"></div></div>';
}
function modTransparencia(rol,d){
  var ing=d.movimientos.filter(function(m){return m.tipo==="INGRESO";}).reduce(function(a,m){return a+m.monto;},0);
  var gas=d.movimientos.filter(function(m){return m.tipo==="GASTO";}).reduce(function(a,m){return a+m.monto;},0);
  var rows=d.movimientos.slice(0,9).map(function(m,i){
    return '<tr class="card-in" style="--d:'+(i*40)+'ms"><td class="mono" style="font-size:12px">'+fmtFecha(m.fecha)+"</td><td>"+esc(m.descripcion)+"</td>"+
    '<td><span class="tag '+(m.tipo==="GASTO"?"tag-vencido":"tag-pago")+'">'+esc(m.categoria)+"</span></td>"+
    '<td class="tnum mono" style="font-weight:700;text-align:right;color:'+(m.tipo==="GASTO"?"var(--signal)":"var(--pine2)")+'">'+(m.tipo==="GASTO"?"−":"+")+fmt(m.monto)+"</td></tr>";
  }).join("");
  var form=rol==="ADMIN"?'<div class="card" style="padding:1.6rem;background:var(--pine);border-color:var(--pine);color:#fff">'+
  '<h3 class="font-display" style="font-weight:800;font-size:1.25rem;display:flex;gap:.5rem;align-items:center">'+ic("plus",20)+" Transparencia Activa</h3>"+
  '<p style="font-size:.85rem;color:rgba(255,255,255,.7);margin:.3rem 0 1.1rem">Registra un gasto, ingreso o pago y la comunidad lo verá al instante.</p>'+
  '<form data-form="mov" style="display:grid;gap:.9rem">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">'+
  '<button type="button" class="btn" id="mov-gasto" style="background:var(--neon);color:var(--deep)">Gasto / pago</button>'+
  '<button type="button" class="btn btn-outline-light" id="mov-ingreso">Ingreso</button></div>'+
  '<input type="hidden" id="mov-tipo" value="GASTO">'+
  '<div><label class="fl" style="color:rgba(255,255,255,.6)">Categoría</label><select class="field" id="mov-cat">'+["Mantención","Servicios","Personal","Seguridad","Áreas verdes","Pagos del mes","Fondo de reserva","Otros"].map(function(c){return "<option>"+c+"</option>";}).join("")+"</select></div>"+
  '<div><label class="fl" style="color:rgba(255,255,255,.6)">Descripción</label><input class="field" id="mov-desc" placeholder="Ej: Reparación de luminarias"></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.9rem"><div><label class="fl" style="color:rgba(255,255,255,.6)">Monto (CLP)</label><input class="field tnum" id="mov-monto" type="number" min="0" step="500" placeholder="0"></div>'+
  '<div><label class="fl" style="color:rgba(255,255,255,.6)">Fecha</label><input class="field" id="mov-fecha" type="date" value="'+hoy()+'"></div></div>'+
  '<button class="btn btn-neon btn-block" type="submit">Registrar en la comunidad</button></form></div>':"";
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem">'+
  statCard("Ingresos registrados",fmt(ing),"últimos movimientos",true,0)+
  statCard("Gastos registrados",fmt(gas),"a la vista de todos",false,80)+
  statCard("Saldo del periodo",fmt(ing-gas),ing-gas>=0?"números en verde":"revisar gastos",false,160)+"</div>"+
  '<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1.4rem;align-items:start" class="dash-grid">'+
  '<div class="card" style="overflow:hidden"><div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--line)"><h3 class="font-display" style="font-weight:800;font-size:1.2rem">En qué se gasta el dinero</h3><p style="font-size:.82rem;color:var(--ink3)">Todos los movimientos de la comunidad, sin filtros</p></div>'+
  '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Detalle</th><th>Categoría</th><th style="text-align:right">Monto</th></tr></thead><tbody>'+rows+"</tbody></table></div></div>"+
  '<div style="display:grid;gap:1.4rem"><div class="card" style="padding:1.5rem"><h3 class="font-display" style="font-weight:800;font-size:1.15rem;margin-bottom:1rem">Ingresos vs gastos</h3>'+graficoMovs(d.movimientos)+"</div>"+form+"</div></div></div>";
}
function modAvisos(rol,d){
  var puede=rol==="ADMIN"||rol==="COMITE";
  var form=puede?'<div class="card" style="padding:1.6rem"><h3 class="font-display" style="font-weight:800;font-size:1.2rem;margin-bottom:1rem">Publicar aviso</h3>'+
  '<form data-form="aviso" style="display:grid;gap:.9rem"><input class="field" id="av-titulo" placeholder="Título del aviso" maxlength="120">'+
  '<textarea class="field" id="av-cuerpo" rows="3" placeholder="Cuéntale a la comunidad…" style="resize:vertical"></textarea>'+
  '<div style="display:flex;gap:.8rem"><select class="field" id="av-tipo" style="width:auto"><option value="INFORMATIVO">Informativo</option><option value="URGENTE">Urgente / emergencia</option></select>'+
  '<button class="btn btn-neon" type="submit" style="margin-left:auto">'+ic("mega",15)+" Publicar</button></div></form></div>':"";
  var list=d.avisos.map(function(a,i){
    return '<div class="card card-in" style="padding:1.4rem;--d:'+(i*70)+'ms;'+(a.tipo==="URGENTE"?"border-color:var(--signal)":"")+'"><div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.6rem;flex-wrap:wrap">'+
    '<span class="tag '+(a.tipo==="URGENTE"?"tag-urgente":"tag-info")+'">'+ic(a.tipo==="URGENTE"?"alert":"bell",11)+" "+esc(a.tipo.toLowerCase())+"</span>"+
    '<span class="mono" style="font-size:10px;color:var(--ink3)">'+esc(a.autor)+" · "+fmtFecha(a.creado)+"</span></div>"+
    '<h3 class="font-display" style="font-weight:800;font-size:1.15rem">'+esc(a.titulo)+"</h3>"+
    '<p style="font-size:.9rem;color:var(--ink2);margin-top:.4rem;line-height:1.6">'+esc(a.cuerpo)+"</p></div>";
  }).join("");
  return '<div class="fade-swap" style="display:grid;gap:1.4rem;grid-template-columns:'+(puede?"1fr 1.5fr":"1fr")+'" class="dash-grid">'+(puede?form:"")+'<div style="display:grid;gap:1rem;align-content:start">'+list+"</div></div>";
}
function modVecinos(rol,d){
  var rows=d.membresias.map(function(m,i){
    var u=d.usuarios.filter(function(x){return x.id===m.usuarioId;})[0];if(!u)return "";
    var ini=u.nombre.split(" ").map(function(p){return p[0];}).slice(0,2).join("");
    return '<div class="card card-in" style="padding:1.1rem;display:flex;gap:.9rem;align-items:center;--d:'+(i*50)+'ms">'+
    '<span style="width:42px;height:42px;border-radius:12px;background:var(--pine);color:var(--neon);display:grid;place-items:center;font-family:Bricolage Grotesque,sans-serif;font-weight:800;flex-shrink:0">'+esc(ini)+"</span>"+
    '<div style="min-width:0;flex:1"><div style="font-weight:700;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(u.nombre)+"</div>"+
    '<div class="mono" style="font-size:10px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(u.email)+"</div>"+
    '<div style="display:flex;gap:.4rem;margin-top:.35rem;flex-wrap:wrap"><span class="tag tag-rol">'+esc(ROL_LABEL[m.rol])+"</span>"+
    (m.unidad?'<span class="tag tag-info">'+esc(m.unidad)+"</span>":"")+"</div></div></div>";
  }).join("");
  var nuevo=rol==="ADMIN"?'<div class="card" style="padding:1.6rem"><h3 class="font-display" style="font-weight:800;font-size:1.2rem;margin-bottom:1rem">Nuevo vecino</h3>'+
  '<form data-form="vecino" style="display:grid;gap:.9rem">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.9rem"><input class="field" id="vn-nombre" placeholder="Nombre completo"><input class="field" id="vn-email" type="email" placeholder="Correo"></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.9rem"><select class="field" id="vn-rol"><option value="PROPIETARIO">Propietario</option><option value="ARRENDATARIO">Arrendatario</option><option value="COMITE">Comité</option><option value="ADMIN">Administrador</option></select>'+
  '<input class="field" id="vn-unidad" placeholder="Parcela (ej: P-14)"><input class="field" id="vn-pass" placeholder="Contraseña" value="vecino123"></div>'+
  '<button class="btn btn-neon" type="submit">'+ic("plus",15)+" Crear vecino</button></form></div>':"";
  return '<div class="fade-swap" style="display:grid;gap:1.4rem;grid-template-columns:1fr 1.6fr;align-items:start" class="dash-grid">'+nuevo+'<div style="display:grid;gap:.9rem">'+rows+"</div></div>";
}
function modAcceso(rol,d){
  var rows=d.bitacora.map(function(r,i){
    var sal=r.salida?'<span class="mono" style="font-size:11px;color:var(--ink3)">Salió · '+esc(r.salida.slice(11))+"</span>"
      :'<button class="btn btn-pine btn-sm" data-act="acceso-salida" data-id="'+r.id+'">Marcar salida</button>';
    return '<tr class="card-in" style="--d:'+(i*40)+'ms"><td><div style="display:flex;align-items:center;gap:.7rem"><span style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;'+(r.tipo==="PROVEEDOR"?"background:rgba(31,125,114,.12);color:var(--teal)":"background:rgba(217,160,54,.15);color:#8a6114")+'">'+ic("door",16)+"</span>"+
    "<div><div style='font-weight:700'>"+esc(r.visitante)+"</div><div class='mono' style='font-size:10px;color:var(--ink3);text-transform:uppercase'>"+esc(r.tipo)+" · "+esc(r.unidad)+"</div></div></div></td>"+
    '<td class="mono" style="font-size:12px">'+esc(r.entrada.replace("T"," · "))+"</td><td style='text-align:right'>"+sal+"</td></tr>";
  }).join("")||'<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--ink3)">Sin registros todavía.</td></tr>';
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+
  '<div class="card" style="padding:1.4rem"><h3 class="font-display" style="font-weight:800;font-size:1.15rem;display:flex;gap:.5rem;align-items:center;margin-bottom:1rem">'+ic("door",19)+" Registrar ingreso</h3>"+
  '<form data-form="acceso" style="display:grid;grid-template-columns:1.6fr 1fr 1fr auto;gap:.8rem" class="acc-form">'+
  '<input class="field" id="ac-nombre" placeholder="Nombre de la visita o proveedor">'+
  '<select class="field" id="ac-tipo"><option value="VISITA">Visita</option><option value="PROVEEDOR">Proveedor</option></select>'+
  '<input class="field" id="ac-unidad" placeholder="Parcela">'+
  '<button class="btn btn-neon" type="submit">Registrar</button></form>'+
  '<style>@media(max-width:760px){.acc-form{grid-template-columns:1fr !important}}</style></div>'+
  '<div class="card" style="overflow:hidden"><div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--line)" class="mono"><span style="font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3)">Historial de accesos</span></div>'+
  '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Persona</th><th>Entrada</th><th style="text-align:right">Salida</th></tr></thead><tbody>'+rows+"</tbody></table></div></div></div>";
}
function modReservas(rol,d){
  var areas=["Quincho central","Sala multiuso","Cancha de tenis"];
  var bloques=["10:00 – 13:00","15:00 – 18:00","19:00 – 23:00"];
  var list=d.reservas.slice().sort(function(a,b){return a.fecha<b.fecha?-1:1;}).map(function(r,i){
    var mia=r.unidad===sesion.unidad;
    return '<div class="card card-in" style="padding:1.2rem;display:flex;gap:1rem;align-items:center;--d:'+(i*60)+'ms">'+
    '<span style="width:44px;height:44px;border-radius:12px;background:rgba(12,59,46,.08);color:var(--pine);display:grid;place-items:center;flex-shrink:0">'+ic("calendar",20)+"</span>"+
    '<div style="flex:1;min-width:0"><div style="font-weight:700">'+esc(r.area)+"</div>"+
    '<div class="mono" style="font-size:10.5px;color:var(--ink3);text-transform:uppercase">'+fmtFecha(r.fecha)+" · "+esc(r.bloque)+" · "+esc(r.quien)+" ("+esc(r.unidad)+")</div></div>"+
    (mia?'<button class="btn btn-danger btn-sm" data-act="cancelar-reserva" data-id="'+r.id+'">'+ic("x",13)+" Cancelar</button>":'<span class="tag tag-info">reservado</span>')+"</div>";
  }).join("")||'<div class="card" style="padding:2.5rem;text-align:center;color:var(--ink3)">No hay reservas próximas. ¡Toma la primera!</div>';
  return '<div class="fade-swap" style="display:grid;gap:1.4rem">'+
  '<div class="card" style="padding:1.5rem"><h3 class="font-display" style="font-weight:800;font-size:1.2rem;margin-bottom:1rem">Reservar un espacio</h3>'+
  '<form data-form="reserva" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.9rem;align-items:end">'+
  '<div><label class="fl">Espacio</label><select class="field" id="re-area">'+areas.map(function(a){return "<option>"+a+"</option>";}).join("")+"</select></div>"+
  '<div><label class="fl">Fecha</label><input class="field" id="re-fecha" type="date" min="'+hoy()+'" value="'+hoy()+'"></div>'+
  '<div><label class="fl">Bloque</label><select class="field" id="re-bloque">'+bloques.map(function(b){return "<option>"+b+"</option>";}).join("")+"</select></div>"+
  '<button class="btn btn-neon" type="submit">'+ic("check",15)+" Reservar</button></form></div>"+
  '<div style="display:grid;gap:.9rem">'+list+"</div></div>";
}
function modVotaciones(rol,d){
  var puedeCrear=rol==="ADMIN"||rol==="COMITE";
  var esVecino=rol==="PROPIETARIO";
  var cards=d.votaciones.map(function(v,i){
    var total=v.votos.length||1;
    var mio=esVecino?v.votos.filter(function(x){return x.unidad===sesion.unidad;})[0]:null;
    var bars=v.opciones.map(function(o){
      var n=v.votos.filter(function(x){return x.opcion===o;}).length;
      var p=Math.round(n/total*100);
      return '<div style="margin-bottom:.7rem"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:.25rem"><span style="font-weight:600">'+esc(o)+"</span>"+
      '<span class="tnum mono" style="color:var(--ink3)">'+n+" · "+p+"%</span></div>"+
      '<div style="height:9px;border-radius:99px;background:rgba(12,59,46,.08);overflow:hidden"><div class="bar-x" style="width:'+p+'%;height:100%;background:'+(mio&&mio.opcion===o?"var(--pine)":"var(--neon2)")+';border-radius:99px"></div></div></div>';
    }).join("");
    var votar="";
    if(v.abierta&&esVecino){
      votar=mio?'<div class="tag tag-ok" style="margin-top:.8rem">'+ic("check",12)+" Votaste: "+esc(mio.opcion)+"</div>"
        :'<form data-form="votar" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.9rem" data-vot="'+v.id+'">'+
        v.opciones.map(function(o){return '<button class="btn btn-ghost btn-sm" type="submit" data-op="'+esc(o)+'">'+esc(o)+"</button>";}).join("")+"</form>";
    }
    return '<div class="card card-in" style="padding:1.5rem;--d:'+(i*80)+'ms"><div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.6rem">'+
    '<span class="tag '+(v.abierta?"tag-pago":"tag-pendiente")+'">'+(v.abierta?"abierta":"cerrada")+"</span>"+
    '<span class="mono" style="font-size:10px;color:var(--ink3)">'+fmtFecha(v.creado)+" · "+v.votos.length+" votos</span></div>"+
    '<h3 class="font-display" style="font-weight:800;font-size:1.15rem">'+esc(v.titulo)+"</h3>"+
    '<p style="font-size:.88rem;color:var(--ink2);margin:.35rem 0 .9rem">'+esc(v.pregunta)+"</p>"+bars+votar+"</div>";
  }).join("");
  var form=puedeCrear?'<div class="card" style="padding:1.6rem"><h3 class="font-display" style="font-weight:800;font-size:1.2rem;margin-bottom:1rem">Nueva votación</h3>'+
  '<form data-form="votacion" style="display:grid;gap:.9rem"><input class="field" id="vo-titulo" placeholder="Título (ej: Nueva iluminación)">'+
  '<textarea class="field" id="vo-pregunta" rows="2" placeholder="Pregunta para los vecinos" style="resize:vertical"></textarea>'+
  '<input class="field" id="vo-opciones" placeholder="Opciones separadas por coma: Sí, No, Abstención">'+
  '<button class="btn btn-neon" type="submit">'+ic("ballot",15)+" Abrir votación</button></form></div>':"";
  return '<div class="fade-swap" style="display:grid;gap:1.4rem;grid-template-columns:'+(puedeCrear?"1fr 1.5fr":"1fr")+';align-items:start" class="dash-grid">'+form+'<div style="display:grid;gap:1rem">'+cards+"</div></div>";
}

/* ============ VISTA: adminapp (oculta) ============ */
function viewAdminApp(){
  if(!sesion||sesion.rol!=="SUPERADMIN"){
    return '<div class="dark dotgrid-dark" style="display:grid;place-items:center;min-height:100vh;padding:2rem"><div class="fade-swap" style="max-width:26rem;text-align:center">'+
    '<span style="width:64px;height:64px;border-radius:18px;background:rgba(201,242,75,.12);border:1px solid rgba(201,242,75,.4);color:var(--neon);display:grid;place-items:center;margin:0 auto 1.4rem">'+ic("lock",28)+"</span>"+
    '<h1 class="font-display" style="font-weight:800;font-size:1.9rem">Zona restringida</h1>'+
    '<p style="color:rgba(255,255,255,.6);margin:.7rem 0 1.6rem;font-size:.95rem">Este panel es exclusivo del equipo de ComunApp. Si tienes una cuenta de superadmin, entra desde el acceso normal.</p>'+
    '<div style="display:flex;gap:.8rem;justify-content:center"><a href="#/entrar" class="btn btn-neon">Entrar como superadmin</a><a href="#/" class="btn btn-outline-light">Ir al sitio</a></div></div></div>';
  }
  if(!S.datos)return '<div class="dark" style="display:grid;place-items:center;min-height:100vh;color:rgba(255,255,255,.6)"><span class="mono">cargando…</span></div>';
  var d=S.datos;var tab=S.adminTab||"metricas";
  var PLAN_MRR={COMITE:0,PARCELAS:29900,CUSTOM:89000};
  var PLAN_LBL={COMITE:"Comité",PARCELAS:"Com. de Parcelas",CUSTOM:"Personalizado"};
  var mrr=d.comunidad.estado==="ACTIVA"?PLAN_MRR[d.comunidad.plan]:0;
  var serie=seriePagos(d.cobros);
  var maxDia=1;serie.forEach(function(s){maxDia=Math.max(maxDia,s.monto);});
  var tabs=[["metricas","Métricas","activity"],["tenant","Tenants","building"],["facturacion","Facturación","card"],["eventos","Eventos","trend"]].map(function(t){
    return '<button class="side-item'+(tab===t[0]?" on":"")+'" data-act="admin-tab" data-tab="'+t[0]+'">'+ic(t[2],17)+"<span>"+t[1]+"</span></button>";
  }).join("");
  var cuerpo="";
  if(tab==="metricas"){
    var bars=serie.map(function(s,i){
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:26px" title="'+s.dia+" · "+fmt(s.monto)+'">'+
      '<div class="bar-up" style="width:100%;max-width:34px;height:'+Math.max(4,s.monto/maxDia*100)+'%;background:rgba(255,255,255,.16);border-radius:5px 5px 2px 2px;transition:background .2s;animation-delay:'+(i*40)+'ms" onmouseover="this.style.background=\'#c9f24b\'" onmouseout="this.style.background=\'rgba(255,255,255,.16)\'"></div>'+
      '<span class="mono" style="font-size:8.5px;color:rgba(255,255,255,.35)">'+s.dia+"</span></div>";
    }).join("");
    var vol=serie.reduce(function(a,s){return a+s.monto;},0);
    var pagos=serie.reduce(function(a,s){return a+s.pagos;},0);
    cuerpo='<div class="fade-swap" style="display:grid;gap:1.3rem">'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem">'+
    '<div class="dcard dcard-acc card-in"><div class="mono" style="font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--neon)">MRR</div><div class="tnum font-display" style="font-size:1.6rem;font-weight:800;margin-top:.3rem">'+fmt(mrr)+'</div><div style="font-size:.75rem;color:rgba(255,255,255,.45)">ingreso mensual recurrente</div></div>'+
    '<div class="dcard card-in" style="--d:70ms"><div class="mono" style="font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4)">Volumen 14d</div><div class="tnum font-display" style="font-size:1.6rem;font-weight:800;margin-top:.3rem">'+fmt(vol)+'</div><div style="font-size:.75rem;color:rgba(255,255,255,.45)">transado por comunidades</div></div>'+
    '<div class="dcard card-in" style="--d:140ms"><div class="mono" style="font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4)">Pagos 14d</div><div class="tnum font-display" style="font-size:1.6rem;font-weight:800;margin-top:.3rem">'+pagos+'</div><div style="font-size:.75rem;color:rgba(255,255,255,.45)">pagos procesados</div></div>'+
    '<div class="dcard card-in" style="--d:210ms"><div class="mono" style="font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4)">Tenants</div><div class="tnum font-display" style="font-size:1.6rem;font-weight:800;margin-top:.3rem">1</div><div style="font-size:.75rem;color:rgba(255,255,255,.45)">en producción (demo)</div></div></div>'+
    '<div class="dcard"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem"><span class="mono" style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5)">Volumen procesado · últimos 14 días</span>'+
    '<span class="mono" style="font-size:10px;color:var(--neon);display:flex;gap:.4rem;align-items:center">'+ic("activity",12)+" en vivo</span></div>"+
    '<div style="display:flex;gap:.45rem;align-items:flex-end;height:150px">'+bars+"</div></div>"+
    '<div class="dcard"><span class="mono" style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5)">Salud de la cartera</span>'+
    '<div style="margin-top:1rem;display:grid;gap:.7rem">'+
    '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:.7rem;font-size:.88rem"><span style="color:rgba(255,255,255,.6)">Cobranza online (Mercado Pago)</span><span class="mono" style="color:var(--neon);font-weight:700">'+(d.comunidad.vinculacion.conectada?"conectada":"pendiente")+"</span></div>"+
    '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:.7rem;font-size:.88rem"><span style="color:rgba(255,255,255,.6)">Cuentas activas</span><span class="mono" style="color:var(--neon);font-weight:700">'+d.usuarios.filter(function(u){return u.activo;}).length+" de "+d.usuarios.length+"</span></div>"+
    '<div style="display:flex;justify-content:space-between;font-size:.88rem"><span style="color:rgba(255,255,255,.6)">Plan del tenant</span><span class="mono" style="color:var(--neon);font-weight:700">'+PLAN_LBL[d.comunidad.plan]+"</span></div></div></div></div>";
  }else if(tab==="tenant"){
    var c=d.comunidad;
    var vol=d.cobros.filter(function(x){return x.estado==="PAGADO";}).reduce(function(a,x){return a+x.monto;},0);
    cuerpo='<div class="fade-swap" style="display:grid;gap:1.3rem"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem"><div><h2 class="font-display" style="font-weight:800;font-size:1.5rem">Comunidades (tenants)</h2>'+
    '<span class="mono" style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.4)">esquema aislado por comunidad</span></div>'+
    '<button class="btn btn-neon btn-sm" data-act="toast-demo">'+ic("plus",14)+" Onboardear tenant</button></div>'+
    '<div class="dcard" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Tenant</th><th>Plan</th><th>Usuarios</th><th>Volumen</th><th>MP</th><th>Estado</th><th style="text-align:right">Acción</th></tr></thead><tbody><tr>'+
    '<td><div style="font-weight:700">'+esc(c.nombre)+"</div><div class='mono' style='font-size:10px;color:rgba(255,255,255,.35)'>"+esc(c.ciudad)+" · "+c.unidades+" unid. · "+esc(c.id)+"</div></td>"+
    '<td><span class="mono" style="font-size:10px;font-weight:700;color:var(--neon);border:1px solid rgba(201,242,75,.35);background:rgba(201,242,75,.1);padding:.25rem .6rem;border-radius:8px">'+PLAN_LBL[c.plan]+"</span></td>"+
    '<td class="tnum mono">'+d.usuarios.length+'</td><td class="tnum mono" style="font-weight:700">'+fmt(vol)+"</td>"+
    '<td>'+(c.vinculacion.conectada?'<span class="mono" style="font-size:9.5px;font-weight:700;background:rgba(201,242,75,.15);color:var(--neon);padding:.2rem .55rem;border-radius:99px">ONLINE</span>':'<span class="mono" style="font-size:9.5px;font-weight:700;background:rgba(255,255,255,.08);color:rgba(255,255,255,.4);padding:.2rem .55rem;border-radius:99px">OFFLINE</span>')+"</td>"+
    '<td><span class="tag '+(c.estado==="ACTIVA"?"tag-ok":"tag-susp")+'">'+esc(c.estado.toLowerCase())+"</span></td>"+
    '<td style="text-align:right"><button class="btn btn-sm '+(c.estado==="ACTIVA"?"btn-danger":"btn-neon")+'" data-act="toggle-tenant">'+ic("power",13)+(c.estado==="ACTIVA"?" Suspender":" Reactivar")+"</button></td></tr></tbody></table></div></div></div>";
  }else if(tab==="facturacion"){
    var meses=[];for(var i=5;i>=0;i--){var dd=new Date();dd.setDate(1);dd.setMonth(dd.getMonth()-i);meses.push(dd.toISOString().slice(0,7));}
    var mmax=29900;
    var fact=meses.map(function(p){var m=PLAN_MRR[c0(d).plan];return {per:p,monto:p===mesActual()?(c0(d).estado==="ACTIVA"?m:0):m};});
    function c0(x){return x;}
    var fbars=fact.map(function(f,i){
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="tnum mono" style="font-size:10px;color:rgba(255,255,255,.6)">'+fmt(f.monto)+'</span>'+
      '<div class="bar-up" style="width:100%;max-width:60px;height:'+Math.max(6,f.monto/mmax*100)+'%;background:rgba(201,242,75,.85);border-radius:6px 6px 2px 2px;animation-delay:'+(i*70)+'ms"></div>'+
      '<span class="mono" style="font-size:9px;text-transform:uppercase;color:rgba(255,255,255,.35)">'+fmtMes(f.per).split(" ")[0].slice(0,3)+"</span></div>";
    }).join("");
    var rows=fact.slice().reverse().map(function(f){
      var est=f.monto===0?'<span class="tag tag-susp">suspendida</span>':f.per===mesActual()?'<span class="tag tag-pendiente">pendiente</span>':'<span class="tag tag-ok">pagada</span>';
      return '<tr><td class="mono" style="font-size:11px;color:rgba(255,255,255,.5)">F-'+f.per.replace("-","").toUpperCase()+"</td><td>"+esc(d.comunidad.nombre)+"</td><td>"+PLAN_LBL[d.comunidad.plan]+"</td><td class='mono' style='font-size:12px'>"+fmtMes(f.per)+"</td>"+
      '<td class="tnum mono" style="font-weight:700">'+(f.monto===0?"—":fmt(f.monto))+"</td><td>"+est+"</td></tr>";
    }).join("");
    cuerpo='<div class="fade-swap" style="display:grid;gap:1.3rem"><div class="dcard"><span class="mono" style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5)">Ingresos SaaS por mes</span>'+
    '<div style="display:flex;gap:1rem;align-items:flex-end;height:150px;margin-top:1.4rem">'+fbars+"</div></div>"+
    '<div class="dcard" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Factura</th><th>Tenant</th><th>Plan</th><th>Periodo</th><th>Monto</th><th>Estado</th></tr></thead><tbody>'+rows+"</tbody></table></div></div></div>";
  }else{
    cuerpo='<div class="fade-swap"><div class="dcard" style="padding:0"><div style="padding:1.1rem 1.4rem;border-bottom:1px solid rgba(255,255,255,.08)" class="mono"><span style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4)">Eventos de la plataforma</span></div>'+
    d.eventos.map(function(e){return '<div style="display:flex;gap:.9rem;align-items:flex-start;padding:.85rem 1.4rem;border-bottom:1px solid rgba(255,255,255,.05)"><i style="width:7px;height:7px;border-radius:50%;background:var(--neon);margin-top:7px;flex-shrink:0"></i>'+
    '<span style="flex:1;font-size:.86rem;color:rgba(255,255,255,.8)">'+esc(e.texto)+"</span>"+
    '<span class="mono" style="font-size:9.5px;color:rgba(255,255,255,.35);text-transform:uppercase">'+fmtFecha(e.fecha)+"</span></div>";}).join("")+"</div></div>";
  }
  return '<div class="dark dotgrid-dark"><header style="position:sticky;top:0;z-index:40;border-bottom:1px solid rgba(255,255,255,.1);background:rgba(7,31,23,.85);backdrop-filter:blur(10px)">'+
  '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:1rem;padding:.8rem 1.5rem">'+logo(true)+
  '<span class="mono" style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase">/ ops</span>'+
  '<span class="mono" style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--neon);border:1px solid rgba(201,242,75,.4);padding:.25rem .7rem;border-radius:999px">superadmin · acceso restringido</span>'+
  '<div style="margin-left:auto;display:flex;gap:.8rem;align-items:center"><span class="mono" style="font-size:10px;color:rgba(255,255,255,.4)">ruta #/adminapp · sin enlaces públicos</span>'+
  '<button class="btn btn-outline-light btn-sm" data-act="salir">Salir</button></div></div></header>'+
  '<div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:210px 1fr;gap:1.6rem;padding:1.6rem 1.5rem" class="adm-grid"><aside>'+tabs+
  '<p class="mono" style="font-size:9.5px;line-height:1.7;color:rgba(255,255,255,.35);margin-top:1.2rem;padding:0 .5rem">Panel interno para los dueños de ComunApp: tenants, facturación global y métricas de uso.</p></aside>'+
  '<main style="min-width:0">'+cuerpo+"</main></div>"+
  '<style>@media(max-width:900px){.adm-grid{grid-template-columns:1fr !important}}</style></div>';
}

/* ============ router ============ */
function parseCSV(texto){
  var lineas=texto.trim().split(/\r?\n/).filter(function(l){return l.trim();});
  if(lineas.length<2)return {filas:[],errores:["El archivo debe tener un encabezado y al menos una fila."]};
  var d1=(lineas[0].match(/;/g)||[]).length, d2=(lineas[0].match(/,/g)||[]).length;
  var delim=d1>=d2?";":",";
  var cab=lineas[0].split(delim).map(function(h){return h.trim().toLowerCase().replace(/["']/g,"");});
  function idx(ns){for(var i=0;i<cab.length;i++){for(var j=0;j<ns.length;j++){if(cab[i].indexOf(ns[j])>=0)return i;}}return -1;}
  var iP=idx(["parcela","lote","unidad"]),iPr=idx(["propietario"]),iA=idx(["arrendatario"]),iC=idx(["contacto","tel","fono"]),iE=idx(["correo","email","mail"]),iD=idx(["deuda","monto","saldo"]);
  var errores=[];
  if(iP<0)errores.push("Falta la columna «Parcela».");
  if(iPr<0)errores.push("Falta la columna «Propietario».");
  if(iE<0)errores.push("Falta la columna «Correo Electrónico».");
  if(errores.length)return {filas:[],errores:errores};
  var filas=[];
  lineas.slice(1).forEach(function(l,k){
    var c=l.split(delim).map(function(x){return x.trim().replace(/^"|"$/g,"");});
    var p=c[iP]||"",pr=c[iPr]||"",e=c[iE]||"";
    if(!p||!pr||e.indexOf("@")<0){errores.push("Fila "+(k+2)+": necesita Parcela, Propietario y un correo válido.");return;}
    filas.push({parcela:p,propietario:pr,arrendatario:iA>=0?(c[iA]||null):null,contacto:iC>=0?(c[iC]||null):null,correo:e,deuda:iD>=0?Math.max(0,parseInt(String(c[iD]||"0").replace(/[^\d]/g,""),10)||0):0});
  });
  return {filas:filas,errores:errores};
}
var CSV_EJEMPLO="Parcela;Propietario;Arrendatario;Contacto;Correo Electr\u00f3nico;Deuda\nP-31;Laura Espinoza;;;laura.espinoza@correo.cl;55000\nP-32;H\u00e9ctor Camus;Daniela Paz;+56 9 8811 2233;hector.camus@correo.cl;110000\nP-33;Rosa Valenzuela;;;rosa.v@correo.cl;0\nP-34;Iv\u00e1n Sep\u00falveda;Carolina Reyes;;ivan.sepulveda@correo.cl;27500\nP-35;Marta Guzm\u00e1n;;;marta.guzman@correo.cl;55000\nP-36;\u00d3scar Peralta;Felipe Mora;+56 9 7700 1188;oscar.peralta@correo.cl;0\nP-37;Julia Contreras;;;julia.contreras@correo.cl;82500\nP-38;Ram\u00f3n D\u00edaz;;;ramon.diaz@correo.cl;0";

function ruta(){
  var h=location.hash.replace(/^#/,"")||"/";
  if(h.indexOf("/dashboard")===0)return "dashboard";
  if(h.indexOf("/adminapp")===0)return "adminapp";
  if(h.indexOf("/entrar")===0)return "entrar";
  return "landing";
}
var io=null;
function render(){
  var r=ruta();
  if(r==="landing")document.getElementById("app").innerHTML=viewLanding();
  else if(r==="entrar")document.getElementById("app").innerHTML=viewEntrar();
  else if(r==="dashboard"){document.getElementById("app").innerHTML=viewDashboard();}
  else document.getElementById("app").innerHTML=viewAdminApp();
  window.scrollTo(0,0);
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.12});
  document.querySelectorAll(".reveal:not(.in)").forEach(function(el){io.observe(el);});
  var nav=document.getElementById("nav");
  if(nav){var on=function(){nav.classList.toggle("scrolled",window.scrollY>24);};window.addEventListener("scroll",on);on();}
  bindDropzone();
}
function refrescar(){
  return api.datos().then(function(d){S.datos=d;render();});
}
function bindDropzone(){
  var dz=document.getElementById("dropzone");if(!dz)return;
  ["dragover","dragenter"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add("over");});});
  ["dragleave","drop"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.remove("over");});});
  dz.addEventListener("drop",function(e){
    var f=e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;
    if(!/\.(csv|txt)$/i.test(f.name)){toast("Solo se aceptan archivos .csv","warn");return;}
    var rd=new FileReader();rd.onload=function(){abrirPreviewCSV(String(rd.result||""),f.name);};rd.readAsText(f);
  });
  var inp=document.getElementById("csv-file");
  if(inp)inp.addEventListener("change",function(){
    var f=inp.files&&inp.files[0];if(!f)return;
    var rd=new FileReader();rd.onload=function(){abrirPreviewCSV(String(rd.result||""),f.name);};rd.readAsText(f);
    inp.value="";
  });
}
function abrirPreviewCSV(texto,nombre){
  var r=parseCSV(texto);S.previewCSV=r.filas;
  var rows=r.filas.slice(0,8).map(function(f){
    return "<tr><td class='mono' style='font-weight:700;color:var(--pine2)'>"+esc(f.parcela)+"</td><td>"+esc(f.propietario)+"</td><td style='color:var(--ink3)'>"+esc(f.arrendatario||"—")+"</td>"+
    "<td style='color:var(--ink3)'>"+esc(f.contacto||"—")+"</td><td class='mono' style='font-size:11px'>"+esc(f.correo)+"</td>"+
    "<td class='tnum mono' style='text-align:right;font-weight:700'>"+(f.deuda>0?fmt(f.deuda):"—")+"</td></tr>";
  }).join("");
  var err=r.errores.length?'<div style="border:1px solid rgba(217,160,54,.5);background:rgba(217,160,54,.1);border-radius:12px;padding:.8rem 1rem;font-size:.85rem;color:#8a6114;margin-bottom:1rem"><strong>Avisos del archivo:</strong> '+esc(r.errores.slice(0,4).join(" · "))+(r.errores.length>4?" …":"")+"</div>":"";
  var body=r.filas.length?err+
  '<p class="mono" style="font-size:11px;color:var(--ink2);margin-bottom:.8rem">'+ic("sheet",14)+" "+esc(nombre)+" · "+r.filas.length+" filas detectadas</p>"+
  '<div style="overflow-x:auto;border:1px solid var(--line);border-radius:12px"><table class="tbl"><thead><tr><th>Parcela</th><th>Propietario</th><th>Arrendatario</th><th>Contacto</th><th>Correo</th><th style="text-align:right">Deuda</th></tr></thead><tbody>'+rows+"</tbody></table></div>"+
  (r.filas.length>8?'<p class="mono" style="font-size:10px;color:var(--ink3);margin-top:.5rem">… y '+(r.filas.length-8)+" filas más</p>":"")+
  '<p style="font-size:.83rem;color:var(--ink3);margin-top:1rem">Se crearán accesos para los vecinos y cobros por las deudas iniciales (contraseña inicial: vecino123).</p>'+
  '<div style="display:flex;justify-content:flex-end;gap:.7rem;margin-top:1.2rem"><button class="btn btn-ghost" data-act="cerrar-modal">Cancelar</button>'+
  '<button class="btn btn-neon" data-act="confirmar-importar">'+ic("upload",15)+" Importar "+r.filas.length+" parcelas</button></div>"
  :'<div style="text-align:center;padding:1.5rem"><p class="font-display" style="font-weight:800;font-size:1.15rem">No hay filas válidas para importar</p><p style="color:var(--ink3);font-size:.9rem;margin:.4rem 0 1.2rem">Revisa que el archivo tenga las columnas indicadas.</p><button class="btn btn-ghost" data-act="cerrar-modal">Entendido</button></div>';
  openModal("Importar Comunidad",body,true);
}
/* pago en línea en 3 fases */
function modalPago(fase,cobro){
  if(fase==="form"){
    var body='<div style="display:grid;gap:1rem"><div style="display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem">'+
    '<div><div style="font-weight:700;font-size:.92rem">'+esc(cobro.concepto)+" · "+esc(cobro.unidad)+"</div><div class='mono' style='font-size:10px;color:var(--ink3);text-transform:uppercase'>"+esc(fmtMes(cobro.periodo))+"</div></div>"+
    '<span class="tnum font-display" style="font-weight:800;font-size:1.25rem">'+fmt(cobro.monto)+"</span></div>"+
    '<form data-form="pago" style="display:grid;gap:.9rem"><div><label class="fl">Nombre en la tarjeta</label><input class="field" id="pg-nombre" placeholder="Como aparece en la tarjeta" value="'+esc(sesion.nombre)+'"></div>'+
    '<div><label class="fl">Número de tarjeta</label><input class="field mono" id="pg-num" placeholder="4242 4242 4242 4242" maxlength="19" value="4242 4242 4242 4242"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.9rem"><div><label class="fl">Vencimiento</label><input class="field mono" placeholder="MM/AA" maxlength="5" value="12/27"></div>'+
    '<div><label class="fl">CVV</label><input class="field mono" type="password" placeholder="123" maxlength="4" value="123"></div></div>'+
    '<button class="btn btn-neon btn-lg btn-block" type="submit">'+ic("lock",16)+" Pagar "+fmt(cobro.monto)+"</button></form>"+
    '<p class="mono" style="font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3);text-align:center">Demo · procesado por Mercado Pago</p></div>';
    openModal("Pagar con Mercado Pago",body);
  }else if(fase==="procesando"){
    openModal("Pagar con Mercado Pago",'<div style="text-align:center;padding:2rem 1rem"><div class="spin" style="width:52px;height:52px;border-radius:50%;border:4px solid var(--line);border-top-color:var(--pine2);margin:0 auto 1.2rem"></div>'+
    '<p class="font-display" style="font-weight:800;font-size:1.2rem">Procesando tu pago…</p><p class="mono" style="font-size:11px;color:var(--ink3);margin-top:.4rem;text-transform:uppercase;letter-spacing:.1em">no cierres esta ventana <span class="caret-blink" style="display:none">▊</span></p></div>');
  }else if(fase==="ok"){
    openModal("Pago confirmado",'<div style="text-align:center;padding:1rem"><span style="width:64px;height:64px;border-radius:50%;background:rgba(18,82,62,.1);color:var(--pine2);display:grid;place-items:center;margin:0 auto 1rem">'+ic("check",30)+"</span>"+
    '<p class="font-display" style="font-weight:800;font-size:1.4rem">¡Pago realizado!</p>'+
    '<p style="color:var(--ink2);font-size:.92rem;margin:.5rem 0 1.2rem">'+esc(cobro.concepto)+" de "+esc(cobro.unidad)+" · referencia <strong class='mono'>"+esc(cobro.pagoRef)+"</strong></p>"+
    '<div style="display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap"><button class="btn btn-pine" data-act="recibo" data-id="'+esc(cobro.id)+'">'+ic("download",15)+" Descargar recibo</button>"+
    '<button class="btn btn-ghost" data-act="cerrar-modal">Listo</button></div></div>');
  }
}
function descargarRecibo(c){
  var html="<!doctype html><html><head><meta charset='utf-8'><title>Recibo "+esc(c.pagoRef||"")+"</title></head><body style='font-family:Arial,sans-serif;max-width:560px;margin:2rem auto;color:#0e2a20'>"+
  "<div style='border:2px solid #0c3b2e;border-radius:14px;padding:2rem'>"+
  "<div style='display:flex;justify-content:space-between;align-items:center'><h1 style='font-size:1.4rem'>ComunApp</h1><span style='font-size:.8rem;color:#7b9186'>Comprobante de pago</span></div>"+
  "<hr style='border:none;border-top:1px dashed #dde8dc;margin:1.2rem 0'>"+
  "<p><strong>Comunidad:</strong> "+esc(S.datos.comunidad.nombre)+"</p>"+
  "<p><strong>Parcela / unidad:</strong> "+esc(c.unidad)+"</p>"+
  "<p><strong>Concepto:</strong> "+esc(c.concepto)+"</p>"+
  "<p><strong>Periodo:</strong> "+esc(fmtMes(c.periodo))+"</p>"+
  "<p><strong>Medio de pago:</strong> Mercado Pago</p>"+
  "<p><strong>Referencia:</strong> "+esc(c.pagoRef||"—")+"</p>"+
  "<p style='font-size:1.3rem;margin-top:1rem'><strong>Total pagado: "+fmt(c.monto)+"</strong></p>"+
  "<p style='color:#7b9186;font-size:.8rem;margin-top:1.4rem'>Emitido el "+fmtFecha(ahora())+" · Este comprobante es válido como recibo de pago.</p></div></body></html>";
  var b=new Blob([html],{type:"text/html"});
  var a=document.createElement("a");a.href=URL.createObjectURL(b);
  a.download="recibo-"+(c.pagoRef||c.id)+".html";document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
  toast("Recibo descargado.");
}
function modalVincular(){
  openModal("Vincular Mercado Pago",'<p style="font-size:.9rem;color:var(--ink2);margin-bottom:1.2rem">Escribe el correo de la cuenta de Mercado Pago donde quieres recibir los pagos del mes de tu comunidad.</p>'+
  '<form data-form="vincular" style="display:grid;gap:1rem"><div><label class="fl">Correo de Mercado Pago</label><input class="field" id="mp-email" type="email" placeholder="cuenta@mercadopago.cl"></div>'+
  '<button class="btn btn-neon btn-lg btn-block" type="submit">'+ic("link",16)+" Conectar cuenta</button></form>'+
  '<p class="mono" style="font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3);text-align:center">Demo · podrás desvincular cuando quieras</p>');
}
function modalCotizar(){
  openModal("Cotiza tu plan a la medida",'<p style="font-size:.9rem;color:var(--ink2);margin-bottom:1.2rem">Cuéntanos de tu comunidad y te contactamos en menos de 24 horas.</p>'+
  '<form data-form="cotizar" style="display:grid;gap:.9rem">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.9rem"><input class="field" id="ct-nombre" placeholder="Tu nombre"><input class="field" id="ct-comunidad" placeholder="Nombre de la comunidad"></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.9rem"><input class="field" id="ct-correo" type="email" placeholder="Correo"><input class="field" id="ct-unidades" type="number" min="1" placeholder="N° de parcelas / unidades"></div>'+
  '<textarea class="field" id="ct-msj" rows="3" placeholder="¿Qué necesitan resolver?" style="resize:vertical"></textarea>'+
  '<button class="btn btn-neon btn-lg btn-block" type="submit">Enviar cotización '+ic("arrow",16)+"</button></form>");
}

/* ============ eventos globales ============ */
document.addEventListener("click",function(e){
  var sc=e.target.closest("[data-scroll]");
  if(sc){e.preventDefault();var el=document.getElementById(sc.getAttribute("data-scroll"));if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return;}
  var t=e.target.closest("[data-act]");if(!t)return;
  if(t.closest("[data-stop]")&&t.getAttribute("data-act")!=="cerrar-modal"&&t.getAttribute("data-act").indexOf("pagar")!==0&&t.getAttribute("data-act").indexOf("recibo")!==0&&t.getAttribute("data-act").indexOf("confirmar")!==0&&t.getAttribute("data-act").indexOf("csv")!==0&&t.getAttribute("data-act").indexOf("cotizar")!==0)return;
  var act=t.getAttribute("data-act");
  var id=t.getAttribute("data-id");
  function porId(arr){for(var i=0;i<arr.length;i++){if(arr[i].id===id)return arr[i];}return null;}
  if(act==="cerrar-modal")closeModal();
  else if(act==="cerrar-modal-fondo"){if(e.target.classList.contains("modal-bg"))closeModal();}
  else if(act==="demo-pagar"){if(sesion)location.hash="#/dashboard";else location.hash="#/entrar";toast("Entra con una cuenta para pagar de verdad. Esto era la muestra.","warn");}
  else if(act==="cotizar")modalCotizar();
  else if(act==="toast-demo")toast("En la versión completa aquí se crea un nuevo tenant con su administrador.","warn");
  else if(act==="salir"){setSesion(null);S.datos=null;location.hash="#/";toast("Sesión cerrada. ¡Hasta pronto!","warn");}
  else if(act==="modulo"){S.modulo=t.getAttribute("data-mod");render();}
  else if(act==="admin-tab"){S.adminTab=t.getAttribute("data-tab");render();}
  else if(act==="entrar-rapido"){doLogin(t.getAttribute("data-email"),t.getAttribute("data-pass"));}
  else if(act==="pagar-inicio"){var c=porId(S.datos.cobros);if(c){S.pagoCobro=c;modalPago("form",c);}}
  else if(act==="registrar-pago"){var b=porId(S.datos.cobros);if(b){api.registrarPago(b.id).then(function(){toast("Pago registrado. El estado de cuenta del vecino se actualizó.");return refrescar();});}}
  else if(act==="generar-mes"){var m=parseInt(document.getElementById("gen-monto").value,10)||0;if(m<=0){toast("Indica un monto válido.","warn");return;}
    api.generarMes(m).then(function(r){toast(r.creados>0?"Pagos del mes generados para "+r.creados+" unidades.":"Este mes ya está generado. No se duplicaron cobros.",r.creados>0?"ok":"warn");return refrescar();});}
  else if(act==="recibo"){var rc=porId(S.datos.cobros);if(rc)descargarRecibo(rc);}
  else if(act==="vincular-mp")modalVincular();
  else if(act==="desvincular-mp"){api.desvincularMP().then(function(){toast("Cuenta desconectada. Los vecinos ya no pueden pagar en línea.","warn");return refrescar();});}
  else if(act==="csv-click"){var inp=document.getElementById("csv-file");if(inp)inp.click();}
  else if(act==="csv-ejemplo")abrirPreviewCSV(CSV_EJEMPLO,"ejemplo_comunidad.csv");
  else if(act==="confirmar-importar"){var filas=S.previewCSV;if(!filas||!filas.length)return;
    api.importar(filas).then(function(r){closeModal();toast("Comunidad importada: "+r.parcelas+" parcelas, "+r.vecinos+" vecinos nuevos y "+r.cargos+" deudas cargadas.");return refrescar();});}
  else if(act==="cancelar-reserva"){api.cancelarReserva(id).then(function(){toast("Reserva cancelada.","warn");return refrescar();});}
  else if(act==="acceso-salida"){api.salida(id).then(function(){toast("Salida registrada.");return refrescar();});}
  else if(act==="toggle-tenant"){api.toggleTenant().then(function(est){toast("Tenant "+(est==="SUSPENDIDA"?"suspendido":"reactivado")+".",est==="SUSPENDIDA"?"warn":"ok");return refrescar();});}
});
document.addEventListener("change",function(e){
  if(e.target.id==="hist-per"){S.histPer=e.target.value;render();}
});
document.addEventListener("submit",function(e){
  var f=e.target.closest("[data-form]");if(!f)return;
  e.preventDefault();
  var kind=f.getAttribute("data-form");
  function v(id){var el=document.getElementById(id);return el?el.value.trim():"";}
  if(kind==="login"){doLogin(v("login-email")||f.email.value,v("login-pass")||f.pass.value);}
  else if(kind==="pago"){var c=S.pagoCobro;if(!c)return;modalPago("procesando",c);
    setTimeout(function(){api.pagarOnline(c.id).then(function(pagado){modalPago("ok",pagado);toast("Pago confirmado. ¡Gracias!");return refrescar();}).catch(function(err){closeModal();toast(err.message,"err");});},1600);}
  else if(kind==="vincular"){var em=v("mp-email");if(em.indexOf("@")<0){toast("Escribe el correo de tu cuenta de Mercado Pago.","warn");return;}
    closeModal();toast("Conectando con Mercado Pago…");
    api.vincularMP(em).then(function(){toast("¡Listo! Tu comunidad ya puede recibir pagos del mes en línea.");return refrescar();});}
  else if(kind==="mov"){var tipo=(document.getElementById("mov-tipo")||{}).value||"GASTO";
    var desc=v("mov-desc"),monto=parseInt(v("mov-monto"),10)||0;
    if(!desc||monto<=0){toast("Escribe una descripción y un monto válido.","warn");return;}
    api.nuevoMov({tipo:tipo,categoria:v("mov-cat")||"Otros",descripcion:desc,monto:monto,fecha:v("mov-fecha")||hoy()}).then(function(){toast((tipo==="GASTO"?"Gasto":"Ingreso")+" registrado. Los gráficos se actualizaron.");return refrescar();});}
  else if(kind==="aviso"){var ti=v("av-titulo"),cu=v("av-cuerpo");
    if(!ti||!cu){toast("Completa el título y el mensaje del aviso.","warn");return;}
    api.nuevoAviso({titulo:ti,cuerpo:cu,tipo:v("av-tipo")||"INFORMATIVO",autor:sesion.rol==="ADMIN"?"Administración":"Comité"}).then(function(){toast("Aviso publicado. Toda la comunidad ya puede verlo.");return refrescar();});}
  else if(kind==="vecino"){var nm=v("vn-nombre"),em2=v("vn-email"),rol2=v("vn-rol"),un=v("vn-unidad");
    if(!nm||em2.indexOf("@")<0){toast("Nombre y correo válido son obligatorios.","warn");return;}
    if((rol2==="PROPIETARIO"||rol2==="ARRENDATARIO")&&!un){toast("Indica la parcela (ej: P-14).","warn");return;}
    api.nuevoVecino({nombre:nm,email:em2,rol:rol2,unidad:un||null,password:v("vn-pass")||"vecino123"}).then(function(){toast("Vecino creado. Ya puede entrar con su correo y contraseña.");f.reset();document.getElementById("vn-pass").value="vecino123";return refrescar();}).catch(function(err){toast(err.message,"err");});}
  else if(kind==="reserva"){api.reservar({area:v("re-area"),fecha:v("re-fecha"),bloque:v("re-bloque"),unidad:sesion.unidad,quien:sesion.nombre}).then(function(){toast("¡Reservado! El espacio quedó a tu nombre.");return refrescar();}).catch(function(err){toast(err.message,"warn");});}
  else if(kind==="votar"){var vot=f.getAttribute("data-vot");var btn=e.target.closest("[data-op]");if(!btn)return;
    api.votar(vot,btn.getAttribute("data-op"),sesion.unidad).then(function(){toast("Tu voto quedó registrado.");return refrescar();}).catch(function(err){toast(err.message,"warn");});}
  else if(kind==="votacion"){var t2=v("vo-titulo"),p2=v("vo-pregunta"),o2=v("vo-opciones");
    if(!t2||!p2||!o2){toast("Completa título, pregunta y opciones.","warn");return;}
    var ops=o2.split(",").map(function(x){return x.trim();}).filter(function(x){return x;});
    if(ops.length<2){toast("Escribe al menos dos opciones separadas por coma.","warn");return;}
    api.nuevaVotacion({titulo:t2,pregunta:p2,opciones:ops}).then(function(){toast("Votación abierta. Los vecinos ya pueden participar.");f.reset();return refrescar();});}
  else if(kind==="acceso"){var nv=v("ac-nombre");if(!nv){toast("Escribe el nombre de la visita o proveedor.","warn");return;}
    api.acceso({visitante:nv,tipo:v("ac-tipo")||"VISITA",unidad:v("ac-unidad").toUpperCase()}).then(function(){toast("Ingreso registrado en la bitácora.");f.reset();return refrescar();});}
  else if(kind==="cotizar"){var cn=v("ct-nombre"),cc=v("ct-correo");
    if(!cn||cc.indexOf("@")<0){toast("Completa al menos tu nombre y un correo válido.","warn");return;}
    closeModal();toast("¡Gracias "+cn.split(" ")[0]+"! Te contactaremos en menos de 24 horas.");}
});
/* toggle tipo de movimiento */
document.addEventListener("click",function(e){
  if(e.target.id==="mov-gasto"||e.target.id==="mov-ingreso"){
    var g=document.getElementById("mov-gasto"),i2=document.getElementById("mov-ingreso"),h=document.getElementById("mov-tipo");
    var gasto=e.target.id==="mov-gasto";
    h.value=gasto?"GASTO":"INGRESO";
    g.style.background=gasto?"var(--neon)":"transparent";g.style.color=gasto?"var(--deep)":"#fff";g.style.border=gasto?"none":"1px solid rgba(255,255,255,.25)";
    i2.style.background=!gasto?"var(--neon)":"transparent";i2.style.color=!gasto?"var(--deep)":"#fff";i2.style.border=!gasto?"none":"1px solid rgba(255,255,255,.25)";
  }
});
function doLogin(email,pass){
  var err=document.getElementById("login-error");
  api.login(email,pass).then(function(s){
    setSesion(s);S.modulo="inicio";S.adminTab="metricas";
    toast("Bienvenido, "+s.nombre.split(" ")[0]+" — entraste como "+ROL_LABEL[s.rol]+".");
    if(s.rol==="SUPERADMIN")location.hash="#/adminapp";else location.hash="#/dashboard";
    return refrescar();
  }).catch(function(ex){
    if(err)err.innerHTML='<div style="display:flex;gap:.5rem;align-items:flex-start;border:1.5px solid var(--signal);background:rgba(201,79,56,.08);border-radius:12px;padding:.7rem .9rem;font-size:.85rem;color:#a03526">'+ic("alert",15)+"<span>"+esc(ex.message)+"</span></div>";
    else toast(ex.message,"err");
  });
}
window.addEventListener("hashchange",function(){
  var r=ruta();
  if((r==="dashboard"||r==="adminapp")&&!S.datos){refrescar();}else{render();}
});
render();
if(ruta()==="dashboard"||ruta()==="adminapp"){refrescar();}
})();
</script>
</body>
</html>
