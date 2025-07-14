// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  // Necesitamos el campo alert_triggered y consecutive_denied_accesses de la tabla users
  alert_triggered: boolean;
  consecutive_denied_accesses: number;
}

// Interfaz para un usuario observado tal como se recupera de la base de datos 'observed_users'.
interface ObservedUserFromDB {
  id: string;
  embedding: number[];
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null; // jsonb array of strings
  status_id: string;
  alert_triggered: boolean;
  expires_at: string | null;
  potential_match_user_id: string | null;
  face_image_url: string | null;
  ai_action: string | null;
  consecutive_denied_accesses: number;
}

// --- Interfaz para la respuesta unificada de la Edge Function (para el frontend) ---
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
const USER_MATCH_THRESHOLD_DISTANCE = 0.5; // Umbral de distancia para considerar una coincidencia (menor es mejor)
const OBSERVED_USER_MATCH_THRESHOLD_DISTANCE = 0.6; // Umbral para usuarios observados
const NEW_OBSERVED_USER_STATUS_ID = 'c70bbe40-afe3-4357-8454-16b457705db5'; // UUID del estado 'Active Temporal'
const ACCESS_DENIED_STATUS_ID = 'b7d6c8b9-5f21-4f1d-8c1a-9a0e6d5f4c3b'; // UUID del estado 'Access Denied'
const ACCESS_DENIED_CONSECUTIVE_THRESHOLD = 3; // Umbral de accesos denegados consecutivos para alerta

// --- Función Helper para manejar errores con mensaje (corregida para evitar 'any') ---
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string' // CAMBIO AQUÍ
  );
}

