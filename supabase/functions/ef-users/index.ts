// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, type PostgrestError as _PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "ef-users" started!');

// --- Interfaces para Tipado de Datos ---

// Interfaz para elementos de catálogo (roles, estados, zonas)
interface CatalogItem {
  id: string;
  name: string;
}

// ¡CAMBIO CLAVE! Interfaz para la estructura de acceso a zonas desde la base de datos
// Ahora 'zones' es un array de CatalogItem, reflejando cómo Supabase lo devuelve en el join
interface UserZoneAccessDB {
  zones: CatalogItem[]; // Es un array, incluso si solo hay una zona
}

// Interfaz para la estructura de la cara (embedding)
interface FaceDB {
  embedding: number[];
}

// ¡CAMBIO CLAVE! Interfaz para la estructura de datos de usuario tal como viene de la consulta Supabase JOINED
// Supabase a menudo devuelve las relaciones como arrays, incluso si solo hay un elemento.
interface UserDataFromDB {
  id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  access_method: string | null;
  created_at: string;
  updated_at: string;
  // Estos ahora son arrays, ya que Supabase puede aplanarlos así en la respuesta REST
  roles_catalog: CatalogItem[] | null; // Puede ser un array de un solo elemento
  user_statuses_catalog: CatalogItem[] | null; // Puede ser un array de un solo elemento
  user_zone_access: UserZoneAccessDB[]; // Array de objetos que contienen arrays de zonas
  faces: FaceDB[];
}

// Interfaz para la estructura de datos de usuario transformada para el frontend
interface TransformedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  accessZones: string[]; // Array de nombres de zonas
  faceEmbedding?: number[];
  profilePictureUrl?: string | null;
}

// Interfaz para el payload de creación/actualización de usuario
interface UserPayload {
  fullName: string;
  email: string;
  roleName: string;
  statusName: string;
  accessZoneNames: string[];
  faceEmbedding: number[];
  profilePictureUrl?: string;
}

// Interfaz para la solicitud de lista de usuarios (query params)
interface UserListRequest {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  zone?: string;
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
    available: {
      roles: CatalogItem[];
      statuses: CatalogItem[];
      zones: CatalogItem[];
    };
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
  const role = url.searchParams.get('role') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const zone = url.searchParams.get('zone') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  return {
    page,
    limit,
    search,
    role,
    status,
    zone,
    sortBy: sortBy as 'name' | 'email' | 'role' | 'status' | 'created_at',
    sortOrder: sortOrder as 'asc' | 'desc',
  };
}

