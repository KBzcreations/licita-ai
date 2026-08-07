"""
Licita AI - Informe diario de actividad
Envia al admin un resumen de visitas, registros, logins y suscripciones
de las ultimas 24h. Se ejecuta tras el pipeline diario.
"""

import os
from collections import Counter
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "kbz.tube@gmail.com")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def obtener_eventos(horas: int = 24) -> list[dict]:
    desde = (datetime.now(timezone.utc) - timedelta(hours=horas)).isoformat()
    url = f"{SUPABASE_URL}/rest/v1/eventos"
    params = {
        "select": "tipo,pagina,user_id,session_id,metadata,created_at",
        "created_at": f"gte.{desde}",
        "order": "created_at.desc",
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def obtener_nuevos_perfiles(horas: int = 24) -> list[dict]:
    desde = (datetime.now(timezone.utc) - timedelta(hours=horas)).isoformat()
    url = f"{SUPABASE_URL}/rest/v1/user_profiles"
    params = {
        "select": "email,nombre,empresa,plan,tecnologias_interes,created_at",
        "created_at": f"gte.{desde}",
        "order": "created_at.desc",
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def construir_html(eventos: list[dict], nuevos: list[dict]) -> str:
    por_tipo = Counter(e["tipo"] for e in eventos)
    por_pagina = Counter(e["pagina"] for e in eventos if e["tipo"] == "pageview")
    sesiones_unicas = len(set(e["session_id"] for e in eventos if e.get("session_id")))

    filas_paginas = "".join(
        f"<tr><td style='padding:4px 12px 4px 0'>{pagina or '(desconocida)'}</td><td>{n}</td></tr>"
        for pagina, n in por_pagina.most_common(10)
    )

    filas_nuevos = "".join(
        f"<tr><td style='padding:4px 12px 4px 0'>{p.get('email','')}</td>"
        f"<td style='padding:4px 12px'>{p.get('empresa') or '—'}</td>"
        f"<td style='padding:4px 12px'>{p.get('plan')}</td>"
        f"<td>{', '.join(p.get('tecnologias_interes') or []) or '—'}</td></tr>"
        for p in nuevos
    )

    suscripciones = por_tipo.get("suscripcion_completada", 0)
    cancelaciones = por_tipo.get("suscripcion_cancelada", 0)

    return f"""
    <div style="font-family:-apple-system,Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="color:#111">Informe diario - Licita AI</h2>
      <p style="color:#666;font-size:13px">Últimas 24 horas</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0"><strong>Visitas totales (sesiones únicas)</strong></td><td>{sesiones_unicas}</td></tr>
        <tr><td style="padding:6px 0"><strong>Vistas de página</strong></td><td>{por_tipo.get('pageview', 0)}</td></tr>
        <tr><td style="padding:6px 0"><strong>Registros nuevos</strong></td><td>{por_tipo.get('registro', 0)}</td></tr>
        <tr><td style="padding:6px 0"><strong>Logins</strong></td><td>{por_tipo.get('login', 0)}</td></tr>
        <tr><td style="padding:6px 0"><strong>Suscripciones completadas</strong></td><td style="color:{'#16a34a' if suscripciones else '#333'}">{suscripciones}</td></tr>
        <tr><td style="padding:6px 0"><strong>Cancelaciones</strong></td><td>{cancelaciones}</td></tr>
      </table>

      <h3 style="margin-top:24px">Páginas más visitadas</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">{filas_paginas or '<tr><td>Sin datos</td></tr>'}</table>

      <h3 style="margin-top:24px">Usuarios registrados hoy ({len(nuevos)})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="color:#666;text-align:left"><th>Email</th><th>Empresa</th><th>Plan</th><th>Tecnologías</th></tr>
        {filas_nuevos or '<tr><td colspan="4">Sin registros nuevos</td></tr>'}
      </table>

      <p style="margin-top:24px;font-size:12px;color:#999">Generado automáticamente cada día tras el pipeline de licitaciones.</p>
    </div>
    """


def enviar_informe(html: str) -> bool:
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": "Licita AI <alertas@licita-ai.com>",
            "to": [ADMIN_EMAIL],
            "subject": f"Informe diario Licita AI - {datetime.now().strftime('%d/%m/%Y')}",
            "html": html,
        },
        timeout=30,
    )
    return r.status_code < 300


def ejecutar_informe():
    print("[INFORME] Recopilando actividad de las ultimas 24h...")
    eventos = obtener_eventos()
    nuevos = obtener_nuevos_perfiles()
    print(f"[INFORME] {len(eventos)} eventos, {len(nuevos)} usuarios nuevos")
    html = construir_html(eventos, nuevos)
    if enviar_informe(html):
        print(f"[OK] Informe enviado a {ADMIN_EMAIL}")
    else:
        print("[ERROR] No se pudo enviar el informe")


if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY]):
        print("[ERROR] Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY")
    else:
        ejecutar_informe()
