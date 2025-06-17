// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "validate-user-face" started!');

// --- Definiciones de Tipos para Supabase Data (AHORA PRECISOS) ---
// Un elemento básico con propiedad 'name'
interface ItemWithName {
  name: string;
}

// Tipo para roles_catalog y user_statuses_catalog (son objetos directos)
type RelatedCatalogObject = ItemWithName; // No es un array, es un objeto

// Tipo para un elemento dentro de user_zone_access
// Aquí 'zones' es un objeto directo, no un array anidado
interface AccessZoneEntry {
  zones: ItemWithName;
}

// Tipo para la respuesta completa de los datos del usuario desde Supabase
interface SupabaseUserResponse {
  id: string;
  full_name: string;
  roles_catalog: RelatedCatalogObject | null; // Ahora es un objeto directo o null
  user_statuses_catalog: RelatedCatalogObject | null; // Ahora es un objeto directo o null
  user_zone_access: AccessZoneEntry[] | null; // Esto sigue siendo un array de AccessZoneEntry
}

// Interfaz para la estructura del cuerpo de la petición que esperamos del frontend.
interface ValidateFacePayload {
  faceEmbedding: number[];
  // Opcionalmente, puedes enviar el ID de la cámara si tu frontend lo tiene disponible
  // cameraId?: string;
}

// Define un umbral de similitud para la detección de rostros.
const VECTOR_SIMILARITY_THRESHOLD = 0.5;

serve(async (req: Request) => {
  // --- Configuración de CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-requested-with",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  const payload: ValidateFacePayload = await req.json();

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
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const queryEmbedding = payload.faceEmbedding;
  const logEntry = {
    timestamp: new Date().toISOString(),
    user_id: null as string | null,
    camera_id: null as string | null,
    result: false,
    observed_user_id: null as string | null,
    user_type: "unknown" as string,
    vector_attempted: queryEmbedding,
    match_status: "no_match" as string,
    decision: "access_denied" as string,
    reason: null as string | null,
    confidence_score: null as number | null,
  };

  try {
    console.log("Searching for match in registered users (public.faces)...");
    const { data: matchedUsers, error: usersSearchError } = await supabase.rpc(
      "match_face_embedding",
      {
        query_embedding: queryEmbedding,
        match_threshold: VECTOR_SIMILARITY_THRESHOLD,
        match_count: 1,
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

      const { data: rawUserData, error: userFetchError } = await supabase
        .from("users")
        .select(`
                    id, full_name,
                    roles_catalog(name),
                    user_statuses_catalog(name),
                    user_zone_access(zones(name))
                `)
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

      // Casteamos a nuestro tipo preciso
      const userData = rawUserData as SupabaseUserResponse | null;

      if (userFetchError || !userData) {
        console.warn(
          `Matched registered user ID ${userId} not found, deleted, or error fetching details:`,
          userFetchError,
        );
      } else {
        // --- ACCESO A PROPIEDADES AHORA CORRECTO BASADO EN LOS LOGS ---
        const roleName = userData.roles_catalog?.name || "N/A"; // Directo .name, no [0]
        const statusName = userData.user_statuses_catalog?.name || "N/A"; // Directo .name, no [0]
        const accessZones = (userData.user_zone_access || []).map((uza) =>
          uza.zones?.name || "N/A"
        ); // Directo .name, no [0]

        const confidence = parseFloat((1 - matchedFace.distance).toFixed(4));

        logEntry.user_id = userData.id;
        logEntry.result = true;
        logEntry.user_type = "registered";
        logEntry.match_status = "matched_registered";
        logEntry.decision = "access_granted";
        logEntry.reason = "Face matched with a registered and active user.";
        logEntry.confidence_score = confidence;

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
              role_name: roleName,
              status_name: statusName,
              access_zones: accessZones,
              distance: matchedFace.distance,
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

    console.log(
      "No registered user match. Searching in observed users (public.observed_users)...",
    );
    const { data: matchedObservedUsers, error: observedSearchError } =
      await supabase.rpc("match_observed_face_embedding", {
        query_embedding: queryEmbedding,
        match_threshold: VECTOR_SIMILARITY_THRESHOLD,
        match_count: 1,
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

      const { data: rawObservedUserData, error: observedFetchError } =
        await supabase
          .from("observed_users")
          .select(`
                    id, first_seen_at, last_seen_at, access_count, last_accessed_zones,
                    user_statuses_catalog(name)
                `)
          .eq("id", observedUserId)
          .single();

      // Casteamos a nuestro tipo preciso (simplified for observed_users)
      const observedUserData = rawObservedUserData as {
        id: string;
        first_seen_at: string;
        last_seen_at: string;
        access_count: number;
        last_accessed_zones: string[]; // Asumiendo que es un array de strings (jsonb)
        user_statuses_catalog: RelatedCatalogObject | null; // También objeto directo aquí
      } | null;

      if (observedFetchError || !observedUserData) {
        console.warn(
          `Matched observed user ID ${observedUserId} not found or error fetching details:`,
          observedFetchError,
        );
      } else {
        const confidence = parseFloat(
          (1 - matchedObservedFace.distance).toFixed(4),
        );
        // Acceder a la propiedad 'name' directamente
        const observedStatusName =
          observedUserData.user_statuses_catalog?.name || "N/A";

        const { error: updateObservedError } = await supabase.from(
          "observed_users",
        ).update({
          last_seen_at: new Date().toISOString(),
          access_count: observedUserData.access_count + 1,
        }).eq("id", observedUserId);

        if (updateObservedError) {
          console.error("Error updating observed user:", updateObservedError);
        }

        logEntry.observed_user_id = observedUserData.id;
        logEntry.result = true;
        logEntry.user_type = "observed";
        logEntry.match_status = "matched_observed";
        logEntry.decision = "access_denied";
        logEntry.reason = "Face matched with an observed (unregistered) user.";
        logEntry.confidence_score = confidence;

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
              last_seen_at: new Date().toISOString(),
              access_count: observedUserData.access_count + 1,
              last_accessed_zones: observedUserData.last_accessed_zones,
              status_name: observedStatusName,
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

    console.log("No match found in either registered or observed users.");

    logEntry.result = false;
    logEntry.user_type = "unknown";
    logEntry.match_status = "no_match";
    logEntry.decision = "access_denied";
    logEntry.reason = "No match found in registered or observed users.";
    logEntry.confidence_score = null;

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

    logEntry.result = false;
    logEntry.decision = "access_denied";
    logEntry.reason =
      `Validation failed due to internal error: ${errorMessage}`;
    logEntry.match_status = "error";

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
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
