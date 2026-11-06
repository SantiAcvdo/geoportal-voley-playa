// Endpoint Serverless para Vercel: /api/capas
// Consulta la tabla 'capas' en Supabase y devuelve la configuración en formato JSON

const SUPABASE_URL = 'https://omwzkeuhxlzkixpzdbwu.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_n6_FX9CCTZzCoGcnIKrVrw_oqyhw7hJ';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/capas?select=*&activa=eq.true`, {
      headers: {
        apikey: SUPABASE_PUBLIC_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`
      }
    });

    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        return res.status(200).json(data);
      }
    }
  } catch (err) {
    console.warn('Fallo consultando tabla capas en Supabase, usando fallback:', err);
  }

  // Fallback con la capa publicada desde ArcGIS Pro
  return res.status(200).json([
    {
      id: 1,
      nombre: "Límites Municipales AMVA",
      url: "https://services6.arcgis.com/UH4DPLk0MmWXQPyg/arcgis/rest/services/Acevedo_Prueba_WFL1/FeatureServer/0",
      tipo: "arcgis_feature",
      activa: true
    }
  ]);
}
