// Importar las dependencias necesarias.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log('Edge Function "upload-face-image" started!');

// Interfaz para el payload de la solicitud
interface UploadImagePayload {
  userId: string; // El ID del usuario (observed_users.id o users.id)
  imageData: string; // La imagen en formato Base64
  isObservedUser: boolean; // Para saber si actualizar 'observed_users' o 'users'
}

serve(async (req: Request): Promise<Response> => {
  // CORS Preflight (para solicitudes OPTIONS)
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
    const { userId, imageData, isObservedUser }: UploadImagePayload = await req
      .json();

    if (!userId || !imageData) {
      return new Response(
        JSON.stringify({
          error: "Missing userId or imageData in request body.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Decodificar la imagen Base64
    // imageData típicamente viene con un prefijo como "data:image/jpeg;base64,"
    const base64Data = imageData.split(",")[1] || imageData; // Quita el prefijo si existe
    const imageBuffer = Uint8Array.from(
      atob(base64Data),
      (c) => c.charCodeAt(0),
    );

    // Definir el path en Storage
    const bucketName = "face-images";
    // Usamos el userId como nombre de archivo para sobrescribir fotos anteriores
    // Puedes ajustar la extensión si sabes el tipo de imagen (ej. .png, .jpg)
    // Para simplificar, asumiremos jpeg por ahora, o podrías inferirlo del prefijo base64.
    const filePath = `${userId}.jpeg`;

    // 1. Subir la imagen a Supabase Storage
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: "image/jpeg", // Asegúrate de que coincida con el tipo de imagen
        upsert: true, // Esto es CRUCIAL para sobrescribir si el archivo ya existe
      });

    if (uploadError) {
      console.error("❌ Error uploading image to Storage:", uploadError);
      return new Response(
        JSON.stringify({
          error: `Failed to upload image: ${uploadError.message}`,
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

    // 2. Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return new Response(
        JSON.stringify({ error: "Failed to get public URL for image." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const imageUrl = publicUrlData.publicUrl;

    // 3. Actualizar la URL en la tabla de la base de datos (observed_users o users)
    const tableToUpdate = isObservedUser ? "observed_users" : "users";
    const { error: updateDbError } = await supabase
      .from(tableToUpdate)
      .update({ face_image_url: imageUrl })
      .eq("id", userId);

    if (updateDbError) {
      console.error(`❌ Error updating ${tableToUpdate} table:`, updateDbError);
      return new Response(
        JSON.stringify({
          error:
            `Failed to update database with image URL: ${updateDbError.message}`,
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

    console.log(
      `✅ Image uploaded and DB updated for ${tableToUpdate} ID: ${userId}`,
    );
    return new Response(
      JSON.stringify({
        message: "Image uploaded and URL updated successfully",
        imageUrl,
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
    let errorMessage = "An unknown error occurred in upload-face-image.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    console.error(
      "🔥 Unhandled error in upload-face-image Edge Function:",
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
