"""
Licita AI - Extractor de Licitaciones
Extrae informacion de licitaciones publicas usando IA y las guarda en Supabase.
"""

import os
import json
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def extraer_contenido_url(url: str) -> str:
    """Descarga y extrae el texto visible de una URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    respuesta = requests.get(url, headers=headers, timeout=30)
    respuesta.raise_for_status()
    soup = BeautifulSoup(respuesta.text, "lxml")
    for elemento in soup(["script", "style", "meta", "link"]):
        elemento.decompose()
    texto = soup.get_text(separator="\n", strip=True)
    return texto


def extraer_datos_con_ia(texto: str, reintentos: int = 3) -> dict:
    """
    Envia el texto a Gemini API y extrae datos estructurados.
    Reintenta automaticamente si hay error 429 (rate limit).
    """
    prompt = """
Eres un analista experto en licitaciones publicas para empresas tecnologicas.

Extrae la siguiente informacion del texto proporcionado y devuelvela EXCLUSIVAMENTE como JSON valido:

{
    "titulo": "Titulo completo de la licitacion",
    "organismo": "Nombre del organismo publico que convoca",
    "presupuesto": "Importe total en euros (solo numero, sin simbolo)",
    "tecnologias": ["lista", "de", "tecnologias", "mencionadas"],
    "resumen_comercial": "Resumen ejecutivo de 3-4 lineas enfocado en oportunidades de negocio para empresas tech"
}

Instrucciones:
- Si algun campo no se encuentra, usa null para valores individuales o lista vacia para arrays
- El campo 'presupuesto' debe ser un numero (float), no texto
- 'tecnologias' debe ser una lista de strings con las tecnologias identificadas
- 'resumen_comercial' debe ser conciso y orientado a oportunidades de negocio
- Responde SOLO con el JSON, sin texto adicional, sin backticks, sin markdown

Texto de la licitacion:
"""

    payload = {
        "contents": [{
            "parts": [{
                "text": f"{prompt}\n\n{texto[:50000]}"
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        }
    }

    for intento in range(reintentos):
        try:
            respuesta = requests.post(
                GEMINI_API_URL,
                headers={"Content-Type": "application/json"},
                params={"key": GEMINI_API_KEY},
                json=payload,
                timeout=60
            )

            # Si hay rate limit, esperar y reintentar
            if respuesta.status_code == 429:
                espera = 60 * (intento + 1)  # 60s, 120s, 180s
                print(f"   [RATE LIMIT] Esperando {espera}s antes de reintentar...")
                time.sleep(espera)
                continue

            respuesta.raise_for_status()
            resultado = respuesta.json()

            if "candidates" in resultado and len(resultado["candidates"]) > 0:
                contenido = resultado["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(contenido)
            else:
                raise ValueError("Gemini no devolvio respuesta valida")

        except requests.exceptions.HTTPError as e:
            if intento < reintentos - 1:
                print(f"   [ERROR HTTP] Reintentando en 30s... ({intento + 1}/{reintentos})")
                time.sleep(30)
            else:
                raise e

    raise ValueError("Se agotaron los reintentos con Gemini API")


def guardar_en_supabase(datos: dict, url_origen: str) -> dict:
    """Inserta los datos en Supabase. Ignora duplicados por url_origen."""
    registro = {
        "titulo": datos.get("titulo") or "Sin titulo",
        "organismo": datos.get("organismo") or "Organismo desconocido",
        "presupuesto": datos.get("presupuesto"),
        "tecnologias": datos.get("tecnologias", []),
        "resumen_comercial": datos.get("resumen_comercial") or "Sin resumen disponible",
        "url_origen": url_origen,
        "estado": "activa"
    }

    # Filtrar campos None para evitar errores
    registro = {k: v for k, v in registro.items() if v is not None}

    url_insert = f"{SUPABASE_URL}/rest/v1/licitaciones"

    respuesta = requests.post(
        url_insert,
        headers={**SUPABASE_HEADERS, "Prefer": "return=representation,resolution=ignore-duplicates"},
        json=registro
    )

    if respuesta.status_code == 409:
        print(f"   [SKIP] Ya existe en base de datos")
        return None

    respuesta.raise_for_status()
    datos_resp = respuesta.json()
    return datos_resp[0] if datos_resp else None


def verificar_conexion_supabase() -> bool:
    """Verifica que la conexion a Supabase funciona."""
    try:
        url_query = f"{SUPABASE_URL}/rest/v1/licitaciones?select=id&limit=1"
        respuesta = requests.get(url_query, headers=SUPABASE_HEADERS)
        respuesta.raise_for_status()
        return True
    except Exception as e:
        print(f"Error de conexion: {e}")
        return False


def procesar_licitacion_simple(url: str) -> dict:
    """Procesa una URL: extrae contenido, analiza con IA y guarda en Supabase."""
    texto = extraer_contenido_url(url)
    datos = extraer_datos_con_ia(texto)
    registro = guardar_en_supabase(datos, url)
    return registro


def procesar_lote_urls(urls: list) -> list:
    """
    Procesa multiples URLs con pausa entre cada una para evitar rate limits.
    """
    resultados = []
    errores = []

    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Procesando: {url[:80]}...")
        try:
            registro = procesar_licitacion_simple(url)
            if registro:
                resultados.append(registro)
                print(f"   [OK] Guardado: {registro.get('titulo', '')[:60]}")
            else:
                print(f"   [SKIP] Duplicado")
        except Exception as e:
            print(f"   [ERROR] {str(e)[:100]}")
            errores.append({"url": url, "error": str(e)})

        # Pausa entre peticiones para evitar rate limit de Gemini
        if i < len(urls):
            print(f"   [PAUSA] Esperando 15s para evitar rate limit...")
            time.sleep(15)

    print("=" * 60)
    print(f"[OK] {len(resultados)} procesadas correctamente")
    if errores:
        print(f"[ERROR] {len(errores)} fallaron")

    return resultados


def cargar_urls_desde_archivo(archivo: str) -> list:
    """Carga URLs desde archivo generado por el scraper."""
    urls = []
    with open(archivo, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if linea and "|" in linea:
                url = linea.split("|")[0].strip()
                urls.append(url)
    return urls


if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("LICITA AI - Extractor de Licitaciones")
    print("=" * 60)

    print("\n[INFO] Verificando conexion con Supabase...")
    if not verificar_conexion_supabase():
        print("[ERROR] No se pudo conectar a Supabase")
        sys.exit(1)
    print("[OK] Conectado correctamente")

    if len(sys.argv) > 1:
        archivo_o_url = sys.argv[1]
        if os.path.exists(archivo_o_url):
            urls = cargar_urls_desde_archivo(archivo_o_url)
            print(f"[INFO] {len(urls)} URLs encontradas")
            procesar_lote_urls(urls)
        else:
            resultado = procesar_licitacion_simple(archivo_o_url)
            print("[OK] Procesada exitosamente")
            print(json.dumps(resultado, indent=2, default=str))
    else:
        archivo = "licitaciones_pendientes.txt"
        if os.path.exists(archivo):
            urls = cargar_urls_desde_archivo(archivo)
            print(f"[INFO] {len(urls)} URLs encontradas")
            procesar_lote_urls(urls)
        else:
            print("[ERROR] No existe licitaciones_pendientes.txt")
            print("        Ejecuta primero: python scraper.py")