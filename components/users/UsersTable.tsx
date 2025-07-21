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
import { useUserActions } from '@/hooks/user.hooks';
import { UserService } from '@/lib/api/services/user-service';
import { User, UserListRequest } from '@/lib/api/types';
import { DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE_NUMBER, DEFAULT_USER_STATUS, EMPTY_STRING, PAGINATION_OPTIONS, SELECT_ALL_VALUE } from '@/lib/constants';
import { UserSortField } from '@/lib/api/types';
import { AlertCircle, ChevronDown, ChevronUp, Edit, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import React, { useCallback, useEffect, useState } from 'react';
import UsersForm from './UsersForm';

const UsersTable: React.FC = () => {
  //States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userFormModalOpen, setUserFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // --- Global UI Status / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null);

  // --- Server-side filtering and pagination states ---
  const [userSearchTerm, setUserSearchTerm] = useState(EMPTY_STRING);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE_NUMBER);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [sortField, setSortField] = useState<UserSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC);

  // Filter states
  const [selectedRoleId, setSelectedRoleId] = useState<string>(SELECT_ALL_VALUE);
  const [selectedStatusId, setSelectedStatusId] = useState<string>(SELECT_ALL_VALUE);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(SELECT_ALL_VALUE);

  // Server response states
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { zonesData, roles, userStatuses } = useUserActions();

  // Load users with server-side filtering
  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setErrorUsers(null);

      const request: UserListRequest = {
        page: currentPage,
        limit: itemsPerPage,
        search: userSearchTerm || undefined,
        roleId: selectedRoleId && selectedRoleId !== SELECT_ALL_VALUE ? selectedRoleId : undefined,
        statusId: selectedStatusId && selectedStatusId !== SELECT_ALL_VALUE ? selectedStatusId : undefined,
        zoneId: selectedZoneId && selectedZoneId !== SELECT_ALL_VALUE ? selectedZoneId : undefined,
        sortBy: sortField,
        sortOrder: sortDirection === SortDirection.ASC ? SortDirection.ASC : SortDirection.DESC,
      };

      const result = await UserService.getUsers(request);
      setUsers(result.data || []);
      setTotalUsers(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setErrorUsers(error.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [currentPage, itemsPerPage, userSearchTerm, selectedRoleId, selectedStatusId, selectedZoneId, sortField, sortDirection]);

  // Load users when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [userSearchTerm, selectedRoleId, selectedStatusId, selectedZoneId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handlers
  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
    } else {
      setSortField(field);
      setSortDirection(SortDirection.ASC);
    }
  };

  const openAddUserModal = () => {
    setUserToEdit(null);
    setUserFormModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setUserToEdit(user);
    setUserFormModalOpen(true);
  };

  const closeUserFormModal = () => {
    setUserFormModalOpen(false);
    setUserToEdit(null);
  };

  const handleUserFormSuccess = () => {
    loadUsers();
    setShowStatusMessage('User operation completed successfully!');
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
        await loadUsers();
        setDeleteModalOpen(false);
        setUserToDelete(null);
        setShowStatusMessage('User deleted successfully!');
      }
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
      {/* Enhanced Existing Users List with Server-side Search and Pagination */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Existing Users</span>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input placeholder="Search users..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} className="w-64" />

              {/* Filter dropdowns */}
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {userStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zonesData.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="default" size="sm" onClick={openAddUserModal} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
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
                <Button variant="outline" size="sm" onClick={loadUsers} className="ml-2">
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
                    <TableHead className="text-center">Photo</TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Name
                        {sortField === 'name' &&
                          (sortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('email')}>
                      <div className="flex items-center">
                        Email
                        {sortField === 'email' &&
                          (sortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('role')}>
                      <div className="flex items-center">
                        Role
                        {sortField === 'role' &&
                          (sortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        {sortField === 'status' &&
                          (sortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead>Access Zones</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
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
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={user.status === DEFAULT_USER_STATUS ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {(() => {
                              if (!user.accessZones || user.accessZones.length === 0) {
                                return 'No zones assigned';
                              }
                              const zoneNames = user.accessZones.filter(Boolean);
                              if (zoneNames.length > 0) {
                                return zoneNames.join(', ');
                              } else {
                                return `Zones assigned: ${JSON.stringify(user.accessZones)}`;
                              }
                            })()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => openEditUserModal(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {userSearchTerm ||
                        (selectedRoleId && selectedRoleId !== SELECT_ALL_VALUE) ||
                        (selectedStatusId && selectedStatusId !== SELECT_ALL_VALUE) ||
                        (selectedZoneId && selectedZoneId !== SELECT_ALL_VALUE)
                          ? 'No users found matching your filters.'
                          : 'No users found.'}
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
                      {PAGINATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
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

      {/* User Form Modal */}
      <UsersForm isOpen={userFormModalOpen} onClose={closeUserFormModal} editingUser={userToEdit} onSuccess={handleUserFormSuccess} />

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
