// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, type PostgrestError as _PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "ef-users" started!');

// Interfaz para elementos de catálogo (roles, estados, zonas)
interface CatalogItem {
  id: string;
  name: string;
  category?: string;
}

// Interfaz para datos de usuario desde la base de datos (solo campos necesarios)
interface UserDataFromDB {
  id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  access_method: string | null;
  created_at: string;
  updated_at: string;
  email: string;
  role_id: string;
  role: string;
  status_id: string;
  status: string;
  zone_ids: string[];
  zones: CatalogItem[];
  face_embeddings: number[];
}

// Interfaz para la estructura de datos de usuario transformada para el frontend
interface TransformedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  status?: string;
  statusId?: string;
  accessZoneIds?: string[];
  accessZones?: string[];  
  faceEmbedding?: number[] | null;
  profilePictureUrl?: string | null;
  accessMethod?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Interfaz para el payload de creación/actualización de usuario
interface UserPayload {
  fullName: string;
  email: string;
  roleId: string;
  statusId: string;
  accessZoneIds: string[];
  faceEmbedding: number[];
  profilePictureUrl?: string;
}

// Interfaz para la solicitud de lista de usuarios (query params)
interface UserListRequest {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  statusId?: string;
  zoneId?: string;
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

// Interfaz para la respuesta paginada
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    applied: Partial<UserListRequest>;
  };
}

// Helper function to create Supabase client
function createSupabaseClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
}

