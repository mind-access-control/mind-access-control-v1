// Importar las dependencias necesarias.
// --- LOGGING UTILITY ---
function safeLog(label: string, value: unknown) {
  try {
    console.log(`[register-new-user] ${label}:`, JSON.stringify(value));
  } catch (_e) {
    console.log(`[register-new-user] ${label}:`, value);
  }
}
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, type PostgrestError as _PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "register-new-user" started!');

// Contraseña genérica para el usuario que se creará en Supabase Auth.
// ¡IMPORTANTE! Para un entorno de producción, considera generar una contraseña aleatoria
// o un flujo de "restablecimiento de contraseña" para el primer login del usuario.
const GENERIC_PASSWORD = 'Password123!'; // ¡CAMBIA ESTO POR UNA CONTRASEÑA MÁS SEGURA EN PRODUCCIÓN!

// Interfaz para la estructura del cuerpo de la petición que esperamos del frontend.
interface RegisterUserPayload {
  fullName: string;
  email: string;
  roleName: string;
  statusName: string;
  accessZoneIds: string[];
  faceEmbedding: number[]; // El array de 128 números flotantes
  profilePictureUrl?: string; // Opcional, si se envía la URL de la imagen
  observedUserId?: string; // NUEVO: ID del usuario observado si viene de esa tabla
}

// Define un umbral de similitud para la detección de rostros duplicados.
// Un valor más bajo significa que los embeddings deben ser MUY similares para ser considerados duplicados.
// Este valor debe ser ajustado y probado con tus propios datos.
// Los embeddings de face-api.js suelen usar L2 (Euclidean) distance, donde 0 es idéntico.
const VECTOR_SIMILARITY_THRESHOLD = 0.5; // Ejemplo: Si la distancia es menor a 0.5, se considera un duplicado.

