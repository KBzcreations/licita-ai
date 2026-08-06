"""
Licita AI - API REST con FastAPI
Backend para servir licitaciones procesadas
"""

import os
from datetime import datetime
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Faltan variables de entorno: SUPABASE_URL y SUPABASE_KEY")

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

app = FastAPI(
    title="Licita AI API",
    description="API para consultar licitaciones publicas del sector tecnologico",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LicitacionResponse(BaseModel):
    id: int
    titulo: str
    organismo: str
    presupuesto: Optional[float] = None
    tecnologias: list[str] = Field(default_factory=list)
    resumen_comercial: str
    url_origen: str
    fecha_publicacion: Optional[str] = None
    estado: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class LicitacionCreate(BaseModel):
    titulo: str
    organismo: str
    presupuesto: Optional[float] = None
    tecnologias: list[str] = Field(default_factory=list)
    resumen_comercial: str
    url_origen: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    licitaciones_count: int


@app.get("/", response_model=dict)
async def root():
    return {
        "message": "Bienvenido a Licita AI API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    try:
        url_count_total = f"{SUPABASE_URL}/rest/v1/licitaciones?select=*&count=exact&limit=0"
        response_count = requests.get(url_count_total, headers=SUPABASE_HEADERS)
        count = response_count.headers.get("Content-Range", "*/0").split("/")[-1]
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            licitaciones_count=int(count) if count.isdigit() else 0
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Servicio no disponible: {str(e)}")


@app.get("/licitaciones", response_model=list[LicitacionResponse])
async def listar_licitaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    estado: Optional[str] = Query(None),
    organismo: Optional[str] = Query(None),
    tecnologia: Optional[str] = Query(None),
    presupuesto_min: Optional[float] = Query(None, ge=0),
    presupuesto_max: Optional[float] = Query(None, ge=0),
    desde_fecha: Optional[str] = Query(None),
    hasta_fecha: Optional[str] = Query(None),
):
    try:
        params = {
            "select": "*",
            "order": "fecha_publicacion.desc",
            "limit": limit,
            "offset": (page - 1) * limit
        }
        filters = []
        if estado:
            filters.append(f"estado=eq.{estado}")
        if organismo:
            filters.append(f"organismo=ilike.*{organismo}*")
        if tecnologia:
            filters.append(f"tecnologias=cs.{tecnologia}")
        if presupuesto_min is not None:
            filters.append(f"presupuesto=gte.{presupuesto_min}")
        if presupuesto_max is not None:
            filters.append(f"presupuesto=lte.{presupuesto_max}")
        if desde_fecha:
            filters.append(f"fecha_publicacion=gte.{desde_fecha}")
        if hasta_fecha:
            filters.append(f"fecha_publicacion=lte.{hasta_fecha}")

        url = f"{SUPABASE_URL}/rest/v1/licitaciones"
        if filters:
            params["filter"] = "and(" + ",".join(filters) + ")"

        response = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=30)
        if response.status_code == 400:
            params.pop("filter", None)
            response = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Error conectando a Supabase: {str(e)}")


@app.get("/licitaciones/{licitacion_id}", response_model=LicitacionResponse)
async def obtener_licitacion(licitacion_id: int):
    try:
        url = f"{SUPABASE_URL}/rest/v1/licitaciones?id=eq.{licitacion_id}&select=*"
        response = requests.get(url, headers=SUPABASE_HEADERS, timeout=30)
        response.raise_for_status()
        datos = response.json()
        if not datos:
            raise HTTPException(status_code=404, detail="Licitacion no encontrada")
        return datos[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error: {str(e)}")


@app.post("/licitaciones", response_model=LicitacionResponse, status_code=201)
async def crear_licitacion(licitacion: LicitacionCreate):
    try:
        url = f"{SUPABASE_URL}/rest/v1/licitaciones"
        response = requests.post(url, headers=SUPABASE_HEADERS, json=licitacion.model_dump(), timeout=30)
        response.raise_for_status()
        datos = response.json()
        return datos[0] if datos else None
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error creando licitacion: {str(e)}")


@app.delete("/licitaciones/{licitacion_id}", status_code=204)
async def eliminar_licitacion(licitacion_id: int):
    try:
        url = f"{SUPABASE_URL}/rest/v1/licitaciones?id=eq.{licitacion_id}"
        response = requests.delete(url, headers=SUPABASE_HEADERS, timeout=30)
        response.raise_for_status()
        return None
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando licitacion: {str(e)}")


@app.get("/licitaciones/organismo/{organismo}", response_model=list[LicitacionResponse])
async def licitaciones_por_organismo(organismo: str):
    try:
        url = f"{SUPABASE_URL}/rest/v1/licitaciones?organismo=eq.{organismo}&select=*"
        response = requests.get(url, headers=SUPABASE_HEADERS, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Error: {str(e)}")


@app.get("/licitaciones/tecnologias/{tecnologia}", response_model=list[LicitacionResponse])
async def licitaciones_por_tecnologia(tecnologia: str):
    try:
        url = f"{SUPABASE_URL}/rest/v1/licitaciones?tecnologias=cs.{tecnologia}&select=*"
        response = requests.get(url, headers=SUPABASE_HEADERS, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Error: {str(e)}")


class LicitacionFit(BaseModel):
    titulo: str
    organismo: str
    presupuesto: Optional[float] = None
    tecnologias: list[str] = Field(default_factory=list)
    resumen_comercial: str


class PerfilFit(BaseModel):
    empresa: Optional[str] = None
    tecnologias_interes: list[str] = Field(default_factory=list)


class FitAnalysisRequest(BaseModel):
    licitacion: LicitacionFit
    perfil: PerfilFit


@app.post("/api/fit-analysis")
async def fit_analysis(req: FitAnalysisRequest):
    """Analiza con IA el encaje entre una empresa y una licitacion.
    La API key de Gemini vive solo en el servidor."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada")

    r, p = req.licitacion, req.perfil
    prompt = f"""Eres analista senior en licitaciones publicas tecnologicas. Analiza el encaje empresa-licitacion. Responde SOLO JSON sin backticks.

LICITACION: {r.titulo} | {r.organismo} | {r.presupuesto or '?'}EUR | Techs: {','.join(r.tecnologias)}
RESUMEN: {r.resumen_comercial}
EMPRESA: {p.empresa or 'empresa tech'} | Stack: {','.join(p.tecnologias_interes)}

JSON: {{"puntuacion":85,"nivel":"Alto","recomendacion":"texto","fortalezas":["f1","f2"],"debilidades":["d1"],"acciones":["a1","a2","a3"]}}"""

    try:
        res = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
            },
            timeout=60,
        )
        res.raise_for_status()
        data = res.json()
        texto = data["candidates"][0]["content"]["parts"][0]["text"]
        import json as _json
        return _json.loads(texto)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error llamando a Gemini: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)