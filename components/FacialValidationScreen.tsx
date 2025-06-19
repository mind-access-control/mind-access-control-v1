import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Zone {
  id: string;
  name: string;
  description?: string;
}

// --- ACTUALIZACIÓN DE INTERFACES PARA LA RESPUESTA UNIFICADA DE LA EDGE FUNCTION ---
interface ItemWithNameAndId {
  // Re-definido aquí para coherencia con el backend
  id: string;
  name: string;
}

interface UnifiedValidationResponse {
  user: {
    id: string;
    full_name: string | null;
    user_type: "registered" | "observed" | "unknown";
    hasAccess: boolean;
    similarity: number;
    role_details: ItemWithNameAndId | null; // Null para observados
    status_details: ItemWithNameAndId;
    zones_accessed_details: ItemWithNameAndId[];

    observed_details?: {
      // Opcional, solo para usuarios observados
      first_seen_at: string;
      last_seen_at: string;
      access_count: number;
      alert_triggered: boolean;
      expires_at: string;
      potential_match_user_id: string | null;
    };
  };
  type:
    | "registered_user_matched"
    | "observed_user_updated"
    | "new_observed_user_registered"
    | "no_match_found"
    | string;
  message?: string;
  error?: string;
}
// --- FIN DE ACTUALIZACIÓN DE INTERFACES ---

