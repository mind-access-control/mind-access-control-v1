import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetUserDetailsPayload {
  userId: string;
}

serve(async (req: Request) => {
  // CORS configuration
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  try {
    const payload: GetUserDetailsPayload = await req.json();
    
    if (!payload.userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Get user details from public.users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        profile_picture_url,
        access_method,
        created_at,
        updated_at,
        roles_catalog:roles_catalog(id, name),
        user_statuses_catalog:user_statuses_catalog(id, name),
        user_zone_access:user_zone_access(zones:zones(id, name)),
        faces:faces(embedding, created_at)
      `)
      .eq("id", payload.userId)
      .single();

    if (userError) {
      return new Response(
        JSON.stringify({ error: `User not found: ${userError.message}` }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Get email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(payload.userId);
    
    const userDetails = {
      id: userData.id,
      full_name: userData.full_name,
      email: authUser?.user?.email || "Email not available",
      profile_picture_url: userData.profile_picture_url,
      access_method: userData.access_method,
      role: userData.roles_catalog?.name || "Unknown",
      status: userData.user_statuses_catalog?.name || "Unknown",
      access_zones: userData.user_zone_access?.map((access: any) => access.zones?.name).filter(Boolean) || [],
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      has_face_embedding: userData.faces && userData.faces.length > 0,
      face_embedding_count: userData.faces?.length || 0,
      face_embedding_created: userData.faces?.[0]?.created_at || null
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userDetails 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );

  } catch (error: any) {
    console.error("Error getting user details:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error" 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}); 