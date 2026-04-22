-- LICITA AI - Fix para políticas RLS de Supabase
-- Ejecutar en SQL Editor de tu proyecto Supabase
-- Esto permite inserciones públicas (necesario para el scraper)
-- y mantiene la seguridad básica

-- ============================================
-- ACTUALIZAR POLÍTICAS DE LICITACIONES
-- ============================================

-- Permitir lectura pública (ya debería existir)
DROP POLICY IF EXISTS "licitaciones_public_read" ON licitaciones;
CREATE POLICY "licitaciones_public_read" ON licitaciones
    FOR SELECT
    USING (true);

-- Permitir inserciones públicas (para el scraper/backend)
-- En producción, esto debería restringirse solo a claves de servicio
DROP POLICY IF EXISTS "licitaciones_public_insert" ON licitaciones;
CREATE POLICY "licitaciones_public_insert" ON licitaciones
    FOR INSERT
    WITH CHECK (true);

-- Permitir actualizaciones solo para usuarios autenticados (opcional)
DROP POLICY IF EXISTS "licitaciones_auth_update" ON licitaciones;
CREATE POLICY "licitaciones_auth_update" ON licitaciones
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ACTUALIZAR POLÍTICAS DE USER_PROFILES
-- ============================================

DROP POLICY IF EXISTS "user_profiles_self" ON user_profiles;

-- Permitir que usuarios autenticados lean su propio perfil
CREATE POLICY "user_profiles_read_own" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Permitir inserción al registrarse
CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Permitir actualización del propio perfil
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ============================================
-- ACTUALIZAR POLÍTICAS DE SUBSCRIPTIONS
-- ============================================

DROP POLICY IF EXISTS "subscriptions_self" ON subscriptions;

CREATE POLICY "subscriptions_read_own" ON subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- ACTUALIZAR POLÍTICAS DE LICITACIONES_VISTAS
-- ============================================

DROP POLICY IF EXISTS "vistas_self" ON licitaciones_vistas;

CREATE POLICY "licitaciones_vistas_read_own" ON licitaciones_vistas
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "licitaciones_vistas_insert_own" ON licitaciones_vistas
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ACTUALIZAR POLÍTICAS DE EMAIL_ALERTS
-- ============================================

DROP POLICY IF EXISTS "email_alerts_self" ON email_alerts;

CREATE POLICY "email_alerts_read_own" ON email_alerts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "email_alerts_insert_own" ON email_alerts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Mostrar todas las políticas activas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
