// Import necessary dependencies
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log('Edge Function "ef-zones" started!');

// Type definitions
interface Zone {
  id: string;
  name: string;
  access_level?: number;
  category?: string;
}

interface CreateZoneRequest {
  name: string;
  access_level?: number;
  category?: string;
}

interface UpdateZoneRequest {
  name?: string;
  access_level?: number;
  category?: string;
}

interface ZoneResponse {
  success: boolean;
  data?: Zone | Zone[];
  error?: string;
  message?: string;
}

// Error handling utility
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ErrorWithMessage).message === "string"
  );
}

// CORS response helper
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

// Validation helpers
function validateZoneName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Zone name is required and must be a string';
  }
  if (name.trim().length === 0) {
    return 'Zone name cannot be empty';
  }
  if (name.length > 100) {
    return 'Zone name must be 100 characters or less';
  }
  return null;
}

function validateAccessLevel(accessLevel?: number): string | null {
  if (accessLevel !== undefined && (typeof accessLevel !== 'number' || accessLevel < 0)) {
    return 'Access level must be a non-negative number';
  }
  return null;
}

function validateCategory(category?: string): string | null {
  if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
    return 'Category must be a non-empty string';
  }
  if (category && category.length > 50) {
    return 'Category must be 50 characters or less';
  }
  return null;
}

// Main request handler
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
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

  // Initialize Supabase client with service role for admin operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';
    const zoneId = url.searchParams.get('id');

    console.log(`🔧 Zone management request: ${req.method} ${path}${zoneId ? ` (ID: ${zoneId})` : ''}`);

    // Route based on HTTP method
    switch (req.method) {
      case "GET":
        return await handleGet(req, supabase, zoneId);
      case "POST":
        return await handlePost(req, supabase);
      case "PUT":
      case "PATCH":
        return await handlePutPatch(req, supabase, zoneId);
      case "DELETE":
        return await handleDelete(req, supabase, zoneId);
      default:
        return createCorsResponse(
          { error: `Method ${req.method} not allowed` },
          405
        );
    }
  } catch (error: unknown) {
    console.error("🔥 Unhandled error in manage-zones Edge Function:", error);

    let errorMessage = "An unexpected error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (isErrorWithMessage(error)) {
      errorMessage = error.message;
    }

    return createCorsResponse(
      { error: errorMessage },
      500
    );
  }
});

// GET: Retrieve zones
async function handleGet(req: Request, supabase: any, zoneId?: string | null): Promise<Response> {
  try {
    if (zoneId) {
      // Get specific zone by ID
      const { data, error } = await supabase
        .from("zones")
        .select("id, name, access_level, category")
        .eq("id", zoneId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return createCorsResponse(
            { error: "Zone not found" },
            404
          );
        }
        throw new Error(`Error fetching zone: ${error.message}`);
      }

      return createCorsResponse({
        success: true,
        data,
        message: "Zone retrieved successfully"
      });
    } else {
      // Get all zones
      const { data, error } = await supabase
        .from("zones")
        .select("id, name, access_level, category")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(`Error fetching zones: ${error.message}`);
      }

      return createCorsResponse({
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} zones successfully`
      });
    }
  } catch (error) {
    throw error;
  }
}

// POST: Create new zone
async function handlePost(req: Request, supabase: any): Promise<Response> {
  try {
    const payload: CreateZoneRequest = await req.json();

    // Validate input
    const nameError = validateZoneName(payload.name);
    if (nameError) {
      return createCorsResponse(
        { error: nameError },
        400
      );
    }

    const accessLevelError = validateAccessLevel(payload.access_level);
    if (accessLevelError) {
      return createCorsResponse(
        { error: accessLevelError },
        400
      );
    }

    const categoryError = validateCategory(payload.category);
    if (categoryError) {
      return createCorsResponse(
        { error: categoryError },
        400
      );
    }

    // Check if zone name already exists
    const { data: existingZone, error: checkError } = await supabase
      .from("zones")
      .select("id")
      .eq("name", payload.name.trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking existing zone: ${checkError.message}`);
    }

    if (existingZone) {
      return createCorsResponse(
        { error: "Zone with this name already exists" },
        409
      );
    }

    // Create new zone
    const { data, error } = await supabase
      .from("zones")
      .insert([{
        name: payload.name.trim(),
        access_level: payload.access_level || null,
        category: payload.category || 'General',
      }])
      .select("id, name, access_level, category")
      .single();

    if (error) {
      throw new Error(`Error creating zone: ${error.message}`);
    }

    console.log(`✅ Zone created: ${data.name} (ID: ${data.id})`);

    return createCorsResponse({
      success: true,
      data,
      message: "Zone created successfully"
    }, 201);
  } catch (error) {
    throw error;
  }
}

