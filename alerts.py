"""
Licita AI - Alertas por email
Envia a cada usuario Pro/Enterprise con alertas activadas las licitaciones
nuevas del dia que coincidan con sus tecnologias de interes.
Se ejecuta despues del pipeline diario (ver .github/workflows/pipeline.yml).
"""

import os
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def obtener_usuarios_con_alertas() -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/user_profiles"
    params = {
        "select": "id,email,nombre,tecnologias_interes,palabras_clave,plan,"
                  "sector_actividad,presupuesto_min_interes,presupuesto_max_interes",
        "recibir_alertas": "eq.true",
        "plan": "in.(pro,enterprise)",
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def obtener_licitaciones_recientes(horas: int = 24) -> list[dict]:
    desde = (datetime.now(timezone.utc) - timedelta(hours=horas)).isoformat()
    url = f"{SUPABASE_URL}/rest/v1/licitaciones"
    params = {
        "select": "titulo,organismo,presupuesto,tecnologias,resumen_comercial,url_origen",
        "created_at": f"gte.{desde}",
        "estado": "eq.activa",
        "order": "presupuesto.desc",
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


SECTOR_KEYWORDS = {
    "ia": ["inteligencia artificial", "machine learning", "algoritmos"],
    "cloud": ["cloud", "aws", "azure", "nube"],
    "ciberseguridad": ["ciberseguridad", "seguridad informatica"],
    "datos": ["datos", "business intelligence", "big data", "analitica"],
    "mobile": ["movil", "mobile", "app", "ios", "android"],
    "web": ["web", "portal"],
    "iot": ["iot", "internet de las cosas", "sensor"],
    "backend": ["erp", "crm", "backend"],
    "telecomunicaciones": ["telecomunicac", "redes", "fibra"],
    "consultoria": ["consultoria", "asesoria"],
}


def coincide(licitacion: dict, usuario: dict) -> bool:
    # Rango de presupuesto: si el usuario lo configuro, es un filtro duro
    pmin = usuario.get("presupuesto_min_interes")
    pmax = usuario.get("presupuesto_max_interes")
    presupuesto_lic = licitacion.get("presupuesto")
    if (pmin is not None or pmax is not None) and presupuesto_lic is not None:
        if pmin is not None and presupuesto_lic < pmin:
            return False
        if pmax is not None and presupuesto_lic > pmax:
            return False

    intereses = set(t.lower() for t in (usuario.get("tecnologias_interes") or []))
    palabras = set(p.lower() for p in (usuario.get("palabras_clave") or []))
    sector_kws = SECTOR_KEYWORDS.get(usuario.get("sector_actividad") or "", [])

    if not intereses and not palabras and not sector_kws:
        return True  # sin preferencias configuradas -> recibe todas

    techs_lic = set(t.lower() for t in (licitacion.get("tecnologias") or []))
    texto = f"{licitacion.get('titulo', '')} {licitacion.get('resumen_comercial', '')}".lower()

    if intereses & techs_lic:
        return True
    if any(p in texto for p in palabras):
        return True
    if any(k in texto for k in sector_kws):
        return True
    return False


def construir_email_html(nombre: str, licitaciones: list[dict]) -> str:
    filas = ""
    for lic in licitaciones[:15]:
        presupuesto = f"{lic['presupuesto']:,.0f} EUR".replace(",", ".") if lic.get("presupuesto") else "N/D"
        filas += f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee">
            <a href="{lic['url_origen']}" style="color:#2563EB;text-decoration:none;font-weight:600">{lic['titulo']}</a><br>
            <span style="color:#666;font-size:13px">{lic['organismo']} · {presupuesto}</span><br>
            <span style="color:#333;font-size:13px">{lic.get('resumen_comercial', '')[:200]}</span>
          </td>
        </tr>
        """
    return f"""
    <div style="font-family:-apple-system,Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#111">Hola {nombre or ''},</h2>
      <p style="color:#333">Hoy hemos encontrado <strong>{len(licitaciones)}</strong> licitaciones tech que encajan con tu perfil:</p>
      <table style="width:100%;border-collapse:collapse">{filas}</table>
      <p style="margin-top:24px;font-size:12px;color:#999">
        Recibes esto porque tienes las alertas activadas en tu cuenta Pro de Licita AI.
        Puedes desactivarlas desde tu perfil en <a href="https://www.licita-ai.com">licita-ai.com</a>.
      </p>
    </div>
    """


def enviar_email(destinatario: str, asunto: str, html: str) -> bool:
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": "Licita AI <alertas@licita-ai.com>",
            "to": [destinatario],
            "subject": asunto,
            "html": html,
        },
        timeout=30,
    )
    return r.status_code < 300


def ejecutar_alertas():
    print("[ALERTAS] Buscando usuarios con alertas activas (Pro/Enterprise)...")
    usuarios = obtener_usuarios_con_alertas()
    print(f"[ALERTAS] {len(usuarios)} usuarios elegibles")

    if not usuarios:
        print("[ALERTAS] No hay usuarios a los que avisar. Fin.")
        return

    licitaciones = obtener_licitaciones_recientes()
    print(f"[ALERTAS] {len(licitaciones)} licitaciones nuevas en las ultimas 24h")

    if not licitaciones:
        print("[ALERTAS] No hay licitaciones nuevas hoy. Fin.")
        return

    enviados = 0
    for usuario in usuarios:
        matches = [lic for lic in licitaciones if coincide(lic, usuario)]
        if not matches:
            continue
        html = construir_email_html(usuario.get("nombre", ""), matches)
        asunto = f"{len(matches)} licitaciones nuevas para ti - Licita AI"
        if enviar_email(usuario["email"], asunto, html):
            enviados += 1
            print(f"   [OK] Enviado a {usuario['email']} ({len(matches)} licitaciones)")
        else:
            print(f"   [ERROR] Fallo enviando a {usuario['email']}")

    print(f"[ALERTAS] {enviados}/{len(usuarios)} emails enviados")


if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY]):
        print("[ERROR] Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY")
    else:
        ejecutar_alertas()
