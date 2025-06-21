import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserApi } from '@/hooks/user-api';

import {
    csvTemplateContent,
    defaultNewCamera,
    initialUsers,
    aiRecommendations as mockAiRecommendations,
    cameras as mockCameras,
    mockData as mockKpiData,
    observedUsers as mockObservedUsers,
    riskScore as mockRiskScore,
    suspiciousUsers as mockSuspiciousUsers,
    zones as mockZones,
} from '@/mock-data';
import { LogSortField, ObservedUserSortField, Role, SortDirection, SortField, SummarySortField, User, UserStatus, Zone } from '@/types';
import { AlertCircle, Camera, Check, ChevronDown, ChevronUp, Download, Edit, FileSpreadsheet, RotateCcw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

const UsersTab: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- User Management States ---
  const [users, setUsers] = useState<User[]>(initialUsers); // Usar initialUsers
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null); // Considerar tipado más específico
  const [editingAccessZones, setEditingAccessZones] = useState<string[]>([]);
  const [editingAccessZonesOpen, setEditingAccessZonesOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null); // Considerar tipado más específico

  // --- New User Form States ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>('Inactive'); // Default to 'Inactive'
  const [selectedAccessZones, setSelectedAccessZones] = useState<string[]>([]);
  const [accessZonesOpen, setAccessZonesOpen] = useState(false);

  // --- Photo Upload & Face-API.js States ---
  const [imagePreview, setImagePreview] = useState<string | null>(null); // URL para mostrar la imagen seleccionada/capturada
  const [currentImage, setCurrentImage] = useState<File | Blob | null>(null); // La imagen activa (File o Blob) para procesar
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null); // El vector 128D resultante de face-api.js
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(null); // Errores específicos de detección facial
  const [isProcessingImage, setIsProcessingImage] = useState(false); // Indica si face-api está trabajando
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] = useState(false); // Para el estado de carga de los modelos de Face-API
  const [faceApiModelsError, setFaceApiModelsError] = useState<string | null>(null); // Errores de carga de los modelos de Face-API

  // --- Camera Capture Component State (isCameraOpen es para el prop 'open') ---
  const [isCameraOpen, setCameraOpen] = useState(false);

  // --- Global UI Status / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null); // Mensajes de éxito/error al guardar/procesar
  const [isSavingUser, setIsSavingUser] = useState(false); // Para el estado del botón Guardar Usuario
  const [isDragging, setIsDragging] = useState(false); // Para la sección de drag & drop de fotos

  // --- Dashboard Filtering/Sorting States (mantener tus existentes) ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  // Nuevo estado para el ordenamiento de la tabla de usuarios
  const [sortField, setSortField] = useState<SortField>('name'); // Campo de ordenamiento por defecto
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc'); // Dirección de ordenamiento por defecto

  const [csvIsDragging, setCsvIsDragging] = useState(false);
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
  const [activeSettingsTab, setActiveSettingsTab] = useState('zones');
  const [zones, setZones] = useState(mockZones);
  const [cameras, setCameras] = useState(mockCameras);
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');
  const [zoneToDelete, setZoneToDelete] = useState<any>(null);
  const [zoneDeleteModalOpen, setZoneDeleteModalOpen] = useState(false);
  const [newCamera, setNewCamera] = useState(defaultNewCamera);
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [cameraToDelete, setCameraToDelete] = useState<any>(null);
  const [cameraDeleteModalOpen, setCameraDeleteModalOpen] = useState(false);

  // Estados para la carga masiva CSV (faltantes)
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);

  // Search term para los Access Logs (faltante)
  const [searchTerm, setSearchTerm] = useState('');

  // States for data fetched from Edge Functions
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  const {
    roles,
    loadingRoles,
    errorRoles,
    userStatuses,
    loadingUserStatuses,
    errorUserStatuses,
    zonesData,
    loadingZones,
    errorZones,
  } = useUserApi();

  // --- AI-ENHANCED DASHBOARD STATE & DATA (Inicializados como arrays/objetos vacíos) ---
  const [riskScore] = useState(mockRiskScore);
  const [kpiData] = useState(mockKpiData);
  const [suspiciousUsers, setSuspiciousUsers] = useState(mockSuspiciousUsers);
  const [aiRecommendations, setAIRecommendations] = useState(mockAiRecommendations);
  const [recentLogs, setRecentLogs] = useState<any[]>([]); // Inicializado
  const [trendData] = useState<any[]>([]); // Inicializado
  const [failureCauseData] = useState<any[]>([]); // Inicializado
  const [aiDetailsUser, setAIDetailsUser] = useState<any>(null); // Tipado más específico
  const [aiDetailsLog, setAIDetailsLog] = useState<any>(null); // Tipado más específico
  const [aiRecDetails, setAIRecDetails] = useState<any>(null); // Tipado más específico
  const [observedUsers] = useState(mockObservedUsers);
  const [observedSortField, setObservedSortField] = useState<ObservedUserSortField>('id');
  const [observedSortDirection, setObservedSortDirection] = useState<'asc' | 'desc'>('asc');
  const [logsSortField, setLogsSortField] = useState<LogSortField>('timestamp');
  const [logsSortDirection, setLogsSortDirection] = useState<SortDirection>('desc');
  const [observedUserDetails, setObservedUserDetails] = useState<null | (typeof observedUsers)[0]>(null);
  const [dashboardTab, setDashboardTab] = useState('overview');

  // --- FUNCIONES DE MANEJO DE IMAGEN Y CÁMARA ---

  // Maneja el evento cuando un elemento arrastrable está sobre la zona de drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Maneja el evento cuando un elemento arrastrable deja la zona de drop
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Maneja el evento cuando un elemento es soltado en la zona de drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setCurrentImage(file); // Guarda el objeto File (o Blob) de la imagen para su procesamiento futuro
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string); // Establece la URL para la previsualización en la UI
          setFaceEmbedding(null); // Reinicia el embedding
          setFaceDetectionError(null); // Reinicia errores de detección facial
        };
        reader.readAsDataURL(file);
      } else {
        console.error('Dropped file is not an image.');
        setFaceDetectionError('Please drop an image file (e.g., JPG, PNG).');
      }
    }
  }, []);

  // Maneja la carga de imagen desde el input de archivo
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

  // Función corregida: Limpia la imagen seleccionada/capturada y sus estados relacionados
  const clearImage = useCallback(() => {
    setImagePreview(null);
    setCurrentImage(null);
    setFaceEmbedding(null);
    setFaceDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const validateEmail = (email: string) => {
    // Expresión regular simple para validar el formato de email
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

  const saveEditing = () => {
    // Lógica para guardar el usuario editado en Supabase
    console.log('Saving edited user:', editingUser, editingAccessZones);
    // Actualizar el estado 'users' localmente
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

  // --- Función handleSaveUser (Actualizada para Face-API.js y Supabase) ---
  const handleSaveUser = async () => {
    // Para depuración: Muestra el estado actual del formulario en la consola.
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

    // Realiza validaciones en el lado del cliente antes de enviar la petición.
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

    // Si hay campos faltantes o errores de validación, muestra un mensaje y detén la ejecución.
    if (missingFields.length > 0) {
      setShowStatusMessage(`Error: Please fill all required fields and ensure a single face is detected. Missing: ${missingFields.join(', ')}`);
      return;
    }

    // Establece el estado de guardado para deshabilitar el botón y mostrar un indicador.
    setIsSavingUser(true);
    setShowStatusMessage('Saving user...');

    try {
      // Prepara los datos (payload) que se enviarán a la Edge Function.
      const payload = {
        fullName: fullName,
        email: email,
        roleName: selectedRole,
        statusName: selectedUserStatus,
        accessZoneNames: selectedAccessZones,
        faceEmbedding: Array.from(faceEmbedding!), // Convierte Float32Array a un Array<number> estándar para JSON.
        profilePictureUrl: null, //imagePreview, // Envía la URL de la imagen (Base64) si existe.
      };

      // --- ¡MUY IMPORTANTE! ---
      // REEMPLAZA 'YOUR_PROJECT_REF' con la URL de INVOKE REAL de tu Edge Function.
      // Esta URL la obtuviste después de desplegar la función en el paso anterior.
      // Ejemplo: https://abcdef123456.supabase.co/functions/v1/register-new-user
      const edgeFunctionUrl = 'https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/register-new-user';

      // Realiza la petición POST a la Edge Function.
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No se necesita el encabezado Authorization si la función se desplegó con --no-verify-jwt
          // (ya que la función usa la Service Role Key para la autenticación en BD).
        },
        body: JSON.stringify(payload), // Envía los datos del formulario como JSON.
      });

      // Verifica si la petición fue exitosa (código de estado 2xx).
      if (!response.ok) {
        const errorData = await response.json(); // Intenta parsear el error del cuerpo de la respuesta.
        // Lanza un error con el mensaje de error de la función o un mensaje HTTP genérico.
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      // Si la petición fue exitosa, parsea la respuesta JSON.
      const result = await response.json();
      // Muestra un mensaje de éxito con el ID del usuario si se devuelve.
      setShowStatusMessage(`User saved successfully! ID: ${result.userId || 'N/A'}`);
      console.log('User registration successful:', result);

      // Reinicia el formulario a sus valores iniciales después de un guardado exitoso.
      setFullName('');
      setEmail('');
      setEmailError(null);
      setSelectedRole('');
      setSelectedUserStatus('Inactive'); // Restablece a 'Inactive' por defecto.
      setSelectedAccessZones([]);
      clearImage(); // Limpia la imagen y los estados relacionados (embedding, error de detección).
      setFaceEmbedding(null);
      setFaceDetectionError(null);
    } catch (error: any) {
      // Captura cualquier error que ocurra durante la petición o procesamiento.
      console.error('Error during user registration:', error);
      // Muestra un mensaje de error en la interfaz.
      setShowStatusMessage(`Failed to save user: ${error.message}`);
    } finally {
      // Restablece el estado de guardado, sin importar si fue exitoso o fallido.
      setIsSavingUser(false);
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([csvTemplateContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'user_onboarding_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
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
                  ) : zonesData && zonesData.length > 0 ? (
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
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-slate-50"
                        onClick={() => setCameraOpen(true)} // Abrir el modal de CameraCapture
                      >
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
                <strong>Instructions:</strong> Upon saving this user, the system will automatically detect faces in the image and generate a 'facial embedding'
                for authentication. Ensure the image contains a clear, well-lit face.
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
                  <AlertDescription className={showStatusMessage.startsWith('Error') ? 'text-red-700' : 'text-blue-700'}>{showStatusMessage}</AlertDescription>
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
                                className="w-full justify-between h-8 text-left font-normal"
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
                                ) : zonesData && zonesData.length > 0 ? (
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
  );
};

export default UsersTab;
