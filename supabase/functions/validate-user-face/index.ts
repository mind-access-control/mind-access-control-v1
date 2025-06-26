// Importar las dependencias necesarias.
// 'serve' es para crear un servidor HTTP básico en Deno.
// 'createClient' es el cliente de Supabase para interactuar con tu proyecto.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "validate-user-face" started!');

// --- Definiciones de Tipos para Supabase Data ---
// Interfaz para elementos con ID y nombre (ej. estados, zonas, roles).
interface ItemWithNameAndId {
  id: string;
  name: string;
}

// Interfaz para la respuesta de Supabase ALINEADA CON LA VISTA SQL 'user_full_details_view'.
interface SupabaseUserResponse {
  id: string;
  full_name: string;
  role_details: ItemWithNameAndId | null;
  status_details: ItemWithNameAndId | null;
  zones_accessed_details: ItemWithNameAndId[];
}

// Interfaz para un usuario observado tal como se recupera de la base de datos 'observed_users'.
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
  similarity?: number; // Añadido por la función RPC match_observed_face_embedding
  distance?: number; // Añadido por la función RPC match_observed_face_embedding
  face_image_url: string | null;
  ai_action: string | null;
}

// Interfaz para el payload de actualización de un usuario observado existente.
interface ObservedUserUpdatePayload {
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null;
  status_id?: string; // Opcional para actualizaciones, ya que no siempre se cambia el estado
  face_image_url?: string | null; // Opcional para actualizaciones, si se sube una nueva imagen
  ai_action?: string | null; // Opcional para actualizaciones, si se genera una nueva sugerencia de IA
}

// Interfaz para el payload de inserción de un NUEVO usuario observado.
// Incluye 'embedding' que no está en el payload de actualización.
interface NewObservedUserInsertPayload {
  embedding: number[];
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null;
  status_id: string;
  alert_triggered: boolean;
  expires_at: string;
  potential_match_user_id: string | null;
  face_image_url?: string | null; // Opcional, puede ser null al inicio y luego actualizado
  ai_action?: string | null; // Opcional, puede ser null al inicio y luego generado
}

// Interfaz para los datos de entrada de la petición a esta Edge Function.
interface ValidateFacePayload {
  faceEmbedding: number[];
  zoneId?: string; // ID de la zona a la que se intenta acceder (opcional)
  imageData?: string; // La imagen en Base64 (opcional, para subirla si no existe o actualizarla)
}

// --- Definiciones de Tipos para la Respuesta Unificada al Frontend ---
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
      firstSeenAt: string;
      lastSeenAt: string;
      accessCount: number;
      alertTriggered: boolean;
      expiresAt: string;
      potentialMatchUserId: string | null;
      similarity: number;
      distance: number;
      faceImageUrl: string | null;
      aiAction: string | null; // Incluye la sugerencia de IA
    };
  };
  type:
    | "registered_user_matched"
    | "observed_user_updated"
    | "new_observed_user_registered"
    | "no_match_found"
    | "registered_user_access_denied"
    | "observed_user_access_denied_expired"
    | "observed_user_access_denied_status_expired"
    | "observed_user_access_denied_blocked"
    | "observed_user_access_denied_other_status"
    | string; // Para tipos de respuesta no definidos explícitamente
  message?: string;
  error?: string;
}

// --- Interfaz LogEntry para el registro de eventos en 'public.logs' ---
interface LogEntry {
  user_id: string | null;
  observed_user_id: string | null;
  camera_id: string | null; // Asumiendo que camera_id podría venir en el futuro
  result: boolean;
  user_type: "registered" | "observed" | "new_observed" | "unknown" | null;
  vector_attempted: number[];
  match_status: string | null;
  decision: "unknown" | "access_granted" | "access_denied" | "error";
  reason: string;
  confidence_score: number | null;
  requested_zone_id: string | null;
}

// Interfaz auxiliar para manejar errores con una propiedad 'message'.
interface ErrorWithMessage {
  message: string;
}

// Función de guardia para TypeScript para verificar si un error tiene una propiedad 'message'.
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ErrorWithMessage).message === "string"
  );
}

