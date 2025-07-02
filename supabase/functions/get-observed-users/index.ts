// Importar las dependencias necesarias usando los alias definidos en deno.json.
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

console.log('Edge Function "get-observed-user-logs" started!');

// --- Definiciones de Tipos ---
interface ItemWithNameAndId {
  id: string;
  name: string;
}

// Interfaz para los datos crudos que vienen de la consulta inicial de logs (sin joins anidados)
interface RawLogQueryResult {
  id: string;
  timestamp: string;
  observed_user_id: string;
  decision: string;
  match_status: string | null;
  requested_zone_id: string | null; // Puede ser null según tu esquema
}

// Interfaz para el resultado de la consulta de Supabase (alineada con la tabla 'observed_users' para obtener is_registered)
interface SupabaseObservedUserForLogQueryResult {
  id: string;
  face_image_url: string | null;
  is_registered: boolean; // NUEVO: Añadir la columna is_registered
}

interface ObservedLog {
  id: string; // ID del log (de la tabla 'logs')
  timestamp: string;
  observedUserId: string; // ID del usuario observado (de 'observed_users')
  faceImageUrl: string | null; // URL de la última foto del usuario observado (viene de observed_users)
  zone: ItemWithNameAndId; // Objeto {id, name} de la tabla 'zones'
  status: ItemWithNameAndId; // Objeto {id, name} - Inferido de 'decision'
  aiAction: string | null; // Acción sugerida por la IA (inferido de 'match_status')
  isRegistered: boolean; // NUEVO: Indicar si el usuario observado está registrado
}

interface GetObservedLogsResponse {
  logs: ObservedLog[];
  totalCount: number;
}

// Función de guardia de tipo para verificar si un error es un Error con un mensaje
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: string }).message === "string"
  );
}

// --- Configuración de CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Permite cualquier origen. En producción, deberías restringirlo a tu dominio.
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

// --- Manejador de Solicitudes HTTP ---
serve(async (req) => {
  // Manejar solicitudes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`Received request for ${req.url} with method ${req.method}`);

  try {
    const { url } = req;
    const { searchParams } = new URL(url);

    // Obtener parámetros de la URL
    const searchTerm = searchParams.get("searchTerm") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortDirection = searchParams.get("sortDirection") || "desc"; // Solo se usará para timestamp
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    // Inicializar cliente Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // --- Lógica de Consulta a la Base de Datos ---
    // 1. Consulta inicial para obtener los logs y sus IDs relacionados
    let logsQuery = supabase
      .from("logs")
      .select(
        `
        id,
        timestamp,
        observed_user_id,
        decision,
        match_status,
        requested_zone_id
      `,
        { count: "exact" },
      )
      .not("observed_user_id", "is", null); // Filtrar solo logs de usuarios observados

    // Filtrar por searchTerm (solo por observed_user_id si es un UUID)
    if (searchTerm) {
      if (
        searchTerm.match(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        )
      ) {
        logsQuery = logsQuery.eq("observed_user_id", searchTerm);
      }
    }

    // Aplicar filtros de fecha si están presentes
    if (startDate) {
      logsQuery = logsQuery.gte("timestamp", startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      logsQuery = logsQuery.lt("timestamp", endOfDay.toISOString());
    }

    // Ordenar resultados (solo por timestamp en la DB)
    logsQuery = logsQuery.order("timestamp", {
      ascending: sortDirection === "asc",
    });

    // Paginación
    logsQuery = logsQuery.range(offset, offset + limit - 1);

    const { data: rawLogs, error: logsError, count: totalCount } =
      await logsQuery;

    if (logsError) {
      console.error("Supabase logs query error:", logsError);
      return new Response(
        JSON.stringify({
          error: logsError.message || "Database logs query failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const logsToProcess: RawLogQueryResult[] = rawLogs || [];

    // 2. Recopilar todos los IDs de zonas y usuarios observados únicos de los logs
    const uniqueZoneIds = [
      ...new Set(
        logsToProcess.map((log) => log.requested_zone_id).filter((id) =>
          id !== null
        ),
      ),
    ] as string[];
    const uniqueObservedUserIds = [
      ...new Set(logsToProcess.map((log) => log.observed_user_id)),
    ];

    // 3. Consultar los nombres de las zonas
    const zoneMap = new Map<string, ItemWithNameAndId>();
    if (uniqueZoneIds.length > 0) {
      const { data: zonesData, error: zonesError } = await supabase
        .from("zones")
        .select("id, name")
        .in("id", uniqueZoneIds);

      if (zonesError) {
        console.error("Supabase zones query error:", zonesError);
      } else {
        zonesData.forEach((zone) =>
          zoneMap.set(zone.id, { id: zone.id, name: zone.name })
        );
      }
    }

    // 4. Consultar las URLs de las imágenes y el estado de registro de los usuarios observados
    const userDetailsMap = new Map<
      string,
      SupabaseObservedUserForLogQueryResult
    >(); // Map<observed_user_id, { face_image_url, is_registered }>
    if (uniqueObservedUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("observed_users")
        .select("id, face_image_url, is_registered") // NUEVO: Seleccionar is_registered
        .in("id", uniqueObservedUserIds);

      if (usersError) {
        console.error("Supabase observed_users query error:", usersError);
      } else {
        usersData.forEach((user) => {
          userDetailsMap.set(user.id, {
            id: user.id,
            face_image_url: user.face_image_url,
            is_registered: user.is_registered, // Almacenar el estado de registro
          });
        });
      }
    }

    // 5. Mapear los datos al formato de la interfaz ObservedLog del frontend
    const formattedLogs: ObservedLog[] = logsToProcess.map((log) => {
      const zoneInfo = log.requested_zone_id
        ? zoneMap.get(log.requested_zone_id)
        : null;
      const userDetails = userDetailsMap.get(log.observed_user_id);

      const faceImageUrl = userDetails?.face_image_url || null;
      const isRegistered = userDetails?.is_registered || false; // Obtener is_registered, por defecto false

      const statusName = log.decision || "unknown";
      const aiActionName = log.match_status || "N/A";

      // CONSOLE.LOG PARA DEPURAR LA URL DE LA IMAGEN Y ZONA
      console.log(`Processing log ID: ${log.id}`);
      console.log(`  Observed User ID: ${log.observed_user_id}`);
      console.log(
        `  Face Image URL from Map: ${faceImageUrl || "null/undefined"}`,
      );
      console.log(`  Zone Name from Map: ${zoneInfo?.name || "N/A"}`);
      console.log(`  Is Registered: ${isRegistered}`); // NUEVO: Log de is_registered

      return {
        id: log.id,
        timestamp: log.timestamp,
        observedUserId: log.observed_user_id,
        faceImageUrl: faceImageUrl,
        zone: {
          id: zoneInfo?.id || "",
          name: zoneInfo?.name || "N/A",
        },
        status: {
          id: statusName.toLowerCase().replace(/\s/g, "_"),
          name: statusName,
        },
        aiAction: aiActionName,
        isRegistered: isRegistered, // NUEVO: Mapear al frontend
      };
    });

    // Devolver la respuesta
    return new Response(
      JSON.stringify({ logs: formattedLogs, totalCount: totalCount || 0 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred";

    if (isErrorWithMessage(error)) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    console.error("Unhandled error in Edge Function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
