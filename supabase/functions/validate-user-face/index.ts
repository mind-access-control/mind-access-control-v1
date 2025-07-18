// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "validate-user-face" started!');

// --- Definiciones de Tipos para Supabase Data ---
interface ItemWithNameAndId {
  id: string;
  name: string;
}

interface SupabaseUserResponse {
  id: string;
  full_name: string;
  role_details: ItemWithNameAndId | null;
  status_details: ItemWithNameAndId | null;
  zones_accessed_details: ItemWithNameAndId[];
  alert_triggered: boolean;
  consecutive_denied_accesses: number;
}

interface ObservedUserFromDB {
  id: string;
  embedding: number[];
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null;
  status_id: string;
  alert_triggered: boolean;
  expires_at: string | null;
  potential_match_user_id: string | null;
  face_image_url: string | null;
  ai_action: string | null; // Asegurarse de que este campo está presente
  consecutive_denied_accesses: number;
  distance?: number;
  similarity?: number;
}

interface UnifiedValidationResponse {
  user: {
    id: string;
    full_name: string | null;
    user_type: 'registered' | 'observed' | 'unknown';
    hasAccess: boolean;
    similarity: number;
    role_details: ItemWithNameAndId | null;
    status_details: ItemWithNameAndId;
    zones_accessed_details: ItemWithNameAndId[];
    // Añadido para usuarios registrados también
    faceImageUrl?: string | null;
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
      aiAction: string | null; // Asegurarse de que este campo está presente en la respuesta
    };
  };
  type:
    | 'registered_user_matched'
    | 'observed_user_updated'
    | 'new_observed_user_registered'
    | 'no_match_found'
    | 'registered_user_access_denied'
    | 'observed_user_access_denied_expired'
    | 'observed_user_access_denied_status_expired'
    | string;
  message?: string;
  error?: string;
}

// --- Constantes de Configuración ---
const USER_MATCH_THRESHOLD_DISTANCE = 0.15;
const OBSERVED_USER_MATCH_THRESHOLD_DISTANCE = 0.08;

const NEW_OBSERVED_USER_STATUS_ID = 'c70bbe40-afe3-4357-8454-16b457705db5';
const ACCESS_DENIED_STATUS_ID = 'b7d6c8b9-5f21-4f1d-8c1a-9a0e6d5f4c3b';
const ACCESS_DENIED_CONSECUTIVE_THRESHOLD = 3;

// --- Función Helper para manejar errores con mensaje ---
function isErrorWithMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

// --- Helper para subir imagen (centralizado) ---
async function uploadFaceImage(userId: string, imageData: string, isObservedUser: boolean): Promise<string | null> {
  if (!imageData) {
    console.warn(`WARNING: No imageData provided for userId: ${userId}. Skipping image upload.`);
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const uploadFunctionUrl = `${supabaseUrl}/functions/v1/upload-face-image`;
  console.log(`DEBUG: Llamando a upload-face-image para ${isObservedUser ? 'observado' : 'registrado'} ID: ${userId} en: ${uploadFunctionUrl}`);

  try {
    const uploadResponse = await fetch(uploadFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        userId: userId,
        imageData: imageData,
        isObservedUser: isObservedUser,
      }),
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json();
      console.error(
        `❌ ERROR al llamar a upload-face-image para ${isObservedUser ? 'observado' : 'registrado'} ID: ${userId}:`,
        uploadResponse.status,
        errorBody
      );
      throw new Error(
        `Failed to upload image via Edge Function for ${isObservedUser ? 'observado' : 'registrado'} user: ${errorBody.error || uploadResponse.statusText}`
      );
    }
    const uploadResult = await uploadResponse.json();
    console.log(
      `DEBUG: URL de imagen obtenida de upload-face-image para ${isObservedUser ? 'observado' : 'registrado'} ID: ${userId}: ${uploadResult.imageUrl}`
    );
    return uploadResult.imageUrl;
  } catch (uploadCallError) {
    console.error(`❌ ERROR en la llamada a upload-face-image para ${isObservedUser ? 'observado' : 'registrado'} ID: ${userId}:`, uploadCallError);
    console.warn(
      `WARNING: No se pudo subir la imagen del rostro para ${isObservedUser ? 'observado' : 'registrado'} ID: ${userId}. face_image_url no se actualizará.`
    );
    return null; // Retornar null en caso de error en la subida
  }
}

