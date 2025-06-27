// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log('Edge Function "manage-observed-user-actions" started!');

// Interfaz para el payload de la solicitud
interface ManageActionPayload {
  observedUserId: string;
  actionType: "block" | "extend" | "register"; // Añadimos 'register' para el futuro
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

  // Crear cliente de Supabase con la service_role key para permisos de escritura
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

  try {
    const { observedUserId, actionType }: ManageActionPayload = await req
      .json();

    if (!observedUserId || !actionType) {
      return new Response(
        JSON.stringify({ error: "Missing observedUserId or actionType." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    let updatePayload: Record<string, unknown> = {}; // Corregido 'any'
    let message = "";

    switch (actionType) {
      case "block": {
        // Obtener el ID del estado 'blocked'
        const { data: statusData, error: statusError } = await supabaseAdmin
          .from("user_statuses_catalog")
          .select("id")
          .eq("name", "blocked")
          .single();

        if (statusError || !statusData) {
          console.error("❌ Error fetching 'blocked' status ID:", statusError);
          return new Response(
            JSON.stringify({
              error: "Blocked status ID not found in catalog.",
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
        updatePayload = { status_id: statusData.id };
        message = `Observed user ${observedUserId} blocked successfully.`;
        break;
      }
      case "extend": {
        // Obtener la fecha de expiración actual del usuario observado
        const { data: observedUser, error: fetchError } = await supabaseAdmin
          .from("observed_users")
          .select("expires_at")
          .eq("id", observedUserId)
          .single();

        if (fetchError || !observedUser) {
          console.error(
            "❌ Error fetching observed user for extend:",
            fetchError,
          );
          return new Response(
            JSON.stringify({ error: "Observed user not found for extension." }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }

        const _currentExpiresAt = new Date(observedUser.expires_at); // Corregido el warning

        // Fetch the 'active_temporal' status ID
        const {
          data: activeTemporalStatusData,
          error: activeTemporalStatusError,
        } = await supabaseAdmin
          .from("user_statuses_catalog")
          .select("id")
          .eq("name", "active_temporal")
          .single();

        if (activeTemporalStatusError || !activeTemporalStatusData) {
          console.error(
            "❌ Error fetching 'active_temporal' status ID:",
            activeTemporalStatusError,
          );
          return new Response(
            JSON.stringify({
              error: "Active temporal status ID not found in catalog.",
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

        const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        updatePayload = {
          expires_at: newExpiresAt.toISOString(),
          status_id: activeTemporalStatusData.id, // <--- ¡AÑADIDO: Actualizar el status_id!
        };
        message =
          `Observed user ${observedUserId} access extended successfully. New expiry: ${newExpiresAt.toLocaleString()}`;
        break;
      }
      // case "register": {
      //   // TODO: Lógica para registrar usuario (más compleja)
      //   // Esto implicaría crear un nuevo registro en 'users',
      //   // migrar el embedding y la imagen, y luego eliminar el observed_user.
      //   // Por ahora, solo es un placeholder.
      //   message = `Action 'register' for user ${observedUserId} is not yet implemented.`;
      //   break;
      // }
      default:
        return new Response(
          JSON.stringify({ error: `Invalid action type: ${actionType}` }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("observed_users")
        .update(updatePayload)
        .eq("id", observedUserId);

      if (updateError) {
        console.error(
          `❌ Error updating observed user ${observedUserId}:`,
          updateError,
        );
        return new Response(
          JSON.stringify({
            error: `Failed to update observed user: ${updateError.message}`,
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
    }

    console.log(
      `✅ Action '${actionType}' completed for observed user ID: ${observedUserId}`,
    );
    return new Response(
      JSON.stringify({ message: message }),
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
      "An unknown error occurred in manage-observed-user-actions.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    console.error(
      "🔥 Unhandled error in manage-observed-user-actions Edge Function:",
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
