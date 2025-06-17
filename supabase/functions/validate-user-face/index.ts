// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "validate-user-face" started!');

// Interfaz para la estructura del cuerpo de la petición que esperamos del frontend.
interface ValidateFacePayload {
  faceEmbedding: number[];
  // Opcionalmente, puedes enviar el ID de la cámara si tu frontend lo tiene disponible
  // cameraId?: string;
}

// Define un umbral de similitud para la detección de rostros.
// Un valor más bajo significa que los embeddings deben ser MUY similares.
const VECTOR_SIMILARITY_THRESHOLD = 0.5;

// La función 'serve' de Deno espera una función asíncrona que maneje las peticiones HTTP.
serve(async (req: Request) => {
  // --- Configuración de CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permite peticiones desde cualquier origen (ajustar en producción)
        "Access-Control-Allow-Methods": "POST, OPTIONS", // Métodos permitidos
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-requested-with",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Asegúrate de que la petición sea POST.
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  // Inicialización del Cliente Supabase.
  // Usamos SUPABASE_SERVICE_ROLE_KEY para tener permisos elevados
  // (es segura en el entorno de la Edge Function).
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  const payload: ValidateFacePayload = await req.json(); // Se infiere el tipo aquí

  // Validar que el embedding facial esté presente y tenga el formato correcto.
  if (
    !payload.faceEmbedding || !Array.isArray(payload.faceEmbedding) ||
    payload.faceEmbedding.length !== 128
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Invalid or missing faceEmbedding in request body. Must be an array of 128 numbers.",
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

  const queryEmbedding = payload.faceEmbedding;
  // const cameraId = payload.cameraId || null; // Captura el ID de la cámara si se envía

  // Objeto para almacenar los datos que se insertarán en la tabla `logs`
  const logEntry = { // Usamos const ya que no se reasigna la variable en sí
    timestamp: new Date().toISOString(),
    user_id: null as string | null,
    camera_id: null as string | null, // Si pasas cameraId, actualiza aquí
    result: false, // Por defecto, fallo de validación
    observed_user_id: null as string | null,
    user_type: "unknown" as string,
    vector_attempted: queryEmbedding, // El embedding que se intentó validar
    match_status: "no_match" as string,
    decision: "access_denied" as string, // Por defecto, acceso denegado
    reason: null as string | null,
    confidence_score: null as number | null,
  };

  try {
    // --- 1. Buscar en `public.faces` (usuarios registrados) ---
    console.log("Searching for match in registered users (public.faces)...");
    const { data: matchedUsers, error: usersSearchError } = await supabase.rpc(
      "match_face_embedding",
      {
        query_embedding: queryEmbedding,
        match_threshold: VECTOR_SIMILARITY_THRESHOLD,
        match_count: 1, // Solo necesitamos el mejor match
      },
    );

    if (usersSearchError) {
      console.error(
        "Error calling match_face_embedding RPC:",
        usersSearchError,
      );
      throw new Error(
        `Failed to query registered users: ${usersSearchError.message}`,
      );
    }

    if (matchedUsers && matchedUsers.length > 0) {
      const matchedFace = matchedUsers[0];
      const userId = matchedFace.user_id;

      // Obtener detalles completos del usuario registrado
      const { data: userData, error: userFetchError } = await supabase
        .from("users")
        .select(`
                    id, full_name,
                    roles_catalog(name),
                    user_statuses_catalog(name),
                    user_zone_access(zones(name))
                `)
        .eq("id", userId)
        .is("deleted_at", null) // Asegurarse de que el usuario no esté lógicamente eliminado
        .single();

      if (userFetchError || !userData) {
        console.warn(
          `Matched registered user ID ${userId} not found, deleted, or error fetching details:`,
          userFetchError,
        );
        // Si el usuario no existe o está eliminado, no lo consideramos un match válido aquí.
        // Continuaremos buscando en observed_users o se marcará como no_match.
      } else {
        // CORRECCIÓN AQUÍ: uza.zones es un array, por lo tanto accedemos al primer elemento [0]
        const accessZones =
          (userData.user_zone_access as Array<
            { zones: Array<{ name: string }> }
          >).map((uza) => uza.zones[0]?.name);
        const confidence = parseFloat((1 - matchedFace.distance).toFixed(4)); // Convierte distancia a un score de confianza (0-1)

        // Actualizar el log para un match con usuario registrado
        logEntry.user_id = userData.id;
        logEntry.result = true;
        logEntry.user_type = "registered";
        logEntry.match_status = "matched_registered";
        logEntry.decision = "access_granted"; // Acceso concedido para usuario registrado
        logEntry.reason = "Face matched with a registered and active user.";
        logEntry.confidence_score = confidence;

        // Insertar log antes de retornar respuesta
        const { error: logInsertError } = await supabase.from("logs").insert([
          logEntry,
        ]);
        if (logInsertError) {
          console.error("Error logging validation success:", logInsertError);
        }

        return new Response(
          JSON.stringify({
            matchedUser: {
              id: userData.id,
              full_name: userData.full_name,
              // Acceder al primer elemento del array para 'name' de roles_catalog
              role_name: (userData.roles_catalog as { name: string }[])[0]
                ?.name,
              // Acceder al primer elemento del array para 'name' de user_statuses_catalog
              status_name:
                (userData.user_statuses_catalog as { name: string }[])[0]?.name,
              access_zones: accessZones,
              distance: matchedFace.distance, // Mantener distancia bruta para depuración
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }
    }

    // --- 2. Si no hubo match con usuario registrado, buscar en `public.observed_users` ---
    console.log(
      "No registered user match. Searching in observed users (public.observed_users)...",
    );
    const { data: matchedObservedUsers, error: observedSearchError } =
      await supabase.rpc("match_observed_face_embedding", {
        query_embedding: queryEmbedding,
        match_threshold: VECTOR_SIMILARITY_THRESHOLD,
        match_count: 1, // Solo necesitamos el mejor match
      });

    if (observedSearchError) {
      console.error(
        "Error calling match_observed_face_embedding RPC:",
        observedSearchError,
      );
      throw new Error(
        `Failed to query observed users: ${observedSearchError.message}`,
      );
    }

    if (matchedObservedUsers && matchedObservedUsers.length > 0) {
      const matchedObservedFace = matchedObservedUsers[0];
      const observedUserId = matchedObservedFace.observed_user_id;

      // Obtener detalles del usuario observado
      const { data: observedUserData, error: observedFetchError } =
        await supabase
          .from("observed_users")
          .select(`
                    id, first_seen_at, last_seen_at, access_count, last_accessed_zones,
                    user_statuses_catalog(name)
                `)
          .eq("id", observedUserId)
          .single();

      if (observedFetchError || !observedUserData) {
        console.warn(
          `Matched observed user ID ${observedUserId} not found or error fetching details:`,
          observedFetchError,
        );
        // Si el usuario observado no existe, se marcará como no_match.
      } else {
        const confidence = parseFloat(
          (1 - matchedObservedFace.distance).toFixed(4),
        );

        // Actualizar el registro del usuario observado (last_seen_at, access_count)
        const { error: updateObservedError } = await supabase.from(
          "observed_users",
        ).update({
          last_seen_at: new Date().toISOString(),
          access_count: observedUserData.access_count + 1,
        }).eq("id", observedUserId);

        if (updateObservedError) {
          console.error("Error updating observed user:", updateObservedError);
        }

        // Actualizar el log para un match con usuario observado
        logEntry.observed_user_id = observedUserData.id;
        logEntry.result = true;
        logEntry.user_type = "observed";
        logEntry.match_status = "matched_observed";
        logEntry.decision = "access_denied"; // Usuarios observados no tienen acceso per se, solo son 'conocidos'
        logEntry.reason = "Face matched with an observed (unregistered) user.";
        logEntry.confidence_score = confidence;

        // Insertar log antes de retornar respuesta
        const { error: logInsertError } = await supabase.from("logs").insert([
          logEntry,
        ]);
        if (logInsertError) {
          console.error(
            "Error logging validation success for observed user:",
            logInsertError,
          );
        }

        return new Response(
          JSON.stringify({
            observedUser: {
              id: observedUserData.id,
              first_seen_at: observedUserData.first_seen_at,
              last_seen_at: new Date().toISOString(), // Usar el timestamp actual para la respuesta
              access_count: observedUserData.access_count + 1,
              last_accessed_zones: observedUserData.last_accessed_zones,
              // Acceder al primer elemento del array para 'name' de user_statuses_catalog
              status_name:
                (observedUserData.user_statuses_catalog as { name: string }[])[
                  0
                ]?.name,
              distance: matchedObservedFace.distance,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }
    }

    // --- 3. Si no hay match en ninguna tabla ---
    console.log("No match found in either registered or observed users.");

    // Si quieres que aquí se cree un nuevo 'observed_user' para cada rostro no reconocido,
    // la lógica iría aquí. Por ahora, solo se registrará como 'no_match'.
    logEntry.result = false;
    logEntry.user_type = "unknown";
    logEntry.match_status = "no_match";
    logEntry.decision = "access_denied";
    logEntry.reason = "No match found in registered or observed users.";
    logEntry.confidence_score = null;

    // Insertar log antes de retornar respuesta
    const { error: logInsertError } = await supabase.from("logs").insert([
      logEntry,
    ]);
    if (logInsertError) {
      console.error("Error logging no match validation:", logInsertError);
    }

    return new Response(
      JSON.stringify({
        message:
          "No registered or observed user matched the provided face embedding.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (catchError: unknown) {
    // Manejo centralizado de errores.
    let errorMessage = "An unexpected error occurred during facial validation.";
    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === "string") {
      errorMessage = catchError;
    }

    console.error(
      "Unhandled error in validate-user-face Edge Function:",
      catchError,
    );

    // Actualizar el log para un error general y registrarlo.
    logEntry.result = false;
    logEntry.decision = "access_denied";
    logEntry.reason =
      `Validation failed due to internal error: ${errorMessage}`;
    logEntry.match_status = "error";

    // Insertar log de error (captura cualquier error aquí también para no perderlo)
    const { error: logInsertError } = await supabase.from("logs").insert([
      logEntry,
    ]);
    if (logInsertError) {
      console.error(
        "Error logging validation error during catch:",
        logInsertError,
      );
    }

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
