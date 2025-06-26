// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log('Edge Function "get-observed-users" started!');

// Define interfaces para estructuras comunes
interface ItemWithNameAndId {
  id: string;
  name: string;
}

// Interfaz para el resultado de la consulta de Supabase (con los joins)
interface SupabaseObservedUserQueryResult {
  id: string;
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null;
  status_id: string;
  ai_action: string | null;
  face_image_url: string | null;
  status_catalog: ItemWithNameAndId[] | null; // Es un array porque así lo retorna Supabase a veces en joins
  expires_at: string;
  alert_triggered: boolean;
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
}

// Interfaz para el payload de la solicitud
interface GetObservedUsersPayload {
  searchTerm?: string;
  page: number;
  itemsPerPage: number;
  sortField: string;
  sortDirection: "asc" | "desc";
}

serve(async (req: Request): Promise<Response> => {
  // CORS Preflight
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

  // Cliente con service_role_key para operaciones de escritura (actualización de estados)
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

  // Cliente con anon_key para operaciones de lectura (RPCs, selects de catálogos sin auth especial)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    },
  );

  try {
    const {
      searchTerm = "",
      page = 1,
      itemsPerPage = 10,
      sortField = "lastSeen",
      sortDirection = "desc",
    }: GetObservedUsersPayload = await req.json();

    const offset = (page - 1) * itemsPerPage;

    let dbSortField: string;
    switch (sortField) {
      case "firstSeen":
        dbSortField = "first_seen_at";
        break;
      case "lastSeen":
        dbSortField = "last_seen_at";
        break;
      case "tempAccesses":
        dbSortField = "access_count";
        break;
      case "aiAction":
        dbSortField = "ai_action";
        break;
      case "status":
        dbSortField = "status_catalog.name";
        break;
      case "id":
        dbSortField = "id";
        break;
      case "accessedZones":
      default:
        dbSortField = "last_seen_at";
    }

    // --- Obtener TODOS los IDs y nombres de estados del catálogo de una vez ---
    const { data: allStatusCatalog, error: statusCatalogError } =
      await supabaseAdmin
        .from("user_statuses_catalog")
        .select("id, name");

    if (statusCatalogError || !allStatusCatalog) {
      console.error(
        "❌ Error fetching all user_statuses_catalog:",
        statusCatalogError,
      );
      throw new Error("Failed to retrieve all user status definitions.");
    }

    // Crear un mapa para una búsqueda eficiente de nombres de estado por ID
    const statusNameMap = new Map<string, string>();
    allStatusCatalog.forEach((s) => statusNameMap.set(s.id, s.name));

    // Obtener IDs de estados específicos necesarios para la lógica de expiración
    const activeTemporalStatusId = allStatusCatalog.find((s) =>
      s.name === "active_temporal"
    )?.id;
    const expiredStatusId = allStatusCatalog.find((s) => s.name === "expired")
      ?.id;

    if (!activeTemporalStatusId || !expiredStatusId) {
      console.error(
        "❌ Missing required status IDs (active_temporal, expired) in user_statuses_catalog for auto-expiration logic.",
      );
      // Este error indica un problema en la configuración de la base de datos de estados.
      // No es fatal si no existen otros estados, pero sí si faltan estos dos.
    }

    // --- Consulta principal de observed_users (usando supabaseAdmin porque vamos a actualizar) ---
    let query = supabaseAdmin
      .from("observed_users")
      .select(
        `
        id,
        first_seen_at,
        last_seen_at,
        access_count,
        last_accessed_zones, 
        status_id,
        ai_action,
        face_image_url,
        expires_at,      
        alert_triggered, 
        status_catalog:user_statuses_catalog(id, name)
      `,
        { count: "exact" },
      );

    // Aplicar término de búsqueda si existe (filtrado en la DB antes de traer datos)
    if (searchTerm) {
      const lowerCaseSearchTerm = `%${searchTerm.toLowerCase()}%`;
      query = query.or(
        `id.ilike.${lowerCaseSearchTerm},` +
          `ai_action.ilike.${lowerCaseSearchTerm},` +
          `status_catalog.name.ilike.${lowerCaseSearchTerm}`,
      );
    }

    query = query.order(dbSortField, { ascending: sortDirection === "asc" });
    query = query.range(offset, offset + itemsPerPage - 1);

    const { data, error, count: totalCountFromDb } = await query;

    if (error) {
      console.error("Error fetching observed users (main query):", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Castear los datos de la base de datos a nuestro tipo de interfaz
    const observedUsersRawData = (data as unknown[]).map((item) =>
      item as SupabaseObservedUserQueryResult
    );

    const usersToUpdateStatus: string[] = []; // Usamos const como sugiere el linter
    const now = new Date();

    // --- Lógica para validar y actualizar estados 'expired' y pre-procesar datos ---
    const allUniqueZoneIds: string[] = [];

    const processedDataForFrontend = observedUsersRawData.map((dbUser) => {
      let currentStatusId = dbUser.status_id;
      const userExpiresAt = new Date(dbUser.expires_at);

      // Si el usuario es active_temporal y la fecha de expiración ha pasado
      if (currentStatusId === activeTemporalStatusId && userExpiresAt < now) {
        currentStatusId = expiredStatusId; // Actualizar estado a 'expired' para la respuesta
        usersToUpdateStatus.push(dbUser.id); // Añadir a la lista para actualización por lotes en DB
      }

      // Recolectar zone IDs
      if (dbUser.last_accessed_zones) {
        dbUser.last_accessed_zones.forEach((zoneId) => {
          if (!allUniqueZoneIds.includes(zoneId)) {
            allUniqueZoneIds.push(zoneId);
          }
        });
      }

      // Devolver una versión modificada del usuario con el status_id actualizado si aplica
      return {
        ...dbUser,
        status_id: currentStatusId,
        // Acceder a status_catalog de forma segura, tomando el primer elemento si es array, y obteniendo el nombre del mapa
        status_catalog: {
          id: currentStatusId,
          name: statusNameMap.get(currentStatusId) || "unknown",
        },
      };
    });

    // --- Realizar la actualización por lotes si hay usuarios que expirar en la DB ---
    if (usersToUpdateStatus.length > 0) {
      console.log(
        `Updating status to 'expired' for ${usersToUpdateStatus.length} observed users in DB.`,
      );
      const { error: updateError } = await supabaseAdmin
        .from("observed_users")
        .update({ status_id: expiredStatusId })
        .in("id", usersToUpdateStatus);

      if (updateError) {
        console.error("❌ Error updating expired statuses in DB:", updateError);
        // No lanzamos un error fatal aquí, permitimos que la función devuelva los datos ya procesados.
      }
    }

    // --- Obtener nombres reales de las zonas en una sola consulta ---
    // DEBUG: Log the unique zone IDs before fetching
    console.log("DEBUG: Unique Zone IDs to fetch:", allUniqueZoneIds);

    const zoneNamesMap: Map<string, ItemWithNameAndId> = new Map(); // Usamos const
    if (allUniqueZoneIds.length > 0) {
      const { data: zonesData, error: zonesError } = await supabase
        .from("zones")
        .select("id, name")
        .in("id", allUniqueZoneIds);

      // DEBUG: Log the result of fetching zones
      if (zonesError) {
        console.error(
          "❌ Error fetching zone names (supabase.from('zones').select):",
          zonesError,
        );
      } else if (!zonesData || zonesData.length === 0) {
        console.warn(
          "⚠️ No zone names found for the unique IDs in the 'zones' table.",
        );
      } else {
        console.log("DEBUG: Fetched Zone Data:", zonesData);
        zonesData.forEach((zone) =>
          zoneNamesMap.set(zone.id, { id: zone.id, name: zone.name })
        );
        console.log(
          "DEBUG: Populated Zone Names Map:",
          Array.from(zoneNamesMap.entries()),
        );
      }
    } else {
      console.log(
        "DEBUG: No unique zone IDs to fetch. Skipping zone names query.",
      );
    }

    // --- Mapear datos finales para el frontend ---
    const finalMappedUsers: ObservedUserForFrontend[] = processedDataForFrontend
      .map((dbUser) => {
        const statusDetails = dbUser.status_catalog;

        const accessedZonesDetails: ItemWithNameAndId[] =
          (dbUser.last_accessed_zones || []).map((zoneId) => {
            const realZone = zoneNamesMap.get(zoneId);
            // DEBUG: Log what happens for each zone ID lookup
            if (!realZone) {
              console.warn(
                `⚠️ Zone ID ${zoneId} not found in fetched zones. Defaulting to 'Unknown Zone'.`,
              );
            }
            return realZone ? realZone : {
              id: zoneId,
              name: `Unknown Zone (${zoneId.substring(0, 4)}...)`,
            };
          });

        return {
          id: dbUser.id,
          firstSeen: dbUser.first_seen_at,
          lastSeen: dbUser.last_seen_at,
          tempAccesses: dbUser.access_count,
          accessedZones: accessedZonesDetails,
          status: statusDetails || { id: "unknown", name: "Unknown" },
          aiAction: dbUser.ai_action,
          faceImage: dbUser.face_image_url,
        };
      });

    // El filtro de búsqueda se aplica en la base de datos si searchTerm existe.
    // El filtro final en el array en 'finalFilteredUsers' se mantiene para compatibilidad
    // si se quisiera un filtro post-base de datos, pero podría ser redundante.
    // Mantenemos la lógica de contar finalFilteredUsers.length para searchTerm,
    // que es lo que se envía al frontend.
    let finalFilteredUsers = finalMappedUsers;
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      finalFilteredUsers = finalMappedUsers.filter((user) => {
        const matchesId = user.id.toLowerCase().includes(lowerCaseSearchTerm);
        const matchesAiAction = (user.aiAction || "").toLowerCase().includes(
          lowerCaseSearchTerm,
        );
        const matchesStatusName = user.status.name.toLowerCase().includes(
          lowerCaseSearchTerm,
        );
        const matchesAccessedZoneName = user.accessedZones.some((zone) =>
          zone.name.toLowerCase().includes(lowerCaseSearchTerm)
        );

        return matchesId || matchesAiAction || matchesStatusName ||
          matchesAccessedZoneName;
      });
    }

    return new Response(
      JSON.stringify({
        users: finalFilteredUsers,
        // Si hay searchTerm, totalCount debe ser el de los usuarios filtrados localmente.
        // Si no hay searchTerm, es el total de la DB antes de la paginación.
        totalCount: searchTerm ? finalFilteredUsers.length : totalCountFromDb,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error: unknown) {
    let errorMessage =
      "An unknown error occurred while fetching observed users.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    console.error(
      "Unhandled error in get-observed-users Edge Function:",
      error,
    );

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
