// Importar las dependencias necesarias.
// 'serve' es para crear un servidor HTTP básico en Deno.
// 'createClient' es el cliente de Supabase para interactuar con tu proyecto.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, type PostgrestError as _PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';

// Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
console.log('Edge Function "users" started!');

// Interfaces for type safety
interface UserPayload {
  fullName: string;
  email: string;
  roleName: string;
  statusName: string;
  accessZoneNames: string[];
  faceEmbedding: number[];
  profilePictureUrl?: string;
}

interface Zone {
  id: string;
  name: string;
}

// Helper function to create Supabase client
function createSupabaseClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
}

// Helper function to create CORS response
function createCorsResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// GET: List all users or get by ID
async function handleGet(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    const supabase = createSupabaseClient();

    let query = supabase.from('users').select(`
            id,
            full_name,
            profile_picture_url,
            access_method,
            created_at,
            updated_at,
            roles_catalog:roles_catalog(id, name),
            user_statuses_catalog:user_statuses_catalog(id, name),
            user_zone_access:user_zone_access(zones:zones(id, name))
          `);

    if (userId) {
      query = query.eq('id', userId).single();
    }

    const { data, error } = await query;
    if (error) {
      return createCorsResponse({ error: error.message }, 500);
    }

    return createCorsResponse({ users: data });
  } catch (err) {
    return createCorsResponse(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}

// POST: Create a new user
async function handlePost(req: Request) {
  try {
    const payload: UserPayload = await req.json();
    const supabase = createSupabaseClient();

    // Validate required fields
    if (!payload.fullName || !payload.email || !payload.roleName || !payload.statusName || !payload.accessZoneNames || !payload.faceEmbedding) {
      throw new Error('Missing required fields in request body.');
    }

    if (!Array.isArray(payload.faceEmbedding) || payload.faceEmbedding.length !== 128) {
      throw new Error('faceEmbedding must be an array of 128 numbers.');
    }

    // 1. Create user in Supabase Auth
    const GENERIC_PASSWORD = 'Password123!';
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: GENERIC_PASSWORD,
      options: { data: {} },
    });

    if (authError) {
      if (authError.message.includes('User already registered')) {
        return createCorsResponse({ error: 'User with this email is already registered.' }, 409);
      }
      throw new Error(`Authentication user creation failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Authentication user data not returned after signup. User might need email confirmation.');
    }

    const authUserId = authData.user.id;

    // 2. Resolve role, status, and zones
    const { data: roleData, error: roleError } = await supabase.from('roles_catalog').select('id').eq('name', payload.roleName).single();

    if (roleError || !roleData) {
      throw new Error(`Role '${payload.roleName}' not found.`);
    }

    const { data: statusData, error: statusError } = await supabase.from('user_statuses_catalog').select('id').eq('name', payload.statusName).single();

    if (statusError || !statusData) {
      throw new Error(`Status '${payload.statusName}' not found.`);
    }

    const { data: zonesData, error: zonesError } = await supabase.from('zones').select('id, name').in('name', payload.accessZoneNames);

    if (zonesError) {
      throw new Error(`Error fetching access zone IDs: ${zonesError.message}`);
    }

    if (!zonesData || zonesData.length !== payload.accessZoneNames.length) {
      const foundZoneNames = (zonesData || []).map((z: Zone) => z.name);
      const missingZones = payload.accessZoneNames.filter((name: string) => !foundZoneNames.includes(name));
      throw new Error(`Some access zones not found: ${missingZones.join(', ')}`);
    }

    const resolvedZoneIds = zonesData.map((zone: Zone) => zone.id);

    // 3. Insert into users table
    const currentTimestamp = new Date().toISOString();
    const { error: publicUserError } = await supabase.from('users').insert([
      {
        id: authUserId,
        full_name: payload.fullName,
        role_id: roleData.id,
        status_id: statusData.id,
        access_method: 'facial',
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
        profile_picture_url: payload.profilePictureUrl,
      },
    ]);

    if (publicUserError) {
      throw new Error(`Public user data save failed: ${publicUserError.message}`);
    }

    // 4. Insert into user_zone_access
    const zoneAccessesToInsert = resolvedZoneIds.map((zoneId: string) => ({
      user_id: authUserId,
      zone_id: zoneId,
    }));

    const { error: zoneAccessError } = await supabase.from('user_zone_access').insert(zoneAccessesToInsert);

    if (zoneAccessError) {
      throw new Error(`User zone access save failed: ${zoneAccessError.message}`);
    }

    // 5. Insert into faces
    const { error: faceEmbeddingError } = await supabase.from('faces').insert([
      {
        user_id: authUserId,
        embedding: payload.faceEmbedding,
        created_at: new Date().toISOString(),
      },
    ]);

    if (faceEmbeddingError) {
      throw new Error(`Facial embedding save failed: ${faceEmbeddingError.message}`);
    }

    return createCorsResponse(
      {
        message: 'User created successfully!',
        userId: authUserId,
      },
      201
    );
  } catch (err) {
    return createCorsResponse(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}

// PUT/PATCH: Update an existing user
async function handlePutPatch(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    if (!userId) {
      throw new Error('User ID is required as a query parameter (id)');
    }

    const payload: Partial<UserPayload> = await req.json();
    const supabase = createSupabaseClient();

    // Update main user fields
    const updateFields: any = {};
    if (payload.fullName) updateFields.full_name = payload.fullName;
    if (payload.profilePictureUrl) updateFields.profile_picture_url = payload.profilePictureUrl;

    if (payload.roleName) {
      const { data: roleData, error: roleError } = await supabase.from('roles_catalog').select('id').eq('name', payload.roleName).single();

      if (roleError || !roleData) {
        throw new Error(`Role '${payload.roleName}' not found.`);
      }
      updateFields.role_id = roleData.id;
    }

    if (payload.statusName) {
      const { data: statusData, error: statusError } = await supabase.from('user_statuses_catalog').select('id').eq('name', payload.statusName).single();

      if (statusError || !statusData) {
        throw new Error(`Status '${payload.statusName}' not found.`);
      }
      updateFields.status_id = statusData.id;
    }

    updateFields.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase.from('users').update(updateFields).eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    // Update zones if provided
    if (payload.accessZoneNames) {
      // Remove old accesses
      await supabase.from('user_zone_access').delete().eq('user_id', userId);

      // Add new accesses
      const { data: zonesData, error: zonesError } = await supabase.from('zones').select('id, name').in('name', payload.accessZoneNames);

      if (zonesError) {
        throw new Error(`Error fetching access zone IDs: ${zonesError.message}`);
      }

      if (!zonesData || zonesData.length !== payload.accessZoneNames.length) {
        const foundZoneNames = (zonesData || []).map((z: Zone) => z.name);
        const missingZones = payload.accessZoneNames.filter((name: string) => !foundZoneNames.includes(name));
        throw new Error(`Some access zones not found: ${missingZones.join(', ')}`);
      }

      const resolvedZoneIds = zonesData.map((zone: Zone) => zone.id);
      const zoneAccessesToInsert = resolvedZoneIds.map((zoneId: string) => ({
        user_id: userId,
        zone_id: zoneId,
      }));

      const { error: zoneAccessError } = await supabase.from('user_zone_access').insert(zoneAccessesToInsert);

      if (zoneAccessError) {
        throw new Error(`User zone access save failed: ${zoneAccessError.message}`);
      }
    }

    // Update face embedding if provided
    if (payload.faceEmbedding && Array.isArray(payload.faceEmbedding) && payload.faceEmbedding.length === 128) {
      // Update or insert face embedding
      const { data: faceData } = await supabase.from('faces').select('id').eq('user_id', userId).single();

      if (faceData) {
        // Update existing
        const { error: faceUpdateError } = await supabase
          .from('faces')
          .update({
            embedding: payload.faceEmbedding,
            created_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (faceUpdateError) {
          throw new Error(`Failed to update face embedding: ${faceUpdateError.message}`);
        }
      } else {
        // Insert new
        const { error: faceInsertError } = await supabase.from('faces').insert([
          {
            user_id: userId,
            embedding: payload.faceEmbedding,
            created_at: new Date().toISOString(),
          },
        ]);

        if (faceInsertError) {
          throw new Error(`Failed to insert face embedding: ${faceInsertError.message}`);
        }
      }
    }

    return createCorsResponse({ message: 'User updated successfully!' });
  } catch (err) {
    return createCorsResponse(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}

// DELETE: Remove a user
async function handleDelete(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    if (!userId) {
      throw new Error('User ID is required as a query parameter (id)');
    }

    const supabase = createSupabaseClient();

    // Delete from faces
    await supabase.from('faces').delete().eq('user_id', userId);

    // Delete from user_zone_access
    await supabase.from('user_zone_access').delete().eq('user_id', userId);

    // Delete from users
    await supabase.from('users').delete().eq('id', userId);

    // Delete from auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    return createCorsResponse({ message: 'User deleted successfully!' });
  } catch (err) {
    return createCorsResponse(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}

// Main serve function
serve(async (req: Request) => {
  // --- Configuración de CORS ---
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Route to appropriate handler based on HTTP method
  switch (req.method) {
    case 'GET':
      return await handleGet(req);
    case 'POST':
      return await handlePost(req);
    case 'PUT':
    case 'PATCH':
      return await handlePutPatch(req);
    case 'DELETE':
      return await handleDelete(req);
    default:
      return createCorsResponse({ error: 'Method Not Allowed' }, 405);
  }
});