// PUT/PATCH: Update zone
async function handlePutPatch(req: Request, supabase: any, zoneId?: string | null): Promise<Response> {
  try {
    if (!zoneId) {
      return createCorsResponse(
        { error: "Zone ID is required for updates" },
        400
      );
    }

    const payload: UpdateZoneRequest = await req.json();

    // Validate input
    if (payload.name !== undefined) {
      const nameError = validateZoneName(payload.name);
      if (nameError) {
        return createCorsResponse(
          { error: nameError },
          400
        );
      }
    }

    if (payload.access_level !== undefined) {
      const accessLevelError = validateAccessLevel(payload.access_level);
      if (accessLevelError) {
        return createCorsResponse(
          { error: accessLevelError },
          400
        );
      }
    }

    if (payload.category !== undefined) {
      const categoryError = validateCategory(payload.category);
      if (categoryError) {
        return createCorsResponse(
          { error: categoryError },
          400
        );
      }
    }

    // Check if zone exists
    const { data: existingZone, error: checkError } = await supabase
      .from("zones")
      .select("id, name")
      .eq("id", zoneId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return createCorsResponse(
          { error: "Zone not found" },
          404
        );
      }
      throw new Error(`Error checking zone existence: ${checkError.message}`);
    }

    // Check for name conflicts if name is being updated
    if (payload.name && payload.name.trim() !== existingZone.name) {
      const { data: nameConflict, error: nameCheckError } = await supabase
        .from("zones")
        .select("id")
        .eq("name", payload.name.trim())
        .neq("id", zoneId)
        .single();

      if (nameCheckError && nameCheckError.code !== 'PGRST116') {
        throw new Error(`Error checking name conflict: ${nameCheckError.message}`);
      }

      if (nameConflict) {
        return createCorsResponse(
          { error: "Zone with this name already exists" },
          409
        );
      }
    }

    // Prepare update payload
    const updatePayload: any = {};
    if (payload.name !== undefined) {
      updatePayload.name = payload.name.trim();
    }
    if (payload.access_level !== undefined) {
      updatePayload.access_level = payload.access_level;
    }
    if (payload.category !== undefined) {
      updatePayload.category = payload.category.trim();
    }

    // Update zone
    const { data, error } = await supabase
      .from("zones")
      .update(updatePayload)
      .eq("id", zoneId)
      .select("id, name, access_level, category")
      .single();

    if (error) {
      throw new Error(`Error updating zone: ${error.message}`);
    }

    console.log(`✅ Zone updated: ${data.name} (ID: ${data.id})`);

    return createCorsResponse({
      success: true,
      data,
      message: "Zone updated successfully"
    });
  } catch (error) {
    throw error;
  }
}

// DELETE: Remove zone
async function handleDelete(req: Request, supabase: any, zoneId?: string | null): Promise<Response> {
  try {
    if (!zoneId) {
      return createCorsResponse(
        { error: "Zone ID is required for deletion" },
        400
      );
    }

    // Check if zone exists
    const { data: existingZone, error: checkError } = await supabase
      .from("zones")
      .select("id, name")
      .eq("id", zoneId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return createCorsResponse(
          { error: "Zone not found" },
          404
        );
      }
      throw new Error(`Error checking zone existence: ${checkError.message}`);
    }

    // Check for dependencies (users with access to this zone)
    const { data: userAccess, error: accessCheckError } = await supabase
      .from("user_zone_access")
      .select("user_id")
      .eq("zone_id", zoneId)
      .limit(1);

    if (accessCheckError) {
      throw new Error(`Error checking zone dependencies: ${accessCheckError.message}`);
    }

    if (userAccess && userAccess.length > 0) {
      return createCorsResponse(
        { error: "Cannot delete zone: Users have access to this zone. Remove user access first." },
        409
      );
    }

    // Check for cameras in this zone
    const { data: cameras, error: cameraCheckError } = await supabase
      .from("cameras")
      .select("id")
      .eq("zone_id", zoneId)
      .limit(1);

    if (cameraCheckError) {
      throw new Error(`Error checking camera dependencies: ${cameraCheckError.message}`);
    }

    if (cameras && cameras.length > 0) {
      return createCorsResponse(
        { error: "Cannot delete zone: Cameras are assigned to this zone. Reassign cameras first." },
        409
      );
    }

    // Delete zone
    const { error } = await supabase
      .from("zones")
      .delete()
      .eq("id", zoneId);

    if (error) {
      throw new Error(`Error deleting zone: ${error.message}`);
    }

    console.log(`✅ Zone deleted: ${existingZone.name} (ID: ${zoneId})`);

    return createCorsResponse({
      success: true,
      message: "Zone deleted successfully"
    });
  } catch (error) {
    throw error;
  }
} 