// Helper function to create CORS response
function createCorsResponse(data: unknown, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Helper function to validate and parse query parameters
function parseQueryParams(url: URL): UserListRequest {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  const search = url.searchParams.get('search') || undefined; 
  const roleId = url.searchParams.get('roleId') || undefined;
  const statusId = url.searchParams.get('statusId') || undefined;
  const zoneId = url.searchParams.get('zoneId') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  return {
    page,
    limit,
    search,
    roleId,
    statusId,
    zoneId,
    sortBy: sortBy as 'name' | 'email' | 'role' | 'status' | 'created_at',
    sortOrder: sortOrder as 'asc' | 'desc',
  };
}

// GET: List all users with pagination and filtering or get by ID
async function handleGet(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    const minimal = url.searchParams.get('minimal');
    const supabase = createSupabaseClient();

    // Minimal users list: ?minimal=1
    if (minimal === '1') {
      const { data, error } = await supabase.from('users').select('id, full_name');
      if (error) {
        return createCorsResponse({ error: error.message }, 500);
      }
      return createCorsResponse({ users: data });
    }

    // If userId is provided, get single user from the view
    if (userId) {
      const { data, error } = await supabase
        .from('user_full_details_view')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        return createCorsResponse({ error: error.message }, 500);
      }
      if (!data) {
        return createCorsResponse({ error: 'User not found' }, 404);
      }
      // Map the view row to TransformedUser
      const transformedUser: TransformedUser = {
        id: data.id,
        name: data.full_name || '',
        email: data.email || '',
        role: data.role || '',
        roleId: data.role_id || '',
        status: data.status || '',
        statusId: data.status_id || '',
        accessZoneIds: Array.isArray(data.zone_ids) ? data.zone_ids : [],
        accessZones: data.zones?.map((zone:CatalogItem) => zone.name),
        faceEmbedding: Array.isArray(data.face_embeddings) && data.face_embeddings.length > 0 ? data.face_embeddings : undefined,
        profilePictureUrl: data.profile_picture_url || undefined,
        accessMethod: data.access_method || undefined,
        createdAt: data.created_at || undefined,
        updatedAt: data.updated_at || undefined,
      };
      return createCorsResponse({ user: transformedUser });
    }

    // Parse query parameters for pagination and filtering
    const params = parseQueryParams(url);
    let query = supabase.from('user_full_details_view').select('*', { count: 'exact' });

    // Apply search filter (search in both name and email)
    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
         
    if (params.roleId) {
      query = query.eq('role_id', params.roleId);
    }
    
    if (params.statusId) {
      query = query.eq('status_id', params.statusId);
    }
    
    if (params.zoneId) {
      query = query.contains('zone_ids', [params.zoneId]);
    }
    
    // Apply sorting
    const sortField =
      params.sortBy === 'name'
        ? 'full_name'
        : params.sortBy === 'email'
        ? 'email'
        : params.sortBy === 'role'
        ? 'role'
        : params.sortBy === 'status'
        ? 'status'
        : 'created_at';
    query = query.order(sortField, { ascending: params.sortOrder === 'asc' });
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    console.log('Query params:', params);
    console.log('Offset:', offset, 'Limit:', limit);

    const { data, error, count } = await query;
    if (error) {
      console.error('Database query error:', error);
      return createCorsResponse({ error: error.message }, 500);
    }
    
    console.log('Query result - count:', count, 'data length:', data?.length);
    // Map each row to TransformedUser
    const transformedData: TransformedUser[] = (data || []).map((row: UserDataFromDB) => ({
      id: row.id,
      name: row.full_name || '',
      email: row.email || '',
      role: row.role || '',
      roleId: row.role_id || '',
      status: row.status || '',
      statusId: row.status_id || '',
      accessZoneIds: Array.isArray(row.zone_ids) ? row.zone_ids : [],
      accessZones: row.zones?.map(zone => zone.name),
      faceEmbedding: Array.isArray(row.face_embeddings) && row.face_embeddings.length > 0 ? row.face_embeddings : null,
      profilePictureUrl: row.profile_picture_url || undefined,
      accessMethod: row.access_method || undefined,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    }));
    // Calculate pagination info
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    // Create paginated response
    const response: PaginatedResponse<TransformedUser> = {
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: {
        applied: params,
      },
    };
    return createCorsResponse(response);
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
    const updateFields: Record<string, unknown> = {};
    if (payload.fullName) updateFields.full_name = payload.fullName;
    if (payload.profilePictureUrl) updateFields.profile_picture_url = payload.profilePictureUrl;

    if (payload.roleId) {
      const { data: roleData, error: roleError } = await supabase.from('roles_catalog').select('id').eq('id', payload.roleId).single();

      if (roleError || !roleData) {
        throw new Error(`Role '${payload.roleId}' not found.`);
      }
      updateFields.role_id = roleData.id;
    }

    if (payload.statusId) {
      const { data: statusData, error: statusError } = await supabase.from('user_statuses_catalog').select('id').eq('id', payload.statusId).single();

      if (statusError || !statusData) {
        throw new Error(`Status '${payload.statusId}' not found.`);
      }
      updateFields.status_id = statusData.id;
    }

    updateFields.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase.from('users').update(updateFields).eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    // Update zones if provided
    if (payload.accessZoneIds) {
      // Remove old accesses
      await supabase.from('user_zone_access').delete().eq('user_id', userId);

      // Add new accesses
      const { data: zonesData, error: zonesError } = await supabase.from('zones').select('id, name').in('id', payload.accessZoneIds);

      if (zonesError) {
        throw new Error(`Error fetching access zone IDs: ${zonesError.message}`);
      }

      if (!zonesData || zonesData.length !== payload.accessZoneIds.length) {
        const foundZoneIds = (zonesData || []).map((z: CatalogItem) => z.id);
        const missingZones = payload.accessZoneIds.filter((id: string) => !foundZoneIds.includes(id));
        throw new Error(`Some access zones not found: ${missingZones.join(', ')}`);
      }

      const resolvedZoneIds = zonesData.map((zone: CatalogItem) => zone.id);
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

    // Get user's profile picture URL before deletion
    const { data: userData, error: userError } = await supabase.from('users').select('profile_picture_url').eq('id', userId).single();

    if (userError) {
      console.warn(`Could not fetch user data for storage cleanup: ${userError.message}`);
    }

    // Delete profile picture from storage if it exists
    if (userData?.profile_picture_url) {
      try {
        // Extract filename from URL (e.g., "http://.../face-images/userId.jpeg" -> "userId.jpeg")
        const urlParts = userData.profile_picture_url.split('/');
        const filename = urlParts[urlParts.length - 1];

        console.log(`🗑️ Deleting profile picture: ${filename}`);

        const { error: storageError } = await supabase.storage.from('face-images').remove([filename]);

        if (storageError) {
          console.warn(`Failed to delete profile picture from storage: ${storageError.message}`);
        } else {
          console.log(`✅ Profile picture deleted from storage: ${filename}`);
        }
      } catch (storageErr) {
        console.warn(`Error during storage cleanup: ${storageErr}`);
      }
    }

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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with, x-request-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Route to appropriate handler based on HTTP method
  switch (req.method) {
    case 'GET':
      return await handleGet(req);
    case 'PUT':
    case 'PATCH':
      return await handlePutPatch(req);
    case 'DELETE':
      return await handleDelete(req);
    default:
      return createCorsResponse({ error: 'Method Not Allowed' }, 405);
  }
});
