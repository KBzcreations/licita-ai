-- Columnas que el formulario de perfil ya intentaba guardar pero nunca
-- existieron en la tabla (por eso "Guardar cambios" fallaba en silencio),
-- mas el nuevo campo de sector de actividad de la empresa.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS presupuesto_min_interes NUMERIC,
  ADD COLUMN IF NOT EXISTS presupuesto_max_interes NUMERIC,
  ADD COLUMN IF NOT EXISTS frecuencia_alertas TEXT DEFAULT 'diaria',
  ADD COLUMN IF NOT EXISTS sector_actividad TEXT,
  ADD COLUMN IF NOT EXISTS sector_actividad_desc TEXT;
