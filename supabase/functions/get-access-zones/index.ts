// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "get-access-zones" started!');

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as ErrorWithMessage).message === 'string';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: {
      persistSession: false,
    },
  });

  try {
    const { data, error } = await supabase.from('zones').select('id, name, category').order('name', { ascending: true });

    if (error) {
      throw new Error(`Error fetching zones from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ zones: [], message: 'No zones found in catalog.' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // ¡CAMBIO CLAVE! Mapear los datos para asegurar que 'category' sea siempre una cadena.
    const transformedZones = data.map((zone) => ({
      id: zone.id,
      name: zone.name,
      category: zone.category || 'Uncategorized', // Si category es null, usar 'Uncategorized'
    }));

    return new Response(
      JSON.stringify({ zones: transformedZones }), // Enviar las zonas transformadas
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (catchError: unknown) {
    console.error('Unhandled error in Edge Function:', catchError);

    let errorMessage = 'An unexpected error occurred';
    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === 'string') {
      errorMessage = catchError;
    } else if (isErrorWithMessage(catchError)) {
      errorMessage = catchError.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
