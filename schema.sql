-- LICITA AI - Schema completo para Supabase
-- Ejecutar en SQL Editor de tu proyecto Supabase

-- ============================================
-- LIMPIEZA (eliminar tablas si existen)
-- ============================================
DROP TABLE IF EXISTS email_alerts CASCADE;
DROP TABLE IF EXISTS licitaciones_vistas CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS licitaciones CASCADE;

-- ============================================
-- TABLA: licitaciones
-- ============================================
CREATE TABLE licitaciones (
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

CREATE INDEX idx_licitaciones_fecha ON licitaciones(fecha_publicacion DESC);
CREATE INDEX idx_licitaciones_organismo ON licitaciones(organismo);
CREATE INDEX idx_licitaciones_estado ON licitaciones(estado);

COMMENT ON TABLE licitaciones IS 'Licitaciones públicas de tecnología extraídas con IA';

-- ============================================
-- TABLA: user_profiles (extiende auth.users)
-- ============================================
CREATE TABLE user_profiles (
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

CREATE INDEX idx_user_profiles_email ON user_profiles(email);

COMMENT ON TABLE user_profiles IS 'Perfiles de usuarios con sus preferencias de licitaciones';

-- ============================================
-- TABLA: subscriptions
-- ============================================
CREATE TABLE subscriptions (
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

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

COMMENT ON TABLE subscriptions IS 'Suscripciones de usuarios gestionadas por Stripe';

-- ============================================
-- TABLA: licitaciones_vistas (tracking)
-- ============================================
CREATE TABLE licitaciones_vistas (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    licitacion_id BIGINT REFERENCES licitaciones(id) ON DELETE CASCADE,
    visto_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accion TEXT
);

CREATE INDEX idx_vistas_user ON licitaciones_vistas(user_id);
CREATE INDEX idx_vistas_licitacion ON licitaciones_vistas(licitacion_id);

COMMENT ON TABLE licitaciones_vistas IS 'Tracking de qué licitaciones ve cada usuario';

-- ============================================
-- TABLA: email_alerts (logs de envío)
-- ============================================
CREATE TABLE email_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    licitacion_ids BIGINT[] NOT NULL,
    enviado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo TEXT DEFAULT 'semanal',
    estado TEXT DEFAULT 'pendiente'
);

CREATE INDEX idx_email_alerts_user ON email_alerts(user_id);

COMMENT ON TABLE email_alerts IS 'Registro de emails enviados con alertas de licitaciones';

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_licitaciones_updated_at
    BEFORE UPDATE ON licitaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licitaciones_vistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE licitaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "licitaciones_public_read" ON licitaciones
    FOR SELECT USING (true);

CREATE POLICY "user_profiles_self" ON user_profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "subscriptions_self" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "vistas_self" ON licitaciones_vistas
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "email_alerts_self" ON email_alerts
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT INTO licitaciones (titulo, organismo, presupuesto, tecnologias, resumen_comercial, url_origen)
VALUES (
    'Ejemplo - Plataforma de análisis de datos',
    'Ministerio de Ejemplo',
    150000.00,
    ARRAY['Python', 'AWS', 'PostgreSQL'],
    'El ministerio busca una plataforma integral para análisis de datos masivos. Oportunidad para consultoras especializadas en Big Data y cloud. Presupuesto competitivo con posibilidad de extensión.',
    'https://ejemplo.com/licitacion/123'
) ON CONFLICT (url_origen) DO NOTHING;
