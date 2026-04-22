-- ============================================
-- LICITA AI - Configuración Completa Supabase
-- ============================================
-- Ejecutar en: https://supabase.com/dashboard/project/ainldfadnebxwkfzzajp/interactions/sql
--
-- ESTE SCRIPT:
-- 1. Crea las tablas necesarias
-- 2. Configura políticas RLS correctas
-- 3. Permite inserciones públicas para el scraper
-- ============================================

-- ============================================
-- 1. TABLA: licitaciones
-- ============================================
CREATE TABLE IF NOT EXISTS licitaciones (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    organismo TEXT NOT NULL,
    presupuesto NUMERIC(15, 2),
    tecnologias TEXT[] DEFAULT '{}',
    resumen_comercial TEXT NOT NULL,
    url_origen TEXT UNIQUE NOT NULL,
    url_pliegos TEXT,
    fecha_publicacion DATE,
    fecha_extraccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado TEXT DEFAULT 'activa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licitaciones_fecha ON licitaciones(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_licitaciones_organismo ON licitaciones(organismo);
CREATE INDEX IF NOT EXISTS idx_licitaciones_estado ON licitaciones(estado);

-- ============================================
-- 2. TABLA: user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT,
    empresa TEXT,
    cargo TEXT,
    tecnologias_interes TEXT[] DEFAULT '{}',
    sectores_interes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- 3. TABLA: subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'basic',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 4. TABLA: licitaciones_vistas (tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS licitaciones_vistas (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    licitacion_id BIGINT REFERENCES licitaciones(id) ON DELETE CASCADE,
    visto_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accion TEXT
);

CREATE INDEX IF NOT EXISTS idx_vistas_user ON licitaciones_vistas(user_id);
CREATE INDEX IF NOT EXISTS idx_vistas_licitacion ON licitaciones_vistas(licitacion_id);

-- ============================================
-- 5. TABLA: email_alerts
-- ============================================
CREATE TABLE IF NOT EXISTS email_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    licitacion_ids BIGINT[] NOT NULL,
    enviado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo TEXT DEFAULT 'semanal',
    estado TEXT DEFAULT 'pendiente'
);

CREATE INDEX IF NOT EXISTS idx_email_alerts_user ON email_alerts(user_id);

-- ============================================
-- 6. FUNCIONES Y TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_licitaciones_updated_at ON licitaciones;
CREATE TRIGGER update_licitaciones_updated_at
    BEFORE UPDATE ON licitaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE licitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licitaciones_vistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para licitaciones
DROP POLICY IF EXISTS "licitaciones_public_read" ON licitaciones;
CREATE POLICY "licitaciones_public_read" ON licitaciones
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "licitaciones_public_insert" ON licitaciones;
CREATE POLICY "licitaciones_public_insert" ON licitaciones
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "licitaciones_auth_update" ON licitaciones;
CREATE POLICY "licitaciones_auth_update" ON licitaciones
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- Políticas para user_profiles
DROP POLICY IF EXISTS "user_profiles_read_own" ON user_profiles;
CREATE POLICY "user_profiles_read_own" ON user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Políticas para subscriptions
DROP POLICY IF EXISTS "subscriptions_read_own" ON subscriptions;
CREATE POLICY "subscriptions_read_own" ON subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
CREATE POLICY "subscriptions_insert_own" ON subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
CREATE POLICY "subscriptions_update_own" ON subscriptions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Políticas para licitaciones_vistas
DROP POLICY IF EXISTS "licitaciones_vistas_read_own" ON licitaciones_vistas;
CREATE POLICY "licitaciones_vistas_read_own" ON licitaciones_vistas
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "licitaciones_vistas_insert_own" ON licitaciones_vistas;
CREATE POLICY "licitaciones_vistas_insert_own" ON licitaciones_vistas
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Políticas para email_alerts
DROP POLICY IF EXISTS "email_alerts_read_own" ON email_alerts;
CREATE POLICY "email_alerts_read_own" ON email_alerts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "email_alerts_insert_own" ON email_alerts;
CREATE POLICY "email_alerts_insert_own" ON email_alerts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. DATOS DE PRUEBA
-- ============================================
INSERT INTO licitaciones (titulo, organismo, presupuesto, tecnologias, resumen_comercial, url_origen) VALUES
('Desarrollo de plataforma cloud para gestión de datos sanitarios', 'Ministerio de Sanidad', 245000.00, ARRAY['AWS', 'Python', 'PostgreSQL', 'Docker', 'Kubernetes'], 'El Ministerio busca una plataforma cloud escalable para gestión de datos sanitarios. Oportunidad para empresas con experiencia en cloud público y cumplimiento normativo de datos de salud.', 'https://contrataciondelestado.es/wps/poc?procId=389472'),
('Sistema de IA para análisis de documentos administrativos', 'Agencia Tributaria', 380000.00, ARRAY['Machine Learning', 'Python', 'TensorFlow', 'NLP', 'Azure'], 'La AEAT requiere un sistema de IA para clasificación y análisis automático de documentos. Proyecto estratégico con alto impacto visible.', 'https://contrataciondelestado.es/wps/poc?procId=389583'),
('Mantenimiento de aplicación móvil corporativa', 'Comunidad de Madrid', 120000.00, ARRAY['React Native', 'TypeScript', 'Node.js', 'iOS', 'Android'], 'Contrato de mantenimiento evolutivo para app móvil con 50k+ usuarios. Incluye desarrollo de nuevas funcionalidades y soporte técnico.', 'https://contrataciondelestado.es/wps/poc?procId=389621'),
('Plataforma de ciberseguridad para infraestructuras críticas', 'INCIBE', 520000.00, ARRAY['Ciberseguridad', 'SIEM', 'Python', 'Kubernetes', 'Elasticsearch'], 'INCIBE busca plataforma integral de monitorización de seguridad. Contrato de alto valor para empresas con certificaciones de seguridad.', 'https://contrataciondelestado.es/wps/poc?procId=389704'),
('Migración a microservicios de sistema de expedientes', 'Ayuntamiento de Barcelona', 195000.00, ARRAY['Java', 'Spring Boot', 'Microservicios', 'Docker', 'PostgreSQL'], 'El Ayuntamiento necesita migrar su sistema monolítico a arquitectura de microservicios. Proyecto moderno con stack actual.', 'https://contrataciondelestado.es/wps/poc?procId=389812'),
('Portal de transparencia y sede electrónica', 'Diputación de Valencia', 85000.00, ARRAY['Java', 'Angular', 'PostgreSQL', 'Web', 'Seguridad'], 'Portal de transparencia con sede electrónica, pago telemático y registro. Proyecto completo para empresas full-stack.', 'https://contrataciondelestado.es/wps/poc?procId=389901'),
('Sistema de business intelligence para datos económicos', 'INE', 290000.00, ARRAY['Business Intelligence', 'Python', 'Tableau', 'PostgreSQL', 'ETL'], 'El INE requiere plataforma BI para visualización y análisis de indicadores económicos con dashboards interactivos.', 'https://contrataciondelestado.es/wps/poc?procId=390015'),
('Infraestructura IoT para monitorización ambiental', 'Ayuntamiento de Sevilla', 165000.00, ARRAY['IoT', 'Sensores', '5G', 'Python', 'Dashboard'], 'Red de sensores IoT para medición de calidad del aire, ruido y temperatura. Proyecto innovador de smart city.', 'https://contrataciondelestado.es/wps/poc?procId=390123')
ON CONFLICT (url_origen) DO NOTHING;

-- ============================================
-- 9. VERIFICACIÓN
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT COUNT(*) as total_licitaciones FROM licitaciones;
