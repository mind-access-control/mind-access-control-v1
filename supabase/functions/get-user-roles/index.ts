    // Importar las dependencias necesarias.
    // 'serve' es para crear un servidor HTTP básico en Deno.
    // 'createClient' es el cliente de Supabase para interactuar con tu proyecto.
    import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    // Este console.log aparecerá en los logs de la Edge Function cuando se inicie.
    console.log('Edge Function "get-user-roles" started!');

    // La función 'serve' de Deno espera una función asíncrona que maneje las peticiones HTTP.
    // 'req' es el objeto de la petición entrante.
    serve(async (req: Request) => {
        // --- Configuración de CORS ---
        // Esto es crucial para que tu frontend (que corre en un dominio diferente, ej. localhost:3000)
        // pueda hacer peticiones a esta función.
        // En producción, deberías restringir 'Access-Control-Allow-Origin' al dominio de tu frontend.
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*', // Permite peticiones desde cualquier origen (ajustar en producción)
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Métodos permitidos
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with', // Cabeceras permitidas
                    'Access-Control-Max-Age': '86400', // Cachea la respuesta OPTIONS por 24 horas
                },
            });
        }

        // --- Inicialización del Cliente Supabase ---
        // La Edge Function tiene acceso a las variables de entorno de Supabase.
        // SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son predefinidas.
        // Usamos SUPABASE_SERVICE_ROLE_KEY porque esta función DEBE tener permisos elevados
        // para leer la tabla 'roles_catalog' sin restricciones de RLS (Row Level Security),
        // ya que los roles deben ser accesibles para el dropdown de administración.
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                // No persistas la sesión en una Edge Function.
                auth: { persistSession: false },
            },
        );

        // --- Obtener los roles de la base de datos ---
        try {
            // Consulta la tabla 'public.roles_catalog'.
            // Selecciona las columnas 'id' y 'name'.
            // No se usa 'order by' para evitar posibles errores de índices en Supabase
            // y porque el orden se puede manejar en el frontend si es necesario.
            const { data, error } = await supabase
                .from('roles_catalog')
                .select('id, name');

            if (error) {
                console.error('Error fetching roles:', error);
                return new Response(
                    JSON.stringify({ error: error.message || 'Error fetching roles from database' }),
                    {
                        status: 500, // Error interno del servidor
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                );
            }

            // Si no hay roles, devuelve un array vacío (o un mensaje adecuado).
            if (!data || data.length === 0) {
                return new Response(
                    JSON.stringify({ roles: [], message: 'No roles found in catalog.' }),
                    {
                        status: 200, // Éxito, pero sin contenido
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                );
            }

            // Devuelve los roles encontrados en formato JSON.
            return new Response(
                JSON.stringify({ roles: data }),
                {
                    status: 200, // Éxito
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                },
            );

          } catch (catchError: any) { // O 'catchError: Error' si estás seguro de que siempre será un objeto Error
            // Manejo de errores inesperados.
            console.error('Unhandled error in Edge Function:', catchError);
            return new Response(
                JSON.stringify({ error: catchError.message || 'An unexpected error occurred' }),
                {
                    status: 500, // Error interno del servidor
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                },
            );
        }
    });
    