// Define los umbrales de similitud para las funciones RPC de PostGIS.
const USER_MATCH_THRESHOLD_DISTANCE = 0.5; // Umbral para match con usuarios registrados
const OBSERVED_USER_UPDATE_THRESHOLD_DISTANCE = 0.35; // Umbral para actualizar un usuario observado existente

// --- Función interna para subir imagen a Supabase Storage y actualizar la DB ---
// Llama a otra Edge Function ('upload-face-image') para manejar la subida.
async function uploadImageToStorageAndDb(
  userId: string,
  imageData: string,
  isObservedUser: boolean,
  supabaseUrl: string,
  _supabaseAnonKey: string, // No usado directamente aquí, pero útil para consistencia si se necesitara.
  serviceRoleKey: string,
): Promise<{ imageUrl: string | null; error: string | null }> {
  try {
    // URL de la Edge Function 'upload-face-image'.
    const uploadFunctionUrl = `${supabaseUrl}/functions/v1/upload-face-image`;

    const uploadResponse = await fetch(uploadFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // La clave de servicio es necesaria para que esta EF pueda llamar a otra EF con privilegios.
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey, // Algunas configuraciones de Supabase también requieren 'apikey'
      },
      body: JSON.stringify({ userId, imageData, isObservedUser }),
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error(
        "Error calling upload-face-image EF:",
        uploadResult.error ||
          "Unknown error during image upload via internal EF.",
      );
      return {
        imageUrl: null,
        error: uploadResult.error || "Failed to upload image via internal EF.",
      };
    }

    console.log("Image upload via EF successful:", uploadResult.imageUrl);
    return { imageUrl: uploadResult.imageUrl, error: null };
  } catch (err) {
    let errorMessage = "Failed to call internal image upload EF.";
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === "string") {
      errorMessage = err;
    }
    console.error("Exception calling internal upload-face-image EF:", err);
    return { imageUrl: null, error: errorMessage };
  }
}

// --- Función para generar sugerencias de acción con IA (Gemini API) ---
// Utiliza la imagen del rostro y el contexto del usuario para generar una sugerencia concisa.
async function generateAISuggestion(
  faceImageData: string | null,
  context: {
    type: "new" | "existing"; // Indica si es un usuario nuevo o existente
    userId?: string;
    statusName?: string;
    expiresAt?: string; // Fecha de expiración (puede ser undefined o null)
    zonesAccessed?: ItemWithNameAndId[]; // Zonas previamente accedidas
  },
): Promise<string | null> {
  // Si no hay datos de imagen, no se puede generar una sugerencia de IA visual.
  if (!faceImageData) {
    console.log(
      "No image data provided for AI suggestion. Skipping AI generation.",
    );
    return null;
  }

  // Obtener la API Key de Gemini desde las variables de entorno de Deno/Supabase.
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error(
      "GEMINI_API_KEY is not set in environment variables. AI suggestion will not be generated.",
    );
    return "AI suggestion failed: API Key missing.";
  }

  // --- CORRECCIÓN CLAVE AQUÍ: Quitar el prefijo 'data:image/jpeg;base64,' ---
  const base64Data = faceImageData.startsWith("data:image/")
    ? faceImageData.split(",")[1]
    : faceImageData;
  // --- FIN CORRECCIÓN ---

  // URL de la API de Gemini (usando gemini-2.0-flash para eficiencia).
  const apiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let prompt = "";
  // Construir el prompt basado en el tipo de usuario (nuevo o existente) y su contexto.
  if (context.type === "new") {
    prompt =
      "A new observed user has been detected. Based on the provided face image, what immediate action or assessment would you suggest for this user in an access control system? Keep it concise (max 15 words) and action-oriented. Examples: 'Review for permanent access', 'Monitor closely for unusual activity', 'Categorize as visitor'.";
  } else { // existing user
    prompt = `An existing observed user (ID: ${
      context.userId || "N/A"
    }) has been detected. Their current status is '${
      context.statusName || "unknown"
    }'. Their access is set to expire on '${
      context.expiresAt || "N/A"
    }'. They have previously accessed zones: ${
      context.zonesAccessed?.map((z) => z.name).join(", ") || "None"
    }. Based on their face image and this context, what AI action would you suggest for this user in an access control system? Keep it concise (max 20 words) and action-oriented. Examples: 'Extend temporal access', 'Block access immediately', 'Re-evaluate status'.`;
  }

  // Payload para la API de Gemini, incluyendo el prompt y la imagen en Base64.
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg", // Asume que la imagen es JPEG
              data: base64Data, // Usamos la cadena Base64 limpia aquí
            },
          },
        ],
      },
    ],
  };

  try {
    // Realizar la llamada a la API de Gemini.
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // Verificar si la respuesta contiene una sugerencia válida.
    if (
      result.candidates && result.candidates.length > 0 &&
      result.candidates[0].content && result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const suggestion = result.candidates[0].content.parts[0].text;
      console.log("AI Suggestion generated:", suggestion);
      return suggestion;
    } else {
      // Registrar si la IA no devolvió una sugerencia válida (ej. por filtros de seguridad).
      console.warn(
        "AI did not return a valid suggestion. Response:",
        JSON.stringify(result),
      );
      // Si hay un error detallado de Gemini (ej. bloqueo por seguridad), se puede incluir en el retorno.
      if (result.error && result.error.message) {
        return `AI suggestion blocked: ${
          result.error.message.substring(0, 50)
        }...`;
      }
      return "No AI suggestion available.";
    }
  } catch (err) {
    console.error("Error calling Gemini API for AI suggestion:", err);
    return `AI suggestion failed: ${
      isErrorWithMessage(err) ? err.message : "Unknown error"
    }`;
  }
}

