import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export function useAdminApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getUsers();
      return response.users;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.createUser(userData);
      return response.user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, userData: any) => {
    setLoading(true);
    setError(null);
    try {
      await api.updateUser(id, userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteUser(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccessLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAccessLogs();
      return response.logs;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch access logs');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAccessZones();
      return response.zones;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch zones');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    fetchAccessLogs,
    fetchZones,
  };
} 