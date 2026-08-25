-- Datos objetivos necesarios para evaluar capacidad antes de invertir horas.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS facturacion_anual NUMERIC,
  ADD COLUMN IF NOT EXISTS empleados INTEGER,
  ADD COLUMN IF NOT EXISTS contrato_maximo NUMERIC,
  ADD COLUMN IF NOT EXISTS experiencia_publica TEXT,
  ADD COLUMN IF NOT EXISTS referencias_similares TEXT,
  ADD COLUMN IF NOT EXISTS territorios TEXT[] DEFAULT '{}';

ALTER TABLE licitaciones
  ADD COLUMN IF NOT EXISTS cpv TEXT,
  ADD COLUMN IF NOT EXISTS expediente TEXT,
  ADD COLUMN IF NOT EXISTS fecha_limite DATE,
  ADD COLUMN IF NOT EXISTS hora_limite TEXT,
  ADD COLUMN IF NOT EXISTS fuente_datos TEXT DEFAULT 'PLACSP';
