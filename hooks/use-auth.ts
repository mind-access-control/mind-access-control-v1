'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { edgeFunctions } from '@/lib/edge-functions';
import { AUTH, ERROR_MESSAGES } from '@/lib/constants';
import type { User } from '@supabase/supabase-js';

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
        error: new Error(ERROR_MESSAGES.AUTH_DATA_MISSING),
      };
    }

    // 2. Obtener el rol del usuario usando la nueva Edge Function
    const userId = data.user.id;

    try {
      const roleResult = await edgeFunctions.getUserRoleById(userId);
      const userRole = roleResult.role_name;
      console.log(`User ${email} (ID: ${userId}) has role: ${userRole}`); // Para depuración

      // 3. Verificar si el rol es "Admin"
      if (userRole?.toLowerCase() !== AUTH.ADMIN_ROLE.toLowerCase()) {
        // Si el rol no es "Admin", cerrar la sesión inmediatamente
        await supabase.auth.signOut();
        // Devolver un error específico para el frontend
        return {
          data: null,
          error: new Error(ERROR_MESSAGES.ACCESS_DENIED),
        };
      }

      // Si el rol es "Admin", todo bien, devolver los datos de la sesión
      return { data, error: null };
    } catch (roleFetchError: any) {
      console.error('Error during user role verification:', roleFetchError);
      // Si ocurre un error al obtener el rol, también cerrar la sesión por seguridad
      await supabase.auth.signOut();
      return {
        data: null,
        error: new Error(`${ERROR_MESSAGES.ROLE_VERIFICATION_FAILED} ${roleFetchError.message || ERROR_MESSAGES.UNEXPECTED_ERROR}`),
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