const FacialValidationScreen: React.FC = () => {
  // --- ESTADOS ---\
  const webcamRef = useRef<Webcam>(null);
  const [captureMode, setCaptureMode] = useState<"manual" | "automatic">(
    "manual"
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] =
    useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [isProcessingFace, setIsProcessingFace] = useState<boolean>(false); // Para la UI
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(
    null
  );
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [isLoadingZones, setIsLoadingZones] = useState<boolean>(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined
  );
  // Estado para la información detallada del usuario en la UI
  const [userInfo, setUserInfo] = useState<{
    id: string;
    fullName: string | null;
    userType: "registered" | "observed" | "unknown";
    role: string;
    status: string;
    accessZones: string[];
    similarity: number;
    hasAccess: boolean;
    observedDetails?: {
      firstSeenAt: string;
      lastSeenAt: string;
      accessCount: number;
      alertTriggered: boolean;
      expiresAt: string;
      potentialMatchUserId: string | null;
    };
  } | null>(null);

  // New state to force the main useEffect to restart
  const [intervalRestartTrigger, setIntervalRestartTrigger] = useState(false);

  // --- REFERENCES (for mutable values that do not trigger re-renders) ---
  const detectionIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyInCooldownRef = useRef(false); // Cooldown flag
  const isProcessingAttemptRef = useRef(false); // Flag for processing attempt in progress (manual or automatic)

  // --- HELPER FUNCTION TO CLEAR ALL TIMERS AND RESET FLAGS ---
  const clearAllTimersAndFlags = useCallback(() => {
    if (detectionIntervalIdRef.current) {
      clearInterval(detectionIntervalIdRef.current);
      detectionIntervalIdRef.current = null;
    }
    if (cooldownTimeoutIdRef.current) {
      clearTimeout(cooldownTimeoutIdRef.current);
      cooldownTimeoutIdRef.current = null;
    }
    isCurrentlyInCooldownRef.current = false;
    isProcessingAttemptRef.current = false;
    setIsProcessingFace(false);
  }, []);

  // --- GENERIC CLEANUP FUNCTION FOR MODE/ZONE/CAMERA CHANGES ---
  const resetStateAndClearTimers = useCallback(() => {
    setImageSrc(null);
    setValidationMessage(null);
    setFaceDetectionError(null);
    setUserInfo(null); // <--- AHORA SÍ: Limpiar la información del usuario en cada reinicio
    clearAllTimersAndFlags();
  }, [clearAllTimersAndFlags]);

  // --- Camera change handler (useCallback for stability) ---
  const handleDeviceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(event.target.value);
      resetStateAndClearTimers(); // Resetear estado al cambiar de cámara
      setIntervalRestartTrigger((prev) => !prev);
    },
    [setSelectedDeviceId, resetStateAndClearTimers, setIntervalRestartTrigger]
  );

  // --- Fetch zones from Supabase ---
  useEffect(() => {
    const fetchZones = async () => {
      setIsLoadingZones(true);
      try {
        const response = await fetch(
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-access-zones"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch zones");
        }
        const data = await response.json();

        let zonesArray: Zone[] = [];
        if (Array.isArray(data)) {
          zonesArray = data;
        } else if (data && Array.isArray(data.data)) {
          zonesArray = data.data;
        } else if (data && Array.isArray(data.zones)) {
          zonesArray = data.zones;
        } else if (data && data.id && data.name) {
          zonesArray = [data];
        }

        setZones(zonesArray);

        if (zonesArray.length > 0) {
          setSelectedZone(zonesArray[0].id);
        }
      } catch (error) {
        console.error("❌ ERROR: Error al obtener zonas:", error);
        setFaceDetectionError("Failed to load access zones. Please try again.");
      } finally {
        setIsLoadingZones(false);
      }
    };

    fetchZones();
  }, []);

  // --- Load Face-API.js models ---
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const MODEL_URL = "/models";
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setFaceApiModelsLoaded(true);
      } catch (error) {
        console.error(
          "❌ ERROR: Error al cargar modelos de Face-API.js:",
          error
        );
        setFaceDetectionError(
          "Failed to load facial recognition models. Please check your network or model path."
        );
      } finally {
        setIsLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  // --- Effect to enumerate video devices ---
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error(
          "❌ ERROR: Error al enumerar dispositivos de medios:",
          error
        );
        setFaceDetectionError(
          "Failed to access camera devices. Please ensure camera permissions are granted."
        );
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        enumerateDevices();
      })
      .catch((error) => {
        console.error("❌ ERROR: Acceso inicial a la cámara denegado:", error);
        setFaceDetectionError(
          "Camera access denied. Please grant permissions to use this feature."
        );
      });
  }, [selectedDeviceId]);

  // --- Main validation function (imperatively called) ---
  const processAndValidateFace = useCallback(
    async (descriptor: Float32Array, capturedImageSrc: string) => {
      setIsProcessingFace(true);
      setValidationMessage("Validating face against database...");
      setFaceDetectionError(null);
      setUserInfo(null); // <--- AHORA SÍ: Limpiar userInfo al inicio de CADA validación
      setImageSrc(capturedImageSrc);

      try {
        const validateEdgeFunctionUrl =
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/validate-user-face";

        const payload = {
          faceEmbedding: Array.from(descriptor),
          zoneId: selectedZone,
        };

        const response = await fetch(validateEdgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData: { error?: string; message?: string } =
            await response.json();
          throw new Error(
            errorData.error ||
              errorData.message ||
              `HTTP Error: ${response.status}`
          );
        }

        const result: UnifiedValidationResponse = await response.json();
        console.log(
          "✅ VALIDACIÓN: Resultado de validación de rostro:",
          result
        );

        if (result.error) {
          setFaceDetectionError(`Validation Error: ${result.error}`);
          setValidationMessage("Validation failed due to server error.");
          setUserInfo(null); // Asegurar que userInfo sea null en caso de error de la Edge Function
          return;
        }

        // --- Lógica para el mensaje principal y userInfo basada en la respuesta unificada ---
        let displayMessage = "";
        let userFullNameForDisplay = result.user.full_name;

        if (
          !userFullNameForDisplay ||
          userFullNameForDisplay === "System Error"
        ) {
          // Generar un nombre más amigable para usuarios observados si no hay nombre completo
          if (result.user.user_type === "observed") {
            userFullNameForDisplay = `Usuario Observado ${result.user.id.substring(
              0,
              8
            )}`;
          } else {
            userFullNameForDisplay = `ID: ${result.user.id.substring(0, 8)}...`;
          }
        }

        if (result.user.hasAccess) {
          displayMessage = `Acceso Concedido - Usuario: ${userFullNameForDisplay}`;
        } else {
          displayMessage = `Acceso Denegado - Usuario: ${userFullNameForDisplay}`;
        }

        setValidationMessage(displayMessage);

        const newUserInfo: typeof userInfo = {
          id: result.user.id,
          fullName: userFullNameForDisplay, // Usar el nombre procesado
          userType: result.user.user_type,
          role: result.user.role_details?.name || "N/A",
          status: result.user.status_details?.name || "N/A",
          accessZones: result.user.zones_accessed_details.map(
            (z) => z.name || "Zona Desconocida"
          ),
          similarity: result.user.similarity,
          hasAccess: result.user.hasAccess,
        };

        if (
          result.user.user_type === "observed" &&
          result.user.observed_details
        ) {
          newUserInfo.observedDetails = {
            firstSeenAt: result.user.observed_details.first_seen_at,
            lastSeenAt: result.user.observed_details.last_seen_at,
            accessCount: result.user.observed_details.access_count,
            alertTriggered: result.user.observed_details.alert_triggered,
            expiresAt: result.user.observed_details.expires_at,
            potentialMatchUserId:
              result.user.observed_details.potential_match_user_id,
          };
        }
        setUserInfo(newUserInfo);
      } catch (error: any) {
        console.error(
          "❌ ERROR: Error durante la validación del rostro:",
          error
        );
        setFaceDetectionError(`Error: ${error.message}`);
        setValidationMessage("Validation failed.");
        setUserInfo(null); // Limpiar info si hay error
      } finally {
        setIsProcessingFace(false);
      }
    },
    [
      selectedZone,
      setValidationMessage,
      setFaceDetectionError,
      setIsProcessingFace,
      setUserInfo,
      setImageSrc,
    ]
  );

  // --- Function to capture photo and extract descriptor (manual or automatic) ---
  const captureAndExtractDescriptorLogic = useCallback(async () => {
    if (!isProcessingAttemptRef.current) {
      return;
    }

    if (!webcamRef.current || !faceApiModelsLoaded) {
      setValidationMessage(
        "Facial recognition models are still loading or camera not ready."
      );
      isProcessingAttemptRef.current = false;
      return;
    }

    setValidationMessage("Capturing image...");
    setFaceDetectionError(null);
    setUserInfo(null); // <--- AHORA SÍ: Limpiar userInfo al inicio de CADA captura
    setImageSrc(null);

    try {
      const imageSrcData = webcamRef.current?.getScreenshot();
      if (imageSrcData) {
        const img = await faceapi.fetchImage(imageSrcData);

        const detections = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          setValidationMessage("Face detected! Processing for validation...");
          await processAndValidateFace(detections.descriptor, imageSrcData);
        } else {
          setValidationMessage("No face detected in the captured image.");
          setFaceDetectionError(
            "No face detected in the captured image. Please ensure your face is clearly visible."
          );
          console.warn("⚠️ ADVERTENCIA: No se detectó rostro en la captura.");
          isProcessingAttemptRef.current = false;
        }
      } else {
        throw new Error("Could not capture image from webcam.");
      }
    } catch (error: any) {
      console.error("❌ ERROR: Error durante la captura de imagen:", error);
      setFaceDetectionError(`Error: ${error.message}`);
      setValidationMessage("An error occurred during capture.");
      isProcessingAttemptRef.current = false;
    }
  }, [
    webcamRef,
    faceApiModelsLoaded,
    processAndValidateFace,
    setValidationMessage,
    setFaceDetectionError,
    setUserInfo,
    setImageSrc,
  ]);

  // --- Main useEffect for automatic detection interval management ---
  useEffect(() => {
    // --- EFFECT INITIAL CLEANUP LOGIC ---
    // Asegurar que se limpian los estados relevantes antes de iniciar un nuevo ciclo.
    // Esto es CRUCIAL cuando se reinicia el efecto (e.g., cambio de modo/zona/cámara).
    resetStateAndClearTimers();

    // --- CONDITIONS TO START A NEW DETECTION INTERVAL ---
    if (
      captureMode !== "automatic" ||
      !faceApiModelsLoaded ||
      isLoadingModels ||
      !selectedDeviceId ||
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4
    ) {
      return;
    }

    // --- FUNCTION THAT RUNS ON EACH setInterval TICK ---
    const runDetectionStep = async () => {
      if (isCurrentlyInCooldownRef.current || isProcessingAttemptRef.current) {
        return;
      }

      if (
        !webcamRef.current ||
        !webcamRef.current.video ||
        webcamRef.current.video.readyState !== 4
      ) {
        console.log("⚠️ TICK: Webcam no está lista, deteniendo intervalo.");
        clearAllTimersAndFlags();
        return;
      }

      isProcessingAttemptRef.current = true;

      try {
        let bestDetection: any = null;
        let highestScore = 0;
        const ATTEMPTS = 3;
        const ATTEMPT_DELAY_MS = 100;

        for (let i = 0; i < ATTEMPTS; i++) {
          const currentDetection = await faceapi
            .detectSingleFace(
              webcamRef.current.video,
              new faceapi.SsdMobilenetv1Options()
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (
            currentDetection &&
            currentDetection.detection.score > highestScore
          ) {
            highestScore = currentDetection.detection.score;
            bestDetection = currentDetection;
          }
          if (i < ATTEMPTS - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, ATTEMPT_DELAY_MS)
            );
          }
        }

        if (bestDetection) {
          // Detener el intervalo inmediatamente después de una detección exitosa
          if (detectionIntervalIdRef.current) {
            clearInterval(detectionIntervalIdRef.current);
            detectionIntervalIdRef.current = null;
          }

          isCurrentlyInCooldownRef.current = true;

          // Iniciar un cooldown, después del cual se reinicia el intervalo
          cooldownTimeoutIdRef.current = setTimeout(() => {
            isCurrentlyInCooldownRef.current = false;
            // Forzar el reinicio del useEffect para re-evaluar y (re)iniciar el intervalo
            setIntervalRestartTrigger((prev) => !prev);
          }, 10000); // 10 segundos de cooldown

          await captureAndExtractDescriptorLogic();
        } else {
          isProcessingAttemptRef.current = false;
        }
      } catch (error) {
        console.error(
          "❌ TICK: Error during automatic face detection interval:",
          error
        );
        clearAllTimersAndFlags();
      }
    };

    // Solo iniciar el intervalo si no hay uno activo
    if (!detectionIntervalIdRef.current) {
      detectionIntervalIdRef.current = setInterval(runDetectionStep, 500); // Intenta detectar cada 0.5 segundos
    }

    return () => {
      clearAllTimersAndFlags();
    };
  }, [
    captureMode,
    faceApiModelsLoaded,
    isLoadingModels,
    selectedDeviceId,
    captureAndExtractDescriptorLogic,
    clearAllTimersAndFlags,
    intervalRestartTrigger, // Dependencia para forzar reinicio del efecto
    resetStateAndClearTimers, // Asegurar que resetStateAndClearTimers se llama al inicio del efecto
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Validación de Acceso Facial
        </h2>

        {/* Loading models indicator */}
        {isLoadingModels && (
          <div className="text-center text-blue-500 font-semibold">
            Cargando modelos de reconocimiento facial...
          </div>
        )}

        {/* Camera Selector */}
        {!isLoadingModels && devices.length > 1 && (
          <div className="w-full">
            <label
              htmlFor="camera-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Seleccionar Cámara:
            </label>
            <select
              id="camera-select"
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Cámara ${device.deviceId.substring(0, 8)}`}{" "}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Warning if no cameras detected */}
        {!isLoadingModels && devices.length === 0 && (
          <div className="text-center text-red-500 font-semibold">
            No se encontraron dispositivos de cámara. Asegúrese de que una
            cámara esté conectada y los permisos estén concedidos.
          </div>
        )}

        {/* Zone Selector */}
        {!isLoadingZones && (
          <div className="w-full">
            <label
              htmlFor="zone-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Seleccionar Zona de Acceso:
            </label>
            <select
              id="zone-select"
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                resetStateAndClearTimers(); // Resetear estado al cambiar de zona
                setIntervalRestartTrigger((prev) => !prev);
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Zone loading indicator */}
        {isLoadingZones && (
          <div className="text-center text-blue-500 font-semibold">
            Cargando zonas de acceso...
          </div>
        )}

        {/* CAPTURE MODE: Manual vs. Automatic */}
        <div className="w-full mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de Captura:
          </label>
          <div className="flex items-center space-x-4">
            <label
              htmlFor="manual-mode"
              className="flex items-center cursor-pointer"
            >
              <input
                type="radio"
                id="manual-mode"
                name="captureMode"
                value="manual"
                checked={captureMode === "manual"}
                onChange={() => {
                  setCaptureMode("manual");
                  resetStateAndClearTimers(); // Resetear estado al cambiar de modo
                  setIntervalRestartTrigger((prev) => !prev);
                }}
                className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-gray-800">Manual</span>
            </label>
            <label
              htmlFor="automatic-mode"
              className="flex items-center cursor-pointer"
            >
              <input
                type="radio"
                id="automatic-mode"
                name="captureMode"
                value="automatic"
                checked={captureMode === "automatic"}
                onChange={() => {
                  setCaptureMode("automatic");
                  resetStateAndClearTimers(); // Resetear estado al cambiar de modo
                  setIntervalRestartTrigger((prev) => !prev);
                }}
                className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-gray-800">
                Automático (Detección Facial)
              </span>
            </label>
          </div>
        </div>

        {/* Camera Area */}
        <div className="relative w-full aspect-video bg-gray-200 rounded-md overflow-hidden">
          {!isLoadingModels && selectedDeviceId && (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              height="100%"
              videoConstraints={{
                deviceId: selectedDeviceId,
                facingMode: { ideal: "user" },
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Capture Button */}
        <button
          onClick={() => {
            isProcessingAttemptRef.current = true;
            captureAndExtractDescriptorLogic();
          }}
          disabled={
            !faceApiModelsLoaded ||
            isProcessingFace ||
            !selectedDeviceId ||
            captureMode === "automatic"
          }
          className={`w-full py-3 rounded-md font-semibold text-lg ${
            faceApiModelsLoaded &&
            !isProcessingFace &&
            selectedDeviceId &&
            captureMode === "manual"
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300"
              : "bg-gray-400 text-gray-700 cursor-not-allowed"
          }`}
          style={{ display: captureMode === "automatic" ? "none" : "block" }}
        >
          {isProcessingFace ? "Procesando..." : "Capturar Foto"}
        </button>

        {/* Captured image preview */}
        {imageSrc && (
          <div className="mt-4 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Imagen Capturada:
            </h3>
            <img
              src={imageSrc}
              alt="Captured"
              className="max-w-full h-auto rounded-md border border-gray-300 mx-auto"
            />
          </div>
        )}

        {/* Status and error messages */}
        {validationMessage && (
          <div
            className="mt-4 p-3 rounded-md text-center text-lg font-medium"
            style={{
              backgroundColor: validationMessage.includes("Access Granted")
                ? "#dcfce7"
                : validationMessage.includes("Access Denied")
                ? "#fee2e2"
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No face detected") ||
                  validationMessage.includes("Validation failed.")
                ? "#fee2e2"
                : "#dbeafe",
              color: validationMessage.includes("Access Granted")
                ? "#166534"
                : validationMessage.includes("Access Denied")
                ? "#b91c1c"
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No face detected") ||
                  validationMessage.includes("Validation failed.")
                ? "#b91c1c"
                : "#2563eb",
            }}
          >
            {validationMessage}
          </div>
        )}
        {faceDetectionError && (
          <div className="mt-2 p-3 rounded-md bg-red-100 text-red-700 text-center font-medium">
            Error: {faceDetectionError}
          </div>
        )}

        {/* Información detallada del usuario (si está disponible) */}
        {userInfo && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md shadow-inner text-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Detalles del Usuario:
            </h3>
            <p>
              <strong>ID:</strong> {userInfo.id}
            </p>
            {userInfo.fullName && userInfo.fullName !== "System Error" && (
              <p>
                <strong>Nombre Completo:</strong> {userInfo.fullName}
              </p>
            )}
            <p>
              <strong>Tipo de Usuario:</strong>{" "}
              {userInfo.userType === "registered" ? "Registrado" : "Observado"}
            </p>
            <p>
              <strong>Rol:</strong> {userInfo.role}
            </p>
            <p>
              <strong>Estado:</strong> {userInfo.status}
            </p>
            <p>
              <strong>Similitud:</strong>{" "}
              {(userInfo.similarity * 100).toFixed(2)}%
            </p>
            <p>
              <strong>Acceso Concedido:</strong>{" "}
              {userInfo.hasAccess ? "Sí" : "No"}
            </p>
            <p>
              <strong>Zonas Accedidas:</strong>{" "}
              {userInfo.accessZones.length > 0
                ? userInfo.accessZones.join(", ")
                : "N/A"}
            </p>

            {userInfo.userType === "observed" && userInfo.observedDetails && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  Detalles de Usuario Observado:
                </h4>
                <p>
                  <strong>Visto por primera vez:</strong>{" "}
                  {new Date(
                    userInfo.observedDetails.firstSeenAt
                  ).toLocaleString()}
                </p>
                <p>
                  <strong>Visto por última vez:</strong>{" "}
                  {new Date(
                    userInfo.observedDetails.lastSeenAt
                  ).toLocaleString()}
                </p>
                <p>
                  <strong>Conteo de Accesos:</strong>{" "}
                  {userInfo.observedDetails.accessCount}
                </p>
                <p>
                  <strong>Alerta Activada:</strong>{" "}
                  {userInfo.observedDetails.alertTriggered ? "Sí" : "No"}
                </p>
                <p>
                  <strong>Expira en:</strong>{" "}
                  {new Date(
                    userInfo.observedDetails.expiresAt
                  ).toLocaleString()}
                </p>
                {userInfo.observedDetails.potentialMatchUserId && (
                  <p>
                    <strong>Posible Match con ID:</strong>{" "}
                    {userInfo.observedDetails.potentialMatchUserId.substring(
                      0,
                      8
                    )}
                    ...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacialValidationScreen;
