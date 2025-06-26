"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { AlertTriangle, Eye, UserCircle2 } from "lucide-react";
import ObservedUsersOverviewCards from "@/components/ObservedUsersOverviewCards";
import ObservedUsersTable from "@/components/ObservedUsersTable";

// IMPORTAR LAS INTERFACES DESDE EL ARCHIVO COMPARTIDO
import {
  ObservedUser,
  ItemWithNameAndId,
  ObservedUserSortField,
  SortDirection,
} from "@/types/common";

const ObservedUsersTab: React.FC = () => {
  const [observedUsers, setObservedUsers] = useState<ObservedUser[]>([]);
  const [totalObservedUsersCount, setTotalObservedUsersCount] = useState(0);

  const [observedSortField, setObservedSortField] =
    useState<ObservedUserSortField>("firstSeen");
  const [observedSortDirection, setObservedSortDirection] =
    useState<SortDirection>("desc");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null); // Estado para mensajes de acción
  const actionMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Referencia para el timeout del mensaje

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchObservedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    // IMPORTANTE: NO limpiar actionMessage aquí. Ahora se limpia con un timeout.
    // setActionMessage(null);

    try {
      const edgeFunctionUrl =
        "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-observed-users";

      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: searchTerm,
          page: currentPage,
          itemsPerPage: itemsPerPage,
          sortField: observedSortField,
          sortDirection: observedSortDirection,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string; message?: string } =
          await response.json();
        throw new Error(
          errorData.error ||
            errorData.message ||
            `HTTP Error: ${response.status}`
        );
      }

      const result = await response.json();

      const mappedUsers: ObservedUser[] = result.users.map((user: any) => ({
        id: user.id,
        firstSeen: user.firstSeen,
        lastSeen: user.lastSeen,
        tempAccesses: user.tempAccesses,
        accessedZones: user.accessedZones,
        status: user.status,
        aiAction: user.aiAction,
        confidence: user.confidence || 0.95,
        faceImage: user.faceImage,
      }));

      setObservedUsers(mappedUsers);
      setTotalObservedUsersCount(result.totalCount);
    } catch (err: unknown) {
      let errorMessage =
        "An unknown error occurred while fetching observed users.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      console.error("Error fetching observed users:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    currentPage,
    itemsPerPage,
    observedSortField,
    observedSortDirection,
  ]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchObservedUsers();
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [fetchObservedUsers]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalObservedUsersCount / itemsPerPage);
  }, [totalObservedUsersCount, itemsPerPage]);

  const handleItemsPerPageChange = useCallback((items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    fetchObservedUsers();
  }, [fetchObservedUsers]);

  // --- FUNCIÓN GENÉRICA PARA ENVIAR ACCIONES ---
  const sendObservedUserAction = useCallback(
    async (userId: string, actionType: "block" | "extend" | "register") => {
      // Limpiar cualquier timeout previo antes de establecer un nuevo mensaje
      if (actionMessageTimeoutRef.current) {
        clearTimeout(actionMessageTimeoutRef.current);
        actionMessageTimeoutRef.current = null;
      }
      setActionMessage(null); // Limpiar mensaje actual antes de mostrar uno nuevo

      try {
        const edgeFunctionUrl =
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/manage-observed-user-actions";

        const response = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            observedUserId: userId,
            actionType: actionType,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Error HTTP: ${response.status}`);
        }

        setActionMessage(result.message || `Action ${actionType} successful.`);
        // Establecer un timeout para limpiar el mensaje después de 5 segundos
        actionMessageTimeoutRef.current = setTimeout(() => {
          setActionMessage(null);
        }, 10000); // 5 segundos

        fetchObservedUsers(); // Recargar la tabla para ver los cambios
      } catch (err: unknown) {
        let errorMessage = `Failed to perform ${actionType} action.`;
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        console.error(`Error performing ${actionType} action:`, err);
        setActionMessage(`Error: ${errorMessage}`);
        // Establecer un timeout para limpiar el mensaje de error también
        actionMessageTimeoutRef.current = setTimeout(() => {
          setActionMessage(null);
        }, 10000); // Un poco más de tiempo para mensajes de error
      }
    },
    [fetchObservedUsers]
  ); // Asegurar que fetchObservedUsers es una dependencia

  // --- Implementación de los Handlers de los Botones ---
  const handleRegisterObservedUser = useCallback((user: ObservedUser) => {
    console.log(`Action: Register user ${user.id} - NOT YET IMPLEMENTED`);
    setActionMessage(`Registro de usuario ${user.id} no implementado aún.`);
    if (actionMessageTimeoutRef.current) {
      clearTimeout(actionMessageTimeoutRef.current);
    }
    actionMessageTimeoutRef.current = setTimeout(() => {
      setActionMessage(null);
    }, 10000); // Mensaje de "no implementado" se limpia en 5s
    // Implementación futura: sendObservedUserAction(user.id, "register");
  }, []);

  const handleExtendObservedUserAccess = useCallback(
    (user: ObservedUser) => {
      console.log(`Action: Extend access for user ${user.id}`);
      sendObservedUserAction(user.id, "extend");
    },
    [sendObservedUserAction]
  );

  const handleBlockObservedUser = useCallback(
    (user: ObservedUser) => {
      console.log(`Action: Block user ${user.id}`);
      sendObservedUserAction(user.id, "block");
    },
    [sendObservedUserAction]
  );

  const handleObservedSortChange = useCallback(
    (field: ObservedUserSortField) => {
      if (observedSortField === field) {
        setObservedSortDirection(
          observedSortDirection === "asc" ? "desc" : "asc"
        );
      } else {
        setObservedSortField(field);
        setObservedSortDirection("asc");
      }
      setCurrentPage(1);
    },
    [observedSortField, observedSortDirection]
  );

  // Limpiar el timeout si el componente se desmonta
  useEffect(() => {
    return () => {
      if (actionMessageTimeoutRef.current) {
        clearTimeout(actionMessageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Observed Users</h2>
        <p className="text-indigo-200">
          Monitor and manage users detected by the system but not yet
          registered.
        </p>
      </div>

      <ObservedUsersOverviewCards observedUsers={observedUsers} />

      {/* Mensajes de acción */}
      {actionMessage && (
        <div
          className={`p-3 rounded-md text-center font-medium ${
            actionMessage.startsWith("Error:")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {actionMessage}
        </div>
      )}

      {loading && (
        <div className="text-white text-center py-4">
          Loading observed users...
        </div>
      )}
      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg text-center">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <ObservedUsersTable
          observedUsers={observedUsers}
          sortField={observedSortField}
          sortDirection={observedSortDirection}
          onSortChange={handleObservedSortChange}
          onRegister={handleRegisterObservedUser}
          onExtend={handleExtendObservedUserAccess}
          onBlock={handleBlockObservedUser}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          totalObservedUsersCount={totalObservedUsersCount}
          onRefresh={handleRefresh}
        />
      )}
      {!loading && !error && observedUsers.length === 0 && (
        <div className="text-white text-center py-4">
          No observed users found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default ObservedUsersTab;
