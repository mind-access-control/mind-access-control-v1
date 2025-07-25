// Import the necessary dependencies.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "block-observed-user" started!');

// Interface for the expected request payload.
interface BlockUserPayload {
  observedUserId: string; // The ID of the observed user to block.
}

// Helper function to check if an error has a 'message' property.
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

// Function to create a CORS-compliant response for JSON (used for errors).
function createCorsJsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json', // <--- JSON Content-Type
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS.
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with, x-request-id',
    },
  });
}

// Main Deno server function to handle HTTP requests.
serve(async (req: Request) => {
  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return createCorsJsonResponse(null, 204); // Respond with 204 No Content for OPTIONS.
  }

  // Ensure the request method is POST.
  if (req.method !== 'POST') {
    return createCorsJsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  // Initialize Supabase client with elevated permissions (Service Role Key).
  // This allows the function to bypass Row Level Security (RLS) for updates.
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false }, // Do not persist session in Edge Functions.
  });

  let payload: BlockUserPayload;
  try {
    payload = await req.json(); // Parse the request body as JSON.
    if (!payload.observedUserId) {
      throw new Error("Missing 'observedUserId' in request body.");
    }
  } catch (error: unknown) {
    let errorMessage = 'Invalid request body.';
    if (isErrorWithMessage(error)) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('Error parsing request body:', error);
    return createCorsJsonResponse({ error: errorMessage }, 400); // Respond with 400 Bad Request.
  }

  // Define the UUID for the 'blocked' status.
  // Make sure this UUID matches the 'blocked' status in your user_statuses_catalog table.
  const BLOCKED_STATUS_ID = '69b8161c-0196-4687-bacd-e0b766e0a112'; // Use the UUID you provided.

  try {
    // 1. Update the observed_users table.
    // Set is_registered to true (as blocking means it's no longer 'unregistered observed').
    // Set status_id to the 'blocked' status.
    const { data, error } = await supabase
      .from('observed_users')
      .update({
        status_id: BLOCKED_STATUS_ID, // Set status to 'blocked'.
        // REMOVED: updated_at: new Date().toISOString(), // This line was removed based on your feedback
      })
      .eq('id', payload.observedUserId) // Apply update for the specific observed user.
      .select('id') // Select the ID to confirm the update.
      .maybeSingle(); // Expect single or no record.

    if (error) {
      console.error(`Error blocking observed user ${payload.observedUserId}:`, error);
      throw new Error(`Failed to block user: ${error.message}`);
    }

    if (!data) {
      // If user not found, return JSON response.
      return createCorsJsonResponse({ message: `Observed user ${payload.observedUserId} not found.` }, 404);
    }

    console.log(`Observed user ${payload.observedUserId} successfully blocked.`);

    // Return an HTML success page.
    return new Response(
      `
<!DOCTYPE html>
<html>
<head>
  <title>Usuario Bloqueado</title>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      text-align: center;
      padding: 50px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
    }
    .success-icon {
      font-size: 60px;
      margin-bottom: 20px;
    }
    h2 {
      color: #28a745;
      margin: 0 0 15px 0;
      font-size: 24px;
    }
    p {
      color: #6c757d;
      margin: 0 0 20px 0;
      font-size: 16px;
    }
    .user-id {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      word-break: break-all;
      color: #495057;
      margin: 15px 0;
    }
    .closing-msg {
      font-size: 14px;
      color: #adb5bd;
      margin-top: 25px;
    }
  </style>
</head>
<body>
  <div class=\"container\">
    <div class=\"success-icon\">🚫✅</div>
    <h2>Usuario Bloqueado Exitosamente</h2>
    <p>El usuario ha sido bloqueado correctamente en el sistema.</p>
    <div class=\"user-id\">ID: ${payload.observedUserId}</div>
    <p class=\"closing-msg\">Esta ventana se cerrará automáticamente en 3 segundos.</p>
  </div>
  <script>
    setTimeout(() => {
      try {
        window.close();
      } catch(e) {
        document.querySelector('.closing-msg').innerHTML = 'Puedes cerrar esta ventana manualmente.';
      }\n    }, 3000);\n  </script>\n</body>\n</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html', // <--- ¡AQUÍ ESTÁ LA CLAVE!
          'Access-Control-Allow-Origin': '*', // CORS para permitir llamadas desde otros orígenes
        },
      }
    );
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred during user blocking.';
    if (isErrorWithMessage(error)) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('Unhandled error in block-observed-user Edge Function:', error);
    return createCorsJsonResponse({ error: errorMessage }, 500); // Errors still return JSON.
  }
});
