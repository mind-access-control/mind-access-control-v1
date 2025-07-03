// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "get-observed-users" started!');

// Define interfaces para estructuras comunes
interface ItemWithNameAndId {
  id: string;
  name: string;
}

// Interfaz para el resultado de la consulta de Supabase (alineada con la tabla 'observed_users')
interface SupabaseObservedUserQueryResult {
  id: string;
  embedding: number[] | null;
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null;
  status_id: string;
  ai_action: string | null;
  face_image_url: string | null;
  expires_at: string;
  alert_triggered: boolean;
  potential_match_user_id: string | null;
  consecutive_denied_accesses: number;
  is_registered: boolean;
}

// Interfaz para el payload de respuesta al frontend
interface ObservedUserForFrontend {
  id: string;
  firstSeen: string;
  lastSeen: string;
  tempAccesses: number;
  accessedZones: ItemWithNameAndId[];
  status: ItemWithNameAndId;
  aiAction: string | null;
  faceImage: string | null;
  alertTriggered: boolean;
  expiresAt: string;
  potentialMatchUserId: string | null;
  consecutiveDeniedAccesses: number;
  isRegistered: boolean; // NUEVO: Añadir la columna isRegistered
}

// Interfaz para la respuesta final de la API, incluyendo los nuevos conteos
interface GetObservedUsersResponse {
  users: ObservedUserForFrontend[];
  totalCount: number; // Este seguirá siendo el conteo para la tabla filtrada/paginada
  absoluteTotalCount: number; // Conteo total real sin aplicar filtros
  pendingReviewCount: number;
  highRiskCount: number;
  activeTemporalCount: number;
  expiredCount: number;
}

// Auxiliar para manejar errores con mensaje
interface ErrorWithMessage {
  message: string;
}

// Función de guardia para TypeScript para verificar si un error tiene una propiedad 'message'.
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as ErrorWithMessage).message === 'string';
}

