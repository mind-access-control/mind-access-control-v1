import { useState } from 'react';
import { Button } from "@/components/ui/button";
import UserForm from "./UserForm";
import UserTable from "./UserTable";
import BulkUploadDialog from "./BulkUploadDialog";
import { User } from "../AdminDashboardContainer";

interface UserManagementProps {
  users: User[];
  onUserCreated: (user: Omit<User, 'id'>) => Promise<User>;
  onUserUpdated: (userId: string, user: Partial<User>) => Promise<void>;
  onUserDeleted: (userId: string) => Promise<void>;
  loading: boolean;
}

export default function UserManagement({ 
  users, 
  onUserCreated, 
  onUserUpdated, 
  onUserDeleted, 
  loading 
}: UserManagementProps) {
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUserCreated = async (userData: Omit<User, 'id'>) => {
    try {
      setError(null);
      setSuccess(null);
      await onUserCreated(userData);
      setSuccess('User created successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleUserUpdated = async (userId: string, userData: Partial<User>) => {
    try {
      setError(null);
      setSuccess(null);
      await onUserUpdated(userId, userData);
      setSuccess('User updated successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const handleUserDeleted = async (userId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await onUserDeleted(userId);
      setSuccess('User deleted successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">User Management</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Add New User</h3>
          </div>
          <UserForm 
            onSubmit={handleUserCreated}
            loading={loading}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Existing Users</h3>
            <Button
              variant="outline"
              className="bg-slate-50"
              onClick={() => setBulkUploadOpen(true)}
              disabled={loading}
            >
              Bulk Upload
            </Button>
          </div>
          <UserTable 
            users={users}
            onUserUpdate={handleUserUpdated}
            onUserDelete={handleUserDeleted}
            loading={loading}
          />
        </div>
      </div>

      <BulkUploadDialog 
        open={bulkUploadOpen} 
        onOpenChange={setBulkUploadOpen}
        onUsersCreated={handleUserCreated}
        loading={loading}
      />
    </div>
  );
}
