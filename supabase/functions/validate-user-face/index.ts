// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "validate-user-face" started!');

// --- Definiciones de Tipos para Supabase Data ---
interface ItemWithNameAndId {
  id: string;
  name: string;
}

interface AccessZoneEntry {
  zones: ItemWithNameAndId;
}

interface SupabaseUserResponse {
  id: string;
  full_name: string;
  roles_catalog: ItemWithNameAndId | null;
  user_statuses_catalog: ItemWithNameAndId | null;
  user_zone_access: AccessZoneEntry[] | null;
}

interface ObservedUserFromDB {
  id: string;
  embedding: number[];
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[];
  status_id: string;
  alert_triggered: boolean;
  expires_at: string;
  potential_match_user_id: string | null;
  similarity?: number;
  distance?: number;
}

interface ValidateFacePayload {
  faceEmbedding: number[];
  zoneId?: string;
}

// Define la interfaz para el objeto de respuesta unificada
interface UnifiedValidationResponse {
  user: {
    id: string;
    full_name: string | null;
    user_type: "registered" | "observed" | "unknown";
    hasAccess: boolean;
    similarity: number;
    role_details: ItemWithNameAndId | null;
    status_details: ItemWithNameAndId;
    zones_accessed_details: ItemWithNameAndId[];

    observed_details?: {
      first_seen_at: string;
      last_seen_at: string;
      access_count: number;
      alert_triggered: boolean;
      expires_at: string;
      potential_match_user_id: string | null;
    };
  };
  type:
    | "registered_user_matched"
    | "observed_user_updated"
    | "new_observed_user_registered"
    | "no_match_found"
    | string;
  message?: string;
  error?: string;
}

