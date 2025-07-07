// Importar las dependencias necesarias de Deno y Supabase.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Importamos 'User' para tipar el objeto de usuario, y 'PostgrestError' para errores de DB.
import { createClient, PostgrestError, User as SupabaseUser } from 'https://esm.sh/@supabase/supabase-js@2';

console.log("Edge Function 'get-user-emails' started!");

// ¡¡¡NUEVOS LOGS DE DEPURACIÓN DE VARIABLES DE ENTORNO!!!
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
console.log(`DEBUG ENV: SUPABASE_URL is set: ${!!supabaseUrl}`);
console.log(`DEBUG ENV: SUPABASE_SERVICE_ROLE_KEY is set: ${!!supabaseServiceRoleKey}`);
console.log(`DEBUG ENV: SUPABASE_URL value (first 10 chars): ${supabaseUrl ? supabaseUrl.substring(0, 10) : 'N/A'}`);
console.log(`DEBUG ENV: SUPABASE_SERVICE_ROLE_KEY value (last 5 chars): ${supabaseServiceRoleKey ? supabaseServiceRoleKey.slice(-5) : 'N/A'}`);

// Definir una interfaz para el tipo de respuesta de auth.admin.getUserById
// Contendrá un 'user' de tipo SupabaseUser (el tipo de usuario de Supabase)
interface AdminGetUserByIdResponse {
  data: {
    user: SupabaseUser | null;
  };
  error: PostgrestError | null;
}

// Encabezados CORS para permitir solicitudes desde tu frontend.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ¡IMPORTANTE! En producción, cambia esto por el dominio de tu frontend.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función principal que maneja las solicitudes HTTP.
serve(async (req) => {
  // Manejar las solicitudes OPTIONS (preflight CORS).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Intentar parsear el cuerpo de la solicitud para obtener los userIds.
    const { userIds } = await req.json();

    // Validar que userIds sea un array válido y no esté vacío.
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'userIds' array in request body." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear un cliente Supabase con la SERVICE_ROLE_KEY.
    const supabaseClient = createClient(supabaseUrl ?? '', supabaseServiceRoleKey ?? '', {
      auth: {
        persistSession: false,
      },
    });
    console.log('DEBUG: Supabase client created successfully.');

    const userEmails: Record<string, string> = {};

    // Iterar sobre cada user ID y usar auth.admin.getUserById
    for (const userId of userIds) {
      try {
        // Usar auth.admin.getUserById para obtener los detalles del usuario
        // Tipamos la respuesta con la nueva interfaz AdminGetUserByIdResponse
        const { data: userData, error: userError } = (await supabaseClient.auth.admin.getUserById(userId)) as AdminGetUserByIdResponse;

        if (userError) {
          console.error(`Error fetching user ${userId} with auth.admin.getUserById:`, userError);
          userEmails[userId] = 'error_fetching_user';
          continue; // Continuar con el siguiente usuario
        }

        if (userData?.user?.email) {
          // Acceder a userData.user.email
          userEmails[userId] = userData.user.email;
        } else {
          userEmails[userId] = 'email_not_found';
        }
        console.log(`DEBUG: User ${userId} fetched, email: ${userEmails[userId]}`); // Log para cada usuario
      } catch (individualUserError: unknown) {
        let errorMessage = 'An unexpected error occurred while fetching a single user.';
        if (individualUserError instanceof Error) {
          errorMessage = individualUserError.message;
        } else if (typeof individualUserError === 'string') {
          errorMessage = individualUserError;
        }
        console.error(`Unhandled error for user ${userId}:`, errorMessage);
        userEmails[userId] = 'error_fetching_user';
      }
    }

    // Devolver la respuesta con los emails.
    return new Response(JSON.stringify({ emails: userEmails }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred in the Edge Function.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error("Unhandled error in 'get-user-emails' Edge Function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
