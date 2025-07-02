"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  UserCircle2,
  X,
  Check,
  Upload,
  Camera,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

// Importar tipos compartidos
import { ObservedUser, ItemWithNameAndId } from "@/types/common";

// Importar Face-API.js (asumimos que ya está en tu proyecto y cargado globalmente o en un contexto)
// Si Face-API.js no está cargado globalmente, necesitarás un contexto o pasarlo como prop.
// Por ahora, asumimos que se carga en AdminDashboard y está disponible.
import * as faceapi from "face-api.js";

// Importar el componente CameraCapture
import { CameraCapture } from "@/components/camera-capture";

// Definir las props que recibirá la modal
interface RegisterUserModalProps {
  isOpen: boolean; // Controla si la modal está abierta
  onClose: () => void; // Función para cerrar la modal
  observedUser: ObservedUser | null; // El usuario observado que se va a registrar
  onUserRegistered: () => void; // Callback cuando el usuario se registra exitosamente
}

const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  isOpen,
  onClose,
  observedUser,
  onUserRegistered,
}) => {
  // --- Estados del formulario de nuevo usuario ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedUserStatus, setSelectedUserStatus] =
    useState<string>("Inactive");
  const [selectedAccessZones, setSelectedAccessZones] = useState<string[]>([]);
  const [accessZonesOpen, setAccessZonesOpen] = useState(false);

  // --- Estados para carga de catálogos (roles, zonas, estados de usuario) ---
  const [roles, setRoles] = useState<ItemWithNameAndId[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  const [zonesData, setZonesData] = useState<ItemWithNameAndId[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [errorZones, setErrorZones] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<ItemWithNameAndId[]>([]);
  const [loadingUserStatuses, setLoadingUserStatuses] = useState(true);
  const [errorUserStatuses, setErrorUserStatuses] = useState<string | null>(
    null
  );

  // --- Estados para carga de foto y Face-API.js ---
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<File | Blob | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null);
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(
    null
  );
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] = useState(false);
  const [faceApiModelsError, setFaceApiModelsError] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setCameraOpen] = useState(false);

  // --- Estado global de UI / Feedback ---
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(
    null
  );
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- Efecto para cargar los modelos de Face-API.js ---
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models"; // Asegúrate de que esta ruta sea accesible
      try {
        setFaceApiModelsLoaded(false);
        setFaceApiModelsError(null);
        await faceapi.nets.ssdMobilenetv1.load(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.load(MODEL_URL);
        setFaceApiModelsLoaded(true);
        console.log(
          "Face-API.js models loaded successfully in RegisterUserModal!"
        );
      } catch (error: any) {
        console.error(
          "Error loading Face-API.js models in RegisterUserModal:",
          error
        );
        setFaceApiModelsError(
          `Failed to load face detection models: ${error.message}`
        );
      }
    };
    loadModels();
  }, []);

  // --- Efecto para procesar la imagen con Face-API.js ---
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
        const img = document.createElement("img");
        img.src =
          currentImage instanceof File
            ? URL.createObjectURL(currentImage)
            : URL.createObjectURL(currentImage);

        img.onload = async () => {
          const detectionsWithLandmarks = await faceapi
            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (detectionsWithLandmarks.length === 0) {
            setFaceDetectionError(
              "No face detected in the image. Please use a clear photo."
            );
            setFaceEmbedding(null);
          } else if (detectionsWithLandmarks.length > 1) {
            setFaceDetectionError(
              "Multiple faces detected. Please use a photo with only one person."
            );
            setFaceEmbedding(null);
          } else {
            const faceDescriptor = detectionsWithLandmarks[0].descriptor;
            setFaceEmbedding(new Float32Array(faceDescriptor));
            setFaceDetectionError(null);
            console.log("Face detected and embedding generated successfully!");
          }
          URL.revokeObjectURL(img.src);
          setIsProcessingImage(false);
        };

        img.onerror = (e) => {
          console.error("Error loading image for Face-API.js:", e);
          setFaceDetectionError(
            "Could not load image for processing. Please try another file."
          );
          setIsProcessingImage(false);
        };
      } catch (error: any) {
        console.error(
          "Error during face detection or embedding generation:",
          error
        );
        setFaceDetectionError(
          `Face detection failed: ${error.message}. Ensure models are loaded and image is clear.`
        );
        setFaceEmbedding(null);
        setIsProcessingImage(false);
      }
    };

    processImageForFaceRecognition();
  }, [currentImage, faceApiModelsLoaded]);

  // --- Efecto para cargar catálogos (roles, zonas, estados de usuario) ---
  useEffect(() => {
    const fetchCatalogs = async () => {
      // Fetch Roles
      setLoadingRoles(true);
      setErrorRoles(null);
      try {
        const response = await fetch(
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-user-roles"
        );
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Failed to fetch roles"
          );
        const result = await response.json();
        setRoles(result.roles || []);
        if (result.roles && result.roles.length > 0) {
          setSelectedRole(result.roles[0].name); // Seleccionar el primer rol por defecto
        }
      } catch (error: any) {
        console.error("Error fetching roles:", error);
        setErrorRoles(error.message);
      } finally {
        setLoadingRoles(false);
      }

      // Fetch Zones
      setLoadingZones(true);
      setErrorZones(null);
      try {
        const response = await fetch(
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-access-zones"
        );
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Failed to fetch zones"
          );
        const result = await response.json();
        setZonesData(result.zones || []);
      } catch (error: any) {
        console.error("Error fetching zones:", error);
        setErrorZones(error.message);
      } finally {
        setLoadingZones(false);
      }

      // Fetch User Statuses
      setLoadingUserStatuses(true);
      setErrorUserStatuses(null);
      try {
        const response = await fetch(
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-user-statuses"
        );
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Failed to fetch user statuses"
          );
        const result = await response.json();
        setUserStatuses(result.statuses || []);
        if (result.statuses && result.statuses.length > 0) {
          const inactiveStatus = result.statuses.find(
            (status: { name: string }) => status.name === "Inactive"
          );
          if (inactiveStatus) {
            setSelectedUserStatus(inactiveStatus.name);
          } else {
            setSelectedUserStatus(result.statuses[0].name); // Por defecto si 'Inactive' no existe
          }
        }
      } catch (error: any) {
        console.error("Error fetching user statuses:", error);
        setErrorUserStatuses(error.message);
      } finally {
        setLoadingUserStatuses(false);
      }
    };

    if (isOpen) {
      // Solo cargar catálogos cuando la modal se abre
      fetchCatalogs();
      // Pre-llenar campos si se pasa un observedUser
      if (observedUser) {
        setFullName(observedUser.id); // Usamos el ID temporal como nombre inicial
        // Si el observedUser tiene faceImageUrl, precargarlo
        if (observedUser.faceImage) {
          // assuming observedUser.faceImage is the URL
          fetch(observedUser.faceImage)
            .then((res) => res.blob())
            .then((blob) => {
              setCurrentImage(blob);
              setImagePreview(observedUser.faceImage);
            })
            .catch((err) =>
              console.error("Error preloading observed user image:", err)
            );
        }
      } else {
        // Resetear si no hay observedUser o al reabrir sin uno
        setFullName("");
        setEmail("");
        setEmailError(null);
        setSelectedRole("");
        setSelectedUserStatus("Inactive");
        setSelectedAccessZones([]);
        clearImage();
        setFaceEmbedding(null);
        setFaceDetectionError(null);
        setShowStatusMessage(null);
      }
    }
  }, [isOpen, observedUser]); // Dependencia en isOpen y observedUser

  // --- Funciones de manejo de imagen y cámara (reutilizadas de AdminDashboard) ---
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
      if (file.type.startsWith("image/")) {
        setCurrentImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setFaceEmbedding(null);
          setFaceDetectionError(null);
        };
        reader.readAsDataURL(file);
      } else {
        console.error("Dropped file is not an image.");
        setFaceDetectionError("Please drop an image file (e.g., JPG, PNG).");
      }
    }
  }, []);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        setCurrentImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setFaceEmbedding(null);
          setFaceDetectionError(null);
        };
        reader.readAsDataURL(file);
      } else if (file) {
        console.error("Selected file is not an image.");
        setFaceDetectionError("Please select an image file (e.g., JPG, PNG).");
      }
      e.target.value = "";
    },
    []
  );

  const clearImage = useCallback(() => {
    setImagePreview(null);
    setCurrentImage(null);
    setFaceEmbedding(null);
    setFaceDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        console.error("Error converting captured image to blob:", error);
        setFaceDetectionError("Failed to process captured image from camera.");
      });
  }, []);

  // --- Funciones de validación y manejo de formulario ---
  const validateEmail = (email: string) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.trim();
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError(null);
    }
  };

  const toggleAccessZone = (zoneName: string) => {
    setSelectedAccessZones((prev) =>
      prev.includes(zoneName)
        ? prev.filter((name) => name !== zoneName)
        : [...prev, zoneName]
    );
  };

  const handleRegisterUser = async () => {
    console.log("Register User clicked in modal");

    const trimmedEmail = email.trim();
    const isEmailValid = validateEmail(trimmedEmail);

    const missingFields = [];
    if (!fullName) missingFields.push("Full Name");
    if (!isEmailValid) missingFields.push("Valid Email");
    if (!selectedRole) missingFields.push("User Role");
    if (!selectedUserStatus) missingFields.push("User Status");
    if (selectedAccessZones.length === 0) missingFields.push("Access Zones");
    if (!currentImage) missingFields.push("Photo");
    if (!faceApiModelsLoaded)
      missingFields.push("Facial recognition models not loaded");
    if (!faceEmbedding)
      missingFields.push(
        "Facial Embedding (No face detected or multiple faces)"
      );
    if (faceDetectionError)
      missingFields.push(`Face Detection Issue: ${faceDetectionError}`);

    if (missingFields.length > 0) {
      setShowStatusMessage(
        `Error: Please fill all required fields and ensure a single face is detected. Missing: ${missingFields.join(
          ", "
        )}`
      );
      return;
    }

    setIsSavingUser(true);
    setShowStatusMessage("Registering user...");

    try {
      const payload = {
        fullName: fullName,
        email: trimmedEmail,
        roleName: selectedRole,
        statusName: selectedUserStatus,
        accessZoneNames: selectedAccessZones,
        faceEmbedding: Array.from(faceEmbedding!),
        // AHORA: Enviar la URL de la imagen del usuario observado si existe
        profilePictureUrl: observedUser?.faceImage || null,
        // Añadir observedUserId si existe, para vincular el log
        observedUserId: observedUser?.id || null,
      };

      const edgeFunctionUrl =
        "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/register-new-user"; // URL de tu Edge Function para registrar usuarios

      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      setShowStatusMessage(
        `User registered successfully! ID: ${result.userId || "N/A"}`
      );
      console.log("User registration successful:", result);

      // Limpiar formulario y cerrar modal después de éxito
      setFullName("");
      setEmail("");
      setEmailError(null);
      setSelectedRole("");
      setSelectedUserStatus("Inactive");
      setSelectedAccessZones([]);
      clearImage();
      setFaceEmbedding(null);
      setFaceDetectionError(null);
      setIsSavingUser(false);
      onUserRegistered(); // Llamar al callback para que el padre actualice la lista
      onClose(); // Cerrar la modal
    } catch (error: any) {
      console.error("Error during user registration:", error);
      setShowStatusMessage(`Failed to register user: ${error.message}`);
      setIsSavingUser(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Observed User</DialogTitle>
          <DialogDescription>
            Convert an observed user into a registered system user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
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
                className={emailError ? "border-red-500" : ""}
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
                disabled={loadingRoles || !!errorRoles}
              >
                <SelectTrigger
                  id="userRole"
                  className="bg-slate-50 border-0 h-12"
                >
                  {loadingRoles ? (
                    <SelectValue placeholder="Loading roles..." />
                  ) : errorRoles ? (
                    <SelectValue
                      placeholder={`Error loading roles: ${errorRoles}`}
                    />
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
              <Select
                value={selectedUserStatus}
                onValueChange={setSelectedUserStatus}
                disabled={loadingUserStatuses || !!errorUserStatuses}
              >
                <SelectTrigger
                  id="userStatus"
                  className="bg-slate-50 border-0 h-12"
                >
                  <span>
                    {loadingUserStatuses
                      ? "Loading statuses..."
                      : errorUserStatuses
                      ? `Error: ${errorUserStatuses}`
                      : selectedUserStatus
                      ? selectedUserStatus
                      : "Select status"}
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
                      ? "Loading zones..."
                      : errorZones
                      ? `Error: ${errorZones}`
                      : selectedAccessZones.length > 0
                      ? `${selectedAccessZones.length} zone${
                          selectedAccessZones.length > 1 ? "s" : ""
                        } selected`
                      : "Select access zones"}
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
                      <div
                        key={zone.id}
                        className="flex items-center space-x-2"
                      >
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
                    !loadingZones &&
                    !errorZones && (
                      <div className="p-2 text-gray-500">
                        No zones available
                      </div>
                    )
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedAccessZones.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedAccessZones.map((zoneName) => (
                  <Badge
                    key={zoneName}
                    variant="secondary"
                    className="bg-slate-100"
                  >
                    {zoneName}
                    <button
                      className="ml-1 hover:text-red-500"
                      onClick={() => toggleAccessZone(zoneName)}
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Upload Photo for Facial Recognition
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {!imagePreview ? (
              <div
                className={`border-2 ${
                  isDragging
                    ? "border-teal-500 bg-teal-50"
                    : "border-dashed border-gray-300"
                } rounded-lg p-6 transition-colors`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload
                    className={`mx-auto h-12 w-12 ${
                      isDragging ? "text-teal-500" : "text-gray-400"
                    }`}
                  />
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Drag and drop an image here, or use one of the options
                      below
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-slate-50"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-slate-50"
                        onClick={() => setCameraOpen(true)}
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
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-48 h-48 object-cover rounded-lg border shadow-md"
                  />
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
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Replace Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Photo
                  </Button>
                </div>
                <p className="text-xs text-gray-500 italic">
                  You can also drag and drop a new image to replace the current
                  one
                </p>
              </div>
            )}

            {isProcessingImage && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">
                  Processing Image...
                </AlertTitle>
                <AlertDescription className="text-blue-700">
                  Analyzing photo for face detection and embedding generation.
                </AlertDescription>
              </Alert>
            )}

            {faceDetectionError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">
                  Facial Recognition Error
                </AlertTitle>
                <AlertDescription className="text-red-700">
                  {faceDetectionError}
                </AlertDescription>
              </Alert>
            )}

            {faceEmbedding && !faceDetectionError && !isProcessingImage && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">
                  Face Detected!
                </AlertTitle>
                <AlertDescription className="text-green-700">
                  Facial embedding successfully generated.
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> Upon saving this user, the system
                will automatically detect faces in the image and generate a
                'facial embedding' for authentication. Ensure the image contains
                a clear, well-lit face.
              </p>
            </div>
          </div>

          {showStatusMessage && (
            <Alert
              className={
                showStatusMessage.startsWith("Error")
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription
                    className={
                      showStatusMessage.startsWith("Error")
                        ? "text-red-700"
                        : "text-blue-700"
                    }
                  >
                    {showStatusMessage}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStatusMessage(null)}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
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
            disabled={
              isSavingUser ||
              isProcessingImage ||
              !faceApiModelsLoaded ||
              !!faceApiModelsError ||
              !!faceDetectionError ||
              !faceEmbedding
            }
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSavingUser ? "Registering..." : "Register User"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Camera Capture Component */}
      <CameraCapture
        open={isCameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </Dialog>
  );
};

export default RegisterUserModal;
