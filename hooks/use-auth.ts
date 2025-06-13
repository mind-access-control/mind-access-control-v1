"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // 1. Intentar iniciar sesión con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Si hay un error de autenticación (ej. credenciales incorrectas), devolverlo directamente
    if (error) {
      return { data, error };
    }

    // Si no hay usuario o la sesión es nula después del login, es un caso inesperado
    if (!data.user || !data.session) {
      return {
        data: null,
        error: new Error("Authentication data missing after login."),
      };
    }

    // 2. Obtener el rol del usuario usando la nueva Edge Function
    const userId = data.user.id;
    // ¡MUY IMPORTANTE: REEMPLAZA ESTA URL con la URL de INVOKE REAL de tu función!
    // La encuentras en tu Dashboard de Supabase -> Edge Functions -> get-user-role-by-id -> INVOKE URL
    const edgeFunctionUrl =
      `https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-user-role-by-id?userId=${userId}`;

    try {
      const roleResponse = await fetch(edgeFunctionUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!roleResponse.ok) {
        // Si la función Edge devuelve un error, manejarlo
        const errorData = await roleResponse.json();
        throw new Error(
          errorData.error ||
            `Error HTTP fetching user role: ${roleResponse.status}`,
        );
      }

      const roleResult = await roleResponse.json();
      const userRole = roleResult.role_name;
      console.log(`User ${email} (ID: ${userId}) has role: ${userRole}`); // Para depuración

      // 3. Verificar si el rol es "Admin"
      if (userRole?.toLowerCase() !== "admin") {
        // Si el rol no es "Admin", cerrar la sesión inmediatamente
        await supabase.auth.signOut();
        // Devolver un error específico para el frontend
        return {
          data: null,
          error: new Error(
            "Access Denied: Only administrators are allowed to log in.",
          ),
        };
      }

      // Si el rol es "Admin", todo bien, devolver los datos de la sesión
      return { data, error: null };
    } catch (roleFetchError: any) {
      console.error("Error during user role verification:", roleFetchError);
      // Si ocurre un error al obtener el rol, también cerrar la sesión por seguridad
      await supabase.auth.signOut();
      return {
        data: null,
        error: new Error(
          `Failed to verify user role: ${
            roleFetchError.message ||
            "An unexpected error occurred during role verification."
          }`,
        ),
      };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    signIn,
    signOut,
  };
}
