// Importar las dependencias necesarias.
// 'serve' es para crear un servidor HTTP básico en Deno.
// 'createClient' es el cliente de Supabase para interactuar con tu proyecto.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "get-access-zones" started!');

// Interfaz para el tipo de error que esperamos con un mensaje
interface ErrorWithMessage {
  message: string;
}

// Función de guardia para verificar si un error tiene una propiedad 'message'
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ErrorWithMessage).message === "string"
  );
}

// La función 'serve' de Deno espera una función asíncrona que maneje las peticiones HTTP.
// 'req' es el objeto de la petición entrante.
serve(async (req: Request) => {
  // --- Configuración de CORS ---
  // Esto es crucial para que tu frontend (que corre en un dominio diferente, ej. localhost:3000)
  // pueda hacer peticiones a esta función.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permite peticiones desde cualquier origen (ajustar en producción)
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Métodos permitidos
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-requested-with", // Cabeceras permitidas
        "Access-Control-Max-Age": "86400", // Cachea la respuesta OPTIONS por 24 horas
      },
    });
  }

  // --- Inicialización del Cliente Supabase ---
  // Usamos SUPABASE_SERVICE_ROLE_KEY para asegurar permisos para leer la tabla 'zones'
  // sin preocuparnos por RLS en este contexto administrativo.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  // --- Obtener las zonas de la base de datos ---
  try {
    // Consulta la tabla 'public.zones'.
    // Selecciona las columnas 'id' y 'name'.
    // No se usa 'order by' aquí.
    const { data, error } = await supabase
      .from("zones")
      .select("id, name"); // Solo necesitamos id y name para el dropdown

    if (error) {
      console.error("Error fetching zones:", error);
      return new Response(
        JSON.stringify({
          error: error.message || "Error fetching zones from database",
        }),
        {
          status: 500, // Error interno del servidor
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Si no hay zonas, devuelve un array vacío.
    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ zones: [], message: "No zones found in catalog." }),
        {
          status: 200, // Éxito, pero sin contenido
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Devuelve las zonas encontradas en formato JSON.
    return new Response(
      JSON.stringify({ zones: data }),
      {
        status: 200, // Éxito
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (catchError: unknown) { // Manejo de errores inesperados (ahora 'unknown')
    console.error("Unhandled error in Edge Function:", catchError);

    let errorMessage = "An unexpected error occurred"; // Declarar y inicializar errorMessage
    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === "string") {
      errorMessage = catchError;
    } else if (isErrorWithMessage(catchError)) { // Usar la función de guardia
      errorMessage = catchError.message;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }), // Usar errorMessage ya definido
      {
        status: 500, // Error interno del servidor
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
