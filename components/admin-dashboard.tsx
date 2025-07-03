'use client'; // Esta línea va al inicio si es un Client Component
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';

// --- Configuración del Cliente Supabase para el Frontend ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// --- Shadcn UI Components ---
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Lucide React Icons ---
import {
  Users,
  Shield,
  Zap,
  TrendingUp,
  Upload,
  Search,
  Edit,
  Trash2,
  LogOut,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Camera,
  SlidersHorizontal,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  UserCircle2,
} from 'lucide-react';

// --- Custom Hooks & Components ---
import { userAuthActions } from '@/hooks/auth.hooks';
import { CameraCapture } from '@/components/camera-capture';

// --- Recharts (for AI-Enhanced Dashboard) ---
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

// --- Face-API.js ---
import * as faceapi from 'face-api.js';

// --- IMPORTAR NUEVOS COMPONENTES REFACTORIZADOS ---
import ObservedUsersTab from '@/components/observedUsers/ObservedUsersTab';
import DetailedObservedLogsTab from '@/components/observedUsersLogs/DetailedObservedLogsTab';

// --- Tipos de Datos (Asegúrate de que estos tipos concuerden con tu backend/Supabase) ---
type Role = { id: string; name: string };
type UserStatus = { id: string; name: string };
type Zone = { id: string; name: string };

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  accessZones: string[];
  faceEmbedding?: number[]; // Representado como array de números para JSON
  profilePictureUrl?: string; // Para la URL de la imagen de perfil
};

type Log = {
  id: number;
  timestamp: string;
  user: string;
  email: string;
  role: string;
  zone: string;
  status: string;
  method: string;
};

type SummaryEntry = {
  user: string;
  email: string;
  firstAccess: string;
  lastAccess: string;
  totalAccesses: number;
  successful: number;
  failed: number;
  successRate: number;
  zoneAccesses: Record<string, number>;
};

// --- Tipos para ordenar y filtrar ---
type SortField = 'name' | 'email' | 'role';
type SortDirection = 'asc' | 'desc';
type LogSortField = 'timestamp' | 'user' | 'email' | 'role' | 'zone' | 'method' | 'status';
type SummarySortField = 'user' | 'email' | 'firstAccess' | 'lastAccess' | 'totalAccesses' | 'successRate';

// Tipo para las columnas de la tabla (faltaba en la versión anterior)
type Column = {
  key: string;
  label: string;
  sortable: boolean;
};

// --- Mock Data (Inicializados como arrays/objetos vacíos para evitar errores) ---
const summaryData = {}; // Mantener como mock si no se usa directamente
const recentAccesses = []; // Mantener como mock si no se usa directamente
const initialUsers: User[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    accessZones: ['Main Entrance', 'Server Room', 'Office Area'],
    profilePictureUrl: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'User',
    accessZones: ['Main Entrance', 'Office Area'],
    profilePictureUrl: 'https://i.pravatar.cc/150?img=2',
  },
  {
    id: 3,
    name: 'Robert Johnson',
    email: 'robert.johnson@example.com',
    role: 'User',
    accessZones: ['Main Entrance', 'Parking Lot'],
    profilePictureUrl: 'https://i.pravatar.cc/150?img=3',
  },
  {
    id: 4,
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    role: 'Admin',
    accessZones: ['Main Entrance', 'Server Room', 'Office Area', 'Parking Lot'],
    profilePictureUrl: 'https://i.pravatar.cc/150?img=4',
  },
  {
    id: 5,
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    role: 'User',
    accessZones: ['Main Entrance'],
    profilePictureUrl: 'https://i.pravatar.cc/150?img=5',
  },
];
const accessLogs: Log[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutos atrás
    user: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    zone: 'Server Room',
    status: 'Granted',
    method: 'Face Recognition',
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutos atrás
    user: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'User',
    zone: 'Main Entrance',
    status: 'Granted',
    method: 'Card',
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hora atrás
    user: 'Robert Johnson',
    email: 'robert.johnson@example.com',
    role: 'User',
    zone: 'Parking Lot',
    status: 'Denied',
    method: 'Face Recognition',
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 horas atrás
    user: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    role: 'Admin',
    zone: 'Server Room',
    status: 'Granted',
    method: 'Card',
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 horas atrás
    user: 'David Wilson',
    email: 'david.wilson@example.com',
    role: 'User',
    zone: 'Main Entrance',
    status: 'Granted',
    method: 'Face Recognition',
  },
  {
    id: 6,
    timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(), // 2.5 horas atrás
    user: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    zone: 'Office Area',
    status: 'Granted',
    method: 'Card',
  },
  {
    id: 7,
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 horas atrás
    user: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'User',
    zone: 'Office Area',
    status: 'Denied',
    method: 'Face Recognition',
  },
  {
    id: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 210).toISOString(), // 3.5 horas atrás
    user: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    role: 'Admin',
    zone: 'Parking Lot',
    status: 'Granted',
    method: 'Face Recognition',
  },
];
const csvTemplateContent = `Full Name,Email Address,User Role,Job Title,Access Zones,Photo URL\nJohn Doe,john.doe@example.com,Admin,Security Officer,"Main Entrance,Server Room,Zone A",https://example.com/photos/john.jpg\nJane Smith,jane.smith@example.com,User,Software Engineer,"Main Entrance,Zone B",https://example.com/photos/jane.jpg\n`;

