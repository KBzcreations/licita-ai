"""
Licita AI - Pipeline Completo
Ejecuta el scraper y procesa todas las licitaciones encontradas con IA.
"""

import os
import sys
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

# Importar módulos locales
from scraper import obtener_licitaciones_del_dia, guardar_enlaces_temporal
from extractor import verificar_conexion_supabase, procesar_lote_urls


def ejecutar_pipeline_completo():
    """
    Ejecuta el pipeline completo:
    1. Scraping de buscadorlicitaciones.com
    2. Procesamiento con IA de cada licitación
    3. Guardado en Supabase
    """
    print("=" * 70)
    print("LICITA AI - Pipeline de Extracción")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()

    # ========================================
    # FASE 1: Scraping
    # ========================================
    print("[FASE 1] Scraping de licitaciones...")
    print("-" * 40)

    licitaciones = obtener_licitaciones_del_dia()

    if not licitaciones:
        print("[INFO] No se encontraron licitaciones tech. Fin del pipeline.")
        return {"scrapeadas": 0, "procesadas": 0, "errores": 0}

    # Guardar temporalmente
    guardar_enlaces_temporal(licitaciones)

    urls = [lic["url"] for lic in licitaciones]

    print()

    # ========================================
    # FASE 2: Procesamiento con IA
    # ========================================
    print("[FASE 2] Procesamiento con IA...")
    print("-" * 40)

    # Verificar conexión
    if not verificar_conexion_supabase():
        print("[ERROR] No se pudo conectar a Supabase")
        return {"scrapeadas": len(licitaciones), "procesadas": 0, "errores": len(urls)}

    resultados = procesar_lote_urls(urls)

    # ========================================
    # RESUMEN FINAL
    # ========================================
    print()
    print("=" * 70)
    print("RESUMEN DEL PIPELINE")
    print("=" * 70)
    print(f"  Licitaciones encontradas: {len(licitaciones)}")
    print(f"  Procesadas con éxito:     {len(resultados)}")
    print(f"  Fecha:                    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    return {
        "scrapeadas": len(licitaciones),
        "procesadas": len(resultados),
        "fecha": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    # Verificar variables de entorno
    if not os.getenv("SUPABASE_URL") or not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] Faltan variables de entorno")
        print("   Asegúrate de tener configurado el archivo .env con:")
        print("   - SUPABASE_URL")
        print("   - SUPABASE_KEY")
        print("   - GEMINI_API_KEY")
        sys.exit(1)

    # Ejecutar pipeline
    resultado = ejecutar_pipeline_completo()

    # Código de salida para cron/schedulers
    if resultado["procesadas"] > 0:
        print("\n[OK] Pipeline completado con exito")
        sys.exit(0)
    else:
        print("\n[INFO] Pipeline completado sin procesar licitaciones")
        sys.exit(0)
