"use client"; // Marca este componente como un Client Component en Next.js

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation"; // Importa useRouter y usePathname
import { Session } from "@supabase/supabase-js"; // Importa Session de Supabase

import AdminLogin from "../admin-login"; // Ruta correcta de tu componente de login
import AdminDashboard from "../components/admin-dashboard"; // Ruta correcta de tu AdminDashboard
import FacialValidationScreen from "../components/FacialValidationScreen"; // Ruta correcta de tu componente de validación facial
import { supabase } from "@/lib/supabase"; // Importar el cliente Supabase existente

// Este es el componente principal que se renderiza al acceder a la ruta raíz (/)
export default function Page() {
  const router = useRouter();
  const pathname = usePathname();

  // Estado para guardar la sesión del usuario y el estado de carga
  const [session, setSession] = useState<Session | null>(null); // Tipado para session
  const [loading, setLoading] = useState(true);

  // useEffect para monitorear los cambios en el estado de autenticación de Supabase
  useEffect(() => {
    // console.log("app/page.tsx: useEffect de autenticación inicializado.");

    // Escucha los cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      // console.log(
      //   `app/page.tsx: onAuthStateChanged callback disparado. Event: ${_event}`
      // );
      // console.log("app/page.tsx: Sesión recibida:", session);
      setSession(session); // Actualiza el estado de la sesión
      setLoading(false); // La carga inicial ha terminado
      // console.log("app/page.tsx: setSession y setLoading a false ejecutados.");
    });

    // Limpiar la suscripción cuando el componente se desmonte
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Se ejecuta solo una vez al montar el componente

  // Renderizado condicional basado en la ruta y el estado de autenticación
  // console.log(
  //   "app/page.tsx: Renderizando Page. Loading:",
  //   loading,
  //   "Session:",
  //   session,
  //   "Pathname:",
  //   pathname
  // );

  if (loading) {
    // Muestra un estado de carga mientras se verifica la sesión inicial
    // console.log("app/page.tsx: Mostrando 'Verifying session...'");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-blue-600">
          Verifying session...
        </div>
      </div>
    );
  }

  // Si la ruta es para la validación facial, la muestra directamente sin autenticación
  if (pathname === "/facial-validation-screen") {
    // console.log("app/page.tsx: Mostrando FacialValidationScreen.");
    return <FacialValidationScreen />;
  }

  // Si no es la ruta de validación facial, entonces gestiona la autenticación del Admin Dashboard
  if (!session) {
    // Si no hay sesión, muestra el componente de Login
    // console.log("app/page.tsx: NO hay sesión. Mostrando AdminLogin.");
    return <AdminLogin />;
  } else {
    // Si hay sesión, muestra el componente del Dashboard
    // console.log("app/page.tsx: HAY sesión. Mostrando AdminDashboard.");
    // Nota: AdminDashboard internamente necesitará el objeto 'supabase' y posiblemente el 'session'
    // Puedes pasarlos como props si tu AdminDashboard los usa directamente
    return <AdminDashboard supabase={supabase} session={session} />;
  }
}
