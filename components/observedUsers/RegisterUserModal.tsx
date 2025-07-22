'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Re-adding Select components imports
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Badge, Popover, Checkbox might still be used elsewhere or in ZoneSelector, so keep them if needed by ZoneSelector or other parts.
// For now, I'll assume Badge, Popover, Checkbox are not directly used by this component, but ZoneSelector might use them.
// If ZoneSelector uses them, their imports are handled within zone-selector.tsx.
// If you uncommented them manually, keep them. Otherwise, they are not needed here specifically.
// import { Badge } from "@/components/ui/badge";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Checkbox } from "@/components/ui/checkbox";

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, Check, Upload, Camera, RotateCcw, AlertCircle } from 'lucide-react';

// Import shared types
import { ZoneSelector } from '@/components/ui/zone-selector';
import { Zone, ObservedUser, CreateUserRequest, Role, UserStatus } from '@/lib/api/types';

// Import Face-API.js
import * as faceapi from 'face-api.js';

// Import the CameraCapture component
import { CameraCapture } from '@/components/camera-capture';
import { EMAIL_REGEX, EMPTY_STRING, NA_VALUE } from '@/lib/constants';
import { CatalogService, UserService, ZoneService } from '@/lib/api/services';

// Define the props for the modal
interface RegisterUserModalProps {
  isOpen: boolean; // Controls if the modal is open
  onClose: () => void; // Function to close the modal
  observedUser: ObservedUser | null; // The observed user to be registered
  onUserRegistered: () => void; // Callback when the user is successfully registered
}

