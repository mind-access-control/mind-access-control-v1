"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "./layout/AdminLayout";
import DashboardOverview from "./dashboard/DashboardOverview";
import UserManagement from "./users/UserManagement";
import AccessLogs from "./logs/AccessLogs";
import Settings from "./settings/Settings";
import { api } from '@/lib/api';

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  job_title: string;
  access_zones: string[];
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccessLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  zone: string;
  status: "Success" | "Failure";
  method: string;
  confidence?: number;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Camera {
  id: string;
  name: string;
  zone: string;
  ip_address: string;
  status: "active" | "inactive";
  created_at?: string;
}

export interface ObservedUser {
  id: number;
  name: string;
  photoUrl?: string;
  firstSeen: string;
  lastSeen: string;
  tempAccesses: number;
  accessedZones: string[];
  status: "active_temporal" | "in_review_admin" | "pending_review";
  confidence: number;
}

export default function AdminDashboardContainer({ onLogout }) {
  const { user } = useAuth();

  // Shared state
  const [users, setUsers] = useState<User[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard specific state
  const [riskScore, setRiskScore] = useState({ score: 23, status: "low" as const });
  const [suspiciousUsers, setSuspiciousUsers] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [observedUsers, setObservedUsers] = useState<ObservedUser[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch data from your API
      const [usersData, logsData, zonesData, camerasData] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getAccessLogs().catch(() => ({ logs: [] })),
        api.getAccessZones().catch(() => ({ zones: [] })),
        // api.getCameras().catch(() => ({ cameras: [] })) // Add when available
      ]);
      
      setUsers(usersData.users || []);
      setAccessLogs(logsData.logs || []);
      setZones(zonesData.zones || []);
      setCameras(camerasData?.cameras || []);

      // Mock data for dashboard features
      setSuspiciousUsers([
        {
          id: 1,
          name: "John Doe",
          photoUrl: "/placeholder-user.jpg",
          timestamp: "2025-01-10 14:30",
          reason: "Multiple failed access attempts",
          suggestion: "Review access permissions",
          confidence: 85,
        },
        {
          id: 2,
          name: "Jane Smith",
          photoUrl: "/placeholder-user.jpg",
          timestamp: "2025-01-10 15:45",
          reason: "Unusual access pattern",
          suggestion: "Investigate recent activities",
          confidence: 72,
        },
      ]);

      setAiRecommendations([
        {
          id: 1,
          text: "Consider updating facial recognition sensitivity for Zone A",
          type: "optimization" as const,
          priority: "medium" as const,
          timestamp: "2025-01-10 16:00",
          actionRequired: true,
        },
        {
          id: 2,
          text: "Review access logs for unusual patterns in the last 24 hours",
          type: "security" as const,
          priority: "high" as const,
          timestamp: "2025-01-10 15:30",
          actionRequired: true,
        },
      ]);

      setObservedUsers([
        {
          id: 1,
          name: "Unknown User 1",
          photoUrl: "/placeholder-user.jpg",
          firstSeen: "2025-01-10 09:15",
          lastSeen: "2025-01-10 14:30",
          tempAccesses: 3,
          accessedZones: ["Main Entrance", "Zone A"],
          status: "in_review_admin",
          confidence: 85,
        },
        {
          id: 2,
          name: "Unknown User 2",
          photoUrl: "/placeholder-user.jpg",
          firstSeen: "2025-01-10 11:20",
          lastSeen: "2025-01-10 16:45",
          tempAccesses: 1,
          accessedZones: ["Main Entrance"],
          status: "active_temporal",
          confidence: 72,
        },
      ]);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // User management handlers
  const handleUserCreated = async (newUser: Omit<User, 'id'>) => {
    try {
      setLoading(true);
      const response = await api.createUser(newUser);
      setUsers(prev => [...prev, response.user]);
      return response.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdated = async (userId: string, updatedUser: Partial<User>) => {
    try {
      setLoading(true);
      await api.updateUser(userId, updatedUser);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleUserDeleted = async (userId: string) => {
    try {
      setLoading(true);
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Zone management handlers
  const handleZoneCreated = async (newZone: Omit<Zone, 'id'>) => {
    try {
      setLoading(true);
      // Add API call when available
      const mockZone = { ...newZone, id: Date.now().toString() };
      setZones(prev => [...prev, mockZone]);
      return mockZone;
    } catch (error) {
      console.error('Error creating zone:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleZoneUpdated = async (zoneId: string, updatedZone: Partial<Zone>) => {
    try {
      setLoading(true);
      // Add API call when available
      setZones(prev => prev.map(zone => 
        zone.id === zoneId ? { ...zone, ...updatedZone } : zone
      ));
    } catch (error) {
      console.error('Error updating zone:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleZoneDeleted = async (zoneId: string) => {
    try {
      setLoading(true);
      // Add API call when available
      setZones(prev => prev.filter(zone => zone.id !== zoneId));
    } catch (error) {
      console.error('Error deleting zone:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Camera management handlers
  const handleCameraCreated = async (newCamera: Omit<Camera, 'id'>) => {
    try {
      setLoading(true);
      // Add API call when available
      const mockCamera = { ...newCamera, id: Date.now().toString() };
      setCameras(prev => [...prev, mockCamera]);
      return mockCamera;
    } catch (error) {
      console.error('Error creating camera:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCameraUpdated = async (cameraId: string, updatedCamera: Partial<Camera>) => {
    try {
      setLoading(true);
      // Add API call when available
      setCameras(prev => prev.map(camera => 
        camera.id === cameraId ? { ...camera, ...updatedCamera } : camera
      ));
    } catch (error) {
      console.error('Error updating camera:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCameraDeleted = async (cameraId: string) => {
    try {
      setLoading(true);
      // Add API call when available
      setCameras(prev => prev.filter(camera => camera.id !== cameraId));
    } catch (error) {
      console.error('Error deleting camera:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardOverview 
            users={users}
            accessLogs={accessLogs}
            zones={zones}
            cameras={cameras}
            riskScore={riskScore}
            suspiciousUsers={suspiciousUsers}
            aiRecommendations={aiRecommendations}
            observedUsers={observedUsers}
          />
        );
      case "users":
        return (
          <UserManagement 
            users={users}
            onUserCreated={handleUserCreated}
            onUserUpdated={handleUserUpdated}
            onUserDeleted={handleUserDeleted}
            loading={loading}
          />
        );
      case "logs":
        return (
          <AccessLogs 
            logs={accessLogs}
            users={users}
            zones={zones}
          />
        );
      case "settings":
        return (
          <Settings 
            zones={zones}
            cameras={cameras}
            onZoneCreated={handleZoneCreated}
            onZoneUpdated={handleZoneUpdated}
            onZoneDeleted={handleZoneDeleted}
            onCameraCreated={handleCameraCreated}
            onCameraUpdated={handleCameraUpdated}
            onCameraDeleted={handleCameraDeleted}
            loading={loading}
          />
        );
      default:
        return <DashboardOverview users={users} accessLogs={accessLogs} zones={zones} cameras={cameras} />;
    }
  };

  return (
    <AdminLayout
      onLogout={onLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {loading && activeTab !== "dashboard" ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-white">Loading...</div>
        </div>
      ) : (
        renderActiveTab()
      )}
    </AdminLayout>
  );
} 