export default function AdminDashboard({ supabase, session }: { supabase: SupabaseClient; session: Session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { signOut } = userAuthActions();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // --- User Management States ---
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingAccessZones, setEditingAccessZones] = useState<string[]>([]);
  const [editingAccessZonesOpen, setEditingAccessZonesOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // --- New User Form States ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>('Inactive');
  const [selectedAccessZones, setSelectedAccessZones] = useState<string[]>([]);
  const [accessZonesOpen, setAccessZonesOpen] = useState(false);

  // --- Photo Upload & Face-API.js States ---
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<File | Blob | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null);
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] = useState(false);
  const [faceApiModelsError, setFaceApiModelsError] = useState<string | null>(null);

  // --- Camera Capture Component State ---
  const [isCameraOpen, setCameraOpen] = useState(false);

  // --- Global UI Status / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- Dashboard Filtering/Sorting States ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // --- Access Logs Filtering/Sorting States (para la pestaña 'logs' de usuarios registrados) ---
  const [generalSearchTerm, setGeneralSearchTerm] = useState(''); // Renombrado para evitar conflicto
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [logSortField, setLogSortField] = useState<LogSortField>('timestamp');
  const [logSortDirection, setLogSortDirection] = useState<SortDirection>('desc');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(10);
  const [summarySortField, setSummarySortField] = useState<SummarySortField>('user');
  const [summarySortDirection, setSummarySortDirection] = useState<SortDirection>('asc');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState('all');

  // --- Settings Tab States ---
  const [activeSettingsTab, setActiveSettingsTab] = useState('zones');
  const [zones, setZones] = useState([
    { id: 1, name: 'Main Entrance' },
    { id: 2, name: 'Zone A' },
    { id: 3, name: 'Zone B' },
    { id: 4, name: 'Server Room' },
    { id: 5, name: 'Warehouse' },
    { id: 6, name: 'Executive Suite' },
    { id: 7, name: 'Cafeteria' },
  ]);
  const [cameras, setCameras] = useState([
    { id: 1, name: 'Camera 1', zone: 'Main Entrance', location: 'Front Door' },
    { id: 2, name: 'Camera 2', zone: 'Zone A', location: 'North Corner' },
    { id: 3, name: 'Camera 3', zone: 'Server Room', location: 'Server Rack 3' },
    { id: 4, name: 'Camera 4', zone: 'Warehouse', location: 'Loading Dock' },
  ]);
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');
  const [zoneToDelete, setZoneToDelete] = useState<any>(null);
  const [zoneDeleteModalOpen, setZoneDeleteModalOpen] = useState(false);
  const [newCamera, setNewCamera] = useState({
    name: '',
    zone: '',
    location: '',
  });
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [cameraToDelete, setCameraToDelete] = useState<any>(null);
  const [cameraDeleteModalOpen, setCameraDeleteModalOpen] = useState(false);

  // --- Bulk Upload States ---
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [csvIsDragging, setCsvIsDragging] = useState(false);

  // --- States for data fetched from Edge Functions (NO DUPLICADOS) ---
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  const [zonesData, setZonesData] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [errorZones, setErrorZones] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loadingUserStatuses, setLoadingUserStatuses] = useState(true);
  const [errorUserStatuses, setErrorUserStatuses] = useState<string | null>(null);

  // --- AI-ENHANCED DASHBOARD STATE & DATA (Inicializados como arrays/objetos vacíos) ---
  const [riskScore] = useState<{
    score: number;
    status: 'low' | 'moderate' | 'high';
  }>({ score: 23, status: 'low' });
  const [kpiData] = useState({
    totalUsers: 247,
    activeZones: 12,
    accessesToday: 89,
    activeAlerts: 2,
    anomalousAttempts: 3,
    successRate: 94.2,
  });
  const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([
    {
      id: 'sus1',
      name: 'Unknown Person A',
      riskScore: 85,
      status: 'high',
      lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      location: 'Server Room',
      attempts: 3,
      faceImage: 'https://i.pravatar.cc/150?img=11',
    },
    {
      id: 'sus2',
      name: 'Unknown Person B',
      riskScore: 65,
      status: 'moderate',
      lastSeen: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      location: 'Main Entrance',
      attempts: 2,
      faceImage: 'https://i.pravatar.cc/150?img=12',
    },
    {
      id: 'sus3',
      name: 'Unknown Person C',
      riskScore: 45,
      status: 'low',
      lastSeen: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      location: 'Parking Lot',
      attempts: 1,
      faceImage: 'https://i.pravatar.cc/150?img=13',
    },
  ]);
  const [aiRecommendations, setAIRecommendations] = useState<any[]>([
    {
      id: 'rec1',
      type: 'Access Control',
      description: 'Block access for user with multiple failed attempts at Server Room',
      priority: 'High',
      status: 'Pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      action: 'Block Access',
      confidence: 0.95,
    },
    {
      id: 'rec2',
      type: 'User Management',
      description: 'Review and update access zones for user with unusual access patterns',
      priority: 'Medium',
      status: 'Pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      action: 'Review Access',
      confidence: 0.82,
    },
    {
      id: 'rec3',
      type: 'Security Alert',
      description: 'Investigate multiple access attempts during non-business hours',
      priority: 'High',
      status: 'Pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      action: 'Investigate',
      confidence: 0.88,
    },
  ]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [trendData] = useState<any[]>([]);
  const [failureCauseData] = useState<any[]>([]);
  const [aiDetailsUser, setAIDetailsUser] = useState<any>(null);
  const [aiDetailsLog, setAIDetailsLog] = useState<any>(null);
  const [aiRecDetails, setAIRecDetails] = useState<any>(null);
  const [dashboardTab, setDashboardTab] = useState('overview');

  // --- USE EFFECTS PARA CARGA DE DATOS INICIALES (Mismos que ya tienes) ---
  // useEffect para cargar los modelos de Face-API.js (mantener si se usa en user management)
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        setFaceApiModelsLoaded(false);
        setFaceApiModelsError(null);
        await faceapi.nets.ssdMobilenetv1.load(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.load(MODEL_URL);
        setFaceApiModelsLoaded(true);
        console.log('Face-API.js models loaded successfully!');
      } catch (error: any) {
        console.error('Error loading Face-API.js models:', error);
        setFaceApiModelsError(`Failed to load face detection models: ${error.message}`);
      }
    };
    loadModels();
  }, []);

  // Nuevo useEffect para procesar la imagen con Face-API.js (se ejecuta cuando currentImage o faceApiModelsLoaded cambian)
  useEffect(() => {
    const processImageForFaceRecognition = async () => {
      if (!faceApiModelsLoaded || !currentImage) {
        setFaceEmbedding(null);
        setFaceDetectionError(null);
        return;
      }

      setIsProcessingImage(true);
      setFaceDetectionError(null);
      setFaceEmbedding(null);

      try {
        const img = document.createElement('img');
        img.src = currentImage instanceof File ? URL.createObjectURL(currentImage) : URL.createObjectURL(currentImage);

        img.onload = async () => {
          const detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks().withFaceDescriptors();

          if (detectionsWithLandmarks.length === 0) {
            setFaceDetectionError('No face detected in the image. Please use a clear photo.');
            setFaceEmbedding(null);
            console.warn('No face detected.');
          } else if (detectionsWithLandmarks.length > 1) {
            setFaceDetectionError('Multiple faces detected. Please use a photo with only one person.');
            setFaceEmbedding(null);
            console.warn('Multiple faces detected.');
          } else {
            const faceDescriptor = detectionsWithLandmarks[0].descriptor;
            setFaceEmbedding(new Float32Array(faceDescriptor));
            setFaceDetectionError(null);
            console.log('Face detected and embedding generated successfully!');
            console.log('Generated Embedding:', faceDescriptor);
          }
          URL.revokeObjectURL(img.src);
          setIsProcessingImage(false);
        };

        img.onerror = (e) => {
          console.error('Error loading image for Face-API.js:', e);
          setFaceDetectionError('Could not load image for processing. Please try another file.');
          setIsProcessingImage(false);
        };
      } catch (error: any) {
        console.error('Error during face detection or embedding generation:', error);
        setFaceDetectionError(`Face detection failed: ${error.message}. Ensure models are loaded and image is clear.`);
        setFaceEmbedding(null);
        setIsProcessingImage(false);
      }
    };

    processImageForFaceRecognition();
  }, [currentImage, faceApiModelsLoaded]);

  // useEffect para cargar roles
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      setErrorRoles(null);
      const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-user-roles';
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const result = await response.json();
        setRoles(result.roles || []);
        if (result.roles && result.roles.length > 0 && !selectedRole) {
          setSelectedRole(result.roles[0].name);
        }
      } catch (error: any) {
        console.error('Error al obtener roles de Edge Function:', error);
        setErrorRoles(error.message || 'Fallo al cargar los roles.');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // useEffect para cargar zonas
  useEffect(() => {
    const fetchZones = async () => {
      setLoadingZones(true);
      setErrorZones(null);
      const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-access-zones';
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const result = await response.json();
        setZonesData(result.zones || []);
      } catch (error: any) {
        console.error('Error al obtener zonas de Edge Function:', error);
        setErrorZones(error.message || 'Fallo al cargar las zonas.');
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  // useEffect para cargar estados de usuario
  useEffect(() => {
    const fetchUserStatuses = async () => {
      setLoadingUserStatuses(true);
      setErrorUserStatuses(null);
      const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-user-statuses';
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const result = await response.json();
        setUserStatuses(result.statuses || []);
        if (result.statuses && result.statuses.length > 0) {
          const inactiveStatus = result.statuses.find((status: { name: string }) => status.name === 'Inactive');
          if (inactiveStatus) {
            setSelectedUserStatus(inactiveStatus.name);
          } else if (!selectedUserStatus) {
            setSelectedUserStatus(result.statuses[0].name);
          }
        }
      } catch (error: any) {
        console.error('Error al obtener estados de usuario de Edge Function:', error);
        setErrorUserStatuses(error.message || 'Fallo al cargar los estados de usuario.');
      } finally {
        setLoadingUserStatuses(false);
      }
    };
    fetchUserStatuses();
  }, []);

  // --- FUNCIONES DE MANEJO DE IMAGEN Y CÁMARA ---

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setCurrentImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setFaceEmbedding(null);
          setFaceDetectionError(null);
        };
        reader.readAsDataURL(file);
      } else {
        console.error('Dropped file is not an image.');
        setFaceDetectionError('Please drop an image file (e.g., JPG, PNG).');
      }
    }
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCurrentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFaceEmbedding(null);
        setFaceDetectionError(null);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      console.error('Selected file is not an image.');
      setFaceDetectionError('Please select an image file (e.g., JPG, PNG).');
    }
    e.target.value = '';
  }, []);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    setCurrentImage(null);
    setFaceEmbedding(null);
    setFaceDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCameraCapture = useCallback((imageData: string) => {
    setImagePreview(imageData);
    fetch(imageData)
      .then((res) => res.blob())
      .then((blob) => {
        setCurrentImage(blob);
        setFaceEmbedding(null);
        setFaceDetectionError(null);
        setCameraOpen(false);
      })
      .catch((error) => {
        console.error('Error converting captured image to blob:', error);
        setFaceDetectionError('Failed to process captured image from camera.');
      });
  }, []);

  // --- OTRAS FUNCIONES ---
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const validateEmail = (email: string) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Invalid email format');
    } else {
      setEmailError(null);
    }
  };

  const toggleAccessZone = (zoneName: string) => {
    setSelectedAccessZones((prev) => (prev.includes(zoneName) ? prev.filter((name) => name !== zoneName) : [...prev, zoneName]));
  };

  const toggleEditingAccessZone = (zoneName: string) => {
    setEditingAccessZones((prev) => (prev.includes(zoneName) ? prev.filter((name) => name !== zoneName) : [...prev, zoneName]));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLogSort = (field: LogSortField) => {
    if (logSortField === field) {
      setLogSortDirection(logSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLogSortField(field);
      setLogSortDirection('asc');
    }
  };

  const handleSummarySort = (field: SummarySortField) => {
    if (summarySortField === field) {
      setSummarySortDirection(summarySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSummarySortField(field);
      setSummarySortDirection('asc');
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditingUser({ ...user });
    setEditingAccessZones([...user.accessZones]);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingUser(null);
    setEditingAccessZones([]);
  };

  const saveEditing = () => {
    console.log('Saving edited user:', editingUser, editingAccessZones);
    setUsers((prevUsers) => prevUsers.map((user) => (user.id === editingUserId ? { ...editingUser, accessZones: editingAccessZones } : user)));
    cancelEditing();
  };

  const updateEditingUser = (field: string, value: any) => {
    setEditingUser((prev: any) => ({ ...prev, [field]: value }));
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    console.log('Deleting user:', userToDelete);
    setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userToDelete.id));
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedCsvFile(file);
      setUploadStatus('idle');
      setUploadMessage(null);
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([csvTemplateContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'user_onboarding_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const processBulkUpload = async () => {
    if (!selectedCsvFile) {
      setUploadMessage('Please select a CSV file first.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('processing');
    setUploadMessage('Processing CSV file...');

    try {
      console.log('Processing bulk upload for file:', selectedCsvFile.name);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploadStatus('success');
      setUploadMessage(`Successfully processed ${selectedCsvFile.name}! Users will be added shortly.`);
      setSelectedCsvFile(null);
    } catch (error: any) {
      console.error('Error processing bulk upload:', error);
      setUploadStatus('error');
      setUploadMessage(`Failed to process CSV: ${error.message}`);
    }
  };

  const handleCsvDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvIsDragging(true);
  };

  const handleCsvDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvIsDragging(false);
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv') {
        setSelectedCsvFile(file);
        setUploadStatus('idle');
        setUploadMessage(null);
      } else {
        setUploadMessage('Please drop a CSV file.');
        setUploadStatus('error');
      }
    }
  };

  const clearCsvFile = () => {
    setSelectedCsvFile(null);
    setUploadStatus('idle');
    setUploadMessage(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const handleAddZone = () => {
    if (newZoneName.trim()) {
      setZones((prev) => [...prev, { id: prev.length + 1, name: newZoneName.trim() }]);
      setNewZoneName('');
    }
  };

  const startEditingZone = (zone: any) => {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  };

  const cancelEditingZone = () => {
    setEditingZoneId(null);
    setEditingZoneName('');
  };

  const saveEditingZone = () => {
    setZones((prev) => prev.map((zone) => (zone.id === editingZoneId ? { ...zone, name: editingZoneName.trim() } : zone)));
    cancelEditingZone();
  };

  const openZoneDeleteModal = (zone: any) => {
    setZoneToDelete(zone);
    setZoneDeleteModalOpen(true);
  };

  const confirmZoneDelete = () => {
    setZones((prev) => prev.filter((zone) => zone.id !== zoneToDelete.id));
    setCameras((prev) => prev.map((cam) => (cam.zone === zoneToDelete.name ? { ...cam, zone: '' } : cam)));
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const cancelZoneDelete = () => {
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const handleAddCamera = () => {
    if (newCamera.name.trim() && newCamera.zone) {
      setCameras((prev) => [...prev, { id: prev.length + 1, ...newCamera }]);
      setNewCamera({ name: '', zone: '', location: '' });
    }
  };

  const startEditingCamera = (camera: any) => {
    setEditingCameraId(camera.id);
    setEditingCamera({ ...camera });
  };

  const cancelEditingCamera = () => {
    setEditingCameraId(null);
    setEditingCamera(null);
  };

  const saveEditingCamera = () => {
    setCameras((prev) => prev.map((camera) => (camera.id === editingCameraId ? { ...editingCamera } : camera)));
    cancelEditingCamera();
  };

  const openCameraDeleteModal = (camera: any) => {
    setCameraToDelete(camera);
    setCameraDeleteModalOpen(true);
  };

  const confirmCameraDelete = () => {
    setCameras((prev) => prev.filter((camera) => camera.id !== cameraToDelete.id));
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  const cancelCameraDelete = () => {
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  // --- UseMemos para Datos Calculados ---
  const filteredLogs = useMemo(() => {
    return (accessLogs as any[]).filter((log) => {
      const matchSearch = generalSearchTerm ? JSON.stringify(log).toLowerCase().includes(generalSearchTerm.toLowerCase()) : true;
      const matchUser = selectedUser === 'all' ? true : log.user === selectedUser;
      const matchZone = selectedZone === 'all' ? true : log.zone === selectedZone;
      const matchStatus = selectedStatus === 'all' ? true : log.status === selectedStatus;
      const matchMethod = selectedMethod === 'all' ? true : log.method === selectedMethod;

      const logDate = new Date(log.timestamp);
      const fromDateObj = dateFrom ? new Date(dateFrom) : null;
      const toDateObj = dateTo ? new Date(dateTo) : null;

      const matchDate = (!fromDateObj || logDate >= fromDateObj) && (!toDateObj || logDate <= toDateObj);

      return matchSearch && matchUser && matchZone && matchStatus && matchMethod && matchDate;
    });
  }, [generalSearchTerm, selectedUser, selectedZone, selectedStatus, selectedMethod, dateFrom, dateTo, accessLogs]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      if (logSortField === 'timestamp') {
        return logSortDirection === 'asc'
          ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return 0;
    });
  }, [filteredLogs, logSortField, logSortDirection]);

  // --- PAGINACIÓN PARA ACCESS LOGS (REINTRODUCIDA) ---
  const logTotalPages = Math.ceil(sortedLogs.length / logItemsPerPage);
  const logStartIndex = (logCurrentPage - 1) * logItemsPerPage;
  const logEndIndex = logStartIndex + logItemsPerPage;
  const paginatedLogs = sortedLogs.slice(logStartIndex, logEndIndex);

  const userSummaryData = useMemo((): SummaryEntry[] => {
    return Array.from(new Set((accessLogs as any[]).map((log) => log.user))).map((userName) => {
      const userLogs = (accessLogs as any[]).filter((log) => log.user === userName);
      const successful = userLogs.filter((log) => log.status === 'Successful').length;
      const failed = userLogs.filter((log) => log.status === 'Failed').length;
      const totalAccesses = userLogs.length;
      const successRate = totalAccesses > 0 ? (successful / totalAccesses) * 100 : 0;
      const firstAccess = userLogs.length > 0 ? new Date(Math.min(...userLogs.map((log) => new Date(log.timestamp).getTime()))).toLocaleString() : 'N/A';
      const lastAccess = userLogs.length > 0 ? new Date(Math.max(...userLogs.map((log) => new Date(log.timestamp).getTime()))).toLocaleString() : 'N/A';
      const zoneAccesses: Record<string, number> = userLogs.reduce((acc: Record<string, number>, log) => {
        acc[log.zone] = (acc[log.zone] || 0) + 1;
        return acc;
      }, {});

      return {
        user: userName,
        email: userLogs[0]?.email || 'N/A',
        firstAccess,
        lastAccess,
        totalAccesses,
        successful,
        failed,
        successRate: parseFloat(successRate.toFixed(2)),
        zoneAccesses,
      };
    });
  }, [accessLogs]);

  const filteredSummaryData = useMemo(() => {
    return userSummaryData
      .filter((summary: SummaryEntry) => {
        const matchSearch = summarySearchTerm ? JSON.stringify(summary).toLowerCase().includes(summarySearchTerm.toLowerCase()) : true;
        const matchStatus =
          summaryStatusFilter === 'all'
            ? true
            : summaryStatusFilter === 'successful'
            ? summary.successful > 0
            : summaryStatusFilter === 'failed'
            ? summary.failed > 0
            : true;
        return matchSearch && matchStatus;
      })
      .sort((a: SummaryEntry, b: SummaryEntry) => {
        if (summarySortField === 'user') {
          return summarySortDirection === 'asc' ? a.user.localeCompare(b.user) : b.user.localeCompare(a.user);
        }
        return 0;
      });
  }, [userSummaryData, summarySortField, summarySortDirection, summarySearchTerm, summaryStatusFilter]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'email') {
        return sortDirection === 'asc' ? a.email.localeCompare(b.email) : b.email.localeCompare(a.email);
      }
      if (sortField === 'role') {
        return sortDirection === 'asc' ? a.role.localeCompare(b.role) : b.role.localeCompare(a.role);
      }
      return 0;
    });
  }, [users, sortField, sortDirection]);

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter(
      (user) => user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [sortedUsers, userSearchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // --- Reset Pagination on Filter Change ---
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, itemsPerPage]);

  // Reset log pagination when filters change
  useEffect(() => {
    setLogCurrentPage(1);
  }, [generalSearchTerm, selectedUser, selectedZone, selectedStatus, selectedMethod, dateFrom, dateTo]);

  // --- Función handleSaveUser (Actualizada para Face-API.js y Supabase) ---
  const handleSaveUser = async () => {
    console.log('Save User clicked');
    console.log('Current form state:', {
      fullName,
      email,
      emailError,
      selectedRole,
      selectedUserStatus,
      selectedAccessZones,
      currentImage,
      faceEmbedding,
      faceDetectionError,
    });

    const isEmailValid = validateEmail(email);

    const missingFields = [];
    if (!fullName) missingFields.push('Full Name');
    if (!isEmailValid) missingFields.push('Valid Email');
    if (!selectedRole) missingFields.push('User Role');
    if (!selectedUserStatus) missingFields.push('User Status');
    if (selectedAccessZones.length === 0) missingFields.push('Access Zones');
    if (!currentImage) missingFields.push('Photo');
    if (!faceApiModelsLoaded) missingFields.push('Facial recognition models not loaded');
    if (!faceEmbedding) missingFields.push('Facial Embedding (No face detected or multiple faces)');
    if (faceDetectionError) missingFields.push(`Face Detection Issue: ${faceDetectionError}`);

    if (missingFields.length > 0) {
      setShowStatusMessage(`Error: Please fill all required fields and ensure a single face is detected. Missing: ${missingFields.join(', ')}`);
      return;
    }

    setIsSavingUser(true);
    setShowStatusMessage('Saving user...');

    try {
      const payload = {
        fullName: fullName,
        email: email,
        roleName: selectedRole,
        statusName: selectedUserStatus,
        accessZoneNames: selectedAccessZones,
        faceEmbedding: Array.from(faceEmbedding!),
        profilePictureUrl: null,
      };

      const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/register-new-user';

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      setShowStatusMessage(`User saved successfully! ID: ${result.userId || 'N/A'}`);
      console.log('User registration successful:', result);

      setFullName('');
      setEmail('');
      setEmailError(null);
      setSelectedRole('');
      setSelectedUserStatus('Inactive');
      setSelectedAccessZones([]);
      clearImage();
      setFaceEmbedding(null);
      setFaceDetectionError(null);
    } catch (error: any) {
      console.error('Error during user registration:', error);
      setShowStatusMessage(`Failed to save user: ${error.message}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  // --- COMPONENTES AUXILIARES DE UI (Implementaciones básicas) ---
  function RiskScoreCard({ score, status }: { score: number; status: 'low' | 'moderate' | 'high' }) {
    const statusColor = status === 'low' ? 'text-green-500' : status === 'moderate' ? 'text-yellow-500' : 'text-red-500';
    const bgColor = status === 'low' ? 'bg-green-50' : status === 'moderate' ? 'bg-yellow-50' : 'bg-red-50';
    const borderColor = status === 'low' ? 'border-green-200' : status === 'moderate' ? 'border-yellow-200' : 'border-red-200';

    return (
      <div className={`rounded-xl shadow-lg p-6 flex flex-col items-center border ${borderColor} ${bgColor}`}>
        <Lightbulb className={`w-10 h-10 mb-2 ${statusColor}`} />
        <div className="text-sm text-gray-600 mb-1">Overall Risk Score</div>
        <div className={`text-4xl font-bold ${statusColor}`}>{score}</div>
        <Badge className={`mt-2 ${bgColor} border ${borderColor} text-gray-800`}>{status.charAt(0).toUpperCase() + status.slice(1)} Risk</Badge>
      </div>
    );
  }

  function KpiCard({
    icon,
    label,
    value,
    highlight = false,
    alert = false,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
    alert?: boolean;
  }) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center ${highlight ? 'border-2 border-teal-500' : ''}`}>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
            alert ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {icon}
        </div>
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="text-3xl font-bold text-gray-800">{value}</div>
      </div>
    );
  }
  function SecurityAlertCard({ count }: { count: number }) {
    return <KpiCard icon={<AlertTriangle className="w-8 h-8" />} label="Active Alerts" value={count} alert={count > 0} highlight={count > 0} />;
  }

  function SuspiciousUserList({ users, onDetails }: { users: any[]; onDetails: (user: any) => void }) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" /> Suspicious Activities Detected
        </div>
        {users.length > 0 ? (
          <ul className="space-y-3">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <UserCircle2 className="w-6 h-6 text-red-500 mr-2" />
                  <div>
                    <div className="font-medium text-red-800">{user.name}</div>
                    <div className="text-sm text-red-600">{user.reason}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onDetails(user)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No suspicious activities at this time.</p>
        )}
      </Card>
    );
  }

  function AIRecommendationList({ recommendations, onAction }: { recommendations: any[]; onAction: (rec: any) => void }) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-500" /> AI-Suggested Actions
        </div>
        {recommendations.length > 0 ? (
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <li key={rec.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <div className="font-medium text-blue-800">{rec.action}</div>
                  <div className="text-sm text-blue-600">{rec.details}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onAction(rec)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No AI recommendations currently.</p>
        )}
      </Card>
    );
  }

  function AccessLogTable({
    logs,
    onAIDetails,
    logsSortField,
    logsSortDirection,
    setLogsSortField,
    setLogsSortDirection,
  }: {
    logs: any[];
    onAIDetails: (log: any) => void;
    logsSortField: LogSortField;
    logsSortDirection: SortDirection;
    setLogsSortField: React.Dispatch<React.SetStateAction<LogSortField>>;
    setLogsSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  }) {
    const logColumns: Column[] = [
      { key: 'timestamp', label: 'Timestamp', sortable: true },
      { key: 'user', label: 'User Name', sortable: true },
      { key: 'email', label: 'User Email', sortable: true },
      { key: 'role', label: 'User Role', sortable: true },
      { key: 'zone', label: 'Zone', sortable: true },
      { key: 'method', label: 'Method', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'aiDetails', label: 'AI Details', sortable: false },
    ];

    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-purple-500" /> Recent Access Logs
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {logColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`cursor-pointer hover:bg-gray-50 select-none`}
                    onClick={() => col.sortable && setLogsSortField(col.key as LogSortField)}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable &&
                        logsSortField === col.key &&
                        (logsSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell className="text-gray-600">{log.email}</TableCell>
                    <TableCell>
                      <Badge variant={log.role === 'Admin' ? 'default' : 'secondary'}>{log.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {log.zone}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={log.method === 'Facial' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.status === 'Successful' ? 'default' : 'destructive'}
                        className={log.status === 'Successful' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => onAIDetails(log)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={logColumns.length} className="text-center py-8 text-gray-500">
                    No recent access logs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  }

  function SecurityTrendsChart({ data }: { data: any[] }) {
    const chartData =
      data.length > 0
        ? data
        : [
            { name: 'Mon', success: 4000, failed: 2400 },
            { name: 'Tue', success: 3000, failed: 1398 },
            { name: 'Wed', success: 2000, failed: 9800 },
            { name: 'Thu', success: 2780, failed: 3908 },
            { name: 'Fri', success: 1890, failed: 4800 },
            { name: 'Sat', success: 2390, failed: 3800 },
            { name: 'Sun', success: 3490, failed: 4300 },
          ];

    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" /> Security Trends (Weekly)
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
            <YAxis tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 text-center mt-2">Daily successful vs. failed access attempts.</p>
      </Card>
    );
  }

  const PIE_COLORS = ['#ef4444', '#f59e42', '#6366f1', '#a3e635'];
  function FailureCauseChart({ data }: { data: any[] }) {
    const chartData =
      data.length > 0
        ? data
        : [
            { name: 'Incorrect Face', value: 400 },
            { name: 'Access Denied', value: 300 },
            { name: 'Invalid Zone', value: 300 },
            { name: 'System Error', value: 200 },
          ];

    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" /> Top Failure Causes
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 text-center mt-2">Distribution of common reasons for failed access.</p>
      </Card>
    );
  }

  function AIDetailsModal({ open, onClose, details }: { open: boolean; onClose: () => void; details: any }) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>AI Details</DialogTitle>
            <DialogDescription>
              {details?.type === 'user' && `Insights for user: ${details.name}`}
              {details?.type === 'log' && `Details for log entry at: ${details.timestamp}`}
              {details?.type === 'recommendation' && `Recommendation: ${details.action}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            {details &&
              Object.entries(details).map(([key, value]) => (
                <div key={key}>
                  <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:</strong> {JSON.stringify(value)}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'User Management' },
    { id: 'logs', label: 'Access Logs' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <div className="w-4 h-4 bg-white rounded opacity-90"></div>
              </div>
              <h1 className="text-xl font-bold text-white">Access Control System</h1>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-white hover:bg-white/10" disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>Loading...</>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-teal-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Secondary Tab Navigation */}
            <div className="mb-6">
              <nav className="flex space-x-6">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'observed', label: 'Observed Users' },
                  { id: 'detailed-logs', label: 'Detailed Observed Logs' }, // CAMBIO: Etiqueta de la pestaña
                  { id: 'analytics', label: 'Analytics' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardTab(tab.id)}
                    className={`text-sm font-medium transition-colors duration-200 ${
                      dashboardTab === tab.id ? 'text-green-400 border-b-2 border-green-400 pb-1 font-semibold' : 'text-purple-200 hover:text-purple-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Overview Tab */}
            {dashboardTab === 'overview' && (
              <>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Facial Access Control Dashboard - Security Overview</h2>
                  <p className="text-indigo-200">AI-powered insights for proactive security management</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="col-span-1">
                    <RiskScoreCard score={riskScore.score} status={riskScore.status} />
                  </div>
                  <KpiCard icon={<Users className="w-8 h-8" />} label="Total Users" value={kpiData.totalUsers} />
                  <KpiCard icon={<Shield className="w-8 h-8" />} label="Active Zones" value={kpiData.activeZones} />
                  <KpiCard icon={<Zap className="w-8 h-8" />} label="Accesses Today" value={kpiData.accessesToday} />
                  <SecurityAlertCard count={kpiData.activeAlerts} />
                  <KpiCard
                    icon={<AlertTriangle className="w-8 h-8 text-yellow-500" />}
                    label="Anomalous Attempts (AI)"
                    value={kpiData.anomalousAttempts}
                    highlight={kpiData.anomalousAttempts > 0}
                  />
                  <KpiCard icon={<TrendingUp className="w-8 h-8" />} label="Success Rate" value={`${kpiData.successRate}%`} />
                </div>
                {/* Anomalous Events & AI Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SuspiciousUserList users={suspiciousUsers} onDetails={setAIDetailsUser} />
                  <AIRecommendationList recommendations={aiRecommendations} onAction={setAIRecDetails} />
                </div>
              </>
            )}

            {/* Observed Users Tab (AHORA ES UN COMPONENTE SEPARADO) */}
            {dashboardTab === 'observed' && <ObservedUsersTab />}

            {/* Detailed Logs Tab (NUEVO COMPONENTE) */}
            {dashboardTab === 'detailed-logs' && <DetailedObservedLogsTab />}

            {/* Analytics Tab */}
            {dashboardTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SecurityTrendsChart data={trendData} />
                <FailureCauseChart data={failureCauseData} />
              </div>
            )}

            {/* AI Details Modals (keep these always available) */}
            <AIDetailsModal open={!!aiDetailsUser} onClose={() => setAIDetailsUser(null)} details={aiDetailsUser} />
            <AIDetailsModal open={!!aiDetailsLog} onClose={() => setAIDetailsLog(null)} details={aiDetailsLog} />
            <AIDetailsModal open={!!aiRecDetails} onClose={() => setAIRecDetails(null)} details={aiRecDetails} />
          </div>
        )}

        {/* User Management Tab - ENHANCED */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">User Management</h2>
            </div>

            {/* Add New User Form - ENHANCED PHOTO UPLOAD */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Add New User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="Enter full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                  {/* Email Address with Validation */}
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={handleEmailChange}
                      className={emailError ? 'border-red-500' : ''}
                    />
                    {emailError && (
                      <div className="flex items-center mt-1 text-red-500 text-sm">
                        <X className="w-4 h-4 mr-1" />
                        {emailError}
                      </div>
                    )}
                    {email && !emailError && (
                      <div className="flex items-center mt-1 text-green-600 text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Valid email format
                      </div>
                    )}
                  </div>

                  {/* User Role Dropdown */}
                  <div>
                    <Label htmlFor="userRole">User Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                      // Deshabilita el Select si está cargando o si hay un error
                      disabled={loadingRoles || !!errorRoles}
                    >
                      <SelectTrigger id="userRole" className="bg-slate-50 border-0 h-12">
                        {/* Muestra un mensaje de carga, error o el placeholder normal */}
                        {loadingRoles ? (
                          <SelectValue placeholder="Loading roles..." />
                        ) : errorRoles ? (
                          <SelectValue placeholder={`Error loading roles: ${errorRoles}`} />
                        ) : (
                          <SelectValue placeholder="Select role" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {/* Si hay error, mostrar un SelectItem deshabilitado con el error */}
                          {errorRoles ? (
                            <SelectItem value="" disabled>
                              Error: {errorRoles}
                            </SelectItem>
                          ) : roles.length > 0 ? (
                            // Mapea sobre el array 'roles' para crear los SelectItems dinámicamente
                            roles.map((role) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.name}
                              </SelectItem>
                            ))
                          ) : (
                            // Si no hay roles y no hay error, mostrar un mensaje "No roles available"
                            !loadingRoles && (
                              <SelectItem value="" disabled>
                                No roles available
                              </SelectItem>
                            )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* User Status Dropdown */}
                  <div>
                    <Label htmlFor="userStatus">User Status</Label>
                    <Select
                      value={selectedUserStatus}
                      onValueChange={setSelectedUserStatus}
                      disabled={loadingUserStatuses || !!errorUserStatuses} // Deshabilita si está cargando o hay error
                    >
                      <SelectTrigger id="userStatus" className="bg-slate-50 border-0 h-12">
                        <span>
                          {
                            loadingUserStatuses
                              ? 'Loading statuses...'
                              : errorUserStatuses
                              ? `Error: ${errorUserStatuses}`
                              : selectedUserStatus // Muestra el estado seleccionado
                              ? selectedUserStatus
                              : 'Select status' // Placeholder si no hay nada seleccionado
                          }
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {/* Renderizar los estados de usuario dinámicamente */}
                          {errorUserStatuses ? (
                            <SelectItem value="" disabled>
                              Error: {errorUserStatuses}
                            </SelectItem>
                          ) : userStatuses.length > 0 ? (
                            userStatuses.map((status) => (
                              <SelectItem key={status.id} value={status.name}>
                                {status.name}
                              </SelectItem>
                            ))
                          ) : (
                            // Mensaje si no hay estados o si hay un error persistente
                            !loadingUserStatuses &&
                            !errorUserStatuses && (
                              <SelectItem value="" disabled>
                                No statuses available
                              </SelectItem>
                            )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Access Zones Multi-select */}
                <div>
                  <Label htmlFor="accessZones">Access Zones</Label>
                  <Popover open={accessZonesOpen} onOpenChange={setAccessZonesOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={accessZonesOpen}
                        className="w-full justify-between bg-slate-50 border-0 h-12 text-left font-normal"
                        disabled={loadingZones || !!errorZones}
                      >
                        <span>
                          {loadingZones
                            ? 'Loading zones...'
                            : errorZones
                            ? `Error: ${errorZones}`
                            : selectedAccessZones.length > 0
                            ? `${selectedAccessZones.length} zone${selectedAccessZones.length > 1 ? 's' : ''} selected`
                            : 'Select access zones'}
                        </span>
                        <span className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-2 space-y-2 max-h-[300px] overflow-auto">
                        {errorZones ? (
                          <div className="text-red-500 p-2">Error: {errorZones}</div>
                        ) : loadingZones ? (
                          <div className="text-gray-500 p-2">Loading zones...</div>
                        ) : zonesData.length > 0 ? (
                          zonesData.map((zone) => (
                            <div key={zone.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`zone-${zone.id}`}
                                checked={selectedAccessZones.includes(zone.name)}
                                onCheckedChange={() => toggleAccessZone(zone.name)}
                              />
                              <label
                                htmlFor={`zone-${zone.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {zone.name}
                              </label>
                            </div>
                          ))
                        ) : (
                          !loadingZones && !errorZones && <div className="p-2 text-gray-500">No zones available</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {selectedAccessZones.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedAccessZones.map((zoneName) => (
                        <Badge key={zoneName} variant="secondary" className="bg-slate-100">
                          {zoneName}
                          <button className="ml-1 hover:text-red-500" onClick={() => toggleAccessZone(zoneName)}>
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enhanced Photo Upload Section with Drag & Drop */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Upload Photo for Facial Recognition</h3>

                  {/* Single file input for all photo operations */}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  {!imagePreview ? (
                    <div
                      className={`border-2 ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-teal-500' : 'text-gray-400'}`} />
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Drag and drop an image here, or use one of the options below</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="bg-slate-50"
                              onClick={() => {
                                console.log('Choose File clicked');
                                fileInputRef.current?.click();
                              }}
                            >
                              Choose File
                            </Button>
                            <Button type="button" variant="outline" className="bg-slate-50" onClick={() => setCameraOpen(true)}>
                              <Camera className="w-4 h-4 mr-2" />
                              Take Photo
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img src={imagePreview || '/placeholder.svg'} alt="Preview" className="w-48 h-48 object-cover rounded-lg border shadow-md" />
                        <button
                          onClick={clearImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-slate-50"
                          onClick={() => {
                            console.log('Replace Photo clicked');
                            fileInputRef.current?.click();
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Replace Photo
                        </Button>
                        <Button type="button" variant="outline" onClick={clearImage} className="text-red-600 hover:text-red-700">
                          <X className="w-4 h-4 mr-2" />
                          Remove Photo
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 italic">You can also drag and drop a new image to replace the current one</p>
                    </div>
                  )}

                  {/* Feedback de Face-API.js y Guardado */}
                  {isProcessingImage && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Processing Image...</AlertTitle>
                      <AlertDescription className="text-blue-700">Analyzing photo for face detection and embedding generation.</AlertDescription>
                    </Alert>
                  )}

                  {faceDetectionError && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800">Facial Recognition Error</AlertTitle>
                      <AlertDescription className="text-red-700">{faceDetectionError}</AlertDescription>
                    </Alert>
                  )}

                  {faceEmbedding && !faceDetectionError && !isProcessingImage && (
                    <Alert className="bg-green-50 border-green-200">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">Face Detected!</AlertTitle>
                      <AlertDescription className="text-green-700">Facial embedding successfully generated.</AlertDescription>
                    </Alert>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Upon saving this user, the system will automatically detect faces in the image and generate a 'facial
                      embedding' for authentication. Ensure the image contains a clear, well-lit face.
                    </p>
                  </div>
                </div>

                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleSaveUser}
                  disabled={isSavingUser || isProcessingImage || !faceApiModelsLoaded || !!faceDetectionError}
                >
                  {isSavingUser ? 'Saving...' : 'Save User'}
                </Button>

                {showStatusMessage && (
                  <Alert className={showStatusMessage.startsWith('Error') ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className={showStatusMessage.startsWith('Error') ? 'text-red-700' : 'text-blue-700'}>
                          {showStatusMessage}
                        </AlertDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowStatusMessage(null)} className="h-6 w-6 p-0 hover:bg-red-100">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Existing Users List with Search and Pagination */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Existing Users</span>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input placeholder="Search users..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} className="w-64" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('name')}>
                        <div className="flex items-center">
                          Name
                          {sortField === 'name' &&
                            (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('email')}>
                        <div className="flex items-center">
                          Email
                          {sortField === 'email' &&
                            (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('role')}>
                        <div className="flex items-center">
                          Role
                          {sortField === 'role' &&
                            (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead>Access Zones</TableHead>
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
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Input value={editingUser.email} onChange={(e) => updateEditingUser('email', e.target.value)} className="h-8" />
                            ) : (
                              user.email
                            )}
                          </TableCell>
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
                              <div>
                                <Popover open={editingAccessZonesOpen} onOpenChange={setEditingAccessZonesOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={editingAccessZonesOpen}
                                      className="w-full justify-between bg-slate-50 border-0 h-12 text-left font-normal"
                                    >
                                      {editingAccessZones.length > 0
                                        ? `${editingAccessZones.length} zone${editingAccessZones.length > 1 ? 's' : ''}`
                                        : 'Select zones'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-0" align="start">
                                    <div className="p-2 space-y-1 max-h-[200px] overflow-auto">
                                      {errorZones ? (
                                        <div className="text-red-500 p-2">Error: {errorZones}</div>
                                      ) : loadingZones ? (
                                        <div className="text-gray-500 p-2">Loading zones...</div>
                                      ) : zonesData.length > 0 ? (
                                        zonesData.map((zone) => (
                                          <div key={zone.id} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`edit-zone-${zone.id}-${editingUser?.id || ''}`}
                                              checked={editingAccessZones.includes(zone.name)}
                                              onCheckedChange={() => toggleEditingAccessZone(zone.name)}
                                            />
                                            <label
                                              htmlFor={`edit-zone-${zone.id}-${editingUser?.id || ''}`}
                                              className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                              {zone.name}
                                            </label>
                                          </div>
                                        ))
                                      ) : (
                                        !loadingZones && !errorZones && <div className="p-2 text-gray-500">No zones available</div>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {editingAccessZones.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {editingAccessZones.slice(0, 2).map((zone) => (
                                      <Badge key={zone} variant="secondary" className="text-xs py-0 px-1">
                                        {zone}
                                      </Badge>
                                    ))}
                                    {editingAccessZones.length > 2 && (
                                      <Badge variant="secondary" className="text-xs py-0 px-1">
                                        +{editingAccessZones.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {user.accessZones.length > 2
                                  ? `${user.accessZones.slice(0, 2).join(', ')} +${user.accessZones.length - 2}`
                                  : user.accessZones.join(', ')}
                              </>
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
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                          className={`w-8 h-8 p-0 ${currentPage === page ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
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
              </CardContent>
            </Card>

            {/* Enhanced Bulk Onboarding Section */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Bulk Onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Upload a CSV file containing user data for bulk registration. The CSV must include columns for Full Name, Email Address, User Role, Job Title,
                  Access Zones (comma-separated), and a 'Photo URL' where each user's facial recognition image is publicly accessible.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="bg-slate-50" onClick={() => setBulkUploadModalOpen(true)}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Bulk User Upload
                  </Button>
                  <Button variant="outline" className="bg-slate-50" onClick={downloadCsvTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Access Logs Tab - ENHANCED WITH SORTING AND PAGINATION */}
        {activeTab === 'logs' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Access Logs</h2>
              <p className="text-indigo-200">Detailed history of all access attempts</p>
            </div>

            {/* Enhanced Filtering Controls */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filter Access Logs</span>
                  <Button onClick={() => setSummaryModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Summary
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50" />
                  </div>

                  {/* User Filter */}
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {Array.from(new Set((accessLogs as any[]).map((log) => log.user))).map((user) => (
                          <SelectItem key={user} value={user}>
                            {user}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Zone Filter */}
                  <div className="space-y-2">
                    <Label>Access Zone</Label>
                    <Select value={selectedZone} onValueChange={setSelectedZone}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Zones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {Array.from(new Set((accessLogs as any[]).map((log) => log.zone))).map((zone) => (
                          <SelectItem key={zone} value={zone}>
                            {zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Successful">Successful</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Method Filter */}
                  <div className="space-y-2">
                    <Label>Access Method</Label>
                    <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="Facial">Facial</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setSelectedUser('all');
                      setSelectedZone('all');
                      setSelectedStatus('all');
                      setSelectedMethod('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Access Logs Table with Sorting and Pagination */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Access History ({sortedLogs.length} records)</span>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input placeholder="Search logs..." value={generalSearchTerm} onChange={(e) => setGeneralSearchTerm(e.target.value)} className="w-64" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('timestamp')}>
                          <div className="flex items-center">
                            Timestamp
                            {logSortField === 'timestamp' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('user')}>
                          <div className="flex items-center">
                            User Name
                            {logSortField === 'user' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('email')}>
                          <div className="flex items-center">
                            User Email
                            {logSortField === 'email' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('role')}>
                          <div className="flex items-center">
                            User Role
                            {logSortField === 'role' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('zone')}>
                          <div className="flex items-center">
                            Zone
                            {logSortField === 'zone' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('method')}>
                          <div className="flex items-center">
                            Method
                            {logSortField === 'method' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('status')}>
                          <div className="flex items-center">
                            Status
                            {logSortField === 'status' &&
                              (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                            <TableCell className="font-medium">{log.user}</TableCell>
                            <TableCell className="text-gray-600">{log.email}</TableCell>
                            <TableCell>
                              <Badge variant={log.role === 'Admin' ? 'default' : 'secondary'}>{log.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {log.zone}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={log.method === 'Facial' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>
                                {log.method}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={log.status === 'Successful' ? 'default' : 'destructive'}
                                className={log.status === 'Successful' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {log.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            {generalSearchTerm ||
                            selectedUser !== 'all' ||
                            selectedZone !== 'all' ||
                            selectedStatus !== 'all' ||
                            selectedMethod !== 'all' ||
                            dateFrom ||
                            dateTo
                              ? 'No logs found matching your filters.'
                              : 'No access logs found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls for Logs */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <Select value={logItemsPerPage.toString()} onValueChange={(value) => setLogItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Showing {logStartIndex + 1} to {Math.min(logEndIndex, sortedLogs.length)} of {sortedLogs.length} logs
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setLogCurrentPage(Math.max(1, logCurrentPage - 1))} disabled={logCurrentPage === 1}>
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, logTotalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(logTotalPages - 4, logCurrentPage - 2)) + i;
                        return (
                          <Button
                            key={page}
                            variant={logCurrentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLogCurrentPage(page)}
                            className={`w-8 h-8 p-0 ${logCurrentPage === page ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogCurrentPage(Math.min(logTotalPages, logCurrentPage + 1))}
                      disabled={logCurrentPage === logTotalPages || logTotalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
              <p className="text-indigo-200">System configuration and management</p>
            </div>

            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="zones" value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="zones">Zone Management</TabsTrigger>
                    <TabsTrigger value="cameras">Camera Management</TabsTrigger>
                  </TabsList>

                  {/* Zone Management Tab */}
                  <TabsContent value="zones" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Zone Management</h3>
                      <p className="text-gray-600 mb-4">
                        Define and manage access zones for your facility. Each zone can have multiple cameras assigned to it.
                      </p>
                    </div>

                    {/* Add New Zone Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Add New Zone</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label htmlFor="zoneName">Zone Name</Label>
                            <Input
                              id="zoneName"
                              placeholder="Enter zone name"
                              value={newZoneName}
                              onChange={(e) => setNewZoneName(e.target.value)}
                              className="bg-slate-50"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button onClick={handleAddZone} className="bg-teal-600 hover:bg-teal-700" disabled={!newZoneName.trim()}>
                              Add Zone
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Existing Zones Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Existing Zones</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zone Name</TableHead>
                              <TableHead className="w-[200px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {zones.length > 0 ? (
                              zones.map((zone) => (
                                <TableRow key={zone.id}>
                                  <TableCell>
                                    {editingZoneId === zone.id ? (
                                      <Input value={editingZoneName} onChange={(e) => setEditingZoneName(e.target.value)} className="h-8" />
                                    ) : (
                                      zone.name
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {editingZoneId === zone.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={saveEditingZone}
                                            className="text-green-600 hover:text-green-700"
                                            disabled={!editingZoneName.trim()}
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={cancelEditingZone} className="text-gray-600 hover:text-gray-700">
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button size="sm" variant="outline" onClick={() => startEditingZone(zone)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openZoneDeleteModal(zone)}
                                            className="text-red-600 hover:text-red-700"
                                          >
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
                                <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                                  No zones defined. Add your first zone above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Camera Management Tab */}
                  <TabsContent value="cameras" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Camera Management</h3>
                      <p className="text-gray-600 mb-4">Manage cameras and assign them to specific access zones. Each camera can be assigned to one zone.</p>
                    </div>

                    {/* Add New Camera Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Add New Camera</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label htmlFor="cameraName">Camera Name</Label>
                            <Input
                              id="cameraName"
                              placeholder="Enter camera name"
                              value={newCamera.name}
                              onChange={(e) =>
                                setNewCamera({
                                  ...newCamera,
                                  name: e.target.value,
                                })
                              }
                              className="bg-slate-50"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cameraZone">Zone</Label>
                            <Select value={newCamera.zone} onValueChange={(value) => setNewCamera({ ...newCamera, zone: value })}>
                              <SelectTrigger id="cameraZone" className="bg-slate-50">
                                <SelectValue placeholder="Select zone" />
                              </SelectTrigger>
                              <SelectContent>
                                {zones.map((zone) => (
                                  <SelectItem key={zone.id} value={zone.name}>
                                    {zone.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="cameraLocation">Location (Optional)</Label>
                            <Input
                              id="cameraLocation"
                              placeholder="Describe camera location"
                              value={newCamera.location}
                              onChange={(e) =>
                                setNewCamera({
                                  ...newCamera,
                                  location: e.target.value,
                                })
                              }
                              className="bg-slate-50"
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddCamera} className="bg-teal-600 hover:bg-teal-700" disabled={!newCamera.name.trim() || !newCamera.zone}>
                          Add Camera
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Existing Cameras Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Existing Cameras</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Camera Name</TableHead>
                              <TableHead>Zone</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="w-[200px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cameras.length > 0 ? (
                              cameras.map((camera) => (
                                <TableRow key={camera.id}>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Input
                                        value={editingCamera.name}
                                        onChange={(e) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            name: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      camera.name
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Select
                                        value={editingCamera.zone}
                                        onValueChange={(value) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            zone: value,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {zones.map((zone) => (
                                            <SelectItem key={zone.id} value={zone.name}>
                                              {zone.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        {camera.zone || 'Unassigned'}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Input
                                        value={editingCamera.location}
                                        onChange={(e) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            location: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      camera.location || '-'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {editingCameraId === camera.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={saveEditingCamera}
                                            className="text-green-600 hover:text-green-700"
                                            disabled={!editingCamera.name.trim() || !editingCamera.zone}
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={cancelEditingCamera} className="text-gray-600 hover:text-gray-700">
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button size="sm" variant="outline" onClick={() => startEditingCamera(camera)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openCameraDeleteModal(camera)}
                                            className="text-red-600 hover:text-red-700"
                                          >
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
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                  No cameras defined. Add your first camera above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* --- INTEGRACIÓN DEL COMPONENTE CameraCapture --- */}
      <CameraCapture open={isCameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />

      {/* --- OTROS MODALES --- */}
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

      {/* Bulk Upload Modal */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={setBulkUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk User Upload</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing user data for bulk registration. The CSV must include columns for Full Name, Email Address, User Role, Job Title,
              Access Zones (comma-separated), and a 'Photo URL'.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {uploadStatus === 'idle' ? (
              <div
                className={`border-2 ${csvIsDragging ? 'border-teal-500 bg-teal-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors`}
                onDragOver={handleCsvDragOver}
                onDragLeave={handleCsvDragLeave}
                onDrop={handleCsvDrop}
              >
                <div className="text-center">
                  <FileSpreadsheet className={`mx-auto h-12 w-12 ${csvIsDragging ? 'text-teal-500' : 'text-gray-400'}`} />
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Drag and drop a CSV file here, or click to select a file</p>
                    <Button type="button" variant="outline" className="bg-slate-50" onClick={() => csvFileInputRef.current?.click()}>
                      Choose CSV File
                    </Button>
                    <input ref={csvFileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </div>
                </div>
              </div>
            ) : uploadStatus === 'processing' ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">{uploadMessage}</p>
              </div>
            ) : uploadStatus === 'success' ? (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">{uploadMessage}</AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700">{uploadMessage}</AlertDescription>
              </Alert>
            )}

            {selectedCsvFile && uploadStatus === 'idle' && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                <span className="text-sm font-medium truncate">{selectedCsvFile.name}</span>
                <Button variant="ghost" size="sm" onClick={clearCsvFile} className="ml-auto h-6 w-6 p-0 hover:bg-red-100">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="outline" className="bg-slate-50" onClick={downloadCsvTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template CSV
              </Button>
              <p className="text-xs text-gray-500">Download a template CSV file with the required headers for bulk upload.</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkUploadModalOpen(false);
                setSelectedCsvFile(null);
                setUploadStatus('idle');
              }}
              disabled={uploadStatus === 'processing'}
            >
              Cancel
            </Button>
            <Button onClick={processBulkUpload} className="bg-teal-600 hover:bg-teal-700" disabled={!selectedCsvFile || uploadStatus === 'processing'}>
              Process Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Access Summary Modal with Sorting and Filtering */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access Summary & Insights</DialogTitle>
            <DialogDescription>Daily access summary for all users (Today: {new Date().toLocaleDateString()})</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{Array.from(new Set((accessLogs as any[]).map((log: any) => log.user))).length}</p>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{(accessLogs as any[]).filter((log: any) => log.status === 'Successful').length}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{(accessLogs as any[]).filter((log: any) => log.status === 'Failed').length}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{Array.from(new Set((accessLogs as any[]).map((log: any) => log.zone))).length}</p>
                    <p className="text-sm text-gray-600">Zones Accessed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Filtering and Search for Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filter User Summary</span>
                  <SlidersHorizontal className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search Users</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or email..."
                        value={summarySearchTerm}
                        onChange={(e) => setSummarySearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Status</Label>
                    <Select value={summaryStatusFilter} onValueChange={setSummaryStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="successful">Users with Successful Access</SelectItem>
                        <SelectItem value="failed">Users with Failed Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSummarySearchTerm('');
                        setSummaryStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Per-User Summary with Sorting */}
            <div>
              <h3 className="text-lg font-semibold mb-4">User Access Summary ({filteredSummaryData.length} users)</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('user')}>
                        <div className="flex items-center">
                          User
                          {summarySortField === 'user' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('email')}>
                        <div className="flex items-center">
                          Email
                          {summarySortField === 'email' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('firstAccess')}>
                        <div className="flex items-center">
                          First Access
                          {summarySortField === 'firstAccess' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('lastAccess')}>
                        <div className="flex items-center">
                          Last Access
                          {summarySortField === 'lastAccess' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('totalAccesses')}>
                        <div className="flex items-center">
                          Total Accesses
                          {summarySortField === 'totalAccesses' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('successRate')}>
                        <div className="flex items-center">
                          Success Rate
                          {summarySortField === 'successRate' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead>Success/Failed</TableHead>
                      <TableHead>Accesses per Zone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaryData.length > 0 ? (
                      filteredSummaryData.map((summary: any) => (
                        <TableRow key={summary.user}>
                          <TableCell className="font-medium">{summary.user}</TableCell>
                          <TableCell className="text-gray-600">{summary.email}</TableCell>
                          <TableCell className="font-mono text-sm">{summary.firstAccess}</TableCell>
                          <TableCell className="font-mono text-sm">{summary.lastAccess}</TableCell>
                          <TableCell className="text-center font-medium">{summary.totalAccesses}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={summary.successRate >= 80 ? 'default' : summary.successRate >= 50 ? 'secondary' : 'destructive'}
                              className={
                                summary.successRate >= 80 ? 'bg-green-100 text-green-800' : summary.successRate >= 50 ? 'bg-yellow-100 text-yellow-800' : ''
                              }
                            >
                              {summary.successRate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                ✓ {summary.successful}
                              </Badge>
                              <Badge variant="destructive" className="text-xs">
                                ✗ {summary.failed}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(Object.entries(summary.zoneAccesses) as [string, number][]).map(([zone, count]) => (
                                <Badge key={zone} variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                  {zone}: {count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {summarySearchTerm || summaryStatusFilter !== 'all' ? 'No users found matching your filters.' : 'No user data available.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Delete Confirmation Modal */}
      <Dialog open={zoneDeleteModalOpen} onOpenChange={setZoneDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the zone <strong>{zoneToDelete?.name}</strong>? This action cannot be undone.
              {cameras.some((camera) => camera.zone === zoneToDelete?.name) && (
                <div className="mt-2 text-red-600">Warning: This zone has cameras assigned to it. Deleting this zone will unassign these cameras.</div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelZoneDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmZoneDelete} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Delete Confirmation Modal */}
      <Dialog open={cameraDeleteModalOpen} onOpenChange={setCameraDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the camera <strong>{cameraToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelCameraDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmCameraDelete} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
