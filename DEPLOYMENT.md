# 🚀 Guía de Deployment - Licita AI

## Checklist Pre-Deployment

### 1. Supabase
- [ ] Ejecutar `schema.sql` en SQL Editor
- [ ] Ejecutar `supabase_rls_fix.sql` para políticas RLS
- [ ] Copiar `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` de Settings > API
- [ ] Insertar datos de prueba con `python seed_data.py`

### 2. Variables de Entorno

**Backend (.env):**
```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_role_key  # ¡IMPORTANTE!
GEMINI_API_KEY=tu_api_key_de_gemini
```

**Frontend (frontend/.env):**
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_API_URL=https://tu-backend-en-produccion.com
```

---

## Opción A: Deployment Gratuito (Recomendado para MVP)

### Backend en Render.com

1. Subir código a GitHub
2. Crear cuenta en [Render](https://render.com)
3. New > Web Service
4. Conectar repositorio
5. Configurar:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:** Añadir todas las del .env
6. Deploy

**Coste:** Gratis (con limits) o $7/mes

### Frontend en Vercel

1. Crear cuenta en [Vercel](https://vercel.com)
2. Importar repositorio desde GitHub
3. Root Directory: `frontend`
4. Environment Variables: Añadir las del frontend/.env
5. Deploy

**Coste:** Gratis para proyectos personales

### Cron Job (Pipeline automático)

**Opción 1: GitHub Actions**
```yaml
# .github/workflows/pipeline.yml
name: Pipeline Licitaciones
on:
  schedule:
    - cron: '0 */6 * * *'  # Cada 6 horas
jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: python pipeline.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

**Opción 2: Render Scheduled Jobs**
- Crear nuevo servicio "Scheduled Job"
- Script: `python pipeline.py`
- Frecuencia: Cada 6 horas

---

## Opción B: Deployment Profesional

### Backend en Railway.app

1. [Railway](https://railway.app) > New Project
2. Deploy from GitHub
3. Añadir variables de entorno
4. Railway asigna URL automática

**Coste:** $5/mes (crédito incluido)

### Frontend en Netlify

1. [Netlify](https://netlify.com) > Add new site
2. Conectar GitHub
3. Build: `npm run build`
4. Publish: `dist`

**Coste:** Gratis

### Dominio Personalizado

1. Comprar dominio en Namecheap/Google Domains (~€10/año)
2. Configurar DNS:
   - Backend: CNAME a tu-app.railway.app
   - Frontend: CNAME a tu-app.netlify.app

---

## 📝 Pasos Finales

### 1. Verificar Funcionamiento

```bash
# Test API
curl https://tu-backend.com/health

# Test Frontend
# Abrir en navegador https://tu-frontend.com
```

### 2. Configurar Alertas

- Render/Railway: Alertas de downtime
- UptimeRobot: Monitorización gratuita cada 5 min

### 3. Analytics

- Google Analytics en frontend
- Sentry para error tracking

---

## 💰 Primeros Pasos para Monetizar

1. **Validar idea:**
   - Compartir con 10 empresas objetivo
   - Recoger feedback

2. **Configurar pagos (Stripe):**
   - Crear cuenta en [Stripe](https://stripe.com)
   - Crear productos/planes
   - Integrar Stripe Checkout

3. **Landing page:**
   - Añadir pricing page
   - Terms & Privacy Policy

4. **Lanzamiento:**
   - Product Hunt
   - LinkedIn posts
   - Email a leads

---

## 🆘 Soporte

Si tienes problemas:

1. Revisar logs en Render/Railway
2. Verificar variables de entorno
3. Testear endpoints con curl/Postman
4. Revisar políticas RLS en Supabase

¡Ánimo con el lanzamiento! 🎉
