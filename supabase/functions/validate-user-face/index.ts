// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "validate-user-face" started!');

// --- Definiciones de Tipos para Supabase Data (ACTUALIZADO CON ID DE ZONA) ---
// Un elemento básico con propiedad 'id' y 'name'
interface ItemWithNameAndId {
  id: string; // Añadido 'id' para las zonas
  name: string;
}

// Tipo para roles_catalog y user_statuses_catalog (son objetos directos)
type RelatedCatalogObject = ItemWithNameAndId;

// Tipo para un elemento dentro de user_zone_access
// Aquí 'zones' es un objeto directo (ItemWithNameAndId), no un array anidado
interface AccessZoneEntry {
  zones: ItemWithNameAndId; // Ahora 'zones' contendrá id y name
}

// Tipo para la respuesta completa de los datos del usuario desde Supabase
interface SupabaseUserResponse {
  id: string;
  full_name: string;
  roles_catalog: RelatedCatalogObject | null;
  user_statuses_catalog: RelatedCatalogObject | null;
  user_zone_access: AccessZoneEntry[] | null; // Esto sigue siendo un array de AccessZoneEntry
}

// Interfaz para la estructura del cuerpo de la petición que esperamos del frontend.
interface ValidateFacePayload {
  faceEmbedding: number[];
  zoneId?: string; // El ID de la zona de donde se hace la validación
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
  const requestedZoneId = payload.zoneId; // Capturamos el ID de la zona desde el frontend
  let hasAccess = false; // Variable para controlar el acceso

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
    // Aquí puedes añadir más detalles al log si es necesario, como la zona solicitada
    requested_zone_id: requestedZoneId || null,
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

      // MODIFICACIÓN CRUCIAL: Obtener ID y NAME de las zonas
      const { data: rawUserData, error: userFetchError } = await supabase
        .from("users")
        .select(`
                    id, full_name,
                    roles_catalog(name),
                    user_statuses_catalog(name),
                    user_zone_access(zones(id, name)) -- <--- AHORA PEDIMOS ID Y NAME
                `)
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

      const userData = rawUserData as SupabaseUserResponse | null;

      if (userFetchError || !userData) {
        console.warn(
          `Matched registered user ID ${userId} not found, deleted, or error fetching details:`,
          userFetchError,
        );
      } else {
        const roleName = userData.roles_catalog?.name || "N/A";
        const statusName = userData.user_statuses_catalog?.name || "N/A";

        // Extraemos los objetos completos de zona ({id, name})
        const userAccessZonesRaw = (userData.user_zone_access || []).map(
          (uza) => uza.zones,
        );
        // Para la respuesta, seguimos enviando solo los nombres como un array de strings
        const accessZoneNames = userAccessZonesRaw.map((zone) =>
          zone.name || "N/A"
        );

        // --- LÓGICA DE ACCESO COMPLETA: ZONA + ESTATUS ---
        let isZoneAllowed = false;
        if (requestedZoneId && userAccessZonesRaw.length > 0) {
          isZoneAllowed = userAccessZonesRaw.some((zone) =>
            zone.id === requestedZoneId
          );
        }
        // Definimos los estatus permitidos
        const allowedStatuses = ["active", "active_temporal"];
        const isStatusAllowed = allowedStatuses.includes(
          statusName.toLowerCase(),
        ); // Convertir a minúsculas para comparar
        // El acceso se concede SOLO si la zona es permitida Y el estatus es permitido
        hasAccess = isZoneAllowed && isStatusAllowed;
        console.log(
          `Requested Zone ID: ${requestedZoneId}, Is Zone Allowed: ${isZoneAllowed}`,
        );
        console.log(
          `User Status: ${statusName}, Is Status Allowed: ${isStatusAllowed}`,
        );
        console.log(`Final Access Decision (hasAccess): ${hasAccess}`);
        const confidence = parseFloat((1 - matchedFace.distance).toFixed(4));

        logEntry.user_id = userData.id;
        logEntry.result = true;
        logEntry.user_type = "registered";
        logEntry.match_status = "matched_registered";
        logEntry.decision = hasAccess ? "access_granted" : "access_denied"; // Decisión basada en hasAccess
        logEntry.reason = hasAccess
          ? `Face matched and access granted for requested zone (${requestedZoneId}).`
          : `Face matched but access denied for requested zone (${
            requestedZoneId || "N/A"
          }).`;
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
              access_zones: accessZoneNames, // Mantenemos solo nombres para el FE
              distance: matchedFace.distance,
              hasAccess: hasAccess, // ¡ENVIAMOS EL RESULTADO DE ACCESO AL FRONTEND!
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

      const observedUserData = rawObservedUserData as {
        id: string;
        first_seen_at: string;
        last_seen_at: string;
        access_count: number;
        last_accessed_zones: string[];
        user_statuses_catalog: RelatedCatalogObject | null;
      } | null;

      if (observedFetchError || !observedUserData) {
        console.warn(
          `Matched observed user ID ${observedUserId} not found or error fetching details:`,
          observedFetchError,
        );
      } else {
        // Para usuarios observados, el acceso siempre es denegado por defecto
        hasAccess = false;

        const confidence = parseFloat(
          (1 - matchedObservedFace.distance).toFixed(4),
        );
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
        logEntry.decision = "access_denied"; // Siempre denegado para observados
        logEntry.reason =
          "Face matched with an observed (unregistered) user. Access denied by policy.";
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
              hasAccess: hasAccess, // ¡ENVIAMOS EL RESULTADO DE ACCESO AL FRONTEND! (será false)
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
    hasAccess = false; // Sin match, sin acceso

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
        hasAccess: hasAccess, // También enviamos hasAccess false si no hay match
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
    hasAccess = false; // Error en la función, sin acceso

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
      JSON.stringify({ error: errorMessage, hasAccess: hasAccess }), // También enviamos hasAccess false en caso de error
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
