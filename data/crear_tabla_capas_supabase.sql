-- ============================================================
-- SCRIPT SQL PARA SUPABASE: TABLA 'capas' (CONFIGURACIÓN DE SERVICIOS REST)
-- Esquema enseñado en clase: ID PK, Nombre, URL REST de ArcGIS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.capas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  url TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'arcgis_feature',
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS y lectura pública
ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de capas" ON public.capas;
CREATE POLICY "Permitir lectura publica de capas"
  ON public.capas FOR SELECT
  USING (true);

-- Insertar el servicio REST de ArcGIS Pro publicado por el estudiante
INSERT INTO public.capas (id, nombre, url, tipo, activa)
VALUES (
  1,
  'Límites Municipales AMVA',
  'https://services6.arcgis.com/UH4DPLk0MmWXQPyg/arcgis/rest/services/Acevedo_Prueba_WFL1/FeatureServer/0',
  'arcgis_feature',
  true
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  url = EXCLUDED.url,
  tipo = EXCLUDED.tipo,
  activa = EXCLUDED.activa;