// --- NUEVA FUNCIÓN: Generar recomendación de IA ---
async function generateAISuggestion(user: ObservedUserFromDB, context: 'new' | 'existing'): Promise<string> {
  const prompt = `Given the following observed user data, provide a concise (max 20 words) administrative action recommendation.
  User ID: ${user.id}
  Status ID: ${user.status_id}
  Access Count: ${user.access_count}
  Last Seen: ${user.last_seen_at}
  Expires At: ${user.expires_at}
  Alert Triggered: ${user.alert_triggered}
  Consecutive Denied Accesses: ${user.consecutive_denied_accesses}
  Context: ${context === 'new' ? 'New observed user detected.' : 'Existing observed user updated.'}

  Recommendation:`;

  // CAMBIO CLAVE AQUÍ: Leer la clave de API de las variables de entorno de Deno
  const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

  if (!apiKey) {
    console.error('❌ ERROR: GEMINI_API_KEY no está configurada en las variables de entorno de la función Edge.');
    return 'AI suggestion failed: API Key missing.';
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const text = result.candidates[0].content.parts[0].text;
      console.log('DEBUG: AI Recommendation generated:', text);
      return text;
    } else {
      console.warn('WARNING: No AI recommendation candidates found.', result);
      return 'No AI recommendation available.';
    }
  } catch (error) {
    console.error('❌ ERROR calling Gemini API for AI recommendation:', error);
    return 'Error generating AI recommendation.';
  }
}

