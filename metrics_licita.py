"""LICITA: métricas agregadas de la beta, sin datos personales ni contenido de PDFs.

Lee solo eventos de la matriz desde Supabase con la clave de servicio
existente en GitHub Actions. No envía correos ni escribe en la base de datos.
"""
import json
import os
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PAGE = "licita-matriz-beta"
BATCH = 1000
MAX_ROWS = 100000
WINDOW_DAYS = 7


def read_events():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY (sin métricas verificables)")
    since = (datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)).isoformat()
    all_events = []
    for offset in range(0, MAX_ROWS, BATCH):
        params = urlencode({
            "select": "tipo,pagina,session_id,metadata,created_at",
            "pagina": f"eq.{PAGE}",
            "created_at": f"gte.{since}",
            "order": "created_at.asc",
            "limit": BATCH,
            "offset": offset,
        })
        req = Request(
            f"{url}/rest/v1/eventos?{params}",
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"},
        )
        with urlopen(req, timeout=30) as response:
            batch = json.load(response)
        if not isinstance(batch, list):
            raise RuntimeError("Supabase no devolvió una lista de eventos")
        all_events.extend(batch)
        if len(batch) < BATCH:
            return since, all_events
    raise RuntimeError("Más de 100.000 eventos: paginación incompleta, no publicar cifras parciales")


def summarize(events):
    # Excluir explícitamente tests de salud y registros sintéticos.
    clean = [e for e in events
             if e.get("tipo") != "licita_healthcheck"
             and not (isinstance(e.get("metadata"), dict)
                      and (e["metadata"].get("synthetic") is True
                           or e["metadata"].get("source") == "github-actions"))]
    types = Counter(e.get("tipo") for e in clean)
    sessions = lambda kind: {e["session_id"] for e in clean
                             if e.get("tipo") == kind and e.get("session_id")}
    visits = sessions("tender_pageview")
    qualified = sessions("tender_qualified_visit")
    analyzed = sessions("tender_analysis_completed")
    exported = sessions("tender_export_csv")
    choices = Counter((e.get("metadata") or {}).get("choice")
                      for e in clean if e.get("tipo") == "tender_paid_interest"
                      and isinstance(e.get("metadata"), dict))
    return types, visits, qualified, analyzed, exported, choices


def main():
    since, events = read_events()
    types, visits, qualified, analyzed, exported, choices = summarize(events)
    print(f"LICITA / ventana: {since} hasta {datetime.now(timezone.utc).isoformat()} (UTC)")
    print(f"Eventos de la beta recuperados: {len(events)} (incluidos sintéticos)")
    print(f"Vistas de página: {types['tender_pageview']} eventos; {len(visits)} sesiones por pestaña")
    print(f"Selección válida de PDF: {types['tender_qualified_visit']} eventos; {len(qualified)} sesiones aproximadas")
    print(f"Análisis iniciados: {types['tender_analysis_started']}")
    print(f"Análisis completados: {types['tender_analysis_completed']} eventos; {len(analyzed)} sesiones identificables")
    print(f"CSV descargados: {types['tender_export_csv']} eventos; {len(exported)} sesiones identificables")
    print(f"Interés declarado, NO compra: sí={choices['si']}, depende={choices['depende']}, no={choices['no']}")
    if qualified:
        print(f"Embudo sobre sesiones con PDF: análisis={len(qualified & analyzed)}/{len(qualified)}, CSV={len(qualified & exported)}/{len(qualified)}")
    else:
        print("Embudo: aún no hay sesiones con selección de PDF medibles.")
    print("AVISO: sesiones por pestaña ≠ personas; selección de PDF ≠ humano confirmado; eventos anteriores sin session_id no cuentan como sesiones.")
    print("AVISO: la encuesta no acredita disposición real a pagar; no se miden ventas.")
    if len(qualified) < 100:
        print("DECISIÓN: menos de 100 sesiones con PDF; no declarar fracaso comercial.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR de medición: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
