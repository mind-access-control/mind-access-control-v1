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
} from "@/types/common"; // AJUSTA LA RUTA SI ES NECESARIO

// ELIMINAR LAS DEFINICIONES DE INTERFACE ObservedUser, ItemWithNameAndId,
// ObservedUserSortField, SortDirection DE AQUÍ, YA VIENEN IMPORTADAS.
// No deben existir líneas como:
// interface ObservedUser { ... }
// interface ItemWithNameAndId { ... }
// type ObservedUserSortField = ...
// type SortDirection = ...

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

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchObservedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

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
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      // La EF ya está mapeando correctamente, solo aseguramos el tipo aquí.
      // Confidence se asigna como valor por defecto ya que no viene de la DB
      const mappedUsers: ObservedUser[] = result.users.map((user: any) => ({
        id: user.id,
        firstSeen: user.firstSeen,
        lastSeen: user.lastSeen,
        tempAccesses: user.tempAccesses,
        accessedZones: user.accessedZones,
        status: user.status,
        aiAction: user.aiAction,
        confidence: user.confidence || 0.95, // Asegúrate de que confidence tenga un valor
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

  const handleRegisterObservedUser = useCallback((user: ObservedUser) => {
    console.log(`Action: Register user ${user.id}`);
    alert(`Implement: Register user ${user.id}`);
  }, []);

  const handleExtendObservedUserAccess = useCallback((user: ObservedUser) => {
    console.log(`Action: Extend access for user ${user.id}`);
    alert(`Implement: Extend access for user ${user.id}`);
  }, []);

  const handleBlockObservedUser = useCallback((user: ObservedUser) => {
    console.log(`Action: Block user ${user.id}`);
    alert(`Implement: Block user ${user.id}`);
  }, []);

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
