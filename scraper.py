"""
Licita AI - Scraper de BuscadorLicitaciones.com
Recorre la web y extrae URLs de licitaciones relacionadas con tecnología.
"""

import os
import re
from datetime import datetime
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

# Configuración
BASE_URL = "https://www.buscadorlicitaciones.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}

# Palabras clave para filtrar licitaciones tech
KEYWORDS_TECH = [
    "software",
    "tecnología",
    "informática",
    "digital",
    "sistema",
    "plataforma",
    "aplicación",
    "cloud",
    "aws",
    "azure",
    "google cloud",
    "python",
    "java",
    "javascript",
    "react",
    "angular",
    "vue",
    "node",
    "base de datos",
    "postgresql",
    "mysql",
    "mongodb",
    "api",
    "microservicios",
    "devops",
    "kubernetes",
    "docker",
    "ci/cd",
    "inteligencia artificial",
    "machine learning",
    "blockchain",
    "ciberseguridad",
    "redes",
    "servidor",
    "hardware",
    "equipamiento",
    "telecomunicaciones",
    "fibra",
    "5g",
    "iot",
    "sensores",
    "dashboard",
    "bi",
    "business intelligence",
    "crm",
    "erp",
    "gestión",
    "portal",
    "web",
    "móvil",
    "app",
    "desarrollo",
    "mantenimiento",
    "soporte",
    "ti",
    "tIC",
]

# Palabras para excluir (ruido)
EXCLUDE_KEYWORDS = [
    "obra",
    "construcción",
    "carretera",
    "puente",
    "asfalto",
    "jardinería",
    "limpieza",
    "seguridad física",
    "vigilancia",
    "catering",
    "restaurante",
    "hotel",
    "viaje",
    "transporte",
    "vehículo",
    "coche",
    "flota",
    "combustible",
    "electricidad",
    "luz",
    "agua",
    "gas",
    "residuos",
    "basura",
    "papel",
    "suministro de oficina",
    "mobiliario",
    "silla",
    "mesa",
]


def es_licitacion_tech(titulo: str, descripcion: str = "") -> bool:
    """
    Determina si una licitación es del sector tecnológico.
    """
    texto = f"{titulo} {descripcion}".lower()

    # Si contiene palabras excluidas, descartar
    for excl in EXCLUDE_KEYWORDS:
        if excl in texto:
            return False

    # Si contiene al menos una palabra tech, aceptar
    for tech in KEYWORDS_TECH:
        if tech in texto:
            return True

    return False


def extraer_enlaces_licitaciones(html: str) -> list[dict]:
    """
    Extrae todos los enlaces a licitaciones del HTML.
    Retorna lista de dicts con: titulo, url, descripcion (si existe)
    """
    soup = BeautifulSoup(html, "lxml")
    licitaciones = []

    # Buscar en la página principal - estructura típica
    # Ajustar selectores según la estructura real de la web
    enlaces = soup.find_all("a", href=re.compile(r"/licitacion/|/detalle/|/expediente/"))

    for enlace in enlaces:
        titulo = enlace.get_text(strip=True)
        url = urljoin(BASE_URL, enlace.get("href", ""))

        # Buscar descripción cercana (puede estar en un div hermano o padre)
        descripcion = ""
        padre = enlace.find_parent()
        if padre:
            # Buscar texto en elementos hermanos
            for sibling in padre.children:
                if hasattr(sibling, "get_text"):
                    texto = sibling.get_text(strip=True)
                    if texto and texto != titulo:
                        descripcion += " " + texto

        if titulo and url:
            licitaciones.append({
                "titulo": titulo,
                "url": url,
                "descripcion": descripcion.strip(),
            })

    # También buscar por estructura de lista/table
    items = soup.find_all("div", class_=re.compile(r"item|card|row|list-item", re.I))
    for item in items:
        enlace = item.find("a", href=re.compile(r"/licitacion/|/detalle/"))
        if enlace:
            titulo = enlace.get_text(strip=True)
            url = urljoin(BASE_URL, enlace.get("href", ""))

            descripcion = item.get_text(separator=" ", strip=True)
            descripcion = descripcion.replace(titulo, "").strip()

            if titulo and url:
                # Evitar duplicados
                if not any(l["url"] == url for l in licitaciones):
                    licitaciones.append({
                        "titulo": titulo,
                        "url": url,
                        "descripcion": descripcion[:500],  # Limitar longitud
                    })

    return licitaciones


