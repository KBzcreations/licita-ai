"""
Licita AI - Script para poblar datos de ejemplo en Supabase
Ejecutar despues de tener configurado el .env y las tablas creadas
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY")
    exit(1)

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Datos de ejemplo
LICITACIONES_EJEMPLO = [
    {
        "titulo": "Desarrollo de plataforma cloud para gestion de datos publicos",
        "organismo": "Ministerio de Asuntos Economicos y Transformacion Digital",
        "presupuesto": 250000.00,
        "tecnologias": ["AWS", "Python", "PostgreSQL", "Docker", "Kubernetes"],
        "resumen_comercial": "El ministerio busca una plataforma integral para la gestion y analisis de datos publicos en la nube. Oportunidad para consultoras especializadas en cloud computing y big data. El proyecto incluye migracion, desarrollo y mantenimiento durante 2 años.",
        "url_origen": "https://ejemplo.com/licitacion/001",
        "fecha_publicacion": "2026-04-15",
        "estado": "activa"
    },
    {
        "titulo": "Sistema de ciberseguridad para infraestructuras criticas",
        "organismo": "Instituto Nacional de Ciberseguridad",
        "presupuesto": 180000.00,
        "tecnologias": ["Ciberseguridad", "Python", "Machine Learning", "Linux"],
        "resumen_comercial": "Implementacion de sistema avanzado de deteccion de amenazas para infraestructuras criticas. Proyecto de alto valor tecnologico que requiere experiencia en seguridad ofensiva y defensiva. Incluye formacion y soporte 24/7.",
        "url_origen": "https://ejemplo.com/licitacion/002",
        "fecha_publicacion": "2026-04-14",
        "estado": "activa"
    },
    {
        "titulo": "Aplicacion movil para tramites administrativos",
        "organismo": "Ayuntamiento de Madrid",
        "presupuesto": 95000.00,
        "tecnologias": ["React Native", "JavaScript", "Node.js", "MongoDB", "API REST"],
        "resumen_comercial": "Desarrollo de aplicacion movil multiplataforma para facilitar tramites administrativos a los ciudadanos. Oportunidad para empresas especializadas en desarrollo movil y UX. Incluye integracion con sistemas legacy del ayuntamiento.",
        "url_origen": "https://ejemplo.com/licitacion/003",
        "fecha_publicacion": "2026-04-13",
        "estado": "activa"
    },
    {
        "titulo": "Plataforma de inteligencia artificial para analisis documental",
        "organismo": "Agencia Tributaria",
        "presupuesto": 450000.00,
        "tecnologias": ["Machine Learning", "Python", "TensorFlow", "AWS", "NLP"],
        "resumen_comercial": "Sistema de IA para analisis automatico de documentacion fiscal y deteccion de anomalias. Proyecto emblematico con gran visibilidad. Requiere experiencia demostrable en NLP y machine learning aplicado a sector publico.",
        "url_origen": "https://ejemplo.com/licitacion/004",
        "fecha_publicacion": "2026-04-12",
        "estado": "activa"
    },
    {
        "titulo": "Modernizacion de sistemas ERP corporativos",
        "organismo": "Correos y Telegrafos",
        "presupuesto": 320000.00,
        "tecnologias": ["Java", "Spring Boot", "PostgreSQL", "Microservicios", "Docker"],
        "resumen_comercial": "Renovacion completa del sistema ERP para gestion de recursos empresariales. Proyecto de larga duracion con posibilidad de extension. Ideal para consultoras con experiencia en transformacion digital de grandes organizaciones.",
        "url_origen": "https://ejemplo.com/licitacion/005",
        "fecha_publicacion": "2026-04-11",
        "estado": "activa"
    },
    {
        "titulo": "Sistema de gestion de flotas con IoT",
        "organismo": "Ministerio de Transportes",
        "presupuesto": 175000.00,
        "tecnologias": ["IoT", "Python", "Azure", "React", "PostgreSQL"],
        "resumen_comercial": "Implementacion de sistema de telemetria y gestion de flotas vehiculares mediante sensores IoT. Incluye dashboard en tiempo real y analisis predictivo de mantenimiento. Oportunidad para empresas especializadas en IoT y movilidad.",
        "url_origen": "https://ejemplo.com/licitacion/006",
        "fecha_publicacion": "2026-04-10",
        "estado": "activa"
    },
    {
        "titulo": "Portal de transparencia y datos abiertos",
        "organismo": "Generalitat de Catalunya",
        "presupuesto": 85000.00,
        "tecnologias": ["React", "Node.js", "PostgreSQL", "D3.js", "API REST"],
        "resumen_comercial": "Desarrollo de portal web para publicacion de datos abiertos y visualizaciones interactivas. Proyecto con componente de impacto social. Requiere experiencia en visualizacion de datos y accesibilidad web.",
        "url_origen": "https://ejemplo.com/licitacion/007",
        "fecha_publicacion": "2026-04-09",
        "estado": "activa"
    },
    {
        "titulo": "Infraestructura de comunicaciones 5G para smart cities",
        "organismo": "Ayuntamiento de Barcelona",
        "presupuesto": 520000.00,
        "tecnologias": ["5G", "IoT", "Telecomunicaciones", "Python", "Azure"],
        "resumen_comercial": "Despliegue de infraestructura 5G para soporte de aplicaciones de ciudad inteligente. Proyecto troncal que habilitara multiples servicios urbanos. Consorcios de telecomunicaciones y empresas tech pueden participar.",
        "url_origen": "https://ejemplo.com/licitacion/008",
        "fecha_publicacion": "2026-04-08",
        "estado": "activa"
    },
    {
        "titulo": "Sistema de videoconferencia seguro para administracion",
        "organismo": "Ministerio de Politica Territorial",
        "presupuesto": 145000.00,
        "tecnologias": ["WebRTC", "JavaScript", "Node.js", "Ciberseguridad", "Docker"],
        "resumen_comercial": "Plataforma de comunicacion unificada con cifrado de extremo a extremo para uso gubernamental. Alternativa soberana a soluciones comerciales. Requiere certificaciones de seguridad y experiencia en video en tiempo real.",
        "url_origen": "https://ejemplo.com/licitacion/009",
        "fecha_publicacion": "2026-04-07",
        "estado": "activa"
    },
    {
        "titulo": "Chatbot con IA para atencion al ciudadano",
        "organismo": "Seguridad Social",
        "presupuesto": 110000.00,
        "tecnologias": ["Machine Learning", "NLP", "Python", "Azure", "API REST"],
        "resumen_comercial": "Asistente virtual inteligente para resolucion de consultas frecuentes sobre prestaciones y tramites. Reduccion de carga de trabajo en call centers. Experiencia en chatbots y procesamiento de lenguaje natural en español requerida.",
        "url_origen": "https://ejemplo.com/licitacion/010",
        "fecha_publicacion": "2026-04-06",
        "estado": "activa"
    },
]

def insertar_licitaciones():
    """Inserta las licitaciones de ejemplo en Supabase"""
    print("[INFO] Insertando licitaciones de ejemplo en Supabase...")

    url_insert = f"{SUPABASE_URL}/rest/v1/licitaciones"

    insertadas = 0
    errores = 0

    for licitacion in LICITACIONES_EJEMPLO:
        try:
            respuesta = requests.post(
                url_insert,
                headers=SUPABASE_HEADERS,
                json=licitacion,
                timeout=30
            )

            if respuesta.status_code in [200, 201]:
                print(f"  [OK] {licitacion['titulo'][:50]}...")
                insertadas += 1
            elif respuesta.status_code == 409:
                print(f"  [SKIP] {licitacion['titulo'][:50]}... (ya existe)")
            else:
                print(f"  [ERROR] {licitacion['titulo'][:50]}... - {respuesta.text}")
                errores += 1

        except Exception as e:
            print(f"  [ERROR] {licitacion['titulo'][:50]}... - {str(e)}")
            errores += 1

    print()
    print("=" * 50)
    print(f"[RESUMEN] {insertadas} insertadas, {errores} errores")
    print("=" * 50)

if __name__ == "__main__":
    print("=" * 50)
    print("LICITA AI - Carga de datos de ejemplo")
    print("=" * 50)
    print()

    insertar_licitaciones()

    print()
    print("[INFO] Para verificar, visita:")
    print(f"  {SUPABASE_URL}/rest/v1/licitaciones?select=*&limit=5")
    print("  O ejecuta: python main.py && abre http://localhost:8000/docs")
