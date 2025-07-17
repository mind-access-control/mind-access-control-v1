'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ObservedUsersOverviewCards from '@/components/observedUsers/ObservedUsersOverviewCards';
import ObservedUsersTable from '@/components/observedUsers/ObservedUsersTable';

import { EMPTY_STRING } from '@/lib/constants';
import { SortDirection } from '@/app/enums';
import { ObservedUser, ObservedUserSortField, ObservedUserRequest, ObservedUserActionRequest } from '@/lib/api/types';
import { ObservedUserService } from '@/lib/api/services';

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
  const [observedSortDirection, setObservedSortDirection] = useState<SortDirection>(SortDirection.DESC);

  const [searchTerm, setSearchTerm] = useState(EMPTY_STRING);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string>(EMPTY_STRING);

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
      const request: ObservedUserRequest = {
        searchTerm,
        page: currentPage,
        pageSize: itemsPerPage,
        sortField: observedSortField,
        sortDirection: observedSortDirection,
        filterType,
      };

      const result = await ObservedUserService.getObservedUsers(request);

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
    setFilterType(EMPTY_STRING);
  }, []);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    setSearchTerm(EMPTY_STRING);
    setFilterType(EMPTY_STRING);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Definición de handleCardClick
  const handleCardClick = useCallback((type: 'total' | 'pendingReview' | 'highRisk' | 'activeTemporal' | 'expired') => {
    setCurrentPage(1);
    setSearchTerm(EMPTY_STRING);

    if (type === 'total') {
      setFilterType(EMPTY_STRING);
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
        const request: ObservedUserActionRequest = {
          observedUserId: userId,
          actionType: actionType,
        };
        const result = await ObservedUserService.manageObservedUserAction(request);

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
        setObservedSortDirection(observedSortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
      } else {
        setObservedSortField(field);
        setObservedSortDirection(SortDirection.ASC);
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
