import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoneSelector } from '@/components/ui/zone-selector';
import { useUserActions } from '@/hooks/user.hooks';

import { CreateUserRequest, UploadService, UserService } from '@/lib/api';
import { EMAIL_REGEX } from '@/lib/constants';
import { AlertCircle, Camera, Check, RotateCcw, Upload, X } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { CameraCapture } from '../camera-capture';

const UsersForm: React.FC = () => {
  //States
  // --- New User Form States ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const defaultStatus = 'active'; // Default to 'Active'
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>(defaultStatus);
  const [selectedAccessZones, setSelectedAccessZones] = useState<string[]>([]);
  // --- Photo Upload & Face-API.js States ---
  const [imagePreview, setImagePreview] = useState<string | null>(null); // URL para mostrar la imagen seleccionada/capturada
  // --- Camera Capture Component State (isCameraOpen es para el prop 'open') ---
  const [isCameraOpen, setCameraOpen] = useState(false);

  // --- Global UI Status / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null); // Mensajes de éxito/error al guardar/procesar
  const [isSavingUser, setIsSavingUser] = useState(false); // Para el estado del botón Guardar Usuario
  const [isDragging, setIsDragging] = useState(false); // Para la sección de drag & drop de fotos

  //Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Face-API.js states from the hook
    currentImage,
    setCurrentImage,
    faceEmbedding,
    setFaceEmbedding,
    faceDetectionError,
    setFaceDetectionError,
    isProcessingImage,
    faceApiModelsLoaded,
    loadUsersAndNotify,
  } = useUserActions();
  //Handlers
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
  const validateEmail = (email: string) => {
    return EMAIL_REGEX.test(String(email).toLowerCase());
  };

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
    setShowStatusMessage('Uploading image and saving user...');

    try {
      // Step 1: Create user first (without profile picture)
      setShowStatusMessage('Creating user...');

      const payload: CreateUserRequest = {
        fullName: fullName,
        email: email,
        roleName: selectedRole,
        statusName: selectedUserStatus,
        accessZoneNames: selectedAccessZones,
        faceEmbedding: Array.from(faceEmbedding!), // Convierte Float32Array a un Array<number> estándar para JSON.
      };

      const result = await UserService.createUser(payload);
      console.log('User registration successful:', result);

      // Step 2: Upload image if we have one, using the created user ID
      if (currentImage && imagePreview && result.userId) {
        try {
          setShowStatusMessage('Uploading profile picture...');

          const uploadResult = await UploadService.uploadProfilePicture(
            result.userId,
            currentImage,
            false // isObservedUser
          );
          console.log('Profile picture uploaded successfully:', uploadResult.imageUrl);
        } catch (uploadError: any) {
          console.error('Error uploading profile picture:', uploadError);
          // Don't throw error here - user was created successfully
        }
      }
      // Muestra un mensaje de éxito con el ID del usuario si se devuelve.
      setShowStatusMessage(`User saved successfully! ID: ${result.userId || 'N/A'}`);
      console.log('User registration successful:', result);

      // Refresh the users list to show the new user
      await loadUsersAndNotify();

      // Reinicia el formulario a sus valores iniciales después de un guardado exitoso.
      setFullName('');
      setEmail('');
      setEmailError(null);
      setSelectedRole('');
      setSelectedUserStatus(defaultStatus);
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

  // Esta función es llamada por el componente CameraCapture cuando se confirma una foto
  const handleCameraCapture = useCallback((imageData: string) => {
    setImagePreview(imageData); // Muestra la previsualización en el formulario principal
    // Convierte la cadena base64 a un objeto Blob
    fetch(imageData)
      .then((res) => res.blob())
      .then((blob) => {
        setCurrentImage(blob); // Establece el Blob como la imagen actual para procesamiento
        setFaceEmbedding(null); // Reinicia el embedding
        setFaceDetectionError(null); // Reinicia errores de detección
        setCameraOpen(false); // Cierra el modal de la cámara automáticamente al capturar
      })
      .catch((error) => {
        console.error('Error converting captured image to blob:', error);
        setFaceDetectionError('Failed to process captured image from camera.');
      });
  }, []);

  return (
    <>
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

          {/* Enhanced Zone Selection with Categories */}
          <ZoneSelector
            zones={zonesData}
            selectedZones={selectedAccessZones}
            onZoneToggle={toggleAccessZone}
            onSelectAll={(zoneNames) => {
              // Add all zones that aren't already selected
              zoneNames.forEach((zoneName) => {
                if (!selectedAccessZones.includes(zoneName)) {
                  setSelectedAccessZones((prev) => [...prev, zoneName]);
                }
              });
            }}
            loading={loadingZones}
            error={errorZones}
            placeholder="Select access zones"
          />

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
      {/* --- INTEGRACIÓN DEL COMPONENTE CameraCapture --- */}
      {/* Este componente gestiona toda la lógica de la cámara y su modal */}
      <CameraCapture
        open={isCameraOpen} // Le dice a CameraCapture si debe estar abierto o cerrado
        onClose={() => setCameraOpen(false)} // Callback para que CameraCapture cierre su propio modal
        onCapture={handleCameraCapture} // Callback para recibir la imagen capturada como base64
      />
    </>
  );
};

export default UsersForm;
