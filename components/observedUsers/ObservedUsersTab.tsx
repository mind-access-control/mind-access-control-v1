'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Eye, UserCircle2 } from 'lucide-react';
import ObservedUsersOverviewCards from '@/components/observedUsers/ObservedUsersOverviewCards';
import ObservedUsersTable from '@/components/observedUsers/ObservedUsersTable';

// IMPORTAR LAS INTERFACES DESDE EL ARCHIVO COMPARTIDO
import { ObservedUser, ItemWithNameAndId, ObservedUserSortField, SortDirection } from '@/types/common';

// Interfaz para la respuesta completa de la Edge Function (alineada con get-observed-users EF)
interface GetObservedUsersResponse {
  users: ObservedUser[];
  totalCount: number; // Conteo para la tabla (puede ser filtrado)
  absoluteTotalCount: number; // NUEVO: Conteo total real sin aplicar filtros
  pendingReviewCount: number;
  highRiskCount: number;
  activeTemporalCount: number;
  expiredCount: number;
}

const ObservedUsersTab: React.FC = () => {
  const [observedUsers, setObservedUsers] = useState<ObservedUser[]>([]);
  const [totalObservedUsersCount, setTotalObservedUsersCount] = useState(0); // Conteo para la tabla/paginación
  // ¡CAMBIO CLAVE! Asegurarse de que setAbsoluteTotalCount esté desestructurado aquí
  const [absoluteObservedUsersCount, setAbsoluteTotalCount] = useState(0); // NUEVO: Conteo total real

  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [activeTemporalCount, setActiveTemporalCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  const [observedSortField, setObservedSortField] = useState<ObservedUserSortField>('firstSeen');
  const [observedSortDirection, setObservedSortDirection] = useState<SortDirection>('desc');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const actionMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchObservedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-observed-users';

      const url = new URL(edgeFunctionUrl);
      url.searchParams.append('searchTerm', searchTerm);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('pageSize', itemsPerPage.toString());
      url.searchParams.append('sortField', observedSortField);
      url.searchParams.append('sortDirection', observedSortDirection);
      if (filterType) {
        url.searchParams.append('filterType', filterType);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: { error?: string; message?: string } = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP Error: ${response.status}`);
      }

      const result: GetObservedUsersResponse = await response.json();

      setObservedUsers(result.users);
      setTotalObservedUsersCount(result.totalCount); // Conteo para la tabla
      setAbsoluteTotalCount(result.absoluteTotalCount); // NUEVO: Conteo absoluto para la card
      setPendingReviewCount(result.pendingReviewCount);
      setHighRiskCount(result.highRiskCount);
      setActiveTemporalCount(result.activeTemporalCount);
      setExpiredCount(result.expiredCount);
    } catch (err: unknown) {
      let errorMessage = 'An unknown error occurred while fetching observed users.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      console.error('Error fetching observed users:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, itemsPerPage, observedSortField, observedSortDirection, filterType]);

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
  }, [fetchObservedUsers, refreshTrigger]);

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
    setFilterType('');
  }, []);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setFilterType('');
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Definición de handleCardClick
  const handleCardClick = useCallback((type: 'total' | 'pendingReview' | 'highRisk' | 'activeTemporal' | 'expired') => {
    setCurrentPage(1);
    setSearchTerm('');

    if (type === 'total') {
      setFilterType('');
    } else {
      setFilterType(type);
    }
  }, []);

  const sendObservedUserAction = useCallback(
    async (userId: string, actionType: 'block' | 'extend' | 'register') => {
      if (actionMessageTimeoutRef.current) {
        clearTimeout(actionMessageTimeoutRef.current);
        actionMessageTimeoutRef.current = null;
      }
      setActionMessage(null);

      try {
        const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/manage-observed-user-actions';

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        actionMessageTimeoutRef.current = setTimeout(() => {
          setActionMessage(null);
        }, 10000);

        fetchObservedUsers();
      } catch (err: unknown) {
        let errorMessage = `Failed to perform ${actionType} action.`;
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        console.error(`Error performing ${actionType} action:`, err);
        setActionMessage(`Error: ${errorMessage}`);
        actionMessageTimeoutRef.current = setTimeout(() => {
          setActionMessage(null);
        }, 10000);
      }
    },
    [fetchObservedUsers]
  );

  const handleExtendObservedUserAccess = useCallback(
    (user: ObservedUser) => {
      console.log(`Action: Extend access for user ${user.id}`);
      sendObservedUserAction(user.id, 'extend');
    },
    [sendObservedUserAction]
  );

  const handleBlockObservedUser = useCallback(
    (user: ObservedUser) => {
      console.log(`Action: Block user ${user.id}`);
      sendObservedUserAction(user.id, 'block');
    },
    [sendObservedUserAction]
  );

  const handleObservedSortChange = useCallback(
    (field: ObservedUserSortField) => {
      if (observedSortField === field) {
        setObservedSortDirection(observedSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setObservedSortField(field);
        setObservedSortDirection('asc');
      }
      setCurrentPage(1);
    },
    [observedSortField, observedSortDirection]
  );

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
        <p className="text-indigo-200">Monitor and manage users detected by the system but not yet registered.</p>
      </div>

      <ObservedUsersOverviewCards
        totalObserved={absoluteObservedUsersCount}
        pendingReviewCount={pendingReviewCount}
        highRiskCount={highRiskCount}
        activeTemporalCount={activeTemporalCount}
        expiredCount={expiredCount}
        onCardClick={handleCardClick}
      />

      {actionMessage && (
        <div
          className={`p-3 rounded-md text-center font-medium ${actionMessage.startsWith('Error:') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {actionMessage}
        </div>
      )}

      {loading && <div className="text-white text-center py-4">Loading observed users...</div>}
      {error && <div className="bg-red-500 text-white p-4 rounded-lg text-center">Error: {error}</div>}

      {!loading && !error && (
        <ObservedUsersTable
          observedUsers={observedUsers}
          sortField={observedSortField}
          sortDirection={observedSortDirection}
          onSortChange={handleObservedSortChange}
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
      {!loading && !error && observedUsers.length === 0 && <div className="text-white text-center py-4">No observed users found matching your criteria.</div>}
    </div>
  );
};

export default ObservedUsersTab;