// --- Manejador Principal de la Función Edge ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Manejar solicitudes OPTIONS (preflight CORS)
    console.log('DEBUG: Handling OPTIONS preflight request for validate-user-face');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: {
      headers: { 'x-my-custom-header': 'validate-user-face' },
    },
  });

  // CAMBIO: 'logEntry' ahora es 'const'
  const logEntry = {
    user_id: null as string | null,
    camera_id: null as string | null, // Asume que el frontend enviará camera_id si es necesario
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
    const { faceEmbedding, zoneId, imageData } = await req.json();
    logEntry.vector_attempted = faceEmbedding;
    logEntry.requested_zone_id = zoneId;

    console.log('DEBUG: Incoming Query Embedding (frontend):', faceEmbedding);

    // 1. Buscar coincidencia en usuarios registrados (public.users)
    console.log('Buscando coincidencia en usuarios registrados (public.users)...');
    const { data: userData, error: userRpcError } = await supabaseClient.rpc('match_user_face_embedding', {
      query_embedding: faceEmbedding,
      match_threshold: USER_MATCH_THRESHOLD_DISTANCE,
      match_count: 1,
    });

    if (userRpcError) {
      console.error('❌ ERROR RPC match_user_face_embedding:', userRpcError);
      throw userRpcError;
    }

    let userMatchDetails: UnifiedValidationResponse['user'] | null = null;
    let matchSimilarity: number = 0;
    let userMatched = false;

    if (userData && userData.length > 0) {
      const matchedUser = userData[0];
      const actualDistance = matchedUser.distance || 0;

      if (actualDistance <= USER_MATCH_THRESHOLD_DISTANCE) {
        // Verificar que matchedUser.user_id sea válido
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
        matchSimilarity = 1 - actualDistance / 2;

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
            consecutive_denied_accesses  
          `
          )
          .eq('id', matchedUser.user_id)
          .maybeSingle();

        if (fullUserError) {
          console.error('❌ ERROR fetching full user details from view:', fullUserError);
          throw fullUserError;
        }

        if (data) {
          logEntry.user_id = data.id;
          logEntry.user_type = 'registered';
          logEntry.confidence_score = matchSimilarity;

          // Verificar si el usuario tiene acceso a la zona solicitada
          const hasZoneAccess = data.zones_accessed_details.some((zone: ItemWithNameAndId) => zone.id === zoneId);

          // Verificar el estado del usuario
          const isAccessDenied = data.status_details?.id === ACCESS_DENIED_STATUS_ID;

          if (hasZoneAccess && !isAccessDenied) {
            userMatchDetails = {
              id: data.id,
              full_name: data.full_name,
              user_type: 'registered',
              hasAccess: true,
              similarity: matchSimilarity,
              role_details: data.role_details,
              status_details: data.status_details,
              zones_accessed_details: data.zones_accessed_details,
            };
            logEntry.result = true;
            logEntry.decision = 'access_granted';
            logEntry.reason = 'Registered user matched and has access.';
            logEntry.match_status = 'registered_user_matched';

            // Resetear consecutive_denied_accesses si el acceso fue concedido
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
            };
            logEntry.result = false;
            logEntry.decision = 'access_denied';
            logEntry.reason = isAccessDenied ? 'Registered user status denies access.' : 'Registered user does not have access to requested zone.';
            logEntry.match_status = isAccessDenied ? 'registered_user_access_denied_status' : 'registered_user_access_denied_zone';

            // Incrementar consecutive_denied_accesses
            await supabaseClient
              .from('users')
              .update({ consecutive_denied_accesses: data.consecutive_denied_accesses + 1 })
              .eq('id', data.id);

            // Si supera el umbral de denegados consecutivos, activar alerta
            if (data.consecutive_denied_accesses + 1 >= ACCESS_DENIED_CONSECUTIVE_THRESHOLD && !data.alert_triggered) {
              await supabaseClient.from('users').update({ alert_triggered: true }).eq('id', data.id);
              logEntry.reason += ' Alert triggered for consecutive denied accesses.';
            }
          }
        } else {
          // Esto no debería ocurrir si matchedUser.user_id es válido y select fue maybeSingle
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
      console.log('No se encontró coincidencia en usuarios registrados. Buscando en usuarios observados (public.observed_users)...');
      const { data: observedUserData, error: observedRpcError } = await supabaseClient.rpc('match_observed_face_embedding', {
        query_embedding: faceEmbedding,
        match_threshold: OBSERVED_USER_MATCH_THRESHOLD_DISTANCE,
        match_count: 1,
      });

      if (observedRpcError) {
        console.error('❌ ERROR RPC match_observed_face_embedding:', observedRpcError);
        throw observedRpcError;
      }

      if (observedUserData && observedUserData.length > 0) {
        const matchedObservedUser = observedUserData[0];
        const actualDistance = matchedObservedUser.distance || 0;

        if (actualDistance <= OBSERVED_USER_MATCH_THRESHOLD_DISTANCE) {
          // Usuario observado existente
          logEntry.observed_user_id = matchedObservedUser.id;
          logEntry.user_type = 'observed';
          logEntry.confidence_score = 1 - actualDistance / 2; // Similitud

          const newAccessCount = matchedObservedUser.access_count + 1;
          const newLastAccessedZones = Array.isArray(matchedObservedUser.last_accessed_zones) ? [...matchedObservedUser.last_accessed_zones, zoneId] : [zoneId];

          // Verificar si el usuario observado ha expirado
          const hasExpired = matchedObservedUser.expires_at && new Date(matchedObservedUser.expires_at) < new Date();

          if (hasExpired || matchedObservedUser.status_id !== NEW_OBSERVED_USER_STATUS_ID) {
            // Acceso denegado si ha expirado o su estado no es 'Active Temporal'
            userMatchDetails = {
              id: matchedObservedUser.id,
              full_name: `Observado ${matchedObservedUser.id.substring(0, 8)}`,
              user_type: 'observed',
              hasAccess: false,
              similarity: logEntry.confidence_score,
              role_details: null, // Observados no tienen rol_details
              status_details: { id: matchedObservedUser.status_id, name: 'Estado Desconocido' }, // Se actualizará más abajo
              zones_accessed_details: [],
              observed_details: {
                // Corregido: 'observed_details'
                firstSeenAt: matchedObservedUser.first_seen_at,
                lastSeenAt: matchedObservedUser.last_seen_at,
                accessCount: matchedObservedUser.access_count,
                alertTriggered: matchedObservedUser.alert_triggered,
                expiresAt: matchedObservedUser.expires_at || '',
                potentialMatchUserId: matchedObservedUser.potential_match_user_id,
                similarity: matchedObservedUser.similarity,
                distance: matchedObservedUser.distance,
                faceImageUrl: matchedObservedUser.face_image_url,
              },
            };
            logEntry.result = false;
            logEntry.decision = 'access_denied';
            logEntry.reason = hasExpired ? 'Observed user access expired.' : 'Observed user status denies access.';
            logEntry.match_status = hasExpired ? 'observed_user_access_denied_expired' : 'observed_user_access_denied_status_expired';

            // Actualizar el conteo de accesos y la última vez visto, pero mantener el estado denegado
            await supabaseClient
              .from('observed_users')
              .update({
                access_count: newAccessCount,
                last_seen_at: new Date().toISOString(),
                last_accessed_zones: newLastAccessedZones,
                // No cambiar el status_id aquí si ya está en un estado denegado
              })
              .eq('id', matchedObservedUser.id);
          } else {
            // Acceso concedido para usuario observado si no ha expirado y está en estado 'Active Temporal'
            logEntry.result = true;
            logEntry.decision = 'access_granted';
            logEntry.reason = 'Observed user matched and has active temporary access.';
            logEntry.match_status = 'observed_user_updated';

            const { data: updatedObservedUser, error: updateError } = await supabaseClient
              .from('observed_users')
              .update({
                access_count: newAccessCount,
                last_seen_at: new Date().toISOString(),
                last_accessed_zones: newLastAccessedZones,
              })
              .eq('id', matchedObservedUser.id)
              .select(
                `
                id, embedding, first_seen_at, last_seen_at, access_count, last_accessed_zones,
                status_id, alert_triggered, expires_at, potential_match_user_id, face_image_url,
                ai_action, consecutive_denied_accesses
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
                similarity: logEntry.confidence_score,
                role_details: null,
                status_details: { id: updatedObservedUser.status_id, name: 'Estado Desconocido' }, // Se actualizará más abajo
                zones_accessed_details: [],
                observed_details: {
                  // Corregido: 'observed_details'
                  firstSeenAt: updatedObservedUser.first_seen_at,
                  lastSeenAt: updatedObservedUser.last_seen_at,
                  accessCount: updatedObservedUser.access_count,
                  alertTriggered: updatedObservedUser.alert_triggered,
                  expiresAt: updatedObservedUser.expires_at || '',
                  potentialMatchUserId: updatedObservedUser.potential_match_user_id,
                  similarity: matchedObservedUser.similarity,
                  distance: matchedObservedUser.distance,
                  faceImageUrl: updatedObservedUser.face_image_url,
                },
              };
            }
          }
        }
      } else {
        // No se encontró coincidencia en usuarios observados (distancia muy alta)
        console.log('No se encontró coincidencia en usuarios registrados. Registrando como nuevo usuario observado...');
        logEntry.match_status = 'no_match_found_observed';

        // 3. Registrar como nuevo usuario observado
        const { data: newObservedUser, error: insertError } = await supabaseClient
          .from('observed_users')
          .insert({
            embedding: faceEmbedding,
            status_id: NEW_OBSERVED_USER_STATUS_ID,
            last_accessed_zones: [zoneId],
            face_image_url: imageData, // Guarda la imagen en Base64
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expira en 7 días
          })
          .select(
            `
            id, embedding, first_seen_at, last_seen_at, access_count, last_accessed_zones,
            status_id, alert_triggered, expires_at, potential_match_user_id, face_image_url,
            ai_action, consecutive_denied_accesses
          `
          )
          .maybeSingle();

        if (insertError) {
          console.error('❌ ERROR inserting new observed user:', insertError);
          throw insertError;
        }

        if (newObservedUser) {
          userMatchDetails = {
            id: newObservedUser.id,
            full_name: `Nuevo Observado ${newObservedUser.id.substring(0, 8)}`,
            user_type: 'observed',
            hasAccess: true, // Acceso concedido para nuevos observados
            similarity: 0, // No hay similitud inicial
            role_details: null,
            status_details: { id: newObservedUser.status_id, name: 'Estado Desconocido' }, // Se actualizará más abajo
            zones_accessed_details: [],
            observed_details: {
              // Corregido: 'observed_details'
              firstSeenAt: newObservedUser.first_seen_at,
              lastSeenAt: newObservedUser.last_seen_at,
              accessCount: newObservedUser.access_count,
              alertTriggered: newObservedUser.alert_triggered,
              expiresAt: newObservedUser.expires_at || '',
              potentialMatchUserId: newObservedUser.potential_match_user_id,
              similarity: 0,
              distance: 0,
              faceImageUrl: newObservedUser.face_image_url,
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
      console.log('No se encontró ninguna coincidencia. Acceso denegado.');
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
    // Esto es para enriquecer la respuesta del frontend con los nombres de los estados/roles
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

    // Si logEntry ya se ha modificado (ej. se asignó user_id o observed_user_id),
    // queremos mantener esos valores para el log final del error.
    // Solo actualizamos las propiedades relacionadas con el error.
    const finalLogEntry = {
      ...logEntry, // Copia el estado actual de logEntry
      result: false,
      decision: 'error',
      reason: `Validation failed due to unhandled internal error: ${errorMessage}`,
      match_status: 'unhandled_exception',
    };

    const { error: finalLogInsertError } = await supabaseClient.from('logs').insert([finalLogEntry]); // Usar finalLogEntry
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
