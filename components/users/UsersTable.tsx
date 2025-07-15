'use client';

import { SortDirection } from '@/app/enums';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ZoneSelector } from '@/components/ui/zone-selector';
import { useUserActions } from '@/hooks/user.hooks';
import { UserService } from '@/lib/api/services/user-service';
import { UpdateUserRequest, User } from '@/lib/api/types';
import { DEFAULT_USER_STATUS, EMPTY_STRING } from '@/lib/constants';
import { UserSortField } from '@/lib/api/types';
import { AlertCircle, ChevronDown, ChevronUp, Edit, RotateCcw, Save, Search, Trash2, UserCheck, UserX, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

const UsersTable: React.FC = () => {
  //States
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingAccessZones, setEditingAccessZones] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // --- Global UI Status / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null); // Mensajes de éxito/error al guardar/procesar
  // --- Dashboard Filtering/Sorting States (mantener tus existentes) ---
  const [userSearchTerm, setUserSearchTerm] = useState(EMPTY_STRING);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  // Nuevo estado para el ordenamiento de la tabla de usuarios
  const [sortField, setSortField] = useState<UserSortField>('name'); // Campo de ordenamiento por defecto
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC); // Dirección de ordenamiento por defecto

  const { users, loadingUsers, errorUsers, setLoadingUsers, loadUsersAndNotify, zonesData, loadingZones, errorZones } = useUserActions();

  // Derived States
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === SortDirection.ASC ? a.name?.localeCompare(b.name) : b.name?.localeCompare(a.name);
      }
      if (sortField === 'email') {
        return sortDirection === SortDirection.ASC ? a.email?.localeCompare(b.email) : b.email?.localeCompare(a.email);
      }
      if (sortField === 'role') {
        return sortDirection === SortDirection.ASC ? a.role?.localeCompare(b.role) : b.role?.localeCompare(a.role);
      }
      return 0;
    });
  }, [users, sortField, sortDirection]);

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter(
      (user) => user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || user.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [sortedUsers, userSearchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Handlers
  const toggleEditingAccessZone = (zoneName: string) => {
    setEditingAccessZones((prev) => (prev.includes(zoneName) ? prev.filter((name) => name !== zoneName) : [...prev, zoneName]));
  };

  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
    } else {
      setSortField(field);
      setSortDirection(SortDirection.ASC);
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditingUser({ ...user }); // Copia del usuario para editar
    setEditingAccessZones([...user.accessZones]); // Copia de zonas
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingUser(null);
    setEditingAccessZones([]);
  };

  const saveEditing = async () => {
    if (!editingUser) return;

    try {
      setLoadingUsers(true);

      const payload: UpdateUserRequest = {
        userId: editingUserId || undefined,
        fullName: editingUser.name,
        roleName: editingUser.role,
        statusName: editingUser.status || DEFAULT_USER_STATUS,
        accessZoneNames: editingAccessZones,
      };

      const result = await UserService.updateUser(payload);

      if (result.message) {
        // Refresh the users list to get updated data
        await loadUsersAndNotify();
        cancelEditing();
        setShowStatusMessage('User updated successfully!');
      } /*else {
        setShowStatusMessage(`Failed to update user: ${result.error || 'Unknown error'}`);
      }*/
    } catch (error: any) {
      console.error('Error updating user:', error);
      setShowStatusMessage(`Failed to update user: ${error.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateEditingUser = (field: string, value: any) => {
    setEditingUser((prev: any) => ({ ...prev, [field]: value }));
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Delete Confirmation Modal
  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setLoadingUsers(true);

      const result = await UserService.deleteUser({ userId: userToDelete.id });

      if (result.message) {
        // Refresh the users list to get updated data
        await loadUsersAndNotify();
        setDeleteModalOpen(false);
        setUserToDelete(null);
        setShowStatusMessage('User deleted successfully!');
      } /*else {
        setShowStatusMessage(`Failed to delete user: ${result.error || 'Unknown error'}`);
      }*/
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setShowStatusMessage(`Failed to delete user: ${error.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  return (
    <>
      {/* Enhanced Existing Users List with Search and Pagination */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Existing Users</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={loadUsersAndNotify} disabled={loadingUsers} className="mr-2">
                <RotateCcw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : EMPTY_STRING}`} />
                Refresh
              </Button>
              <Search className="w-4 h-4 text-gray-400" />
              <Input placeholder="Search users..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} className="w-64" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          )}
          {errorUsers && (
            <Alert className="bg-red-50 border-red-200 mb-4">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Error Loading Users</AlertTitle>
              <AlertDescription className="text-red-700">
                {errorUsers}
                <Button variant="outline" size="sm" onClick={loadUsersAndNotify} className="ml-2">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {!loadingUsers && !errorUsers && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Name
                        {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('email')}>
                      <div className="flex items-center">
                        Email
                        {sortField === 'email' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('role')}>
                      <div className="flex items-center">
                        Role
                        {sortField === 'role' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead>Access Zones</TableHead>
                    <TableHead className="text-center">Face</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {editingUserId === user.id ? (
                            <Input value={editingUser.name} onChange={(e) => updateEditingUser('name', e.target.value)} className="h-8" />
                          ) : (
                            user.name
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {editingUserId === user.id ? (
                            <Select value={editingUser.role} onValueChange={(value) => updateEditingUser('role', value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="User">User</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            user.role
                          )}
                        </TableCell>
                        <TableCell>
                          {editingUserId === user.id ? (
                            <div className="w-64">
                              <ZoneSelector
                                zones={zonesData}
                                selectedZones={editingAccessZones}
                                onZoneToggle={toggleEditingAccessZone}
                                onSelectAll={(zoneNames) => {
                                  // Add all zones that aren't already selected
                                  zoneNames.forEach(zoneName => {
                                    if (!editingAccessZones.includes(zoneName)) {
                                      setEditingAccessZones(prev => [...prev, zoneName]);
                                    }
                                  });
                                }}
                                loading={loadingZones}
                                error={errorZones}
                                placeholder="Select access zones"
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <>
                              {user.accessZones.length > 2
                                ? `${user.accessZones.slice(0, 2).join(', ')} +${user.accessZones.length - 2}`
                                : user.accessZones.join(', ')}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.profilePictureUrl ? (
                            <div className="flex items-center justify-center">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <img
                                    src={user.profilePictureUrl}
                                    alt={`${user.name}'s photo`}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-teal-500 transition-colors cursor-pointer shadow-sm"
                                    onError={(e) => {
                                      // Fallback to icon if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" align="center">
                                  <div className="text-center">
                                    <img src={user.profilePictureUrl} alt={`${user.name}'s photo`} className="w-32 h-32 rounded-lg object-cover shadow-lg" />
                                    <p className="text-sm font-medium mt-2 text-gray-700">{user.name}</p>
                                    <p className="text-xs text-gray-500">Profile Picture</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <UserX className="w-4 h-4 text-gray-400 hidden" />
                            </div>
                          ) : user.faceEmbedding && user.faceEmbedding.length > 0 ? (
                            <div className="flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-green-600" />
                              </div>
                              <span className="ml-2 text-xs text-green-600 hidden sm:inline">Registered</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                                <UserX className="w-5 h-5 text-gray-400" />
                              </div>
                              <span className="ml-2 text-xs text-gray-500 hidden sm:inline">Not registered</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {editingUserId === user.id ? (
                              <>
                                <Button size="sm" variant="outline" onClick={saveEditing} className="text-green-600 hover:text-green-700">
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditing} className="text-gray-600 hover:text-gray-700">
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => startEditing(user)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {userSearchTerm ? 'No users found matching your search.' : 'No users found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 p-0 ${currentPage === page ? 'bg-teal-600 hover:bg-teal-700' : EMPTY_STRING}`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersTable;
