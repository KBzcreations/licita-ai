# Licita AI 🚀

Plataforma SaaS de licitaciones públicas del sector tecnológico con análisis automático mediante IA.

## 📋 Descripción

Licita AI escanea diariamente licitaciones públicas, filtra las del sector tecnológico y utiliza Inteligencia Artificial para extraer información clave y generar resúmenes comerciales ejecutivos.

**Características principales:**
- Scraping automático de portales de licitaciones
- Filtrado inteligente por palabras clave tech
- Análisis con IA (Gemini) de cada licitación
- Base de datos en Supabase
- API REST con FastAPI
- Frontend React moderno
- Autenticación de usuarios

---

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Scraper.py    │────▶│  Extractor.py    │────▶│   Supabase      │
│   (scraping)    │     │  (IA Gemini)     │     │   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │◀────│   Main.py        │◀────│   API REST      │
│   (React+Vite)  │     │   (FastAPI)      │     │   (endpoints)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Python 3.10+
- Node.js 18+
- Cuenta en Supabase
- API Key de Google Gemini

### 1. Backend

```bash
# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (.env)
# - SUPABASE_URL
# - SUPABASE_KEY
# - SUPABASE_SERVICE_KEY (para insertar datos)
# - GEMINI_API_KEY

# Ejecutar pipeline completo
python pipeline.py

# Iniciar API
python main.py
# o: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables (.env)
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_API_URL=http://localhost:8000

# Iniciar dev server
npm run dev
```

---

## 📦 Estructura del Proyecto

```
licita-ai/
├── scraper.py          # Scraper de licitaciones
├── extractor.py        # Procesamiento con IA + Supabase
├── pipeline.py         # Pipeline completo
├── main.py             # API FastAPI
├── seed_data.py        # Script para datos de prueba
├── schema.sql          # Schema de Supabase
├── supabase_rls_fix.sql # Fix políticas RLS
├── .env                # Variables de entorno (backend)
├── requirements.txt    # Dependencias Python
└── frontend/
    ├── src/
    │   ├── App.jsx         # Componentes principales
    │   ├── contexts/       # AuthContext
    │   └── lib/            # Supabase client
    ├── .env                # Variables de entorno (frontend)
    └── package.json
```

---

## 💰 Modelo de Monetización

### Planes Sugeridos

| Plan | Precio | Características |
|------|--------|-----------------|
| **Free** | €0/mes | 5 licitaciones/día, filtros básicos |
| **Pro** | €49/mes | Licitaciones ilimitadas, alertas email, API access |
| **Enterprise** | €199/mes | Multi-usuario, webhooks, SLA, soporte prioritario |

### Estrategia de Monetización

1. **Freemium**: Permite uso gratuito limitado para captar usuarios
2. **Alertas Premium**: Notificaciones en tiempo real por email/SMS
3. **API Access**: Cobro por uso de API para integración con otros sistemas
4. **White-label**: Licencia para consultoras que quieran usar la plataforma con su marca

### Canales de Adquisición

- SEO: Posicionar para "licitaciones tecnología", "contratos públicos IT"
- LinkedIn: Contenido sobre oportunidades de negocio en sector público
- Partnerships: Consultoras tecnológicas, cámaras de comercio
- Google Ads: Keywords de licitaciones y contratos públicos

---

## 🔧 Configuración de Producción

### Backend (Render/Railway)

1. Crear nuevo servicio Web Service
2. Conectar repositorio GitHub
3. Configurar variables de entorno
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel/Netlify)

1. Conectar repositorio GitHub
2. Directorio: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Configurar variables de entorno

### Tarea Programada (Cron)

Ejecutar `pipeline.py` cada 6-12 horas:
- **Render**: Scheduled Jobs
- **Railway**: Cron job
- **GitHub Actions**: Workflow programado
- **Cron local**: `0 */6 * * * cd /path && python pipeline.py`

---

## 🛡️ Seguridad

### Variables Críticas (NUNCA exponer en frontend)

```
SUPABASE_SERVICE_KEY  # Solo backend
GEMINI_API_KEY        # Solo backend
```

### Políticas RLS Recomendadas

Ejecutar `supabase_rls_fix.sql` en el SQL Editor de Supabase para:
- Permitir lectura pública de licitaciones
- Restringir escritura a usuarios autenticados
- Aislar datos de usuario por ID

---

## 📈 Métricas Clave (KPIs)

- **MRR**: Ingreso recurrente mensual
- **Churn Rate**: % de cancelaciones
- **CAC**: Coste de adquisición de cliente
- **LTV**: Valor de vida del cliente
- **Activación**: % usuarios que ven 10+ licitaciones

---

## 🚧 Próximas Features

- [ ] Alertas email automáticas (Resend/SendGrid)
- [ ] Webhooks para integraciones
- [ ] Dashboard de analytics
- [ ] Exportación a PDF/Excel
- [ ] Integración con múltiples portales de licitaciones
- [ ] Sistema de recomendación con IA
- [ ] Stripe para pagos recurrentes

---

## 📄 Licencia

MIT License

---

## 🤝 Contacto

Desarrollado para transformar licitaciones públicas en oportunidades de negocio.

**¿Listo para monetizar?** Sigue la guía de deployment arriba y lanza tu MVP en menos de 1 hora.
