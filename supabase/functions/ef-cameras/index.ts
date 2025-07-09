import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "ef-cameras" started!');

// Interfaz para el objeto Zone tal como se devuelve en el join
interface Zone {
  id: string;
  name: string;
  category: string;
}

// Interfaz para el objeto Camera tal como se devuelve en el select con el join de Zone
interface Camera {
  id: string;
  name: string;
  zone_id: string;
  location?: string | null;
  zone: Zone[]; // Es un array de Zone
}

// Interfaz para el payload de una nueva cámara (POST)
interface CreateCameraPayload {
  name: string;
  zone_id: string;
  location?: string | null;
}

// Interfaz para el payload de actualización de una cámara (PUT/PATCH)
interface UpdateCameraPayload {
  name?: string;
  zone_id?: string;
  location?: string | null;
}

// Interfaz para la estructura de respuesta general de la Edge Function
interface EdgeFunctionResponse {
  success: boolean;
  data?: Camera | Camera[] | null;
  error?: string;
  message?: string;
}

// Helper function to create CORS response
function createCorsResponse(data: EdgeFunctionResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with, x-request-id',
    },
  });
}

// Helper function to create Supabase client
function createSupabaseClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with, x-request-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const supabase = createSupabaseClient();

  try {
    const url = new URL(req.url);
    const cameraId = url.searchParams.get('id');

    switch (req.method) {
      case 'GET':
        if (cameraId) {
          const { data, error }: PostgrestSingleResponse<Omit<Camera, 'zone'> & { zone: Zone[] }> = await supabase
            .from('cameras')
            .select('id, name, zone_id, location, zone:zones(id, name, category)')
            .eq('id', cameraId)
            .single();
          if (error) return createCorsResponse({ success: false, error: error.message, data: null }, 404);
          const transformedData = data ? { ...data, zone: data.zone || [] } : null;
          return createCorsResponse({ success: true, data: transformedData });
        } else {
          const { data, error }: PostgrestResponse<Omit<Camera, 'zone'> & { zone: Zone[] }> = await supabase
            .from('cameras')
            .select('id, name, zone_id, location, zone:zones(id, name, category)')
            .order('name', { ascending: true });
          if (error) return createCorsResponse({ success: false, error: error.message, data: null }, 500);
          const transformedData = data ? data.map((item) => ({ ...item, zone: item.zone || [] })) : [];
          return createCorsResponse({ success: true, data: transformedData });
        }
      case 'POST': {
        const body: CreateCameraPayload = await req.json();
        const { name, zone_id, location } = body;
        if (!name || !zone_id) return createCorsResponse({ success: false, error: 'Name and zone_id are required', data: null }, 400);

        const { data, error }: PostgrestSingleResponse<Omit<Camera, 'zone'> & { zone: Zone[] }> = await supabase
          .from('cameras')
          .insert([{ name, zone_id, location }])
          .select('id, name, zone_id, location, zone:zones(id, name, category)')
          .single();
        if (error) return createCorsResponse({ success: false, error: error.message, data: null }, 400);
        const transformedData = data ? { ...data, zone: data.zone || [] } : null;
        return createCorsResponse({ success: true, data: transformedData });
      }
      case 'PUT': {
        if (!cameraId) return createCorsResponse({ success: false, error: 'Camera ID required', data: null }, 400);
        const body: UpdateCameraPayload = await req.json();
        const { name, zone_id, location } = body;

        const { data, error }: PostgrestSingleResponse<Omit<Camera, 'zone'> & { zone: Zone[] }> = await supabase
          .from('cameras')
          .update({ name, zone_id, location })
          .eq('id', cameraId)
          .select('id, name, zone_id, location, zone:zones(id, name, category)')
          .single();
        if (error) return createCorsResponse({ success: false, error: error.message, data: null }, 400);
        const transformedData = data ? { ...data, zone: data.zone || [] } : null;
        return createCorsResponse({ success: true, data: transformedData });
      }
      case 'DELETE': {
        // ¡CAMBIO CLAVE! Usar PostgrestSingleResponse<null> para el delete
        const { error }: PostgrestSingleResponse<null> = await supabase.from('cameras').delete().eq('id', cameraId);
        if (error) return createCorsResponse({ success: false, error: error.message, data: null }, 400);
        return createCorsResponse({ success: true, message: 'Camera deleted successfully', data: null });
      }
      default:
        return createCorsResponse({ success: false, error: `Method ${req.method} not allowed`, data: null }, 405);
    }
  } catch (error: unknown) {
    return createCorsResponse({ success: false, error: error instanceof Error ? error.message : String(error), data: null }, 500);
  }
});
