"""
Licita AI - Scraper usando datos abiertos oficiales de PLACSP
Fuente: contrataciondelsectorpublico.gob.es (feed Atom oficial)
Se actualiza diariamente con todas las licitaciones del sector publico.
"""

import os
import io
import time
import zipfile
from datetime import datetime
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup

load_dotenv()

# URL del feed Atom oficial - se actualiza cada dia
# Patron: sindicacion_643/licitacionesPerfilesContratanteCompleto3_AAAAMM.zip
BASE_ATOM_URL = "https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/xml, text/xml, */*",
}

# Codigos CPV tecnologicos (clasificacion europea)
CPV_TECH_PREFIJOS = [
    "720",  # Servicios TI
    "721",  # Servicios TI
    "722",  # Programacion software
    "723",  # Servicios de datos
    "724",  # Servicios internet
    "725",  # Servicios informaticos
    "726",  # Consultoria informatica
    "727",  # Redes informaticas
    "728",  # Auditoria informatica
    "729",  # Otros servicios TI
    "480",  # Software y sistemas
    "642",  # Telecomunicaciones
    "302",  # Equipos informaticos
    "487",  # Paquetes software
]

# Keywords para filtrar por texto
KEYWORDS_TECH = [
    "software", "tecnolog", "inform", "digital", "sistema inform",
    "plataforma tecnol", "aplicacion", "aplicación", "cloud", "aws", "azure",
    "inteligencia artificial", "machine learning", "ciberseguridad",
    "telecomunicac", "base de datos", "desarrollo web", "mantenimiento inform",
    "infraestructura tecnol", "transformacion digital", "sede electronica",
    "portal web", "soporte tecnico inform", "servidores", "redes inform",
    "erp", "crm", "business intelligence", "big data", "iot", "microservicio",
    "data center", "centro de proceso", "helpdesk", "service desk",
    "licencias software", "mantenimiento evolutivo", "app movil",
]

EXCLUDE_KEYWORDS = [
    "obra civil", "construccion", "jardineria", "limpieza urbana",
    "catering", "transporte escolar", "combustible gasoil",
    "mobiliario", "papeleria", "alimentacion", "residuos",
]


def es_tech_por_cpv(cpv: str) -> bool:
    """Comprueba si el CPV corresponde a tecnologia."""
    if not cpv:
        return False
    for prefijo in CPV_TECH_PREFIJOS:
        if cpv.startswith(prefijo):
            return True
    return False


def es_tech_por_texto(titulo: str, descripcion: str = "") -> bool:
    """Comprueba si el titulo/descripcion es tech."""
    texto = f"{titulo} {descripcion}".lower()
    for excl in EXCLUDE_KEYWORDS:
        if excl in texto:
            return False
    for kw in KEYWORDS_TECH:
        if kw in texto:
            return True
    return False


def obtener_url_atom_mes_actual() -> str:
    """Devuelve la URL del fichero Atom del mes actual."""
    ahora = datetime.now()
    anio = ahora.strftime("%Y")
    mes = ahora.strftime("%m")
    return f"{BASE_ATOM_URL}/licitacionesPerfilesContratanteCompleto3_{anio}{mes}.zip"


def obtener_url_atom_diario() -> str:
    """Devuelve la URL del feed Atom diario (sin descargar ZIP)."""
    return f"{BASE_ATOM_URL}/licitacionesPerfilesContratanteCompleto3.atom"


def parsear_atom_licitaciones(contenido_xml: str) -> list[dict]:
    """
    Parsea el XML Atom y extrae licitaciones tech.
    El formato CODICE del gobierno usa namespaces especificos.
    """
    licitaciones = []
    
    try:
        soup = BeautifulSoup(contenido_xml, "xml")
        entries = soup.find_all("entry")
        
        for entry in entries:
            try:
                # Titulo del contrato
                titulo_tag = entry.find("title")
                titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
                
                # URL de la licitacion
                link_tag = entry.find("link", rel="alternate")
                if not link_tag:
                    link_tag = entry.find("link")
                url = link_tag.get("href", "") if link_tag else ""
                
                # Organismo contratante
                organismo = ""
                org_tags = entry.find_all(["cac:PartyName", "PartyName"])
                if org_tags:
                    organismo = org_tags[0].get_text(strip=True)
                
                # Presupuesto
                presupuesto = None
                budget_tags = entry.find_all(["cbc:TaxExclusiveAmount", "TaxExclusiveAmount",
                                               "cbc:EstimatedOverallContractQuantity"])
                if budget_tags:
                    try:
                        presupuesto = float(budget_tags[0].get_text(strip=True))
                    except Exception:
                        pass
                
                # CPV
                cpv = ""
                cpv_tags = entry.find_all(["cbc:ItemClassificationCode", "ItemClassificationCode"])
                if cpv_tags:
                    cpv = cpv_tags[0].get_text(strip=True)
                
                # Estado
                estado_tag = entry.find(["cbc-place:ContractFolderStatusCode",
                                          "ContractFolderStatusCode"])
                estado = estado_tag.get_text(strip=True) if estado_tag else ""
                
                # Solo licitaciones abiertas (ADM = en plazo de admision)
                estados_abiertos = ["ADM", "PUB", ""]
                if estado and estado not in estados_abiertos:
                    continue
                
                # Filtrar por CPV o por texto
                if titulo and (es_tech_por_cpv(cpv) or es_tech_por_texto(titulo)):
                    if url:
                        licitaciones.append({
                            "titulo": titulo,
                            "url": url,
                            "organismo": organismo,
                            "presupuesto": presupuesto,
                            "descripcion": titulo,
                            "cpv": cpv,
                        })
            except Exception:
                continue
                
    except Exception as e:
        print(f"   [ERROR parseando Atom]: {e}")
    
    return licitaciones