// --- Función principal que maneja las peticiones HTTP ---
serve(async (req: Request): Promise<Response> => {
  // Configuración de CORS para solicitudes OPTIONS (preflight).
  if (req.method === "OPTIONS") {
    console.log(
      "DEBUG: Handling OPTIONS preflight request for validate-user-face",
    );
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permite cualquier origen (ajustar en producción)
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type", // Cabeceras permitidas
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Métodos permitidos
      },
    });
  }

  // Inicializar clientes de Supabase.
  // 'supabaseAdmin' usa la clave de rol de servicio para operaciones con privilegios (ej. inserts, updates).
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      },
    },
  );

  // 'supabase' usa la clave anónima y el JWT del cliente para operaciones con RLS.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    },
  );

  // --- Obtener el catálogo de estados y IDs relevantes una vez al inicio ---
  // Se usa supabaseAdminInit (cliente con service_role_key y sin persistencia de sesión) para asegurar la obtención.
  const supabaseAdminInit = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  const { data: allStatusCatalog, error: statusCatalogError } =
    await supabaseAdminInit.from("user_statuses_catalog").select("id, name");

  const statusNameMap = new Map<string, string>();
  let activeTemporalId: string | undefined;
  let expiredStatusId: string | undefined;
  let blockedStatusId: string | undefined;
  let inReviewAdminStatusId: string | undefined;

  if (statusCatalogError || !allStatusCatalog) {
    console.error(
      "❌ ERROR fetching all user_statuses_catalog at init:",
      statusCatalogError || "No data returned for status catalog.",
    );
    // Si no se pueden cargar los estados, la función debería lanzar un error fatal
    // o manejarlo de forma que no cause errores posteriores por IDs indefinidos.
    // Para esta versión, si los IDs esenciales no se cargan, lanzamos un error explícito.
    throw new Error(
      "Failed to load user status catalog. Essential IDs are missing.",
    );
  } else {
    allStatusCatalog.forEach((s) => statusNameMap.set(s.id, s.name));
    activeTemporalId = allStatusCatalog.find((s) =>
      s.name === "active_temporal"
    )?.id;
    expiredStatusId = allStatusCatalog.find((s) => s.name === "expired")?.id;
    blockedStatusId = allStatusCatalog.find((s) => s.name === "blocked")?.id;
    inReviewAdminStatusId = allStatusCatalog.find((s) =>
      s.name === "in_review_admin"
    )?.id;

    // Verificar que los IDs esenciales se encontraron.
    if (
      !activeTemporalId || !expiredStatusId || !blockedStatusId ||
      !inReviewAdminStatusId
    ) {
      console.error(
        "❌ ERROR: One or more essential status IDs (active_temporal, expired, blocked, in_review_admin) not found in user_statuses_catalog.",
      );
      throw new Error("Missing essential status IDs in user_statuses_catalog.");
    }
  }
  // --- Fin de obtención del catálogo de estados ---

  // Inicializar el objeto de log para registrar eventos de la función.
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
    // Parsear el payload JSON de la petición.
    const { faceEmbedding, zoneId, imageData }: ValidateFacePayload = await req
      .json();
    logEntry.vector_attempted = faceEmbedding;
    logEntry.requested_zone_id = zoneId || null;

    // Validación básica de la entrada.
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

    // Llamada a la función RPC de PostGIS para encontrar el usuario registrado más cercano.
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

    console.log(
      "DEBUG: Raw userData from match_user_face_embedding RPC:",
      userData,
    );

    let userMatchDetails: UnifiedValidationResponse["user"] | null = null;
    let matchSimilarity: number = 0;
    let userMatched = false;

    if (userData && userData.length > 0) {
      const matchedUser = userData[0]; // El usuario más cercano según la distancia.
      const actualDistance = matchedUser.distance || 0;

      console.log(
        `DEBUG: Closest registered user match found. ID: ${matchedUser.user_id}, Actual Distance: ${actualDistance}, Threshold: ${USER_MATCH_THRESHOLD_DISTANCE}`,
      );

      // Si la distancia está dentro del umbral, consideramos que es un match.
      if (actualDistance <= USER_MATCH_THRESHOLD_DISTANCE) {
        userMatched = true;
        matchSimilarity = 1 - (actualDistance / 2); // Calcular similitud (0 a 1).

        console.log(
          `DEBUG: Registered user matched! Similarity: ${matchSimilarity}`,
        );

        // Obtener detalles completos del usuario registrado desde la vista.
        const { data, error: fullUserError } = await supabase.from(
          "user_full_details_view",
        )
          .select(`
            id,
            full_name,
            role_details,          
            status_details,        
            zones_accessed_details 
          `)
          .eq("id", matchedUser.user_id)
          .maybeSingle(); // Usar maybeSingle para manejar casos donde no se encuentre.

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

        if (fullUserData) {
          // Determinar si el usuario registrado tiene acceso.
          const hasAccess = fullUserData.status_details?.name === "active" &&
            (fullUserData.zones_accessed_details?.some((z) =>
              z.id === zoneId
            ) ?? false);

          userMatchDetails = {
            id: fullUserData.id,
            full_name: fullUserData.full_name,
            user_type: "registered",
            hasAccess: hasAccess,
            similarity: matchSimilarity,
            role_details: fullUserData.role_details || null,
            status_details: fullUserData.status_details ||
              { id: "unknown", name: "Unknown" },
            zones_accessed_details: fullUserData.zones_accessed_details || [],
          };

          // Registrar el evento en los logs.
          logEntry.user_id = matchedUser.user_id;
          logEntry.user_type = "registered";
          logEntry.confidence_score = matchSimilarity;
          logEntry.match_status = "registered_match";
          logEntry.decision = hasAccess ? "access_granted" : "access_denied";
          logEntry.reason = hasAccess
            ? `Registered user matched, access granted for zone: ${zoneId}`
            : `Registered user matched, but access denied for zone: ${zoneId} (Status: ${userMatchDetails.status_details.name}, Has Zone Access: ${
              userMatchDetails.zones_accessed_details.some((z) =>
                z.id === zoneId
              )
            })`;

          const successResponse: UnifiedValidationResponse = {
            user: userMatchDetails,
            type: hasAccess
              ? "registered_user_matched"
              : "registered_user_access_denied",
            message: hasAccess
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
          // Caso borde: Usuario encontrado por embedding pero no por la vista (problema de datos).
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
        // La similitud con el usuario registrado es baja, continuar buscando en usuarios observados.
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
      // Llamada a la función RPC para encontrar el usuario observado más cercano.
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

        // Si la distancia está dentro del umbral de actualización.
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
          logEntry.user_id = null; // Asegurarse de que user_id sea null para usuarios observados.
          logEntry.user_type = "observed";
          logEntry.confidence_score = matchSimilarity;

          const nowUtc = new Date();
          const expiresAtDate = new Date(matchedObservedUser.expires_at);

          let observedUserHasAccess = false;
          let accessDeniedReason = "Access Denied (Unknown Reason).";
          let responseType: UnifiedValidationResponse["type"] =
            "observed_user_access_denied_other_status";
          let responseMessage = "Access Denied.";

          // --- LÓGICA DE ACCESO PARA USUARIOS OBSERVADOS ---
          // Solo si el estado es 'active_temporal' Y la fecha de expiración no ha pasado.
          if (
            matchedObservedUser.status_id === activeTemporalId &&
            expiresAtDate >= nowUtc
          ) {
            observedUserHasAccess = true;
            accessDeniedReason = `Observed user updated for zone: ${zoneId}`;
            responseType = "observed_user_updated";
            responseMessage = "Access Granted (Observed User Updated).";
            console.log(
              `DEBUG: Observed user ${matchedObservedUser.id} access granted (active_temporal & not expired).`,
            );
          } else if (matchedObservedUser.status_id === blockedStatusId) {
            accessDeniedReason = `Access Denied: User is blocked.`;
            responseType = "observed_user_access_denied_blocked";
            responseMessage = "Access Denied (Observed User Blocked).";
            console.log(
              `DEBUG: Observed user ${matchedObservedUser.id} access denied due to blocked status.`,
            );
          } else if (
            expiresAtDate < nowUtc ||
            matchedObservedUser.status_id === expiredStatusId
          ) {
            accessDeniedReason =
              `Access Denied: Access expired or status is expired.`;
            responseType = "observed_user_access_denied_expired";
            responseMessage =
              "Access Denied (Observed User Expired/Status Expired).";
            console.log(
              `DEBUG: Observed user ${matchedObservedUser.id} access denied due to expired_at or expired status.`,
            );
          } else if (matchedObservedUser.status_id === inReviewAdminStatusId) {
            accessDeniedReason = `Access Denied: User is in review by admin.`;
            responseType = "observed_user_access_denied_other_status";
            responseMessage = "Access Denied (User in Review).";
            console.log(
              `DEBUG: Observed user ${matchedObservedUser.id} access denied due to in_review_admin status.`,
            );
          } else {
            accessDeniedReason =
              `Access Denied: Invalid status for access: ${matchedObservedUser.status_id}.`;
            responseType = "observed_user_access_denied_other_status";
            responseMessage = "Access Denied (Invalid Status).";
            console.log(
              `DEBUG: Observed user ${matchedObservedUser.id} access denied due to unknown or invalid status.`,
            );
          }
          // --- FIN DE LÓGICA DE ACCESO ---

          const updatePayload: ObservedUserUpdatePayload = {
            last_seen_at: new Date().toISOString(),
            access_count: matchedObservedUser.access_count + 1,
            // Filtrar zoneId para añadirlo solo si es una cadena no vacía.
            last_accessed_zones: (() => {
              const existingZones = matchedObservedUser.last_accessed_zones ||
                [];
              const updatedZones = new Set(existingZones);
              if (zoneId && zoneId.trim() !== "") {
                updatedZones.add(zoneId);
              }
              return Array.from(updatedZones);
            })(),
          };

          // Actualizar el status_id en el payload de actualización si es necesario.
          let newStatusIdForUpdate: string | undefined = undefined;
          if (!observedUserHasAccess) {
            if (
              (expiresAtDate < nowUtc &&
                matchedObservedUser.status_id !== expiredStatusId) ||
              matchedObservedUser.status_id === expiredStatusId
            ) {
              newStatusIdForUpdate = expiredStatusId;
            } else if (matchedObservedUser.status_id === blockedStatusId) {
              newStatusIdForUpdate = blockedStatusId;
            } else if (
              matchedObservedUser.status_id === inReviewAdminStatusId
            ) {
              newStatusIdForUpdate = inReviewAdminStatusId;
            }
          } else {
            if (matchedObservedUser.status_id !== activeTemporalId) {
              newStatusIdForUpdate = activeTemporalId;
            }
          }
          if (newStatusIdForUpdate) {
            updatePayload.status_id = newStatusIdForUpdate;
          }

          // --- Lógica para cargar/actualizar la URL de la imagen y generar sugerencia AI ---
          let uploadedImageUrl: string | null =
            matchedObservedUser.face_image_url;
          let aiActionSuggestion: string | null = matchedObservedUser.ai_action;

          if (imageData && matchedObservedUser.id) {
            console.log(
              `Attempting to upload new image for existing observed user: ${matchedObservedUser.id}`,
            );
            const { imageUrl, error: uploadImageError } =
              await uploadImageToStorageAndDb(
                matchedObservedUser.id,
                imageData,
                true, // Es un usuario observado
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_ANON_KEY") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
              );

            if (uploadImageError) {
              console.error(
                `Warning: Failed to upload new image for observed user ${matchedObservedUser.id}: ${uploadImageError}`,
              );
            } else if (imageUrl) {
              uploadedImageUrl = imageUrl;
              updatePayload.face_image_url = uploadedImageUrl; // Actualizar el payload con la nueva URL
              console.log(
                `Successfully uploaded new image for observed user ${matchedObservedUser.id}: ${uploadedImageUrl}`,
              );

              // Obtener nombres de zonas para el contexto de la IA.
              const { data: zonesData, error: zonesError } = await supabase
                .from("zones").select("id, name").in(
                  "id",
                  (updatePayload.last_accessed_zones || []).filter((
                    id: string,
                  ) => id.trim() !== ""),
                );

              if (zonesError) {
                console.error(
                  "Error fetching zones for AI suggestion context (existing user):",
                  zonesError,
                );
              }

              // Generar sugerencia de AI.
              aiActionSuggestion = await generateAISuggestion(
                imageData, // Pasamos la imagen original con prefijo para que la función la limpie.
                {
                  type: "existing",
                  userId: matchedObservedUser.id,
                  statusName: statusNameMap.get(
                    updatePayload.status_id || matchedObservedUser.status_id,
                  ),
                  expiresAt:
                    (updatePayload.status_id === expiredStatusId ||
                        !matchedObservedUser.expires_at)
                      ? undefined
                      : matchedObservedUser.expires_at,
                  zonesAccessed: zonesData || [],
                },
              );
              if (aiActionSuggestion) {
                updatePayload.ai_action = aiActionSuggestion; // Actualizar el payload con la sugerencia de IA
              }
            }
          }

          // Realizar la actualización en la base de datos.
          const { data: updatedObservedUser, error: updateError } =
            await supabaseAdmin.from("observed_users")
              .update(updatePayload)
              .eq("id", matchedObservedUser.id)
              .select(
                "id, status_id, first_seen_at, last_seen_at, access_count, alert_triggered, expires_at, potential_match_user_id, face_image_url, last_accessed_zones, ai_action",
              )
              .single();

          if (updateError) {
            console.error(
              "❌ ERROR al actualizar usuario observado:",
              updateError,
            );
            throw updateError;
          }

          // Preparar y enviar la respuesta.
          logEntry.result = observedUserHasAccess;
          logEntry.decision = observedUserHasAccess
            ? "access_granted"
            : "access_denied";
          logEntry.reason = accessDeniedReason;
          logEntry.match_status = responseType;

          const statusDetails: ItemWithNameAndId | null =
            statusNameMap.get(updatedObservedUser.status_id)
              ? {
                id: updatedObservedUser.status_id,
                name: statusNameMap.get(updatedObservedUser.status_id)!,
              }
              : { id: "unknown", name: "Unknown" };

          let zonesAccessedDetails: ItemWithNameAndId[] = [];
          if (
            updatedObservedUser.last_accessed_zones &&
            updatedObservedUser.last_accessed_zones.length > 0
          ) {
            const zoneIdsToFilter = updatedObservedUser.last_accessed_zones;
            const { data: zoneNamesData, error: zoneNamesError } =
              await supabase
                .from("zones")
                .select("id, name")
                .in(
                  "id",
                  zoneIdsToFilter.filter((id: string) => id.trim() !== ""),
                );

            if (zoneNamesError) {
              console.error(
                "Error fetching zone names for observed user response:",
                zoneNamesError,
              );
            } else {
              zonesAccessedDetails = zoneNamesData || [];
            }
          }

          const finalResponse: UnifiedValidationResponse = {
            user: {
              id: updatedObservedUser.id,
              full_name: null,
              user_type: "observed",
              hasAccess: observedUserHasAccess,
              similarity: matchSimilarity,
              role_details: null,
              status_details: statusDetails,
              zones_accessed_details: zonesAccessedDetails,
              observed_details: {
                firstSeenAt: updatedObservedUser.first_seen_at,
                lastSeenAt: updatedObservedUser.last_seen_at,
                accessCount: updatedObservedUser.access_count,
                alertTriggered: updatedObservedUser.alert_triggered,
                expiresAt: updatedObservedUser.expires_at,
                potentialMatchUserId:
                  updatedObservedUser.potential_match_user_id,
                similarity: matchSimilarity,
                distance: observedActualDistance,
                faceImageUrl: uploadedImageUrl,
                aiAction: aiActionSuggestion,
              },
            },
            type: responseType,
            message: responseMessage,
          };

          await supabase.from("logs").insert([logEntry]);
          return new Response(JSON.stringify(finalResponse), {
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

      // Comprobación de que los IDs esenciales de estado están disponibles.
      if (!activeTemporalId) {
        logEntry.result = false;
        logEntry.decision = "error";
        logEntry.reason =
          "Critical: 'active_temporal' status ID not found during initialization.";
        logEntry.match_status = "status_id_missing";
        await supabase.from("logs").insert([logEntry]);
        throw new Error(logEntry.reason);
      }

      // Generar sugerencia de AI para el nuevo usuario ANTES de insertarlo.
      // Si la imagen no está presente, newAiActionSuggestion será null.
      const newAiActionSuggestion: string | null = await generateAISuggestion(
        imageData || null, // Pasar imageData, o null si no existe
        { type: "new" },
      );

      // Payload para insertar el nuevo usuario observado.
      const newObservedUserPayload: NewObservedUserInsertPayload = {
        embedding: faceEmbedding,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        access_count: 1,
        // Filtrar zoneId para el nuevo usuario, solo añadir si es válido.
        last_accessed_zones: (zoneId && zoneId.trim() !== "") ? [zoneId] : [],
        status_id: activeTemporalId, // Estado por defecto para nuevos observados.
        alert_triggered: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expira en 24 horas.
        potential_match_user_id: null,
        ai_action: newAiActionSuggestion, // Guardar la sugerencia de IA inicial.
        // face_image_url se actualiza después de la inserción si hay imageData.
      };

      // Insertar el nuevo usuario en la base de datos.
      const { data: createdObservedUser, error: insertError } =
        await supabaseAdmin
          .from("observed_users")
          .insert([newObservedUserPayload])
          .select(
            "id, status_id, first_seen_at, last_seen_at, access_count, alert_triggered, expires_at, potential_match_user_id, face_image_url, last_accessed_zones, ai_action",
          )
          .single();

      if (insertError) {
        console.error(
          "❌ ERROR al insertar nuevo usuario observado:",
          insertError,
        );
        throw insertError;
      }

      let newUploadedImageUrl: string | null = null;
      if (imageData && createdObservedUser.id) {
        console.log(
          `Attempting to upload image for new observed user: ${createdObservedUser.id}`,
        );
        const { imageUrl, error: uploadImageError } =
          await uploadImageToStorageAndDb(
            createdObservedUser.id,
            imageData,
            true, // Es un usuario observado
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          );
        if (uploadImageError) {
          console.error(
            `Warning: Failed to upload image for new observed user ${createdObservedUser.id}: ${uploadImageError}`,
          );
        } else if (imageUrl) {
          newUploadedImageUrl = imageUrl;
          // Actualizar la URL de la imagen en la DB si la subida fue exitosa.
          const { error: updateImgUrlError } = await supabaseAdmin
            .from("observed_users")
            .update({ face_image_url: newUploadedImageUrl })
            .eq("id", createdObservedUser.id);

          if (updateImgUrlError) {
            console.error(
              `Warning: Failed to update face_image_url for new observed user ${createdObservedUser.id} after upload: ${updateImgUrlError.message}`,
            );
          }
          console.log(
            `Successfully uploaded and updated image for new observed user ${createdObservedUser.id}: ${newUploadedImageUrl}`,
          );
        }
      }

      // Preparar y enviar la respuesta para el nuevo usuario.
      logEntry.observed_user_id = createdObservedUser.id;
      logEntry.user_id = null;
      logEntry.user_type = "new_observed";
      logEntry.confidence_score = 1.0;

      const newObservedUserHasAccess = true; // Por defecto, acceso concedido para nuevos observados con 'active_temporal'.
      const newAccessReason =
        `New observed user registered for zone: ${zoneId}`;
      const newResponseType: UnifiedValidationResponse["type"] =
        "new_observed_user_registered";
      const newResponseMessage =
        "New Observed User Registered. Access Granted.";

      logEntry.result = newObservedUserHasAccess;
      logEntry.decision = newObservedUserHasAccess
        ? "access_granted"
        : "access_denied";
      logEntry.reason = newAccessReason;
      logEntry.match_status = "new_observed_user_registered";

      const newStatusDetails: ItemWithNameAndId | null =
        statusNameMap.get(createdObservedUser.status_id)
          ? {
            id: createdObservedUser.status_id,
            name: statusNameMap.get(createdObservedUser.status_id)!,
          }
          : { id: "unknown", name: "Unknown" };

      let newZonesAccessedDetails: ItemWithNameAndId[] = [];
      if (
        createdObservedUser.last_accessed_zones &&
        createdObservedUser.last_accessed_zones.length > 0
      ) {
        const newZoneIdsToFilter = createdObservedUser.last_accessed_zones;
        const { data: newZoneNamesData, error: newZoneNamesError } =
          await supabase
            .from("zones")
            .select("id, name")
            .in(
              "id",
              newZoneIdsToFilter.filter((id: string) => id.trim() !== ""),
            );

        if (newZoneNamesError) {
          console.error(
            "Error fetching zone names for new observed user response:",
            newZoneNamesError,
          );
        } else {
          newZonesAccessedDetails = newZoneNamesData || [];
        }
      }

      const finalNewObservedResponse: UnifiedValidationResponse = {
        user: {
          id: createdObservedUser.id,
          full_name: null, // Usuarios observados no tienen full_name por defecto.
          user_type: "observed",
          hasAccess: newObservedUserHasAccess,
          similarity: 1.0, // Nueva coincidencia es 1.0 perfecta.
          role_details: null,
          status_details: newStatusDetails,
          zones_accessed_details: newZonesAccessedDetails,
          observed_details: {
            firstSeenAt: createdObservedUser.first_seen_at,
            lastSeenAt: createdObservedUser.last_seen_at,
            accessCount: createdObservedUser.access_count,
            alertTriggered: createdObservedUser.alert_triggered,
            expiresAt: createdObservedUser.expires_at,
            potentialMatchUserId: createdObservedUser.potential_match_user_id,
            similarity: 1.0,
            distance: 0,
            faceImageUrl: newUploadedImageUrl,
            aiAction: newAiActionSuggestion,
          },
        },
        type: newResponseType,
        message: newResponseMessage,
      };

      await supabase.from("logs").insert([logEntry]);
      return new Response(JSON.stringify(finalNewObservedResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // --- 4. Si no se encontró ningún match, enviar respuesta de "No Match Found" ---
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
    // --- Manejo de errores inesperados de la función ---
    let errorMessage = "An unexpected error occurred.";

    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === "string") {
      errorMessage = catchError;
    } else if (isErrorWithMessage(catchError)) {
      errorMessage = catchError.message;
    }

    console.error(
      "🔥 CRITICAL ERROR in Edge Function (unhandled):",
      catchError,
    );

    logEntry.result = false;
    logEntry.decision = "error";
    logEntry.reason =
      `Validation failed due to unhandled internal error: ${errorMessage}`;
    logEntry.match_status = "unhandled_exception";

    // Intentar loggear el error final, aunque la función esté fallando.
    const { error: finalLogInsertError } = await supabase.from("logs").insert([
      logEntry,
    ]);
    if (finalLogInsertError) {
      console.error(
        "Error logging unhandled validation error (final catch):",
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