def buscar_licitaciones_techno(query: str = "tecnología", pagina: int = 1) -> list[dict]:
    """
    Realiza una búsqueda en buscadorlicitaciones.com con una query específica.
    """
    url_busqueda = f"{BASE_URL}/busqueda?q={query}&pagina={pagina}"

    try:
        respuesta = requests.get(url_busqueda, headers=HEADERS, timeout=30)
        respuesta.raise_for_status()

        licitaciones = extraer_enlaces_licitaciones(respuesta.text)

        # Filtrar solo las tech
        licitaciones_tech = [
            l for l in licitaciones if es_licitacion_tech(l["titulo"], l.get("descripcion", ""))
        ]

        return licitaciones_tech

    except requests.RequestException as e:
        print(f"[ERROR] Error en búsqueda '{query}': {e}")
        return []


def explorar_secciones() -> list[str]:
    """
    Retorna URLs de secciones que podrían contener licitaciones tech.
    """
    secciones = [
        f"{BASE_URL}/tecnologia",
        f"{BASE_URL}/informatica",
        f"{BASE_URL}/comunicaciones",
        f"{BASE_URL}/software",
        f"{BASE_URL}/servicios-tic",
    ]
    return secciones


def scrapear_pagina(url: str) -> list[dict]:
    """
    Scrapea una página específica y retorna licitaciones tech encontradas.
    """
    try:
        respuesta = requests.get(url, headers=HEADERS, timeout=30)
        respuesta.raise_for_status()

        licitaciones = extraer_enlaces_licitaciones(respuesta.text)
        licitaciones_tech = [
            l for l in licitaciones if es_licitacion_tech(l["titulo"], l.get("descripcion", ""))
        ]

        return licitaciones_tech

    except requests.RequestException as e:
        print(f"[ERROR] Error scrapeando {url}: {e}")
        return []


def obtener_licitaciones_del_dia() -> list[dict]:
    """
    Función principal que recorre la web y obtiene licitaciones tech del día.
    Combina búsqueda por keywords y exploración de secciones.
    """
    print("[SCRAPER] Iniciando scraping de buscadorlicitaciones.com...")

    todas_licitaciones = {}  # Usar dict para evitar duplicados por URL

    # 1. Búsquedas por palabras clave
    queries = ["tecnología", "informática", "software", "servicios TIC", "telecomunicaciones"]

    for query in queries:
        print(f"   Buscando: {query}...")
        resultados = buscar_licitaciones_techno(query, pagina=1)
        for lic in resultados:
            if lic["url"] not in todas_licitaciones:
                todas_licitaciones[lic["url"]] = lic

    # 2. Explorar secciones específicas
    secciones = explorar_secciones()
    for seccion in secciones:
        print(f"   Explorando sección: {seccion}...")
        resultados = scrapear_pagina(seccion)
        for lic in resultados:
            if lic["url"] not in todas_licitaciones:
                todas_licitaciones[lic["url"]] = lic

    lista_final = list(todas_licitaciones.values())

    print(f"[OK] Encontradas {len(lista_final)} licitaciones tech")

    return lista_final


def guardar_enlaces_temporal(licitaciones: list[dict], archivo: str = "licitaciones_pendientes.txt"):
    """
    Guarda las URLs encontradas en un archivo temporal para procesar después.
    """
    with open(archivo, "w", encoding="utf-8") as f:
        for lic in licitaciones:
            f.write(f"{lic['url']}|{lic['titulo']}\n")

    print(f"[INFO] URLs guardadas en {archivo}")


if __name__ == "__main__":
    # Ejecutar scraping
    licitaciones = obtener_licitaciones_del_dia()

    if licitaciones:
        # Guardar para procesar después con el extractor
        guardar_enlaces_temporal(licitaciones)

        # Mostrar resumen
        print("\n" + "=" * 60)
        print("RESUMEN DE LICITACIONES ENCONTRADAS")
        print("=" * 60)
        for i, lic in enumerate(licitaciones[:10], 1):  # Mostrar primeras 10
            print(f"{i}. {lic['titulo'][:60]}...")
            print(f"   URL: {lic['url']}")
            print()

        if len(licitaciones) > 10:
            print(f"... y {len(licitaciones) - 10} más")
    else:
        print("[INFO] No se encontraron licitaciones tech hoy")