// Define los umbrales de similitud.
const USER_MATCH_THRESHOLD = 0.5;
const OBSERVED_USER_UPDATE_THRESHOLD = 0.6;

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
  const requestedZoneId = payload.zoneId || null;
  const embedding_pgvector_format = `[${queryEmbedding.join(",")}]`;
  const now = new Date();

  const logEntry = {
    timestamp: now.toISOString(),
    user_id: null as string | null,
    camera_id: null as string | null,
    result: false,
    observed_user_id: null as string | null,
    user_type: "unknown" as string,
    vector_attempted: embedding_pgvector_format,
    match_status: "no_match" as string,
    decision: "access_denied" as string,
    reason: null as string | null,
    confidence_score: null as number | null,
    requested_zone_id: requestedZoneId,
  };

  try {
    // --- Carga de todos los catálogos para mapeo rápido ---
    const { data: allZones, error: zonesFetchError } = await supabase.from(
      "zones",
    ).select("id, name");
    const zoneMap = new Map<string, string>();
    if (allZones) {
      allZones.forEach((zone) => zoneMap.set(zone.id, zone.name));
    } else {
      console.error(
        "❌ ERROR: No se pudieron cargar las zonas:",
        zonesFetchError?.message,
      );
    }

    const { data: allUserStatuses, error: statusesFetchError } = await supabase
      .from("user_statuses_catalog").select("id, name");
    const userStatusMap = new Map<string, string>();
    if (allUserStatuses) {
      allUserStatuses.forEach((status) =>
        userStatusMap.set(status.id, status.name)
      );
    } else {
      console.error(
        "❌ ERROR: No se pudieron cargar los estatus de usuario:",
        statusesFetchError?.message,
      );
    }
    const activeTemporalStatusId = allUserStatuses?.find((s) =>
      s.name === "active_temporal"
    )?.id;
    if (!activeTemporalStatusId) {
      console.error(
        "❌ ERROR: 'active_temporal' status ID no encontrado en el catálogo.",
      );
      throw new Error("System Error: 'active_temporal' status ID not found.");
    }

    // --- 1. BÚSQUEDA DE USUARIOS REGISTRADOS en 'users' ---
    console.log(
      "Buscando coincidencia en usuarios registrados (public.users)...",
    );
    const { data: matchedUsers, error: usersSearchError } = await supabase.rpc(
      "match_face_embedding",
      {
        query_embedding: queryEmbedding,
        match_threshold: USER_MATCH_THRESHOLD,
        match_count: 1,
      },
    );

    if (usersSearchError) {
      console.error(
        "❌ ERROR RPC match_face_embedding:",
        usersSearchError.message,
      );
      logEntry.match_status = "rpc_error_users";
      logEntry.reason = `RPC Error (users search): ${usersSearchError.message}`;
      await supabase.from("logs").insert([logEntry]);
      throw new Error(
        `Failed to query registered users: ${usersSearchError.message}`,
      );
    }

    if (matchedUsers && matchedUsers.length > 0) {
      const matchedFace = matchedUsers[0];
      const userId = matchedFace.user_id;
      const confidence = parseFloat((1 - matchedFace.distance).toFixed(4));

      const { data: rawUserData, error: userFetchError } = await supabase
        .from("users")
        .select(`
            id,
            full_name,
            roles_catalog:roles_catalog(id, name),
            user_statuses_catalog:user_statuses_catalog(id, name),
            user_zone_access:user_zone_access(zones:zones(id, name))
        `)
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

      if (userFetchError || !rawUserData) {
        console.warn(
          `⚠️ ADVERTENCIA: Usuario registrado ID ${userId} encontrado por similitud pero no se pudieron obtener detalles o está eliminado:`,
          userFetchError,
        );
        logEntry.user_id = userId;
        logEntry.match_status = "matched_user_details_fail";
        logEntry.reason = `Matched user details not found or error: ${
          userFetchError?.message || "User not found/deleted"
        }`;
        logEntry.confidence_score = confidence;
        await supabase.from("logs").insert([logEntry]);
      } else {
        const userData = rawUserData as unknown as SupabaseUserResponse;

        const roleName = userData.roles_catalog?.name || "N/A";
        const statusName = userData.user_statuses_catalog?.name || "N/A";

        const userAccessZonesFlattened = (userData.user_zone_access || []).map(
          (uza) => uza.zones,
        );

        let isZoneAllowed = false;
        if (requestedZoneId && userAccessZonesFlattened.length > 0) {
          isZoneAllowed = userAccessZonesFlattened.some((zone) =>
            zone.id === requestedZoneId
          );
        }
        const allowedStatuses = ["active", "active_temporal"];
        const isStatusAllowed = allowedStatuses.includes(
          statusName.toLowerCase(),
        );
        const hasAccess = isZoneAllowed && isStatusAllowed;

        console.log(
          `✅ USUARIO REGISTRADO: ID ${userId}, Nombre: ${userData.full_name}, Rol: ${roleName}, Estatus: ${statusName}. Acceso a Zona ${requestedZoneId}: ${isZoneAllowed}. Estatus Permitido: ${isStatusAllowed}. Acceso Final: ${hasAccess}`,
        );

        logEntry.user_id = userData.id;
        logEntry.result = hasAccess;
        logEntry.user_type = "registered";
        logEntry.match_status = "matched_registered";
        logEntry.decision = hasAccess ? "access_granted" : "access_denied";
        logEntry.reason = hasAccess
          ? `Rostro coincidente y acceso concedido para la zona solicitada (${requestedZoneId}).`
          : `Rostro coincidente pero acceso denegado para la zona solicitada (${
            requestedZoneId || "N/A"
          }). Estatus de Usuario: ${statusName}, Acceso a Zona: ${isZoneAllowed}.`;
        logEntry.confidence_score = confidence;
        await supabase.from("logs").insert([logEntry]);

        // Construir la respuesta unificada para usuario registrado
        const unifiedResponse: UnifiedValidationResponse = {
          user: {
            id: userData.id,
            full_name: userData.full_name,
            user_type: "registered",
            hasAccess: hasAccess,
            similarity: confidence,
            role_details: userData.roles_catalog, // Ya es ItemWithNameAndId | null
            status_details: userData.user_statuses_catalog ||
              { id: "N/A", name: "N/A" }, // Asegurar objeto
            zones_accessed_details: userAccessZonesFlattened, // Ya es ItemWithNameAndId[]
          },
          type: "registered_user_matched",
          message: hasAccess ? "Access Granted." : "Access Denied.",
        };

        return new Response(
          JSON.stringify(unifiedResponse),
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

    // --- 2. SI NO HAY USUARIO REGISTRADO, BÚSQUEDA/GEstIÓN DE USUARIOS OBSERVADOS ---
    console.log(
      "No se encontró coincidencia con usuario registrado. Buscando en usuarios observados (public.observed_users)...",
    );
    const { data: matchedObservedUsers, error: observedSearchError } =
      await supabase.rpc("match_observed_face_embedding", {
        query_embedding: queryEmbedding,
        match_threshold: OBSERVED_USER_UPDATE_THRESHOLD,
        match_count: 1,
      });

    if (observedSearchError) {
      console.error(
        "❌ ERROR RPC match_observed_face_embedding:",
        observedSearchError.message,
      );
      logEntry.match_status = "rpc_error_observed";
      logEntry.reason =
        `RPC Error (observed users search): ${observedSearchError.message}`;
      await supabase.from("logs").insert([logEntry]);
      throw new Error(
        `Failed to query observed users: ${observedSearchError.message}`,
      );
    }

    const existingObservedUser = matchedObservedUsers?.[0] as
      | ObservedUserFromDB
      | undefined;

    let observedHasAccess = false;
    let observedUserStatusName: string = "N/A";
    let zonesAccessedDetails: ItemWithNameAndId[] = [];
    let observedSimilarity: number = 0;

    if (existingObservedUser) {
      // 2a. Usuario observado EXISTENTE encontrado, ACTUALIZAR su registro
      console.log(
        "🔄 PROCESAMIENTO: Usuario observado existente encontrado, actualizando registro:",
        existingObservedUser.id,
      );
      observedSimilarity = parseFloat(
        (1 - (existingObservedUser.distance || 0)).toFixed(4),
      );

      const newAccessCount = existingObservedUser.access_count + 1;
      const nowUpdate = new Date();
      const expiresAtUpdate = new Date(
        nowUpdate.getTime() + 24 * 60 * 60 * 1000,
      );

      const currentZones =
        Array.isArray(existingObservedUser.last_accessed_zones)
          ? existingObservedUser.last_accessed_zones
          : [];
      if (requestedZoneId && !currentZones.includes(requestedZoneId)) {
        currentZones.push(requestedZoneId);
      }

      const { data: updatedObserved, error: updateError } = await supabase
        .from("observed_users")
        .update({
          last_seen_at: nowUpdate.toISOString(),
          access_count: newAccessCount,
          last_accessed_zones: currentZones,
          expires_at: expiresAtUpdate.toISOString(),
        })
        .eq("id", existingObservedUser.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "❌ ERROR DB: Error al actualizar usuario observado:",
          updateError.message,
        );
        logEntry.observed_user_id = existingObservedUser.id;
        logEntry.result = false;
        logEntry.user_type = "observed";
        logEntry.match_status = "update_failed";
        logEntry.decision = "error";
        logEntry.reason = `Failed to update observed user (ID: ${
          existingObservedUser.id.substring(0, 8)
        }...): ${updateError.message}`;
        logEntry.confidence_score = observedSimilarity;
        await supabase.from("logs").insert([logEntry]);
        return new Response(JSON.stringify({ error: updateError.message }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }

      // Calcular observedHasAccess y obtener detalles para la respuesta
      observedUserStatusName = userStatusMap.get(updatedObserved.status_id) ||
        "N/A";
      zonesAccessedDetails = (updatedObserved.last_accessed_zones || [])
        .map((zoneId: string) => ({
          id: zoneId,
          name: zoneMap.get(zoneId) || "Unknown Zone",
        }));
      const isObservedUserActiveStatus = ["active", "active_temporal"].includes(
        observedUserStatusName.toLowerCase(),
      );
      const isObservedUserNotExpired =
        new Date() < new Date(updatedObserved.expires_at);
      observedHasAccess = isObservedUserActiveStatus &&
        isObservedUserNotExpired;

      logEntry.observed_user_id = updatedObserved.id;
      logEntry.result = true;
      logEntry.user_type = "observed";
      logEntry.match_status = "updated";
      logEntry.decision = observedHasAccess
        ? "access_granted"
        : "access_denied";
      logEntry.reason = `Usuario observado (ID: ${
        updatedObserved.id.substring(0, 8)
      }...) accedió a la zona ${requestedZoneId}. Conteo: ${newAccessCount}. Acceso: ${
        observedHasAccess ? "Granted" : "Denied"
      }.`;
      logEntry.confidence_score = observedSimilarity;
      await supabase.from("logs").insert([logEntry]);

      // Construir la respuesta unificada para usuario observado (actualizado)
      const unifiedResponse: UnifiedValidationResponse = {
        user: {
          id: updatedObserved.id,
          full_name: `Observed User ${updatedObserved.id.substring(0, 8)}`, // Nombre genérico
          user_type: "observed",
          hasAccess: observedHasAccess,
          similarity: observedSimilarity,
          role_details: null, // No aplica para usuarios observados
          status_details: {
            id: updatedObserved.status_id,
            name: observedUserStatusName,
          },
          zones_accessed_details: zonesAccessedDetails,
          observed_details: {
            first_seen_at: updatedObserved.first_seen_at,
            last_seen_at: updatedObserved.last_seen_at,
            access_count: updatedObserved.access_count,
            alert_triggered: updatedObserved.alert_triggered,
            expires_at: updatedObserved.expires_at,
            potential_match_user_id: updatedObserved.potential_match_user_id,
          },
        },
        type: "observed_user_updated",
        message: observedHasAccess
          ? "Access Granted (Observed User Updated)."
          : "Access Denied (Observed User Updated).",
      };

      return new Response(
        JSON.stringify(unifiedResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    } else {
      // 2b. No es un usuario registrado ni un usuario observado existente, CREAR nuevo registro
      console.log(
        "✨ PROCESAMIENTO: No se encontró usuario registrado ni observado existente. Creando nuevo registro.",
      );

      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data: newObserved, error: insertError } = await supabase
        .from("observed_users")
        .insert({
          embedding: embedding_pgvector_format,
          first_seen_at: now.toISOString(),
          last_seen_at: now.toISOString(),
          access_count: 1,
          last_accessed_zones: requestedZoneId ? [requestedZoneId] : [],
          status_id: activeTemporalStatusId,
          alert_triggered: false,
          expires_at: expiresAt.toISOString(),
          potential_match_user_id: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "❌ ERROR DB: Error al insertar nuevo usuario observado:",
          insertError.message,
        );
        logEntry.result = false;
        logEntry.user_type = "new_observed";
        logEntry.match_status = "insert_failed";
        logEntry.decision = "error";
        logEntry.reason =
          `Failed to insert new observed user: ${insertError.message}`;
        logEntry.confidence_score = 0;
        await supabase.from("logs").insert([logEntry]);
        return new Response(JSON.stringify({ error: insertError.message }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }

      // Calcular hasAccess y obtener detalles para la respuesta
      observedUserStatusName = userStatusMap.get(newObserved.status_id) ||
        "N/A";
      zonesAccessedDetails = (newObserved.last_accessed_zones || [])
        .map((zoneId: string) => ({
          id: zoneId,
          name: zoneMap.get(zoneId) || "Unknown Zone",
        }));
      const isNewObservedUserActiveStatus = ["active", "active_temporal"]
        .includes(observedUserStatusName.toLowerCase());
      const isNewObservedUserNotExpired =
        new Date() < new Date(newObserved.expires_at);
      observedHasAccess = isNewObservedUserActiveStatus &&
        isNewObservedUserNotExpired;

      logEntry.observed_user_id = newObserved.id;
      logEntry.result = true;
      logEntry.user_type = "new_observed";
      logEntry.match_status = "registered";
      logEntry.decision = observedHasAccess
        ? "access_granted"
        : "access_denied";
      logEntry.reason = `Nuevo usuario observado (ID: ${
        newObserved.id.substring(0, 8)
      }...) registrado en la zona ${requestedZoneId}. Acceso: ${
        observedHasAccess ? "Granted" : "Denied"
      }.`;
      logEntry.confidence_score = 0; // Para nuevos observados, la similitud inicial es 0 ya que no hubo match
      await supabase.from("logs").insert([logEntry]);

      // Construir la respuesta unificada para nuevo usuario observado
      const unifiedResponse: UnifiedValidationResponse = {
        user: {
          id: newObserved.id,
          full_name: `New Observed User ${newObserved.id.substring(0, 8)}`, // Nombre genérico
          user_type: "observed",
          hasAccess: observedHasAccess,
          similarity: 0, // No hay similitud directa para un nuevo registro sin match previo
          role_details: null, // No aplica
          status_details: {
            id: newObserved.status_id,
            name: observedUserStatusName,
          },
          zones_accessed_details: zonesAccessedDetails,
          observed_details: {
            first_seen_at: newObserved.first_seen_at,
            last_seen_at: newObserved.last_seen_at,
            access_count: newObserved.access_count,
            alert_triggered: newObserved.alert_triggered,
            expires_at: newObserved.expires_at,
            potential_match_user_id: newObserved.potential_match_user_id,
          },
        },
        type: "new_observed_user_registered",
        message: observedHasAccess
          ? "New Observed User Registered. Access Granted."
          : "New Observed User Registered. Access Denied.",
      };

      return new Response(
        JSON.stringify(unifiedResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  } catch (catchError: unknown) {
    let errorMessage = "An unexpected error occurred during facial validation.";
    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === "string") {
      errorMessage = catchError;
    }

    console.error(
      "🔥 ERROR CRÍTICO en Edge Function (sin manejar):",
      catchError,
    );

    logEntry.result = false;
    logEntry.decision = "error";
    logEntry.reason =
      `Validation failed due to unhandled internal error: ${errorMessage}`;
    logEntry.match_status = "unhandled_exception";
    const { error: logInsertError } = await supabase.from("logs").insert([
      logEntry,
    ]);
    if (logInsertError) {
      console.error(
        "Error al loggear error de validación no manejado:",
        logInsertError,
      );
    }

    // Respuesta unificada para errores
    const errorResponse: UnifiedValidationResponse = {
      user: {
        id: "N/A", // O algún ID de error
        full_name: "System Error",
        user_type: "unknown",
        hasAccess: false,
        similarity: 0,
        role_details: null,
        status_details: { id: "error", name: "Error" },
        zones_accessed_details: [],
      },
      type: "error",
      message: "An internal server error occurred during validation.",
      error: errorMessage,
    };

    return new Response(
      JSON.stringify(errorResponse),
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