serve(async (req: Request): Promise<Response> => {
  // Configuración de CORS para solicitudes OPTIONS (preflight).
  if (req.method === 'OPTIONS') {
    console.log('DEBUG: Handling OPTIONS preflight request for get-observed-users');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    });
  }

  // Inicializar clientes de Supabase.
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
    },
  });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const searchTerm = searchParams.get('searchTerm') || '';
    const filterType = searchParams.get('filterType') || '';

    const offset = (page - 1) * pageSize;

    // --- Obtener el catálogo de estados ---
    const { data: statusCatalogData, error: statusCatalogError } = await supabaseAdmin.from('user_statuses_catalog').select('id, name');

    if (statusCatalogError || !statusCatalogData) {
      console.error('Error fetching status catalog:', statusCatalogError);
      throw new Error('Failed to fetch user status catalog for mapping.');
    }
    const statusMap = new Map<string, string>();
    statusCatalogData.forEach((status) => statusMap.set(status.id, status.name));

    const activeTemporalStatusId = statusCatalogData.find((s) => s.name === 'active_temporal')?.id;
    const blockedStatusId = statusCatalogData.find((s) => s.name === 'blocked')?.id;
    const expiredStatusId = statusCatalogData.find((s) => s.name === 'expired')?.id;
    const activeStatusId = statusCatalogData.find((s) => s.name === 'active')?.id; // ID para usuarios registrados

    // Verificación de IDs esenciales
    if (!activeTemporalStatusId || !blockedStatusId || !expiredStatusId || !activeStatusId) {
      console.error('Essential status IDs not found in catalog (active_temporal, blocked, expired, active).');
      throw new Error('Missing essential status IDs for dashboard cards or expiration logic.');
    }

    // --- LÓGICA PARA ACTUALIZAR ESTADO A 'EXPIRED' ---
    const now = new Date();
    // Encuentra usuarios 'active_temporal' cuya fecha de expiración ha pasado
    const { data: usersToExpire, error: expireError } = await supabaseAdmin
      .from('observed_users')
      .select('id')
      .eq('status_id', activeTemporalStatusId)
      .lt('expires_at', now.toISOString()); // Comparar con la fecha y hora actual

    if (expireError) {
      console.error('Error fetching users to expire:', expireError);
      // No lanzamos error fatal aquí, solo registramos y continuamos
    } else if (usersToExpire && usersToExpire.length > 0) {
      const userIdsToExpire = usersToExpire.map((u) => u.id);
      console.log(`Attempting to expire ${userIdsToExpire.length} users:`, userIdsToExpire);
      // Actualizar el estado de estos usuarios a 'expired'
      const { error: updateError } = await supabaseAdmin.from('observed_users').update({ status_id: expiredStatusId }).in('id', userIdsToExpire);

      if (updateError) {
        console.error('Error updating users to expired status:', updateError);
      } else {
        console.log(`Successfully expired ${userIdsToExpire.length} users.`);
      }
    }

    // --- Obtener TODO el catálogo de zonas para mapear IDs a nombres ---
    const { data: zonesCatalogData, error: zonesCatalogError } = await supabaseAdmin.from('zones').select('id, name');

    if (zonesCatalogError || !zonesCatalogData) {
      console.error('Error fetching zones catalog:', zonesCatalogError);
      throw new Error('Failed to fetch zones catalog for mapping.');
    }
    const zonesMap = new Map<string, string>();
    zonesCatalogData.forEach((zone) => zonesMap.set(zone.id, zone.name));

    // --- Obtener conteo TOTAL GENERAL de la base de datos (sin filtros de tabla, pero excluyendo registrados) ---
    const { count: totalCountFromDb, error: countError } = await supabaseAdmin
      .from('observed_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_registered', false); // NUEVO: Excluir usuarios ya registrados del conteo total

    if (countError) {
      console.error('Error fetching total observed users count:', countError);
      throw countError;
    }

    // Conteo para "Pending Review": Usuarios con active_temporal y más de 5 accesos.
    const { count: pendingReviewCount, error: pendingReviewError } = await supabaseAdmin
      .from('observed_users')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', activeTemporalStatusId)
      .gt('access_count', 5)
      .eq('is_registered', false); // NUEVO: Excluir usuarios ya registrados

    if (pendingReviewError) {
      console.error('Error fetching pending review count:', pendingReviewError);
      throw pendingReviewError;
    }

    // Conteo para "High Risk": solo 'alert_triggered = true' y NO 'blocked' o 'active'
    const { count: highRiskCount, error: highRiskError } = await supabaseAdmin
      .from('observed_users')
      .select('*', { count: 'exact', head: true })
      .eq('alert_triggered', true)
      .not('status_id', 'in', `(${blockedStatusId},${activeStatusId})`)
      .eq('is_registered', false); // NUEVO: Excluir usuarios ya registrados

    if (highRiskError) {
      console.error('Error fetching high risk count:', highRiskError);
      throw highRiskError;
    }

    const { count: activeTemporalCount, error: activeTemporalError } = await supabaseAdmin
      .from('observed_users')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', activeTemporalStatusId)
      .eq('is_registered', false); // NUEVO: Excluir usuarios ya registrados

    if (activeTemporalError) {
      console.error('Error fetching active temporal count:', activeTemporalError);
      throw activeTemporalError;
    }

    const { count: expiredCount, error: expiredError } = await supabaseAdmin
      .from('observed_users')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', expiredStatusId)
      .eq('is_registered', false); // NUEVO: Excluir usuarios ya registrados

    if (expiredError) {
      console.error('Error fetching expired count:', expiredError);
      throw expiredError;
    }

    // --- CONSTRUIR LAS CONSULTAS DE DATOS Y CONTEO POR SEPARADO (para la tabla filtrada) ---
    let dataQuery = supabaseAdmin
      .from('observed_users')
      .select(
        `
        id,
        embedding,
        first_seen_at,
        last_seen_at,
        access_count,
        last_accessed_zones,
        status_id,
        ai_action,
        face_image_url,
        expires_at,
        alert_triggered,
        potential_match_user_id,
        consecutive_denied_accesses,
        is_registered  
      `
      )
      .order('last_seen_at', { ascending: false });

    let countQueryForTable = supabaseAdmin.from('observed_users').select('*', {
      count: 'exact',
      head: true,
    });

    // Filtro BASE: Excluir usuarios ya registrados de la tabla principal
    dataQuery = dataQuery.eq('is_registered', false);
    countQueryForTable = countQueryForTable.eq('is_registered', false);

    // Aplicar filtro basado en filterType a AMBAS consultas (de datos y de conteo para la tabla)
    if (filterType === 'pendingReview' && activeTemporalStatusId) {
      // Filtro para "Pending Review": active_temporal y más de 5 accesos
      dataQuery = dataQuery.eq('status_id', activeTemporalStatusId).gt('access_count', 5);
      countQueryForTable = countQueryForTable.eq('status_id', activeTemporalStatusId).gt('access_count', 5);
    } else if (filterType === 'highRisk' && blockedStatusId && activeStatusId) {
      // Filtro para 'High Risk' en la tabla: solo 'alert_triggered = true' y NO 'blocked' o 'active'
      dataQuery = dataQuery.eq('alert_triggered', true).not('status_id', 'in', `(${blockedStatusId},${activeStatusId})`);
      countQueryForTable = countQueryForTable.eq('alert_triggered', true).not('status_id', 'in', `(${blockedStatusId},${activeStatusId})`);
    } else if (filterType === 'activeTemporal' && activeTemporalStatusId) {
      dataQuery = dataQuery.eq('status_id', activeTemporalStatusId);
      countQueryForTable = countQueryForTable.eq('status_id', activeTemporalStatusId);
    } else if (filterType === 'expired' && expiredStatusId) {
      dataQuery = dataQuery.eq('status_id', expiredStatusId);
      countQueryForTable = countQueryForTable.eq('status_id', expiredStatusId);
    }

    // Obtener el conteo TOTAL FILTRADO para la tabla
    const { count: filteredUsersCountForTable, error: filteredCountError } = await countQueryForTable;

    if (filteredCountError) {
      console.error('Error fetching filtered users count for table:', filteredCountError);
      throw filteredCountError;
    }

    // Obtener los datos paginados
    const { data: observedUsersData, error: usersError } = await dataQuery.range(offset, offset + pageSize - 1);

    if (usersError) {
      console.error('Error fetching observed users data (main query):', usersError);
      throw usersError;
    }

    const processedUsers: ObservedUserForFrontend[] = observedUsersData.map((user: SupabaseObservedUserQueryResult) => {
      const statusName = statusMap.get(user.status_id) || 'Unknown';
      const statusDetails: ItemWithNameAndId = {
        id: user.status_id,
        name: statusName,
      };

      const accessedZones: ItemWithNameAndId[] = (user.last_accessed_zones || []).map((zoneId) => {
        const zoneName = zonesMap.get(zoneId) || `Unknown Zone (${zoneId.substring(0, 4)}...)`;
        return { id: zoneId, name: zoneName };
      });

      return {
        id: user.id,
        firstSeen: new Date(user.first_seen_at).toLocaleString(),
        lastSeen: new Date(user.last_seen_at).toLocaleString(),
        tempAccesses: user.access_count,
        accessedZones: accessedZones,
        status: statusDetails,
        aiAction: user.ai_action,
        faceImage: user.face_image_url,
        alertTriggered: user.alert_triggered,
        expiresAt: user.expires_at,
        potentialMatchUserId: user.potential_match_user_id,
        consecutiveDeniedAccesses: user.consecutive_denied_accesses,
        isRegistered: user.is_registered,
      };
    });

    let finalFilteredUsers = processedUsers;
    if (searchTerm && !filterType) {
      // Aplicar searchTerm solo si no hay un filterType activo de card
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      finalFilteredUsers = processedUsers.filter((user) => {
        const matchesId = user.id.toLowerCase().includes(lowerCaseSearchTerm);
        const matchesAiAction = user.aiAction && user.aiAction.toLowerCase().includes(lowerCaseSearchTerm);
        const matchesStatusName = user.status.name.toLowerCase().includes(lowerCaseSearchTerm);
        // También buscar en los nombres de zona completos
        const matchesAccessedZoneName = user.accessedZones.some((zone) => zone.name.toLowerCase().includes(lowerCaseSearchTerm));

        return matchesId || matchesAiAction || matchesStatusName || matchesAccessedZoneName;
      });
    }

    const finalTotalCountForTable = filterType || searchTerm ? filteredUsersCountForTable : totalCountFromDb;

    return new Response(
      JSON.stringify({
        users: finalFilteredUsers,
        totalCount: finalTotalCountForTable, // Este es el conteo para la tabla (filtrado o total)
        absoluteTotalCount: totalCountFromDb, // Este es siempre el conteo global
        pendingReviewCount: pendingReviewCount,
        highRiskCount: highRiskCount,
        activeTemporalCount: activeTemporalCount,
        expiredCount: expiredCount,
      } as GetObservedUsersResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred while fetching observed users.';
    if (isErrorWithMessage(error)) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('Unhandled error in get-observed-users Edge Function:', error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
