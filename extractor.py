"""
Licita AI - Extractor de Licitaciones
Extrae informacion de licitaciones publicas usando IA y las guarda en Supabase.
"""

import os
import json
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuracion
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Headers para Supabase
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def extraer_contenido_url(url: str) -> str:
    """Descarga y extrae el texto visible de una URL usando requests y BeautifulSoup."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    respuesta = requests.get(url, headers=headers, timeout=30)
    respuesta.raise_for_status()

    soup = BeautifulSoup(respuesta.text, "lxml")

    # Eliminar scripts y estilos
    for elemento in soup(["script", "style", "meta", "link"]):
        elemento.decompose()

    # Extraer texto limpio
    texto = soup.get_text(separator="\n", strip=True)

    return texto


def extraer_datos_con_ia(texto: str) -> dict:
    """
    Envia el texto a Gemini API y extrae datos estructurados de la licitacion.
    Retorna un diccionario con: titulo, organismo, presupuesto, tecnologias, resumen_comercial
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

    headers = {
        "Content-Type": "application/json"
    }

    params = {
        "key": GEMINI_API_KEY
    }

    respuesta = requests.post(
        GEMINI_API_URL,
        headers=headers,
        params=params,
        json=payload,
        timeout=60
    )
    respuesta.raise_for_status()

    resultado = respuesta.json()

    # Extraer el contenido generado
    if "candidates" in resultado and len(resultado["candidates"]) > 0:
        contenido = resultado["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(contenido)
    else:
        raise ValueError("La API de Gemini no devolvio una respuesta valida")


def guardar_en_supabase(datos: dict, url_origen: str) -> dict:
    """
    Inserta los datos extraidos en la tabla 'licitaciones' de Supabase.
    Usa la API REST directamente para evitar problemas de compatibilidad.
    Retorna el registro creado.
    """
    registro = {
        "titulo": datos.get("titulo"),
        "organismo": datos.get("organismo"),
        "presupuesto": datos.get("presupuesto"),
        "tecnologias": datos.get("tecnologias", []),
        "resumen_comercial": datos.get("resumen_comercial"),
        "url_origen": url_origen
    }

    url_insert = f"{SUPABASE_URL}/rest/v1/licitaciones"

    respuesta = requests.post(
        url_insert,
        headers=SUPABASE_HEADERS,
        json=registro
    )
    respuesta.raise_for_status()

    return respuesta.json()[0] if respuesta.json() else None


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
    """
    Version simplificada sin prints - para uso en lote o API.
    """
    # Extraer contenido
    texto = extraer_contenido_url(url)

    # Procesar con IA
    datos = extraer_datos_con_ia(texto)

    # Guardar en Supabase
    registro = guardar_en_supabase(datos, url)

    return registro


def procesar_lote_urls(urls: list[str]) -> list[dict]:
    """
    Procesa multiples URLs en lote.
    Retorna lista de registros procesados exitosamente.
    """
    resultados = []
    errores = []

    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Procesando: {url}")
        try:
            registro = procesar_licitacion_simple(url)
            resultados.append(registro)
            print(f"   [OK] Guardado")
        except Exception as e:
            print(f"   [ERROR] {str(e)[:100]}")
            errores.append({"url": url, "error": str(e)})

    print("=" * 60)
    print(f"[OK] {len(resultados)} procesadas correctamente")
    if errores:
        print(f"[ERROR] {len(errores)} fallaron")

    return resultados


def cargar_urls_desde_archivo(archivo: str) -> list[str]:
    """
    Carga URLs desde un archivo generado por el scraper.
    Formato esperado: url|titulo por linea
    """
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

    # Verificar conexion
    print("\n[INFO] Verificando conexion con Supabase...")
    if not verificar_conexion_supabase():
        print("[ERROR] No se pudo conectar a Supabase")
        print("   Verifica las credenciales en el archivo .env")
        sys.exit(1)
    print("[OK] Conectado correctamente")

    if len(sys.argv) > 1:
        # Modo 1: Procesar archivo del scraper
        archivo = sys.argv[1]
        if os.path.exists(archivo):
            print(f"[INFO] Cargando URLs desde {archivo}...")
            urls = cargar_urls_desde_archivo(archivo)
            print(f"[INFO] Encontradas {len(urls)} URLs")
            procesar_lote_urls(urls)
        else:
            # Modo 2: URL directa como argumento
            url = sys.argv[1]
            print(f"[INFO] Procesando URL: {url}")
            resultado = procesar_licitacion_simple(url)
            print("[OK] Procesada exitosamente")
            print(json.dumps(resultado, indent=2, default=str))
    else:
        # Modo 3: Interactivo
        print("\nOpciones:")
        print("  1. Procesar una URL manualmente")
        print("  2. Procesar archivo del scraper (licitaciones_pendientes.txt)")
        print()

        opcion = input("Elige opcion (1/2): ").strip()

        if opcion == "2":
            archivo = "licitaciones_pendientes.txt"
            if os.path.exists(archivo):
                urls = cargar_urls_desde_archivo(archivo)
                print(f"[INFO] {len(urls)} URLs encontradas")
                procesar_lote_urls(urls)
            else:
                print(f"[ERROR] No existe {archivo}. Ejecuta primero scraper.py")
        else:
            url = input("\nIntroduce la URL de la licitacion: ").strip()
            if url:
                try:
                    resultado = procesar_licitacion_simple(url)
                    print("\n" + "=" * 50)
                    print("[OK] PROCESO COMPLETADO")
                    print("=" * 50)
                    print(json.dumps(resultado, indent=2, default=str))
                except Exception as e:
                    print(f"\n[ERROR] {str(e)}")
                    raise
            else:
                print("No se proporciono una URL.")