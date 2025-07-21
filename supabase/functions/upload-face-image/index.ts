// Importar las dependencias necesarias.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "upload-face-image" started!');

// Interfaz para el payload de la solicitud
interface UploadImagePayload {
  userId: string; // El ID del usuario (observed_users.id o users.id)
  imageData: string; // La imagen en formato Base64
  isObservedUser: boolean; // Para saber si actualizar 'observed_users' o 'users'
}

serve(async (req: Request): Promise<Response> => {
  // CORS Preflight (para solicitudes OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log('DEBUG (upload-face-image): Handling OPTIONS preflight request.');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // AÑADIDO: Permitir 'x-request-id' en los encabezados CORS
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  // Inicializar el cliente Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usar SERVICE_ROLE_KEY para Storage
    {
      global: {
        // No pasar el Authorization del request si usas SERVICE_ROLE_KEY
        // headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );
  console.log('DEBUG (upload-face-image): Supabase client initialized.');

  try {
    const payload: UploadImagePayload = await req.json();
    const { userId, imageData, isObservedUser } = payload;
    console.log(`DEBUG (upload-face-image): Received payload for userId: ${userId}, isObservedUser: ${isObservedUser}, imageData length: ${imageData.length}`);

    // Decodificar la imagen Base64
    // imageData viene con el prefijo "data:image/jpeg;base64," o similar
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      console.error('❌ ERROR (upload-face-image): imageData no contiene datos Base64 válidos.');
      throw new Error('Invalid imageData: Missing Base64 part.');
    }
    const fileBody = decode(base64Data); // 'decode' es una función global en Deno para base64
    console.log('DEBUG (upload-face-image): Base64 image decoded.');

    // Determinar la tabla y la ruta de almacenamiento
    const bucketName = 'face-images'; // Asegúrate de que este sea el nombre correcto de tu bucket
    const folder = isObservedUser ? 'observed_users' : 'registered_users';
    const fileName = `${userId}.jpeg`; // O .png, dependiendo del formato
    const path = `${folder}/${fileName}`;
    console.log(`DEBUG (upload-face-image): Attempting to upload to bucket: ${bucketName}, path: ${path}`);

    // Subir la imagen a Supabase Storage
    const { data: _uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(path, fileBody, {
      contentType: 'image/jpeg', // Asegúrate de que coincida con el formato de tu imagen
      upsert: true, // Para sobrescribir si ya existe
    });

    if (uploadError) {
      console.error('❌ ERROR (upload-face-image): Error al subir la imagen a Storage:', uploadError);
      throw new Error(`Failed to upload image to Storage: ${uploadError.message}`);
    }
    console.log('DEBUG (upload-face-image): Image uploaded to Storage successfully.');

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);

    let imageUrl = publicUrlData.publicUrl;
    console.log(`DEBUG (upload-face-image): Public URL obtained: ${imageUrl}`);

     // Fix the URL for local development - replace kong:8000 with localhost:54321     
    if (imageUrl.includes('kong:8000')) {
      imageUrl = imageUrl.replace('kong:8000', '127.0.0.1:54321');
    }
     
     // Alternative: Construct URL manually for local development
    if (!imageUrl || imageUrl.includes('kong:8000')) {
      const baseUrl = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
      imageUrl = `${baseUrl}/storage/v1/object/public/${bucketName}/${path}`;
    }
    console.log('🔍 Generated image URL:', imageUrl);

    // Actualizar la URL de la imagen en la base de datos (observed_users o users)
    const tableToUpdate = isObservedUser ? 'observed_users' : 'users';
    const columnToUpdate = isObservedUser ? "face_image_url" : "profile_picture_url";
    console.log(`DEBUG (upload-face-image): Attempting to update table: ${tableToUpdate} for userId: ${userId}`);

    const { error: updateDbError } = await supabase.from(tableToUpdate).update({ [columnToUpdate]: imageUrl }).eq('id', userId);

    if (updateDbError) {
      console.error(`❌ ERROR (upload-face-image): Error updating ${tableToUpdate} table:`, updateDbError);
      return new Response(
        JSON.stringify({
          error: `Failed to update database with image URL: ${updateDbError.message}`,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`✅ SUCCESS (upload-face-image): Image uploaded and DB updated for ${tableToUpdate} ID: ${userId}`);
    return new Response(
      JSON.stringify({
        message: 'Image uploaded and URL updated successfully',
        imageUrl,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred in upload-face-image.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('🔥 CRITICAL ERROR (upload-face-image): Unhandled error in Edge Function:', error);

    return new Response(
      JSON.stringify({
        error: `Internal server error: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

// Función auxiliar para decodificar Base64 (necesaria en Deno)
function decode(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const _bytes = new Uint8Array(len);
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    view[i] = binaryString.charCodeAt(i);
  }
  return buffer;
}
