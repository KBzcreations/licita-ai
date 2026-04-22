# 📋 Procedimientos - Licita AI

## Para Poner en Producción

### 1. Configurar Supabase

1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a SQL Editor
4. Ejecutar `schema.sql` completo
5. Ejecutar `supabase_rls_fix.sql` para políticas RLS
6. Copiar las keys de Settings > API

### 2. Insertar Datos de Prueba

1. Obtener `SUPABASE_SERVICE_KEY` de Supabase Dashboard
2. Añadir al `.env`:
   ```
   SUPABASE_SERVICE_KEY=tu_service_role_key
   ```
3. Ejecutar:
   ```bash
   python seed_data.py
   ```

### 3. Backend (Render.com)

1. Crear cuenta en https://render.com
2. New > Web Service
3. Conectar repositorio GitHub
4. Configurar:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Añadir Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`
6. Deploy

### 4. Frontend (Vercel)

1. Crear cuenta en https://vercel.com
2. Importar repositorio
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (URL del backend en Render)
7. Deploy

### 5. Configurar Cron para Pipeline

**GitHub Actions:**

1. Crear `.github/workflows/pipeline.yml`
2. Añadir secrets en GitHub Settings > Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`
3. El workflow se ejecutará cada 6 horas

---

## Para Desarrollo Local

### Inicio Rápido (Windows)

```bash
# Doble clic en start.bat
# O desde terminal:
start.bat
```

### Inicio Manual

```bash
# Terminal 1 - Backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Acceder

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Para Añadir Nuevas Fuentes de Licitaciones

### Opción 1: Modificar Scraper Actual

Editar `scraper.py`:
- Cambiar `BASE_URL` por el nuevo sitio
- Actualizar `KEYWORDS_TECH` si es necesario
- Ajustar selectores CSS en `extraer_enlaces_licitaciones()`

### Opción 2: Añadir Múltiples Fuentes

En `obtener_licitaciones_del_dia()`:
```python
def obtener_licitaciones_del_dia():
    todas = {}
    
    # Fuente 1: buscadorlicitaciones.com
    resultados1 = scrapear_fuente_1()
    todas.update(resultados1)
    
    # Fuente 2: contrataciondelestado.es
    resultados2 = scrapear_fuente_2()
    todas.update(resultados2)
    
    return list(todas.values())
```

---

## Para Monitorizar

### Logs

- **Render:** Dashboard > Logs
- **Vercel:** Project > Deployments > View Logs
- **Supabase:** Dashboard > Logs

### Métricas

- **API Requests:** Render dashboard
- **Usuarios:** Supabase > Authentication > Users
- **Licitaciones:** Supabase > Table Editor > licitaciones

### Alertas

Configurar en:
- Render: Settings > Alerts
- UptimeRobot: https://uptimerobot.com (gratis, 50 checks)

---

## Para Hacer Cambios

### Backend

```bash
# Editar archivos Python
# El servidor recarga automáticamente con --reload

# Testear endpoints
curl http://localhost:8000/health
curl http://localhost:8000/licitaciones
```

### Frontend

```bash
cd frontend

# Cambios se recargan hot-reload
npm run dev

# Para producción
npm run build
```

---

## Para Añadir Funcionalidades

### Nuevos Endpoints

En `main.py`:
```python
@app.get("/nuevo-endpoint")
async def nuevo_endpoint():
    return {"mensaje": "Hola"}
```

### Nuevas Páginas React

En `App.jsx`:
```jsx
function NuevaPagina() {
  return <div>Contenido</div>
}

// Añadir ruta
<Route path="/nueva" element={<NuevaPagina />} />
```

---

## Para Debuggear

### Backend

```bash
# Con más logging
python -m uvicorn main:app --reload --log-level debug
```

### Frontend

- Abrir DevTools (F12)
- Consola para errores
- Network para ver requests

### Supabase

- Table Editor para ver datos
- Logs para errores de base de datos
- Authentication para usuarios

---

## Soporte Técnico

### Errores Comunes

**401 Unauthorized en Supabase:**
- Verificar que `SUPABASE_KEY` es correcta
- Revisar políticas RLS

**CORS Error:**
- Backend: Verificar middleware CORS en `main.py`
- Frontend: Verificar `VITE_API_URL`

**Pipeline no funciona:**
- Verificar que `buscadorlicitaciones.com` es accesible
- Revisar logs del scraper

**Frontend no muestra datos:**
- Verificar que backend está corriendo
- Checkear consola del navegador
- Verificar `VITE_API_URL`

---

## Contacto y Recursos

- **Supabase Docs:** https://supabase.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **React Docs:** https://react.dev
- **Render Docs:** https://render.com/docs
