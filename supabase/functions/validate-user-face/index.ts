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

// Interfaz para la respuesta de Supabase ALINEADA CON LA VISTA SQL.
interface SupabaseUserResponse {
  id: string;
  full_name: string;
  role_details: ItemWithNameAndId | null;
  status_details: ItemWithNameAndId | null;
  zones_accessed_details: ItemWithNameAndId[];
}

interface ObservedUserFromDB {
  id: string;
  embedding: number[];
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null; // jsonb en SQL, deserializa a string[] en JS
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

// --- Definiciones de Tipos para la Respuesta Unificada ---
interface UnifiedValidationResponse {
  user: {
    id: string;
    full_name: string | null;
    user_type: "registered" | "observed" | "unknown";
    hasAccess: boolean;
    similarity: number;
    role_details: ItemWithNameAndId | null; // Nombres que usará la respuesta final
    status_details: ItemWithNameAndId; // Nombres que usará la respuesta final
    zones_accessed_details: ItemWithNameAndId[];

    observed_details?: {
      firstSeenAt: string;
      lastSeenAt: string;
      accessCount: number;
      alertTriggered: boolean;
      expiresAt: string;
      potentialMatchUserId: string | null;
      similarity: number;
      distance: number;
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

// --- Interfaz LogEntry AJUSTADA para que coincida con el esquema de public.logs ---
interface LogEntry {
  user_id: string | null;
  observed_user_id: string | null;
  camera_id: string | null;
  result: boolean;
  user_type: "registered" | "observed" | "new_observed" | "unknown" | null;
  vector_attempted: number[];
  match_status: string | null;
  decision: string;
  reason: string;
  confidence_score: number | null;
  requested_zone_id: string | null;
}

// --- NUEVAS INTERFACES Y GUARDAS DE TIPO PARA MANEJO DE ERRORES ---
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ErrorWithMessage).message === "string"
  );
}
// --- FIN DE NUEVAS INTERFACES Y GUARDAS DE TIPO ---

// Define los umbrales de similitud.
const USER_MATCH_THRESHOLD_DISTANCE = 0.5; // Para usuarios registrados (Umbral de distancia: menor es mejor)
const OBSERVED_USER_UPDATE_THRESHOLD_DISTANCE = 0.35; // Para usuarios observados (Umbral de distancia: más estricto)

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    },
  );

  const logEntry: LogEntry = {
    user_id: null,
    observed_user_id: null,
    camera_id: null,
    result: false,
    user_type: null,
    vector_attempted: [],
    match_status: null,
    decision: "unknown",
    reason: "function_started",
    confidence_score: null,
    requested_zone_id: null,
  };

  try {
    const { faceEmbedding, zoneId }: ValidateFacePayload = await req.json();
    logEntry.vector_attempted = faceEmbedding;
    logEntry.requested_zone_id = zoneId || null;

    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      logEntry.result = false;
      logEntry.decision = "error";
      logEntry.reason = "Missing or invalid faceEmbedding in request body.";
      logEntry.match_status = "invalid_input";

      const errorResponse: UnifiedValidationResponse = {
        user: {
          id: "N/A",
          full_name: "Client Error",
          user_type: "unknown",
          hasAccess: false,
          similarity: 0,
          role_details: null,
          status_details: { id: "error", name: "Invalid Input" },
          zones_accessed_details: [],
        },
        type: "client_error",
        message: "Missing or invalid faceEmbedding in request body.",
        error: logEntry.reason,
      };

      await supabase.from("logs").insert([logEntry]);
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    console.log("DEBUG: Incoming Query Embedding (frontend):", faceEmbedding);

    // --- 1. Intentar hacer match con usuarios registrados (public.users) ---
    console.log(
      "Buscando coincidencia en usuarios registrados (public.users)...",
    );

    // Usa RPC para match_user_face_embedding
    const { data: userData, error: userRpcError } = await supabase.rpc(
      "match_user_face_embedding",
      {
        query_embedding: faceEmbedding,
      },
    );

    if (userRpcError) {
      console.error("❌ ERROR RPC match_user_face_embedding:", userRpcError);
      throw userRpcError;
    }

    // Log para depurar la respuesta cruda de la RPC
    console.log(
      "DEBUG: Raw userData from match_user_face_embedding RPC:",
      userData,
    );

    let userMatchDetails: UnifiedValidationResponse["user"] | null = null;
    let matchSimilarity: number = 0;
    let userMatched = false;

    if (userData && userData.length > 0) {
      const matchedUser = userData[0];
      const actualDistance = matchedUser.distance || 0;

      console.log(
        `DEBUG: Closest registered user match found. ID: ${matchedUser.user_id}, Actual Distance: ${actualDistance}, Threshold: ${USER_MATCH_THRESHOLD_DISTANCE}`,
      );

      if (actualDistance <= USER_MATCH_THRESHOLD_DISTANCE) {
        userMatched = true;
        matchSimilarity = 1 - (actualDistance / 2);

        console.log(
          `DEBUG: Registered user matched! Similarity: ${matchSimilarity}`,
        );

        // CONSULTA A LA VISTA SQL para obtener todos los detalles del usuario
        const { data, error: fullUserError } = await supabase
          .from("user_full_details_view") // <-- ¡USANDO LA VISTA AQUÍ!
          .select(`
            id,
            full_name,
            role_details,          
            status_details,        
            zones_accessed_details 
          `)
          .eq("id", matchedUser.user_id)
          .maybeSingle();

        const fullUserData: SupabaseUserResponse | null = data as
          | SupabaseUserResponse
          | null;

        if (fullUserError) {
          console.error(
            "❌ ERROR fetching full user details from view:",
            fullUserError,
          );
          logEntry.result = false;
          logEntry.decision = "error";
          logEntry.reason =
            `Failed to fetch registered user details from view: ${fullUserError.message}`;
          logEntry.match_status = "registered_user_details_error_view";

          const errorResponse: UnifiedValidationResponse = {
            user: {
              id: matchedUser.user_id,
              full_name: "Error fetching details",
              user_type: "registered",
              hasAccess: false,
              similarity: matchSimilarity,
              role_details: null,
              status_details: { id: "error", name: "Error" },
              zones_accessed_details: [],
            },
            type: "registered_user_details_error",
            message: "Failed to fetch registered user details from view.",
            error: fullUserError.message,
          };

          await supabase.from("logs").insert([logEntry]);
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        // Manejo de fullUserData cuando es null (si .maybeSingle() no encontró nada)
        if (fullUserData) {
          userMatchDetails = {
            id: fullUserData.id,
            full_name: fullUserData.full_name,
            user_type: "registered",
            // Las propiedades role_details y status_details ya son objetos o null, no arrays
            hasAccess: (fullUserData.status_details?.name === "active" &&
              (fullUserData.zones_accessed_details?.some((z) =>
                z.id === zoneId
              ) ?? false)),
            similarity: matchSimilarity,
            role_details: fullUserData.role_details || null,
            status_details: fullUserData.status_details ||
              { id: "unknown", name: "Unknown" },
            zones_accessed_details: fullUserData.zones_accessed_details || [],
          };

          logEntry.user_id = matchedUser.user_id;
          logEntry.user_type = "registered";
          logEntry.confidence_score = matchSimilarity;
          logEntry.match_status = "registered_match";
          logEntry.decision = userMatchDetails.hasAccess
            ? "access_granted"
            : "access_denied";
          logEntry.reason = userMatchDetails.hasAccess
            ? `Registered user matched, access granted for zone: ${zoneId}`
            : `Registered user matched, but access denied for zone: ${zoneId} (Status: ${userMatchDetails.status_details.name}, Has Zone Access: ${
              userMatchDetails.zones_accessed_details.some((z) =>
                z.id === zoneId
              )
            })`;

          const successResponse: UnifiedValidationResponse = {
            user: userMatchDetails,
            type: userMatchDetails.hasAccess
              ? "registered_user_matched"
              : "registered_user_access_denied",
            message: userMatchDetails.hasAccess
              ? "Access Granted for Registered User."
              : "Access Denied for Registered User.",
          };

          await supabase.from("logs").insert([logEntry]);
          return new Response(JSON.stringify(successResponse), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } else {
          console.error(
            "❌ ERROR: Registered user found by embedding, but full user data (via .maybeSingle()) returned null from view. User ID:",
            matchedUser.user_id,
          );
          logEntry.result = false;
          logEntry.decision = "error";
          logEntry.reason =
            `Registered user ID ${matchedUser.user_id} found by embedding, but details were null from view.`;
          logEntry.match_status = "registered_user_details_null_view";

          const errorResponse: UnifiedValidationResponse = {
            user: {
              id: matchedUser.user_id,
              full_name: "Error retrieving details",
              user_type: "registered",
              hasAccess: false,
              similarity: matchSimilarity,
              role_details: null,
              status_details: { id: "error", name: "Error" },
              zones_accessed_details: [],
            },
            type: "registered_user_details_retrieval_error",
            message:
              "Could not retrieve full details for registered user from view.",
            error: logEntry.reason,
          };
          await supabase.from("logs").insert([logEntry]);
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      } else {
        console.log(
          `DEBUG: Closest registered user (ID: ${matchedUser.user_id}) found, but distance ${actualDistance} is ABOVE threshold ${USER_MATCH_THRESHOLD_DISTANCE}. Proceeding to observed users.`,
        );
      }
    } else {
      console.log(
        "DEBUG: No registered user found in public.faces table at all, or no embedding in database.",
      );
    }

    // --- 2. Si no hay match con usuario registrado válido, intentar con usuarios observados (public.observed_users) ---
    if (!userMatched) {
      console.log(
        "No se encontró coincidencia con usuario registrado. Buscando en usuarios observados (public.observed_users)...",
      );
      // La llamada RPC para observed_users se mantiene usando RPC
      const { data: observedUserData, error: observedUserRpcError } =
        await supabase.rpc("match_observed_face_embedding", {
          query_embedding: faceEmbedding,
        });

      if (observedUserRpcError) {
        console.error(
          "❌ ERROR RPC match_observed_face_embedding:",
          observedUserRpcError,
        );
        throw observedUserRpcError;
      }

      if (observedUserData && observedUserData.length > 0) {
        const matchedObservedUser: ObservedUserFromDB = observedUserData[0];
        const observedActualDistance = matchedObservedUser.distance || 0;

        console.log(
          `DEBUG: Closest observed user match found. ID: ${matchedObservedUser.id}, Actual Distance: ${observedActualDistance}, Threshold: ${OBSERVED_USER_UPDATE_THRESHOLD_DISTANCE}`,
        );

        if (observedActualDistance <= OBSERVED_USER_UPDATE_THRESHOLD_DISTANCE) {
          console.log(
            `🔄 PROCESAMIENTO: Usuario observado existente encontrado, actualizando registro: ${matchedObservedUser.id}`,
          );
          console.log(
            "DEBUG: Observed User RPC Result (raw):",
            matchedObservedUser,
          );
          matchSimilarity = 1 - (observedActualDistance / 2);

          logEntry.observed_user_id = matchedObservedUser.id;
          logEntry.user_id = null;
          logEntry.user_type = "observed";
          logEntry.confidence_score = matchSimilarity;

          const { data: updatedObservedUser, error: updateError } =
            await supabase.from("observed_users")
              .update({
                last_seen_at: new Date().toISOString(),
                access_count: matchedObservedUser.access_count + 1,
                last_accessed_zones: matchedObservedUser.last_accessed_zones
                  ? [
                    ...new Set([
                      ...matchedObservedUser.last_accessed_zones,
                      zoneId || "",
                    ]),
                  ]
                  : (zoneId ? [zoneId] : []),
              })
              .eq("id", matchedObservedUser.id)
              .select("*")
              .single();

          if (updateError) {
            console.error(
              "❌ ERROR al actualizar usuario observado:",
              updateError,
            );
            throw updateError;
          }

          logEntry.result = true;
          logEntry.decision = "access_granted";
          logEntry.reason = `Observed user updated for zone: ${zoneId}`;
          logEntry.match_status = "observed_user_updated";

          const { data: statusDetailsResult, error: statusError } =
            await supabase
              .from("user_statuses_catalog")
              .select("id, name")
              .eq("id", updatedObservedUser.status_id) // <-- CAMBIO CLAVE: Usamos el ID del estatus actual del usuario
              .single();

          const statusDetails: ItemWithNameAndId | null = statusDetailsResult;

          if (statusError) {
            console.error("Error fetching observed user status:", statusError);
          }

          // --- CAMBIO CLAVE AQUÍ: Obtener nombres reales de las zonas para Observed Users ---
          let zonesAccessedDetails: ItemWithNameAndId[] = [];
          if (
            updatedObservedUser.last_accessed_zones &&
            updatedObservedUser.last_accessed_zones.length > 0
          ) {
            const { data: zoneNamesData, error: zoneNamesError } =
              await supabase
                .from("zones")
                .select("id, name")
                .in("id", updatedObservedUser.last_accessed_zones);

            if (zoneNamesError) {
              console.error(
                "Error fetching zone names for observed user:",
                zoneNamesError,
              );
            } else {
              zonesAccessedDetails = zoneNamesData || [];
            }
          }
          // --- FIN CAMBIO CLAVE ---

          const successResponse: UnifiedValidationResponse = {
            user: {
              id: updatedObservedUser.id,
              full_name: null, // Los observados no tienen full_name en la BD
              user_type: "observed",
              hasAccess: true,
              similarity: matchSimilarity,
              role_details: null, // Los observados no tienen roles
              status_details: statusDetails ||
                { id: "unknown", name: "Unknown" },
              zones_accessed_details: zonesAccessedDetails, // Usar los nombres reales
              observed_details: {
                firstSeenAt: updatedObservedUser.first_seen_at,
                lastSeenAt: updatedObservedUser.last_seen_at,
                accessCount: updatedObservedUser.access_count,
                alertTriggered: updatedObservedUser.alert_triggered,
                expiresAt: updatedObservedUser.expires_at,
                potentialMatchUserId:
                  updatedObservedUser.potential_match_user_id,
                similarity: 1.0,
                distance: 0,
              },
            },
            type: "observed_user_updated",
            message: "Access Granted (Observed User Updated).",
          };

          await supabase.from("logs").insert([logEntry]);

          return new Response(JSON.stringify(successResponse), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } else {
          console.log(
            `DEBUG: Closest observed user (ID: ${matchedObservedUser.id}) found, but distance ${observedActualDistance} is ABOVE threshold ${OBSERVED_USER_UPDATE_THRESHOLD_DISTANCE}. Proceeding to create new observed user.`,
          );
        }
      }

      // --- 3. Si no se encontró ningún match (ni registrado ni observado existente), registrar como nuevo usuario observado ---
      console.log(
        "✨ PROCESAMIENTO: No se encontró usuario registrado ni observado existente. Creando nuevo registro.",
      );

      const { data: observedStatusResult, error: statusError } = await supabase
        .from("user_statuses_catalog")
        .select("id, name")
        .eq("name", "active_temporal") // Usamos 'active_temporal' en minúsculas como acordamos
        .single();

      const observedStatus: ItemWithNameAndId | null = observedStatusResult;

      if (statusError || !observedStatus) {
        logEntry.result = false;
        logEntry.decision = "error";
        logEntry.reason =
          "Missing 'active_temporal' status in user_statuses_catalog. Please create it in your DB.";
        logEntry.match_status = "status_catalog_error";
        await supabase.from("logs").insert([logEntry]);
        throw new Error(logEntry.reason);
      }

      const newObservedUser = {
        embedding: faceEmbedding,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        access_count: 1,
        last_accessed_zones: zoneId ? [zoneId] : [],
        status_id: observedStatus.id,
        alert_triggered: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        potential_match_user_id: null,
      };

      const { data: createdObservedUser, error: insertError } = await supabase
        .from("observed_users")
        .insert([newObservedUser])
        .select("*")
        .single();

      if (insertError) {
        console.error(
          "❌ ERROR al insertar nuevo usuario observado:",
          insertError,
        );
        throw insertError;
      }

      logEntry.observed_user_id = createdObservedUser.id;
      logEntry.user_id = null;
      logEntry.user_type = "new_observed";
      logEntry.confidence_score = 1.0;

      logEntry.result = true;
      logEntry.decision = "access_granted";
      logEntry.reason = `New observed user registered for zone: ${zoneId}`;
      logEntry.match_status = "new_observed_user_registered";

      const { data: newStatusDetailsResult, error: newStatusError } =
        await supabase
          .from("user_statuses_catalog")
          .select("id, name")
          .eq("id", createdObservedUser.status_id)
          .single();

      const newStatusDetails: ItemWithNameAndId | null = newStatusDetailsResult;

      if (newStatusError) {
        console.error(
          "Error fetching new observed user status:",
          newStatusError,
        );
      }

      // --- CAMBIO CLAVE AQUÍ: Obtener nombres reales de las zonas para Newly Observed Users ---
      let newZonesAccessedDetails: ItemWithNameAndId[] = [];
      if (
        createdObservedUser.last_accessed_zones &&
        createdObservedUser.last_accessed_zones.length > 0
      ) {
        const { data: newZoneNamesData, error: newZoneNamesError } =
          await supabase
            .from("zones")
            .select("id, name")
            .in("id", createdObservedUser.last_accessed_zones);

        if (newZoneNamesError) {
          console.error(
            "Error fetching zone names for new observed user:",
            newZoneNamesError,
          );
        } else {
          newZonesAccessedDetails = newZoneNamesData || [];
        }
      }
      // --- FIN CAMBIO CLAVE ---

      const successResponse: UnifiedValidationResponse = {
        user: {
          id: createdObservedUser.id,
          full_name: null, // Los observados no tienen full_name en la BD
          user_type: "observed",
          hasAccess: true,
          similarity: 1.0,
          role_details: null, // Los observados no tienen roles
          status_details: newStatusDetails ||
            { id: "unknown", name: "Unknown" },
          zones_accessed_details: newZonesAccessedDetails, // Usar los nombres reales
          observed_details: {
            firstSeenAt: createdObservedUser.first_seen_at,
            lastSeenAt: createdObservedUser.last_seen_at,
            accessCount: createdObservedUser.access_count,
            alertTriggered: createdObservedUser.alert_triggered,
            expiresAt: createdObservedUser.expires_at,
            potentialMatchUserId: createdObservedUser.potential_match_user_id,
            similarity: 1.0,
            distance: 0,
          },
        },
        type: "new_observed_user_registered",
        message: "New Observed User Registered. Access Granted.",
      };

      await supabase.from("logs").insert([logEntry]);

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // --- Si no se encontró ningún tipo de match (ni registrado ni observado), se envía esta respuesta ---
    logEntry.result = false;
    logEntry.decision = "access_denied";
    logEntry.reason =
      "No registered or observed user matched the face embedding within thresholds.";
    logEntry.match_status = "no_match_found";

    const noMatchResponse: UnifiedValidationResponse = {
      user: {
        id: "N/A",
        full_name: "No Match",
        user_type: "unknown",
        hasAccess: false,
        similarity: 0,
        role_details: null,
        status_details: { id: "no_match", name: "No Match" },
        zones_accessed_details: [],
      },
      type: "no_match_found",
      message: "No registered or observed user found matching the face.",
    };

    await supabase.from("logs").insert([logEntry]);
    return new Response(JSON.stringify(noMatchResponse), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (catchError: unknown) {
    let errorMessage = "An unknown error occurred.";

    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === "string") {
      errorMessage = catchError;
    } else if (isErrorWithMessage(catchError)) {
      errorMessage = catchError.message;
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

    const { error: finalLogInsertError } = await supabase.from("logs").insert([
      logEntry,
    ]);
    if (finalLogInsertError) {
      console.error(
        "Error al loggear error de validación no manejado (final catch):",
        finalLogInsertError,
      );
    }

    const errorResponse: UnifiedValidationResponse = {
      user: {
        id: "N/A",
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
