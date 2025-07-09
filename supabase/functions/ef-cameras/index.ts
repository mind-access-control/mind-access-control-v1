import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log('Edge Function "ef-cameras" started!');

interface Zone {
  id: string;
  name: string;
  category: string;
}

interface Camera {
  id: string;
  name: string;
  zone_id: string;
  location?: string;
  zone: Zone;
}

interface CameraResponse {
  success: boolean;
  data?: Camera | Camera[];
  error?: string;
  message?: string;
}

function createCorsResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with, x-request-id",
    },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with, x-request-id",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(req.url);
    const cameraId = url.searchParams.get('id');

    switch (req.method) {
      case "GET":
        if (cameraId) {
          const { data, error } = await supabase
            .from("cameras")
            .select("id, name, zone_id, location, zone:zones(id, name, category)")
            .eq("id", cameraId)
            .single();
          if (error) return createCorsResponse({ success: false, error: error.message }, 404);
          return createCorsResponse({ success: true, data });
        } else {
          const { data, error } = await supabase
            .from("cameras")
            .select("id, name, zone_id, location, zone:zones(id, name, category)")
            .order("name", { ascending: true });
          if (error) return createCorsResponse({ success: false, error: error.message }, 500);
          return createCorsResponse({ success: true, data });
        }
      case "POST": {
        const body = await req.json();
        const { name, zone_id, location } = body;
        if (!name || !zone_id) return createCorsResponse({ success: false, error: "Name and zone_id are required" }, 400);
        const { data, error } = await supabase
          .from("cameras")
          .insert([{ name, zone_id, location }])
          .select("id, name, zone_id, location, zone:zones(id, name, category)")
          .single();
        if (error) return createCorsResponse({ success: false, error: error.message }, 400);
        return createCorsResponse({ success: true, data });
      }
      case "PUT": {
        if (!cameraId) return createCorsResponse({ success: false, error: "Camera ID required" }, 400);
        const body = await req.json();
        const { name, zone_id, location } = body;
        const { data, error } = await supabase
          .from("cameras")
          .update({ name, zone_id, location })
          .eq("id", cameraId)
          .select("id, name, zone_id, location, zone:zones(id, name, category)")
          .single();
        if (error) return createCorsResponse({ success: false, error: error.message }, 400);
        return createCorsResponse({ success: true, data });
      }
      case "DELETE": {
        if (!cameraId) return createCorsResponse({ success: false, error: "Camera ID required" }, 400);
        const { error } = await supabase.from("cameras").delete().eq("id", cameraId);
        if (error) return createCorsResponse({ success: false, error: error.message }, 400);
        return createCorsResponse({ success: true });
      }
      default:
        return createCorsResponse({ error: `Method ${req.method} not allowed` }, 405);
    }
  } catch (error) {
    return createCorsResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
}); 