// La función 'serve' de Deno espera una función asíncrona que maneje las peticiones HTTP.
serve(async (req: Request) => {
  // --- Configuración de CORS ---
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*', // Permite peticiones desde cualquier origen (ajustar en producción)
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Métodos permitidos
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with, x-request-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Asegúrate de que la petición sea POST.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Inicialización del Cliente Supabase.
  // Usamos SUPABASE_SERVICE_ROLE_KEY para tener permisos elevados
  // y poder insertar en todas las tablas sin restricciones de RLS por ahora.
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  let payload: RegisterUserPayload;
  let rawBody: unknown;
  try {
    rawBody = await req.json();
    safeLog('Raw request body', rawBody);
    safeLog('typeof rawBody', typeof rawBody);
    // Loguear todas las keys y valores del body crudo
    if (typeof rawBody === 'object' && rawBody !== null) {
      safeLog('Raw body keys', Object.keys(rawBody));
      for (const k of Object.keys(rawBody)) {
        // Tipado seguro para acceso dinámico
        const value = (rawBody as Record<string, unknown>)[k];
        safeLog(`rawBody[${k}]`, value);
      }
    }
    // Si el body viene anidado bajo "data" (ej: { data: { ... } }), desanidar
    let bodyObj = typeof rawBody === 'object' && rawBody !== null ? (rawBody as Record<string, unknown>) : {};
    if ('data' in bodyObj && typeof bodyObj['data'] === 'object' && bodyObj['data'] !== null) {
      safeLog('Body anidado bajo data, usando data como body principal', bodyObj['data']);
      bodyObj = bodyObj['data'] as Record<string, unknown>;
    }
    safeLog('Request body keys', Object.keys(bodyObj));
    for (const k of Object.keys(bodyObj)) {
      safeLog(`bodyObj[${k}]`, bodyObj[k]);
    }
    // Buscar observedUserId en todos los niveles posibles
    let observedUserIdRaw =
      'observedUserId' in bodyObj
        ? bodyObj['observedUserId']
        : 'observed_user_id' in bodyObj
        ? bodyObj['observed_user_id']
        : 'observed_userId' in bodyObj
        ? bodyObj['observed_userId']
        : undefined;
    // Si no está, buscar en rawBody directo
    if (observedUserIdRaw === undefined && typeof rawBody === 'object' && rawBody !== null) {
      observedUserIdRaw =
        'observedUserId' in rawBody
          ? rawBody['observedUserId']
          : 'observed_user_id' in rawBody
          ? rawBody['observed_user_id']
          : 'observed_userId' in rawBody
          ? rawBody['observed_userId']
          : undefined;
    }
    safeLog('observedUserIdRaw', observedUserIdRaw);
    // Si es string no vacío, úsalo, si no undefined
    const observedUserId = typeof observedUserIdRaw === 'string' && observedUserIdRaw.length > 0 ? observedUserIdRaw : undefined;
    payload = {
      fullName: typeof bodyObj['fullName'] === 'string' ? (bodyObj['fullName'] as string) : '',
      email: typeof bodyObj['email'] === 'string' ? (bodyObj['email'] as string) : '',
      roleName: typeof bodyObj['roleName'] === 'string' ? (bodyObj['roleName'] as string) : '',
      statusName: typeof bodyObj['statusName'] === 'string' ? (bodyObj['statusName'] as string) : '',
      accessZoneIds: Array.isArray(bodyObj['accessZoneIds']) ? (bodyObj['accessZoneIds'] as string[]) : [],
      faceEmbedding: Array.isArray(bodyObj['faceEmbedding']) ? (bodyObj['faceEmbedding'] as number[]) : [],
      profilePictureUrl: typeof bodyObj['profilePictureUrl'] === 'string' ? (bodyObj['profilePictureUrl'] as string) : undefined,
      observedUserId,
    };
    safeLog('Request body (normalized)', payload);
    // Validar que los campos esenciales estén presentes en el payload.
    const missingFields = [];
    if (!payload.fullName) missingFields.push('fullName');
    if (!payload.email) missingFields.push('email');
    if (!payload.roleName) missingFields.push('roleName');
    if (!payload.statusName) missingFields.push('statusName');
    if (!payload.accessZoneIds || !Array.isArray(payload.accessZoneIds) || payload.accessZoneIds.length === 0) missingFields.push('accessZoneIds');
    if (!payload.faceEmbedding || !Array.isArray(payload.faceEmbedding) || payload.faceEmbedding.length !== 128) missingFields.push('faceEmbedding');
    if (missingFields.length > 0) {
      safeLog('Missing required fields', missingFields);
      throw new Error('Missing required fields in request body: ' + missingFields.join(', '));
    }
    safeLog('Parsed fields', {
      fullName: payload.fullName,
      email: payload.email,
      roleName: payload.roleName,
      statusName: payload.statusName,
      accessZoneIds: payload.accessZoneIds,
      faceEmbeddingLen: payload.faceEmbedding?.length,
      profilePictureUrl: payload.profilePictureUrl,
      observedUserId: payload.observedUserId,
    });
  } catch (error: unknown) {
    // Manejo de errores de parsing o de campos faltantes.
    let errorMessage = 'Invalid request body';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    safeLog('Error parsing request body or missing fields', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400, // Bad Request
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  let authUserId: string | undefined; // ID del usuario en auth.users

  try {
    // --- NUEVA VALIDACIÓN: Verificar si el embedding facial ya existe ---
    console.log('Checking for duplicate facial embeddings...');

    const { data: similarFaces, error: preciseFacesSearchError } = await supabase.rpc('match_face_embedding', {
      query_embedding: payload.faceEmbedding,
      match_threshold: VECTOR_SIMILARITY_THRESHOLD,
      match_count: 1, // Solo necesitamos saber si hay al menos una coincidencia
    });

    if (preciseFacesSearchError) {
      console.error('Error calling match_face_embedding RPC:', preciseFacesSearchError);
      throw new Error(`Failed to check for duplicate face: ${preciseFacesSearchError.message}`);
    }

    if (similarFaces && similarFaces.length > 0) {
      console.warn(`Duplicate facial embedding detected for user ID: ${similarFaces[0].user_id}. Distance: ${similarFaces[0].distance}`);
      return new Response(
        JSON.stringify({
          error: 'A user with a very similar facial profile already exists. Please contact support if you believe this is an error.',
        }),
        {
          status: 409, // Conflict
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    console.log('No duplicate facial embedding found (or distance above threshold). Proceeding with registration.');

    // --- FIN DE LA VALIDACIÓN DE EMBEDDING DUPLICADO ---

    // 1. Crear usuario en la tabla privada de Supabase Auth (auth.users).
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: GENERIC_PASSWORD,
      options: {
        data: {}, // No guardar metadatos aquí, se guardan en la tabla pública 'users'
      },
    });

    if (authError) {
      console.error('Supabase Auth signUp error:', authError);
      if (authError.message.includes('User already registered')) {
        return new Response(
          JSON.stringify({
            error: 'User with this email is already registered.',
          }),
          {
            status: 409, // Conflict
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      throw new Error(`Authentication user creation failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Authentication user data not returned after signup. User might need email confirmation.');
    }
    authUserId = authData.user.id; // Este es el UUID generado por Supabase Auth
    console.log(`Auth user created with ID: ${authUserId}`);

    // 2. Obtener UUIDs de los catálogos.
    const { data: roleData, error: roleError } = await supabase.from('roles_catalog').select('id').eq('name', payload.roleName).single();

    if (roleError || !roleData) {
      console.error('Error fetching role ID:', roleError);
      throw new Error(`Role "${payload.roleName}" not found in catalog.`);
    }
    const roleId = roleData.id;

    const { data: statusData, error: statusError } = await supabase
      .from('user_statuses_catalog') // Asegúrate que esta es la tabla correcta para estados de usuario
      .select('id')
      .eq('name', payload.statusName)
      .single();

    if (statusError || !statusData) {
      console.error('Error fetching status ID:', statusError);
      throw new Error(`User status "${payload.statusName}" not found in catalog.`);
    }
    const statusId = statusData.id;

    // (Opcional) Validar que los IDs existen en la tabla zones
    const { data: zonesData, error: zonesError } = await supabase.from('zones').select('id').in('id', payload.accessZoneIds);

    if (zonesError) {
      console.error('Error validating zone IDs:', zonesError);
      throw new Error(`Error validating access zone IDs: ${zonesError.message}`);
    }
    if (!zonesData || zonesData.length !== payload.accessZoneIds.length) {
      const foundZoneIds = (zonesData || []).map((z) => z.id);
      const missingZones = payload.accessZoneIds.filter((id) => !foundZoneIds.includes(id));
      throw new Error(`Some access zones not found: ${missingZones.join(', ')}. Please ensure they exist in the 'zones' table.`);
    }
    const resolvedZoneIds = payload.accessZoneIds;
    console.log('Resolved IDs:', { roleId, statusId, resolvedZoneIds });

    // 3. Guardar en la tabla pública de usuarios ('users').
    // Se usa el UUID del usuario de autenticación como ID principal.
    // Se añade observed_user_source_id si el usuario proviene de 'observed_users'.
    const currentTimestamp = new Date().toISOString();

    const { error: publicUserError } = await supabase.from('users').insert([
      {
        id: authUserId, // UUID del usuario de autenticación
        full_name: payload.fullName,
        role_id: roleId,
        status_id: statusId,
        access_method: 'facial', // Asumiendo que siempre es "facial" al registrar desde aquí
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
        profile_picture_url: payload.profilePictureUrl,
        // NUEVO: Almacenar el ID del usuario observado si se proporcionó
        observed_user_source_id: payload.observedUserId || null,
      },
    ]);
    safeLog('Insert public user', { userId: authUserId, observedUserId: payload.observedUserId, publicUserError });
    if (publicUserError) {
      safeLog('Public user data save failed', publicUserError);
      throw new Error(`Public user data save failed: ${publicUserError.message}`);
    }
    safeLog('Public user data saved', { userId: authUserId });

    // 4. Guardar los accesos por zona en la tabla 'user_zone_access'.
    const zoneAccessesToInsert = resolvedZoneIds.map((zoneId) => ({
      user_id: authUserId, // UUID del usuario
      zone_id: zoneId, // UUID de la zona
    }));

    const { error: zoneAccessError } = await supabase.from('user_zone_access').insert(zoneAccessesToInsert);

    if (zoneAccessError) {
      console.error('User zone access save failed:', zoneAccessError);
      throw new Error(`User zone access save failed: ${zoneAccessError.message}`);
    }
    console.log('User zone accesses saved.');

    // 5. Guardar el embedding facial en la tabla 'faces'.
    const { error: faceEmbeddingError } = await supabase.from('faces').insert([
      {
        user_id: authUserId, // UUID del usuario
        embedding: payload.faceEmbedding,
        created_at: new Date().toISOString(),
      },
    ]);

    if (faceEmbeddingError) {
      console.error('Facial embedding save failed:', faceEmbeddingError);
      throw new Error(`Facial embedding save failed: ${faceEmbeddingError.message}`);
    }
    console.log('Facial embedding saved.');

    // --- NUEVO PASO: 6. Actualizar el registro en 'observed_users' si el ID fue proporcionado ---
    if (payload.observedUserId && typeof payload.observedUserId === 'string' && payload.observedUserId.length > 0) {
      safeLog('Attempting to update observed_users', { observedUserId: payload.observedUserId });
      const { data: observedUserUpdate, error: updateObservedError } = await supabase
        .from('observed_users')
        .update({ is_registered: true }) // Establecer la bandera a TRUE
        .eq('id', payload.observedUserId)
        .select();
      safeLog('observed_users update result', { observedUserUpdate, updateObservedError });
      if (updateObservedError) {
        safeLog(`Error updating observed_user ${payload.observedUserId}`, updateObservedError);
        // Este error no debería ser fatal para el registro del usuario, pero es importante loggearlo.
        safeLog(`Failed to mark observed user ${payload.observedUserId} as registered.`, {});
      } else {
        safeLog(`Observed user ${payload.observedUserId} marked as registered.`, observedUserUpdate);
      }
    } else {
      safeLog('No observedUserId provided or invalid', { observedUserId: payload.observedUserId });
    }

    // Si todo es exitoso, devolver una respuesta de éxito.
    return new Response(
      JSON.stringify({
        message: 'User registered successfully!',
        userId: authUserId,
      }),
      {
        status: 200, // OK
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (catchError: unknown) {
    // Manejo centralizado de errores.
    let errorMessage = 'An unexpected error occurred during user registration.';
    if (catchError instanceof Error) {
      errorMessage = catchError.message;
    } else if (typeof catchError === 'string') {
      errorMessage = catchError;
    }

    // Si falló alguna inserción después de crear el usuario de autenticación,
    // podrías querer borrar ese usuario también para evitar "huérfanos".
    // Esto es importante para mantener la consistencia entre auth.users y public.users.
    if (authUserId) {
      console.warn(`Attempting to delete partially created auth user ${authUserId} due to subsequent error.`);
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authUserId);
      if (deleteUserError) {
        console.error(`Failed to delete partially created auth user ${authUserId}:`, deleteUserError);
      }
    }

    console.error('Unhandled error in register-new-user Edge Function:', catchError);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, // Internal Server Error
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
