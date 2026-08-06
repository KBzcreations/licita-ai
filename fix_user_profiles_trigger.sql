-- 1) La tabla user_profiles no tenia las columnas que la web usa para
--    guardar preferencias de alertas. Se añaden si faltan.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS recibir_alertas BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS palabras_clave TEXT[] DEFAULT '{}';

-- 2) Trigger que crea automaticamente una fila en user_profiles cuando
--    se registra un usuario nuevo en auth.users. Evita depender de un
--    INSERT/UPSERT desde el navegador, que las politicas RLS bloquean
--    antes de confirmar el email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nombre, empresa, recibir_alertas, tecnologias_interes, palabras_clave)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'empresa', ''),
    true,
    '{}',
    '{}'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
