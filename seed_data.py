"""
Licita AI - Script para insertar datos de prueba
Ejecutar: python seed_data.py

NOTA: Necesitas la clave SERVICE_ROLE de Supabase.
Obtenla en: Supabase Dashboard > Settings > API > service_role key
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Usa SERVICE_ROLE key para bypass RLS (NO compartir nunca esta clave en frontend)
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("ERROR: Falta SUPABASE_SERVICE_KEY en el archivo .env")
    print("Añade tu clave service_role de Supabase para ejecutar este script")
    exit(1)

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Datos de prueba realistas
licitaciones = [
    {
        "titulo": "Desarrollo de plataforma cloud para gestión de datos sanitarios",
        "organismo": "Ministerio de Sanidad",
        "presupuesto": 245000.00,
        "tecnologias": ["AWS", "Python", "PostgreSQL", "Docker", "Kubernetes"],
        "resumen_comercial": "El Ministerio busca una plataforma cloud escalable para gestión de datos sanitarios. Oportunidad para empresas con experiencia en cloud público y cumplimiento normativo de datos de salud.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=389472"
    },
    {
        "titulo": "Sistema de IA para análisis de documentos administrativos",
        "organismo": "Agencia Tributaria",
        "presupuesto": 380000.00,
        "tecnologias": ["Machine Learning", "Python", "TensorFlow", "NLP", "Azure"],
        "resumen_comercial": "La AEAT requiere un sistema de IA para clasificación y análisis automático de documentos. Proyecto estratégico con alto impacto visible.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=389583"
    },
    {
        "titulo": "Mantenimiento de aplicación móvil corporativa",
        "organismo": "Comunidad de Madrid",
        "presupuesto": 120000.00,
        "tecnologias": ["React Native", "TypeScript", "Node.js", "iOS", "Android"],
        "resumen_comercial": "Contrato de mantenimiento evolutivo para app móvil con 50k+ usuarios. Incluye desarrollo de nuevas funcionalidades y soporte técnico.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=389621"
    },
    {
        "titulo": "Plataforma de ciberseguridad para infraestructuras críticas",
        "organismo": "INCIBE",
        "presupuesto": 520000.00,
        "tecnologias": ["Ciberseguridad", "SIEM", "Python", "Kubernetes", "Elasticsearch"],
        "resumen_comercial": "INCIBE busca plataforma integral de monitorización de seguridad. Contrato de alto valor para empresas con certificaciones de seguridad.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=389704"
    },
    {
        "titulo": "Migración a microservicios de sistema de expedientes",
        "organismo": "Ayuntamiento de Barcelona",
        "presupuesto": 195000.00,
        "tecnologias": ["Java", "Spring Boot", "Microservicios", "Docker", "PostgreSQL"],
        "resumen_comercial": "El Ayuntamiento necesita migrar su sistema monolítico a arquitectura de microservicios. Proyecto moderno con stack actual.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=389812"
    },
    {
        "titulo": "Portal de transparencia y sede electrónica",
        "organismo": "Diputación de Valencia",
        "presupuesto": 85000.00,
        "tecnologias": ["Java", "Angular", "PostgreSQL", "Web", "Seguridad"],
        "resumen_comercial": "Portal de transparencia con sede electrónica, pago telemático y registro. Proyecto completo para empresas full-stack.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=389901"
    },
    {
        "titulo": "Sistema de business intelligence para datos económicos",
        "organismo": "INE",
        "presupuesto": 290000.00,
        "tecnologias": ["Business Intelligence", "Python", "Tableau", "PostgreSQL", "ETL"],
        "resumen_comercial": "El INE requiere plataforma BI para visualización y análisis de indicadores económicos con dashboards interactivos.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=390015"
    },
    {
        "titulo": "Infraestructura IoT para monitorización ambiental",
        "organismo": "Ayuntamiento de Sevilla",
        "presupuesto": 165000.00,
        "tecnologias": ["IoT", "Sensores", "5G", "Python", "Dashboard"],
        "resumen_comercial": "Red de sensores IoT para medición de calidad del aire, ruido y temperatura. Proyecto innovador de smart city.",
        "url_origen": "https://contrataciondelestado.es/wps/poc?procId=390123"
    },
]

print("=" * 60)
print("LICITA AI - Insertando datos de prueba")
print("=" * 60)

url = f"{SUPABASE_URL}/rest/v1/licitaciones"
inserted = 0
skipped = 0

for lic in licitaciones:
    try:
        response = requests.post(url, headers=headers, json=lic, timeout=30)
        if response.status_code in [200, 201]:
            print(f"OK: {lic['titulo'][:50]}...")
            inserted += 1
        elif response.status_code == 409:
            print(f"SKIP (ya existe): {lic['titulo'][:40]}...")
            skipped += 1
        else:
            print(f"ERROR ({response.status_code}): {lic['titulo'][:40]}...")
            print(f"  {response.text[:100]}")
    except Exception as e:
        print(f"EXCEPCION: {e}")

print("=" * 60)
print(f"Insertadas: {inserted}, Omitidas: {skipped}")
print("=" * 60)