// --- Manejador Principal de la Función Edge ---
serve(async (req) => {
  // Manejar solicitudes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    console.log('DEBUG: Handling OPTIONS preflight request for validate-user-face');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // AÑADIDO: Permitir 'x-request-id' en los encabezados CORS
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: {
      headers: { 'x-my-custom-header': 'validate-user-face' },
    },
  });

  // Objeto para registrar la entrada de log de la operación
  const logEntry = {
    user_id: null as string | null,
    camera_id: null as string | null,
    result: false,
    observed_user_id: null as string | null,
    user_type: 'unknown',
    vector_attempted: null as number[] | null,
    match_status: 'no_match_found',
    decision: 'access_denied',
    reason: 'No match found.',
    confidence_score: null as number | null,
    requested_zone_id: null as string | null,
  };

  try {
    // Parsear el cuerpo de la solicitud JSON
    const { faceEmbedding, zoneId, imageData } = await req.json();
    logEntry.vector_attempted = faceEmbedding;
    logEntry.requested_zone_id = zoneId;

    console.log('DEBUG: Incoming Query Embedding (frontend - first 5 elements):', faceEmbedding.slice(0, 5), '...');
    console.log('DEBUG: Incoming ImageData length (Base64 string):', imageData ? imageData.length : 'null/undefined');

    // 1. Buscar coincidencia en usuarios registrados (public.users)
    console.log('DEBUG: Buscando coincidencia en usuarios registrados (public.users)...');
    const { data: userData, error: userRpcError } = await supabaseClient.rpc('match_user_face_embedding', {
      match_count: 1,
      match_threshold: USER_MATCH_THRESHOLD_DISTANCE,
      query_embedding: faceEmbedding,
    });

    if (userRpcError) {
      console.error('❌ ERROR RPC match_user_face_embedding:', userRpcError);
      throw userRpcError;
    }

    console.log('DEBUG: Resultado RPC match_user_face_embedding:', userData);
    if (userData && userData.length > 0) {
      console.log(`DEBUG: Usuario registrado más cercano: ID=${userData[0].user_id}, Distancia=${userData[0].distance}`);
    }

    let userMatchDetails: UnifiedValidationResponse['user'] | null = null;
    let userMatched = false;

    if (userData && userData.length > 0) {
      const matchedUser = userData[0];
      const actualDistance = matchedUser.distance || 0;
      const matchSimilarity = 1 - actualDistance / 2;

      if (actualDistance <= USER_MATCH_THRESHOLD_DISTANCE) {
        if (!matchedUser.user_id) {
          console.error('❌ ERROR: match_user_face_embedding devolvió un usuario sin user_id válido:', matchedUser);
          logEntry.result = false;
          logEntry.decision = 'error';
          logEntry.reason = 'Registered user matched, but returned user_id was null/undefined.';
          logEntry.match_status = 'registered_user_id_null';

          const errorResponse: UnifiedValidationResponse = {
            user: {
              id: 'N/A',
              full_name: 'Error de datos',
              user_type: 'registered',
              hasAccess: false,
              similarity: matchSimilarity,
              role_details: null,
              status_details: { id: 'error', name: 'Error' },
              zones_accessed_details: [],
            },
            type: 'registered_user_data_error',
            message: 'Registered user matched, but user ID was invalid.',
            error: logEntry.reason,
          };
          await supabaseClient.from('logs').insert([logEntry]);
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        userMatched = true;
        logEntry.user_id = matchedUser.user_id;
        logEntry.user_type = 'registered';
        logEntry.confidence_score = matchSimilarity;

        const { data, error: fullUserError } = await supabaseClient
          .from('user_full_details_view')
          .select(
            `
            id,
            full_name,
            role_details,
            status_details,
            zones_accessed_details,
            alert_triggered,
            consecutive_denied_accesses,
            face_image_url
          `
          )
          .eq('id', matchedUser.user_id)
          .maybeSingle();

        if (fullUserError) {
          console.error('❌ ERROR fetching full user details from view:', fullUserError);
          throw fullUserError;
        }

        if (data) {
          const hasZoneAccess = data.zones_accessed_details.some((zone: ItemWithNameAndId) => zone.id === zoneId);
          const isAccessDenied = data.status_details?.id === ACCESS_DENIED_STATUS_ID;

          if (hasZoneAccess && !isAccessDenied) {
            // Lógica para subir/actualizar la imagen del rostro para usuarios registrados
            let uploadedImageUrl: string | null = data.face_image_url; // Mantener la actual por defecto
            if (imageData) {
              uploadedImageUrl = await uploadFaceImage(data.id, imageData, false); // False para usuario registrado
              if (uploadedImageUrl) {
                // Actualizar la URL en la tabla 'users' si la subida fue exitosa
                const { error: updateImgUrlError } = await supabaseClient.from('users').update({ face_image_url: uploadedImageUrl }).eq('id', data.id);
                if (updateImgUrlError) {
                  console.error('❌ ERROR al actualizar face_image_url para usuario registrado:', updateImgUrlError);
                }
              }
            }

            userMatchDetails = {
              id: data.id,
              full_name: data.full_name,
              user_type: 'registered',
              hasAccess: true,
              similarity: matchSimilarity,
              role_details: data.role_details,
              status_details: data.status_details,
              zones_accessed_details: data.zones_accessed_details,
              faceImageUrl: uploadedImageUrl, // Incluir la URL de la imagen en la respuesta
            };
            logEntry.result = true;
            logEntry.decision = 'access_granted';
            logEntry.reason = 'Registered user matched and has access.';
            logEntry.match_status = 'registered_user_matched';

            if (data.consecutive_denied_accesses > 0) {
              await supabaseClient.from('users').update({ consecutive_denied_accesses: 0 }).eq('id', data.id);
            }
          } else {
            userMatchDetails = {
              id: data.id,
              full_name: data.full_name,
              user_type: 'registered',
              hasAccess: false,
              similarity: matchSimilarity,
              role_details: data.role_details,
              status_details: data.status_details,
              zones_accessed_details: data.zones_accessed_details,
              faceImageUrl: data.face_image_url, // Mantener la URL existente si el acceso es denegado
            };
            logEntry.result = false;
            logEntry.decision = 'access_denied';
            logEntry.reason = isAccessDenied ? 'Registered user status denies access.' : 'Registered user does not have access to requested zone.';
            logEntry.match_status = isAccessDenied ? 'registered_user_access_denied_status' : 'registered_user_access_denied_zone';

            await supabaseClient
              .from('users')
              .update({ consecutive_denied_accesses: data.consecutive_denied_accesses + 1 })
              .eq('id', data.id);

            if (data.consecutive_denied_accesses + 1 >= ACCESS_DENIED_CONSECUTIVE_THRESHOLD && !data.alert_triggered) {
              await supabaseClient.from('users').update({ alert_triggered: true }).eq('id', data.id);
              logEntry.reason += ' Alert triggered for consecutive denied accesses.';
            }
          }
        } else {
          console.error('❌ ERROR: No se encontraron detalles completos para el usuario registrado coincidente.');
          logEntry.result = false;
          logEntry.decision = 'error';
          logEntry.reason = 'Registered user matched, but full details could not be retrieved.';
          logEntry.match_status = 'registered_user_details_missing';
        }
      }
    }

    // 2. Si no hay coincidencia en usuarios registrados, buscar en usuarios observados o registrar uno nuevo
    if (!userMatched) {
      console.log('DEBUG: No se encontró coincidencia en usuarios registrados. Buscando en usuarios observados (public.observed_users)...');
      const { data: observedUserData, error: observedRpcError } = await supabaseClient.rpc('match_observed_face_embedding', {
        match_count: 1,
        match_threshold: OBSERVED_USER_MATCH_THRESHOLD_DISTANCE,
        query_embedding: faceEmbedding,
      });

      if (observedRpcError) {
        console.error('❌ ERROR RPC match_observed_face_embedding:', observedRpcError);
        throw observedRpcError;
      }

      console.log('DEBUG: Resultado RPC match_observed_face_embedding:', observedUserData);
      if (observedUserData && observedUserData.length > 0) {
        console.log(`DEBUG: Usuario observado más cercano: ID=${observedUserData[0].id}, Distancia=${observedUserData[0].distance}`);
      }

      if (observedUserData && observedUserData.length > 0) {
        const matchedObservedUser = observedUserData[0];
        const actualDistance = matchedObservedUser.distance || 0;
        const matchSimilarity = 1 - actualDistance / 2;

        if (actualDistance <= OBSERVED_USER_MATCH_THRESHOLD_DISTANCE) {
          logEntry.observed_user_id = matchedObservedUser.id;
          logEntry.user_type = 'observed';
          logEntry.confidence_score = matchSimilarity;

          const newAccessCount = matchedObservedUser.access_count + 1;
          // Deduplicar las zonas accedidas
          const existingZones = new Set(Array.isArray(matchedObservedUser.last_accessed_zones) ? matchedObservedUser.last_accessed_zones : []);
          existingZones.add(zoneId); // Añadir la nueva zona
          const newLastAccessedZones = Array.from(existingZones); // Convertir Set de nuevo a Array

          const hasExpired = matchedObservedUser.expires_at && new Date(matchedObservedUser.expires_at) < new Date();

          let aiSuggestedAction: string | null = null; // Variable para almacenar la acción de IA

          if (hasExpired || matchedObservedUser.status_id !== NEW_OBSERVED_USER_STATUS_ID) {
            // Generar recomendación de IA para acceso denegado
            aiSuggestedAction = await generateAISuggestion(matchedObservedUser, 'existing');

            userMatchDetails = {
              id: matchedObservedUser.id,
              full_name: `Observado ${matchedObservedUser.id.substring(0, 8)}`,
              user_type: 'observed',
              hasAccess: false,
              similarity: matchSimilarity,
              role_details: null,
              status_details: { id: matchedObservedUser.status_id, name: 'Estado Desconocido' },
              zones_accessed_details: [],
              observed_details: {
                firstSeenAt: matchedObservedUser.first_seen_at,
                lastSeenAt: matchedObservedUser.last_seen_at,
                accessCount: matchedObservedUser.access_count,
                alertTriggered: matchedObservedUser.alert_triggered,
                expiresAt: matchedObservedUser.expires_at || '',
                potentialMatchUserId: matchedObservedUser.potential_match_user_id,
                similarity: matchSimilarity,
                distance: actualDistance,
                faceImageUrl: matchedObservedUser.face_image_url,
                aiAction: aiSuggestedAction, // Incluir la acción de IA
              },
            };
            logEntry.result = false;
            logEntry.decision = 'access_denied';
            logEntry.reason = hasExpired ? 'Observed user access expired.' : 'Observed user status denies access.';
            logEntry.match_status = hasExpired ? 'observed_user_access_denied_expired' : 'observed_user_access_denied_status_expired';

            await supabaseClient
              .from('observed_users')
              .update({
                consecutive_denied_accesses: (matchedObservedUser.consecutive_denied_accesses || 0) + 1,
                ai_action: aiSuggestedAction, // Guardar la acción de IA
              })
              .eq('id', matchedObservedUser.id);

            if ((matchedObservedUser.consecutive_denied_accesses || 0) + 1 >= ACCESS_DENIED_CONSECUTIVE_THRESHOLD && !matchedObservedUser.alert_triggered) {
              await supabaseClient.from('observed_users').update({ alert_triggered: true }).eq('id', matchedObservedUser.id);
              logEntry.reason += ' Alert triggered for consecutive denied accesses.';
            }

            await supabaseClient
              .from('observed_users')
              .update({
                last_seen_at: new Date().toISOString(),
                last_accessed_zones: newLastAccessedZones, // Usar el array deduplicado
              })
              .eq('id', matchedObservedUser.id);
          } else {
            // Generar recomendación de IA para acceso concedido
            aiSuggestedAction = await generateAISuggestion(matchedObservedUser, 'existing');

            logEntry.result = true;
            logEntry.decision = 'access_granted';
            logEntry.reason = 'Observed user matched and has active temporary access.';
            logEntry.match_status = 'observed_user_updated';

            // Lógica para subir/actualizar la imagen del rostro para usuarios observados existentes
            let uploadedImageUrl: string | null = matchedObservedUser.face_image_url; // Mantener la actual por defecto
            if (imageData) {
              uploadedImageUrl = await uploadFaceImage(matchedObservedUser.id, imageData, true); // True para usuario observado
            }

            const { data: updatedObservedUser, error: updateError } = await supabaseClient
              .from('observed_users')
              .update({
                access_count: newAccessCount,
                last_seen_at: new Date().toISOString(),
                last_accessed_zones: newLastAccessedZones, // Usar el array deduplicado
                consecutive_denied_accesses: 0,
                face_image_url: uploadedImageUrl, // Actualizar con la nueva URL
                ai_action: aiSuggestedAction, // Guardar la acción de IA
              })
              .eq('id', matchedObservedUser.id)
              .select(
                `
                id, embedding, first_seen_at, last_seen_at, access_count, last_accessed_zones,
                status_id, alert_triggered, expires_at, potential_match_user_id, face_image_url,
                ai_action,
                consecutive_denied_accesses
              `
              )
              .maybeSingle();

            if (updateError) {
              console.error('❌ ERROR updating observed user:', updateError);
              throw updateError;
            }

            if (updatedObservedUser) {
              userMatchDetails = {
                id: updatedObservedUser.id,
                full_name: `Observado ${updatedObservedUser.id.substring(0, 8)}`,
                user_type: 'observed',
                hasAccess: true,
                similarity: matchSimilarity,
                role_details: null,
                status_details: { id: updatedObservedUser.status_id, name: 'Estado Desconocido' },
                zones_accessed_details: [],
                observed_details: {
                  firstSeenAt: updatedObservedUser.first_seen_at,
                  lastSeenAt: updatedObservedUser.last_seen_at,
                  accessCount: updatedObservedUser.access_count,
                  alertTriggered: updatedObservedUser.alert_triggered,
                  expiresAt: updatedObservedUser.expires_at || '',
                  potentialMatchUserId: updatedObservedUser.potential_match_user_id,
                  similarity: matchSimilarity,
                  distance: actualDistance,
                  faceImageUrl: updatedObservedUser.face_image_url,
                  aiAction: updatedObservedUser.ai_action, // Asegurarse de que se toma del objeto actualizado
                },
              };
            }
          }
        }
      } else {
        console.log('DEBUG: No se encontró coincidencia en usuarios registrados. Registrando como nuevo usuario observado...');
        logEntry.match_status = 'no_match_found_observed';

        let uploadedImageUrl: string | null = null;
        if (imageData) {
          uploadedImageUrl = await uploadFaceImage(crypto.randomUUID(), imageData, true); // True para usuario observado
        } else {
          console.warn('WARNING: No se proporcionó imageData para el nuevo usuario observado. face_image_url será nulo.');
        }

        // Generar recomendación de IA para nuevo usuario observado (acceso concedido)
        // Creamos un objeto ObservedUserFromDB temporal con los datos que tenemos antes de la inserción.
        const tempObservedUserForAI: ObservedUserFromDB = {
          id: 'temp-new-user', // ID temporal para la recomendación
          embedding: faceEmbedding,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          access_count: 1, // Será 1 después de la inserción
          last_accessed_zones: [zoneId],
          status_id: NEW_OBSERVED_USER_STATUS_ID,
          alert_triggered: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          potential_match_user_id: null,
          face_image_url: uploadedImageUrl,
          ai_action: null, // Se llenará a continuación
          consecutive_denied_accesses: 0,
        };
        const aiSuggestedActionForNew = await generateAISuggestion(tempObservedUserForAI, 'new');

        const { data: newObservedUser, error: insertError } = await supabaseClient
          .from('observed_users')
          .insert({
            embedding: faceEmbedding,
            status_id: NEW_OBSERVED_USER_STATUS_ID,
            last_accessed_zones: [zoneId], // Para nuevos usuarios, la zona siempre es única al inicio
            face_image_url: uploadedImageUrl,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            consecutive_denied_accesses: 0,
            ai_action: aiSuggestedActionForNew, // Guardar la acción de IA para el nuevo usuario
          })
          .select(
            `
            id, embedding, first_seen_at, last_seen_at, access_count, last_accessed_zones,
            status_id, alert_triggered, expires_at, potential_match_user_id, face_image_url,
            ai_action,
            consecutive_denied_accesses
          `
          )
          .maybeSingle();

        if (insertError) {
          console.error('❌ ERROR al insertar nuevo usuario observado:', insertError);
          throw insertError;
        }

        if (newObservedUser) {
          if (uploadedImageUrl && uploadedImageUrl.includes('new-observed-user')) {
            console.log('DEBUG: La imagen se subió con un userId temporal. El ID real del nuevo usuario observado es:', newObservedUser.id);
          }

          userMatchDetails = {
            id: newObservedUser.id,
            full_name: `Nuevo Observado ${newObservedUser.id.substring(0, 8)}`,
            user_type: 'observed',
            hasAccess: true,
            similarity: 0,
            role_details: null,
            status_details: { id: newObservedUser.status_id, name: 'Estado Desconocido' },
            zones_accessed_details: [],
            observed_details: {
              firstSeenAt: newObservedUser.first_seen_at,
              lastSeenAt: newObservedUser.last_seen_at,
              accessCount: newObservedUser.access_count,
              alertTriggered: newObservedUser.alert_triggered,
              expiresAt: newObservedUser.expires_at || '',
              potentialMatchUserId: newObservedUser.potential_match_user_id,
              similarity: 0,
              distance: 0,
              faceImageUrl: newObservedUser.face_image_url,
              aiAction: newObservedUser.ai_action, // Asegurarse de que se toma del objeto actualizado
            },
          };
          logEntry.observed_user_id = newObservedUser.id;
          logEntry.user_type = 'observed';
          logEntry.result = true;
          logEntry.decision = 'access_granted';
          logEntry.reason = 'New observed user registered and access granted.';
          logEntry.match_status = 'new_observed_user_registered';
        } else {
          console.error('❌ ERROR: Fallo al registrar nuevo usuario observado sin error de inserción.');
          logEntry.result = false;
          logEntry.decision = 'error';
          logEntry.reason = 'Failed to register new observed user.';
          logEntry.match_status = 'new_observed_user_registration_failed';
        }
      }
    }

    // 4. Si no se encontró ninguna coincidencia (ni registrado ni observado)
    if (!userMatchDetails) {
      console.log('DEBUG: No se encontró ninguna coincidencia. Acceso denegado.');
      logEntry.result = false;
      logEntry.decision = 'access_denied';
      logEntry.reason = 'No matching user found in registered or observed users.';
      logEntry.match_status = 'no_match_found';

      userMatchDetails = {
        id: 'N/A',
        full_name: 'Usuario Desconocido',
        user_type: 'unknown',
        hasAccess: false,
        similarity: 0,
        role_details: null,
        status_details: { id: 'unknown', name: 'Desconocido' },
        zones_accessed_details: [],
      };
    }

    // 5. Obtener detalles de rol y estado si userMatchDetails.status_details o role_details son solo ID
    if (userMatchDetails.user_type === 'registered' && userMatchDetails.role_details && userMatchDetails.role_details.id) {
      const { data: roleData, error: roleError } = await supabaseClient
        .from('roles_catalog')
        .select('name')
        .eq('id', userMatchDetails.role_details.id)
        .maybeSingle();
      if (roleData) {
        userMatchDetails.role_details.name = roleData.name;
      } else if (roleError) {
        console.error('Error fetching role name:', roleError);
      }
    }

    if (userMatchDetails.status_details && userMatchDetails.status_details.id) {
      const { data: statusData, error: statusError } = await supabaseClient
        .from('user_statuses_catalog')
        .select('name')
        .eq('id', userMatchDetails.status_details.id)
        .maybeSingle();
      if (statusData) {
        userMatchDetails.status_details.name = statusData.name;
      } else if (statusError) {
        console.error('Error fetching status name:', statusError);
      }
    }

    // 6. Insertar log de la operación
    await supabaseClient.from('logs').insert([logEntry]);

    // 7. Preparar y enviar respuesta al frontend
    const responseBody: UnifiedValidationResponse = {
      user: userMatchDetails,
      type: logEntry.match_status,
      message: logEntry.reason,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (catchError: unknown) {
    let errorMessage = 'An unexpected error occurred.';

    if (isErrorWithMessage(catchError)) {
      errorMessage = catchError.message;
    } else if (typeof catchError === 'string') {
      errorMessage = catchError;
    }

    console.error('🔥 CRITICAL ERROR in Edge Function (unhandled):', catchError);

    const finalLogEntry = {
      ...logEntry,
      result: false,
      decision: 'error',
      reason: `Validation failed due to unhandled internal error: ${errorMessage}`,
      match_status: 'unhandled_exception',
    };

    const { error: finalLogInsertError } = await supabaseClient.from('logs').insert([finalLogEntry]);
    if (finalLogInsertError) {
      console.error('Error logging unhandled validation error (final catch):', finalLogInsertError);
    }

    const errorResponse: UnifiedValidationResponse = {
      user: {
        id: 'N/A',
        full_name: 'System Error',
        user_type: 'unknown',
        hasAccess: false,
        similarity: 0,
        role_details: null,
        status_details: { id: 'error', name: 'Error' },
        zones_accessed_details: [],
      },
      type: 'error',
      message: 'An internal server error occurred during validation.',
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