def descargar_feed_diario() -> list[dict]:
    """
    Descarga el feed Atom diario directamente (sin ZIP).
    Es el mas actualizado.
    """
    url = obtener_url_atom_diario()
    print(f"   Descargando feed diario: {url}")
    
    try:
        r = requests.get(url, headers=HEADERS, timeout=60)
        if r.status_code == 200:
            licitaciones = parsear_atom_licitaciones(r.text)
            print(f"   -> {len(licitaciones)} licitaciones tech en feed diario")
            return licitaciones
        else:
            print(f"   [ERROR] Status {r.status_code}")
    except Exception as e:
        print(f"   [ERROR feed diario]: {e}")
    
    return []


def descargar_feed_mensual() -> list[dict]:
    """
    Descarga el ZIP mensual y parsea el Atom.
    Contiene mas datos pero es mas pesado.
    """
    url = obtener_url_atom_mes_actual()
    print(f"   Descargando feed mensual: {url}")
    
    try:
        r = requests.get(url, headers=HEADERS, timeout=120, stream=True)
        if r.status_code != 200:
            print(f"   [ERROR] Status {r.status_code}")
            return []
        
        # Leer el ZIP en memoria
        contenido = b""
        for chunk in r.iter_content(chunk_size=8192):
            contenido += chunk
            if len(contenido) > 10 * 1024 * 1024:  # Max 10MB
                print("   [INFO] ZIP muy grande, usando solo primeros 10MB")
                break
        
        # Descomprimir
        with zipfile.ZipFile(io.BytesIO(contenido)) as z:
            # Buscar el fichero .atom principal
            atom_files = [f for f in z.namelist() if f.endswith(".atom")]
            if not atom_files:
                print("   [ERROR] No se encontro fichero .atom en el ZIP")
                return []
            
            # Parsear el primer fichero atom
            with z.open(atom_files[0]) as f:
                xml_content = f.read().decode("utf-8", errors="ignore")
            
            licitaciones = parsear_atom_licitaciones(xml_content)
            print(f"   -> {len(licitaciones)} licitaciones tech en feed mensual")
            return licitaciones
            
    except Exception as e:
        print(f"   [ERROR feed mensual]: {e}")
        return []


def obtener_licitaciones_del_dia() -> list[dict]:
    """
    Funcion principal. Obtiene licitaciones tech del dia.
    Intenta primero el feed diario, luego el mensual si falla.
    """
    print("[SCRAPER] Consultando datos abiertos de PLACSP...")
    print(f"          (contrataciondelsectorpublico.gob.es)")
    
    todas = {}
    
    # Metodo 1: Feed diario (mas ligero y actualizado)
    print("   [1/2] Intentando feed Atom diario...")
    diario = descargar_feed_diario()
    for lic in diario:
        if lic["url"] not in todas:
            todas[lic["url"]] = lic
    
    # Metodo 2: Si no hay datos, probar feed mensual
    if not todas:
        print("   [2/2] Intentando feed mensual (ZIP)...")
        mensual = descargar_feed_mensual()
        for lic in mensual:
            if lic["url"] not in todas:
                todas[lic["url"]] = lic
    
    lista_final = list(todas.values())
    print(f"[OK] Total: {len(lista_final)} licitaciones tech encontradas")
    return lista_final


def guardar_enlaces_temporal(licitaciones: list[dict], archivo: str = "licitaciones_pendientes.txt"):
    with open(archivo, "w", encoding="utf-8") as f:
        for lic in licitaciones:
            f.write(f"{lic['url']}|{lic['titulo']}\n")
    print(f"[INFO] URLs guardadas en {archivo}")


if __name__ == "__main__":
    licitaciones = obtener_licitaciones_del_dia()
    
    if licitaciones:
        guardar_enlaces_temporal(licitaciones)
        print("\n--- Primeras 5 encontradas ---")
        for i, lic in enumerate(licitaciones[:5], 1):
            print(f"{i}. {lic['titulo'][:70]}")
            print(f"   Organismo: {lic.get('organismo', 'N/A')}")
            print(f"   Presupuesto: {lic.get('presupuesto', 'N/A')} EUR")
            print(f"   CPV: {lic.get('cpv', 'N/A')}")
            print(f"   URL: {lic['url']}")
            print()
    else:
        print("\n[INFO] No se encontraron licitaciones.")
        print("       Posibles causas:")
        print("       - Sin conexion a internet")
        print("       - El servidor de PLACSP no responde")
        print("       - No hay licitaciones tech abiertas hoy")
