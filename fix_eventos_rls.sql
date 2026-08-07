GRANT INSERT ON eventos TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE eventos_id_seq TO anon, authenticated;

DROP POLICY IF EXISTS "eventos_insert_publico" ON eventos;
CREATE POLICY "eventos_insert_publico" ON eventos
  FOR INSERT TO public
  WITH CHECK (true);