// Helper function to build the query with filters
function buildUserQuery(supabase: ReturnType<typeof createSupabaseClient>, params: UserListRequest) {
  let query = supabase.from('users').select(
    `
    id,
    full_name,
    profile_picture_url,
    access_method,
    created_at,
    updated_at,
    roles_catalog!inner(id, name),
    user_statuses_catalog!inner(id, name),
    user_zone_access!left(zones!inner(id, name)),
    faces!left(embedding)
  `,
    { count: 'exact' }
  );

  // Apply search filter
  if (params.search) {
    query = query.ilike('full_name', `%${params.search}%`);
  }

  // Apply role filter
  if (params.role) {
    query = query.eq('roles_catalog.name', params.role);
  }

  // Apply status filter
  if (params.status) {
    query = query.eq('user_statuses_catalog.name', params.status);
  }

  // Apply zone filter
  if (params.zone) {
    query = query.contains('user_zone_access.zones.name', [params.zone]);
  }

  // Apply sorting
  const sortField =
    params.sortBy === 'name'
      ? 'full_name'
      : params.sortBy === 'email'
      ? 'id' // We'll sort by email later
      : params.sortBy === 'role'
      ? 'roles_catalog.name'
      : params.sortBy === 'status'
      ? 'user_statuses_catalog.name'
      : 'created_at';

  query = query.order(sortField, { ascending: params.sortOrder === 'asc' });

  // Apply pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  return query;
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
      // Explicitly map to only id and full_name
      const minimalUsers = (data || []).map((u: any) => ({ id: u.id, full_name: u.full_name }));
      return createCorsResponse({ users: minimalUsers });
    }

    // If userId is provided, get single user
    if (userId) {
      const query = supabase
        .from('users')
        .select(
          `
        id,
        full_name,
        profile_picture_url,
        access_method,
        created_at,
        updated_at,
        roles_catalog!inner(id, name),
        user_statuses_catalog!inner(id, name),
        user_zone_access!left(zones!inner(id, name)),
        faces!left(embedding)
      `
        )
        .eq('id', userId);

      const { data, error } = await query;
      if (error) {
        return createCorsResponse({ error: error.message }, 500);
      }

      const userData: UserDataFromDB | undefined = data?.[0];
      if (!userData) {
        return createCorsResponse({ error: 'User not found' }, 404);
      }

      // Get user email from auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.warn('Could not fetch auth users:', authError.message);
      }

      // Create a map of user IDs to emails
      const emailMap = new Map<string, string>();
      if (authUsers?.users) {
        authUsers.users.forEach((authUser: { id: string; email?: string }) => {
          if (authUser.email) {
            emailMap.set(authUser.id, authUser.email);
          }
        });
      }

      // Extract unique zone names from the joined data
      // ¡CAMBIO CLAVE! Acceder a access.zones[0].name porque zones es un array
      const zoneNames =
        userData.user_zone_access
          ?.map((access: UserZoneAccessDB) => access.zones?.[0]?.name) // Acceder al primer elemento del array zones
          .filter(Boolean) || [];

      // Transform the data to match the TransformedUser interface
      const transformedUser: TransformedUser = {
        id: userData.id,
        name: userData.full_name || '',
        email: emailMap.get(userData.id) || '',
        // ¡CAMBIO CLAVE! Acceder al primer elemento del array roles_catalog
        role: userData.roles_catalog?.[0]?.name || '',
        accessZones: zoneNames,
        // ¡CAMBIO CLAVE! Acceder al primer elemento del array faces
        faceEmbedding: userData.faces?.[0]?.embedding || undefined,
        profilePictureUrl: userData.profile_picture_url || undefined,
      };

      return createCorsResponse({ user: transformedUser });
    }

    // Parse query parameters for pagination and filtering
    const params = parseQueryParams(url);

    // Build the query with filters
    const query = buildUserQuery(supabase, params);

    const { data, error, count } = await query;
    if (error) {
      return createCorsResponse({ error: error.message }, 500);
    }

    // Get user emails from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.warn('Could not fetch auth users:', authError.message);
    }

    // Create a map of user IDs to emails
    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
      authUsers.users.forEach((authUser: { id: string; email?: string }) => {
        if (authUser.email) {
          emailMap.set(authUser.id, authUser.email);
        }
      });
    }

    // Process the data to group zone access by user
    const userMap = new Map<string, UserDataFromDB>();

    // Group the data by user ID
    data.forEach((row: UserDataFromDB) => {
      const userId = row.id;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          ...row,
          // Asegurarse de que estos sean arrays vacíos si no están presentes
          user_zone_access: row.user_zone_access || [],
          faces: row.faces || [],
          // Asegurarse de que roles_catalog y user_statuses_catalog sean arrays o null
          roles_catalog: row.roles_catalog || null,
          user_statuses_catalog: row.user_statuses_catalog || null,
        });
      }

      const user = userMap.get(userId)!;

      // Add zone access if it exists (y si es un array válido)
      if (row.user_zone_access && Array.isArray(row.user_zone_access)) {
        user.user_zone_access.push(...row.user_zone_access);
      }

      // Add face embedding if it exists (y si es un array válido)
      if (row.faces && Array.isArray(row.faces)) {
        user.faces.push(...row.faces);
      }
    });

    // Transform the data to match the TransformedUser interface
    const transformUser = (user: UserDataFromDB): TransformedUser | null => {
      if (!user) return null;

      // Extract unique zone names
      // ¡CAMBIO CLAVE! Acceder a access.zones[0].name porque zones es un array
      const zoneNames = [...new Set(user.user_zone_access.map((access) => access.zones?.[0]?.name))];

      return {
        id: user.id,
        name: user.full_name || '',
        email: emailMap.get(user.id) || '',
        // ¡CAMBIO CLAVE! Acceder al primer elemento del array roles_catalog
        role: user.roles_catalog?.[0]?.name || '',
        accessZones: zoneNames,
        // ¡CAMBIO CLAVE! Acceder al primer elemento del array faces
        faceEmbedding: user.faces?.[0]?.embedding || undefined,
        profilePictureUrl: user.profile_picture_url || undefined,
      };
    };

    const transformedData = Array.from(userMap.values()).map(transformUser).filter(Boolean) as TransformedUser[];

    // Calculate pagination info
    const total = count || 0;
    const page = params.page || 1;
    const limit = params.limit || 10;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Get available filters
    const { data: roles } = await supabase.from('roles_catalog').select('id, name');
    const { data: statuses } = await supabase.from('user_statuses_catalog').select('id, name');
    const { data: zones } = await supabase.from('zones').select('id, name');

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
        available: {
          roles: roles || [],
          statuses: statuses || [],
          zones: zones || [],
        },
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
      const foundZoneNames = (zonesData || []).map((z: CatalogItem) => z.name);
      const missingZones = payload.accessZoneNames.filter((name: string) => !foundZoneNames.includes(name));
      throw new Error(`Some access zones not found: ${missingZones.join(', ')}`);
    }

    const resolvedZoneIds = zonesData.map((zone: CatalogItem) => zone.id);

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
    const updateFields: Record<string, unknown> = {};
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
        const foundZoneNames = (zonesData || []).map((z: CatalogItem) => z.name);
        const missingZones = payload.accessZoneNames.filter((name: string) => !foundZoneNames.includes(name));
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
