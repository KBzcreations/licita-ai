-- Tabla de eventos para el informe diario de actividad (visitas, registros,
-- logins, suscripciones). Los visitantes anonimos pueden insertar (para
-- poder trackear pageviews sin login) pero nadie puede leer salvo el
-- service_role -- los datos de uso quedan privados para el admin.

CREATE TABLE IF NOT EXISTS eventos (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  pagina TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_created_at ON eventos(created_at);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_insert_publico" ON eventos;
CREATE POLICY "eventos_insert_publico" ON eventos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Sin politica de SELECT para anon/authenticated -> solo el service_role
-- (que salta RLS) puede leer los eventos, usado por report.py.
