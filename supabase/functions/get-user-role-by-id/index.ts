// Importar las dependencias necesarias.
// 'serve' es para crear un servidor HTTP básico en Deno.
// 'createClient' es el cliente de Supabase para interactuar con tu proyecto.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  createClient,
  type PostgrestError,
} from "https://esm.sh/@supabase/supabase-js@2"; // Importamos PostgrestError

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "get-user-role-by-id" started!');

// La función 'serve' de Deno espera una función asíncrona que maneje las peticiones HTTP.
// 'req' es el objeto de la petición entrante.
serve(async (req: Request) => {
  // --- Configuración de CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-requested-with, x-request-id",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // --- Inicialización del Cliente Supabase ---
  // Usamos SUPABASE_SERVICE_ROLE_KEY para asegurar permisos para leer la tabla 'users'
  // y la tabla 'roles_catalog' sin preocuparnos por RLS.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  let userId: string | null = null;

  try {
    // Esperamos que el user_id venga como un parámetro de consulta (query parameter) en la URL
    // Ejemplo: /functions/v1/get-user-role-by-id?userId=alguna_uuid_del_usuario
    const url = new URL(req.url);
    userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "User ID is required as a query parameter (userId).",
        }),
        {
          status: 400, // Bad Request
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Definimos la interfaz para el tipo de datos esperado de la consulta.
    // Esto ayuda a TypeScript a inferir correctamente la estructura.
    interface UserWithRole {
      role_id: string | null;
      roles_catalog: { name: string } | null;
    }

    // --- Obtener el rol del usuario de la base de datos ---
    // Consulta la tabla 'public.users' y haz un JOIN implícito con 'roles_catalog'
    // para obtener el nombre del rol.
    // Se añade una aserción de tipo para guiar a TypeScript.
    const { data, error } = await supabase
      .from("users")
      .select("role_id, roles_catalog(name)")
      .eq("id", userId)
      .single() as { data: UserWithRole | null; error: PostgrestError | null }; // Cambiado 'any' a 'PostgrestError | null'

    if (error) {
      console.error(`Error fetching role for user ID ${userId}:`, error);
      // Si el error es por "Row not found", significa que no hay un usuario en 'public.users' para ese user_id.
      if (error.code === "PGRST116") { // Código de error de PostgREST para "Row not found"
        return new Response(
          JSON.stringify({
            role_name: null,
            message: `No user profile found for user ID: ${userId}`,
          }),
          {
            status: 200, // OK, pero el rol es nulo
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }
      return new Response(
        JSON.stringify({
          error: error.message || "Error fetching user role from database",
        }),
        {
          status: 500, // Internal Server Error
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Si no se encuentra un usuario en 'public.users' o el rol es nulo en el usuario
    // (es decir, role_id es NULL o no hay un rol correspondiente en roles_catalog)
    // La aserción de tipo anterior ahora permite acceder a data.roles_catalog.name directamente.
    if (!data || !data.roles_catalog || !data.roles_catalog.name) {
      return new Response(
        JSON.stringify({
          role_name: null,
          message:
            `Role not found for user ID: ${userId} or missing in catalog.`,
        }),
        {
          status: 200, // OK, pero el rol es nulo
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Devuelve el nombre del rol.
    return new Response(
      JSON.stringify({ role_name: data.roles_catalog.name }),
      {
        status: 200, // Éxito
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (catchError: unknown) { // Cambiado 'any' a 'unknown'
    // 'unknown' es más seguro que 'any' porque te obliga a verificar el tipo
    // antes de acceder a sus propiedades (ej. 'message').
    let errorMessage = "An unexpected error occurred";
    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === "string") {
      errorMessage = catchError;
    }

    console.error("Unhandled error in Edge Function:", catchError);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500, // Internal Server Error
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
