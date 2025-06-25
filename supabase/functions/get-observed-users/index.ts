// Import necessary dependencies.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log('Edge Function "get-observed-users" started!');

// Define interfaces for common structures
interface ItemWithNameAndId {
  id: string;
  name: string;
}

// Interface for the observed_users data directly from DB
interface ObservedUserDB {
  id: string;
  first_seen_at: string; // Exact DB column name
  last_seen_at: string; // Exact DB column name
  access_count: number; // Exact DB column name
  last_accessed_zones: string[] | null; // Exact DB column name
  status_id: string; // Exact DB column name
  ai_action: string | null; // Exact DB column name
  face_image_url: string | null; // Exact DB column name
}

// NEW INTERFACE: Represents the data shape AFTER the Supabase .select() query with joins
interface SupabaseObservedUserQueryResult {
  id: string;
  first_seen_at: string;
  last_seen_at: string;
  access_count: number;
  last_accessed_zones: string[] | null;
  status_id: string;
  ai_action: string | null;
  face_image_url: string | null;
  status_catalog: ItemWithNameAndId | null;
}

// Interface for the response payload to the frontend
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
      sortField = "firstSeen",
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
        dbSortField = "status_id";
        break;
      case "accessedZones":
        dbSortField = "first_seen_at"; // Fallback for complex sort
        break;
      default:
        dbSortField = "first_seen_at";
    }

    let query = supabase
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
        status_catalog:user_statuses_catalog(id, name)
      `,
        { count: "exact" },
      );

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

    const observedUsersForFrontend: ObservedUserForFrontend[] = [];

    if (data) {
      for (
        const dbUser of data as unknown as SupabaseObservedUserQueryResult[]
      ) {
        const statusDetails = dbUser.status_catalog;
        const rawLastAccessedZones = dbUser.last_accessed_zones;

        let accessedZonesDetails: ItemWithNameAndId[] = [];
        if (rawLastAccessedZones && rawLastAccessedZones.length > 0) {
          const { data: zoneNamesData, error: zoneNamesError } = await supabase
            .rpc("get_zone_names_by_ids", {
              zone_ids_array: rawLastAccessedZones,
            });

          if (zoneNamesError) {
            console.error("Error fetching zone names via RPC:", zoneNamesError);
            accessedZonesDetails = [];
          } else {
            accessedZonesDetails = zoneNamesData as ItemWithNameAndId[];
          }
        }

        observedUsersForFrontend.push({
          id: dbUser.id,
          firstSeen: dbUser.first_seen_at,
          lastSeen: dbUser.last_seen_at,
          tempAccesses: dbUser.access_count,
          accessedZones: accessedZonesDetails,
          status: statusDetails || { id: "unknown", name: "Unknown" },
          aiAction: dbUser.ai_action,
          faceImage: dbUser.face_image_url,
        });
      }
    }

    let finalFilteredUsers = observedUsersForFrontend;
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      finalFilteredUsers = observedUsersForFrontend.filter((user) => {
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
  } catch (error: unknown) { // 'error' is the name of the caught variable
    let errorMessage =
      "An unknown error occurred while fetching observed users.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error; // FIX: Changed 'err' to 'error'
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