const RegisterUserModal: React.FC<RegisterUserModalProps> = ({ isOpen, onClose, observedUser, onUserRegistered }) => {
  // --- New User Form States ---
  const [fullName, setFullName] = useState(EMPTY_STRING);
  const [email, setEmail] = useState(EMPTY_STRING);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(EMPTY_STRING);
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>('Inactive');
  // Almacena los IDs de zona seleccionados (zone.id)
  const [selectedAccessZones, setSelectedAccessZones] = useState<string[]>([]);

  // --- Catalog Loading States (roles, zones, user statuses) ---
  // Using a generic type for roles and userStatuses if they don't have 'category'

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  // KEY CHANGE! Use Zone[] type for zonesData
  const [zonesData, setZonesData] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [errorZones, setErrorZones] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loadingUserStatuses, setLoadingUserStatuses] = useState(true);
  const [errorUserStatuses, setErrorUserStatuses] = useState<string | null>(null);

  // --- Photo Upload & Face-API.js States ---
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<File | Blob | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null);
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] = useState(false);
  const [faceApiModelsError, setFaceApiModelsError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setCameraOpen] = useState(false);

  // --- Global UI Status / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- Effect to load Face-API.js models ---
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'; // Ensure this path is accessible
      try {
        setFaceApiModelsLoaded(false);
        setFaceApiModelsError(null);
        await faceapi.nets.ssdMobilenetv1.load(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.load(MODEL_URL);
        setFaceApiModelsLoaded(true);
        console.log('Face-API.js models loaded successfully in RegisterUserModal!');
      } catch (error: any) {
        console.error('Error loading Face-API.js models in RegisterUserModal:', error);
        setFaceApiModelsError(`Failed to load face detection models: ${error.message}`);
      }
    };
    loadModels();
  }, []);

  // --- Effect to process image with Face-API.js ---
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
          } else if (detectionsWithLandmarks.length > 1) {
            setFaceDetectionError('Multiple faces detected. Please use a photo with only one person.');
            setFaceEmbedding(null);
          } else {
            const faceDescriptor = detectionsWithLandmarks[0].descriptor;
            setFaceEmbedding(new Float32Array(faceDescriptor));
            setFaceDetectionError(null);
            console.log('Face detected and embedding generated successfully!');
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

  // --- Effect to load catalogs (roles, zones, user statuses) ---
  useEffect(() => {
    const fetchCatalogs = async () => {
      // Fetch Roles
      setLoadingRoles(true);
      setErrorRoles(null);
      try {
        const roles = await CatalogService.getRoles();
        setRoles(roles || []);
        if (roles && roles.length > 0) {
          setSelectedRole(roles[0].name); // Select the first role by default
        }
      } catch (error: any) {
        console.error('Error fetching roles:', error);
        setErrorRoles(error.message);
      } finally {
        setLoadingRoles(false);
      }

      // Fetch Zones
      setLoadingZones(true);
      setErrorZones(null);
      try {
        const zones = await ZoneService.getZones();
        setZonesData(zones || []);
      } catch (error: any) {
        console.error('Error fetching zones:', error);
        setErrorZones(error.message);
      } finally {
        setLoadingZones(false);
      }

      // Fetch User Statuses
      setLoadingUserStatuses(true);
      setErrorUserStatuses(null);
      try {
        const userStatuses = await CatalogService.getUserStatuses();
        setUserStatuses(userStatuses || []);
        if (userStatuses && userStatuses.length > 0) {
          const inactiveStatus = userStatuses.find((status: { name: string }) => status.name === 'Inactive');
          if (inactiveStatus) {
            setSelectedUserStatus(inactiveStatus.name);
          } else {
            setSelectedUserStatus(userStatuses[0].name); // Default if 'Inactive' does not exist
          }
        }
      } catch (error: any) {
        console.error('Error fetching user statuses:', error);
        setErrorUserStatuses(error.message);
      } finally {
        setLoadingUserStatuses(false);
      }
    };

    if (isOpen) {
      fetchCatalogs();
      if (observedUser) {
        setFullName(observedUser.id);
        if (observedUser.faceImage) {
          fetch(observedUser.faceImage)
            .then((res) => res.blob())
            .then((blob) => {
              setCurrentImage(blob);
              setImagePreview(observedUser.faceImage);
            })
            .catch((err) => console.error('Error preloading observed user image:', err));
        }
      } else {
        setFullName(EMPTY_STRING);
        setEmail(EMPTY_STRING);
        setEmailError(null);
        setSelectedRole(EMPTY_STRING);
        setSelectedUserStatus('Inactive');
        setSelectedAccessZones([]);
        clearImage();
        setFaceEmbedding(null);
        setFaceDetectionError(null);
        setShowStatusMessage(null);
      }
    }
  }, [isOpen, observedUser]);

  // --- Image and Camera handling functions (reused from AdminDashboard) ---
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
    e.target.value = EMPTY_STRING;
  }, []);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    setCurrentImage(null);
    setFaceEmbedding(null);
    setFaceDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = EMPTY_STRING;
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

  // --- Form validation and handling functions ---
  const validateEmail = (email: string) => {
    return EMAIL_REGEX.test(String(email).toLowerCase());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.trim();
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Invalid email format');
    } else {
      setEmailError(null);
    }
  };

  // toggleAccessZone para trabajar con IDs
  const toggleAccessZone = (zoneId: string) => {
    setSelectedAccessZones((prev) => (prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]));
  };

  const handleRegisterUser = async () => {
    console.log('Register User clicked in modal');

    const trimmedEmail = email.trim();
    const isEmailValid = validateEmail(trimmedEmail);

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
    setShowStatusMessage('Registering user...');

    try {
      // Construir el request solo con los campos requeridos y válidos
      const request: CreateUserRequest = {
        fullName: fullName,
        email: trimmedEmail,
        roleName: selectedRole,
        statusName: selectedUserStatus,
        accessZoneIds: selectedAccessZones,
        faceEmbedding: Array.from(faceEmbedding!),
        // Siempre enviar observedUserId como string (vacío si no hay)
        observedUserId: observedUser && typeof observedUser.id === 'string' && observedUser.id.length > 0 ? observedUser.id : '',
      };
      // Agregar opcionales solo si existen
      if (observedUser?.faceImage) request.profilePictureUrl = observedUser.faceImage;
      // Log explícito para depuración: mostrar el objeto antes de serializar
      console.log('RegisterUserModal - Objeto request antes de serializar:', request);
      const payloadString = JSON.stringify(request);
      console.log('RegisterUserModal - Payload enviado a createUser (JSON):', payloadString);
      // Validación extra: asegurar que observedUserId SIEMPRE está presente
      if (!Object.prototype.hasOwnProperty.call(request, 'observedUserId')) {
        console.error('ERROR: observedUserId NO está presente en el objeto request!');
      }
      if (!payloadString.includes('"observedUserId"')) {
        console.error('ERROR: observedUserId NO está presente en el JSON final!');
      }

      const result = await UserService.createUser(request);

      setShowStatusMessage(`¡Usuario registrado exitosamente! ID: ${result.userId || NA_VALUE}`);
      console.log('User registration successful:', result);

      setFullName(EMPTY_STRING);
      setEmail(EMPTY_STRING);
      setEmailError(null);
      setSelectedRole(EMPTY_STRING);
      setSelectedUserStatus('Inactive');
      setSelectedAccessZones([]);
      clearImage();
      setFaceEmbedding(null);
      setFaceDetectionError(null);
      setIsSavingUser(false);
      onUserRegistered();
      onClose();
    } catch (error) {
      // Tipado seguro para error
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Error durante el registro de usuario:', error);
      setShowStatusMessage(`Error al registrar usuario: ${errMsg}`);
      setIsSavingUser(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Observed User</DialogTitle>
          <DialogDescription>Convert an observed user into a registered system user.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                className={emailError ? 'border-red-500' : EMPTY_STRING}
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
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={loadingRoles || !!errorRoles}>
                <SelectTrigger id="userRole" className="bg-slate-50 border-0 h-12">
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
                    {errorRoles ? (
                      <SelectItem value="" disabled>
                        Error: {errorRoles}
                      </SelectItem>
                    ) : roles.length > 0 ? (
                      roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))
                    ) : (
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
              <Select value={selectedUserStatus} onValueChange={setSelectedUserStatus} disabled={loadingUserStatuses || !!errorUserStatuses}>
                <SelectTrigger id="userStatus" className="bg-slate-50 border-0 h-12">
                  <span>
                    {loadingUserStatuses
                      ? 'Loading statuses...'
                      : errorUserStatuses
                      ? `Error: ${errorUserStatuses}`
                      : selectedUserStatus
                      ? selectedUserStatus
                      : 'Select status'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
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

          {/* KEY CHANGE! ZoneSelector Integration */}
          <ZoneSelector
            zones={zonesData}
            selectedZones={selectedAccessZones}
            onZoneToggle={toggleAccessZone}
            // IMPORTANTE: ZoneSelector debe pasar zone.name a onZoneToggle
            // Si ZoneSelector usa zone.id, modifícalo para que pase zone.name
            loading={loadingZones}
            error={errorZones}
            placeholder="Select access zones"
          />

          {/* Photo Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Upload Photo for Facial Recognition</h3>

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
                      <Button type="button" variant="outline" className="bg-slate-50" onClick={() => fileInputRef.current?.click()}>
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
                  <Button type="button" variant="outline" className="bg-slate-50" onClick={() => fileInputRef.current?.click()}>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSavingUser}>
            Cancel
          </Button>
          <Button
            onClick={handleRegisterUser}
            disabled={isSavingUser || isProcessingImage || !faceApiModelsLoaded || !!faceApiModelsError || !!faceDetectionError || !faceEmbedding}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSavingUser ? 'Registering...' : 'Register User'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Camera Capture Component */}
      <CameraCapture open={isCameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
    </Dialog>
  );
};

export default RegisterUserModal;
