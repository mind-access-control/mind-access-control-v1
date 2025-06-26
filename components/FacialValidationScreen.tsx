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
      firstSeenAt: string;
      lastSeenAt: string;
      accessCount: number;
      alertTriggered: boolean;
      expiresAt: string;
      potentialMatchUserId: string | null;
      similarity: number; // Añadido
      distance: number; // Añadido
      faceImageUrl: string | null; // <--- AÑADIDO: URL de la imagen de la cara
    };
  };
  type:
    | "registered_user_matched"
    | "observed_user_updated"
    | "new_observed_user_registered"
    | "no_match_found"
    | "registered_user_access_denied"
    | "observed_user_access_denied_expired"
    | "observed_user_access_denied_status_expired"
    | string;
  message?: string;
  error?: string;
}
// --- FIN DE ACTUALIZACIÓN DE INTERFACES ---

const FacialValidationScreen: React.FC = () => {
  // --- ESTADOS ---
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
  const [isProcessingFace, setIsProcessingFace] = useState<boolean>(false);
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
      faceImageUrl: string | null; // <--- AÑADIDO: para mostrar la URL de la imagen
    };
  } | null>(null);

  const [intervalRestartTrigger, setIntervalRestartTrigger] = useState(false);

  // --- REFERENCIAS (para valores mutables que no disparan re-renders) ---
  const detectionIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyInCooldownRef = useRef(false);
  const isProcessingAttemptRef = useRef(false);

  // --- FUNCIÓN HELPER PARA LIMPIAR TODOS LOS TIMERS Y RESETEAR BANDERAS ---
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

  // --- FUNCIÓN GENÉRICA DE LIMPIEZA PARA CAMBIOS DE MODO/ZONA/CÁMARA ---
  const resetStateAndClearTimers = useCallback(() => {
    setImageSrc(null);
    setValidationMessage(null);
    setFaceDetectionError(null);
    setUserInfo(null);
    clearAllTimersAndFlags();
  }, [clearAllTimersAndFlags]);

  // --- Manejador de cambio de cámara (useCallback para estabilidad) ---
  const handleDeviceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(event.target.value);
      resetStateAndClearTimers();
      setIntervalRestartTrigger((prev) => !prev);
    },
    [setSelectedDeviceId, resetStateAndClearTimers, setIntervalRestartTrigger]
  );

  // --- Obtener zonas de Supabase ---
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
        setFaceDetectionError(
          "Fallo al cargar las zonas de acceso. Intente de nuevo."
        );
      } finally {
        setIsLoadingZones(false);
      }
    };

    fetchZones();
  }, []);

  // --- Cargar modelos de Face-API.js ---
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const MODEL_URL = "/models";
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setFaceApiModelsLoaded(true);
        setValidationMessage(
          "Modelos cargados. Seleccione modo de captura y zona."
        );
      } catch (error) {
        console.error(
          "❌ ERROR: Error al cargar modelos de Face-API.js:",
          error
        );
        setFaceDetectionError(
          "Fallo al cargar los modelos de reconocimiento facial. Revise su red o la ruta de los modelos."
        );
        setValidationMessage(
          "Error al cargar modelos de reconocimiento facial."
        );
      } finally {
        setIsLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  // --- Efecto para enumerar dispositivos de video ---
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
          "Fallo al acceder a los dispositivos de la cámara. Asegúrese de que los permisos de la cámara estén concedidos."
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
          "Acceso a la cámara denegado. Por favor, conceda los permisos para usar esta función."
        );
      });
  }, [selectedDeviceId]);

  // --- Función principal de validación (llamada imperativamente) ---
  const processAndValidateFace = useCallback(
    async (descriptor: Float32Array, capturedImageSrc: string) => {
      setIsProcessingFace(true);
      setValidationMessage("Validando rostro contra la base de datos...");
      setFaceDetectionError(null);
      setUserInfo(null);
      setImageSrc(capturedImageSrc); // Muestra la imagen capturada inmediatamente

      try {
        const validateEdgeFunctionUrl =
          "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/validate-user-face";

        const payload = {
          faceEmbedding: Array.from(descriptor),
          zoneId: selectedZone,
          imageData: capturedImageSrc, // <--- CAMBIO CLAVE: Envía la imagen en Base64
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
              `Error HTTP: ${response.status}`
          );
        }

        const result: UnifiedValidationResponse = await response.json();
        console.log(
          "✅ VALIDACIÓN: Resultado de validación de rostro:",
          result
        );

        if (result.error) {
          setFaceDetectionError(`Error de Validación: ${result.error}`);
          setValidationMessage(
            "Fallo la validación debido a un error del servidor."
          );
          setUserInfo(null);
          return;
        }

        let displayMessage = "";
        let userFullNameForDisplay = result.user.full_name;

        if (
          !userFullNameForDisplay ||
          userFullNameForDisplay === "System Error"
        ) {
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
          fullName: userFullNameForDisplay,
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
            firstSeenAt: result.user.observed_details.firstSeenAt,
            lastSeenAt: result.user.observed_details.lastSeenAt,
            accessCount: result.user.observed_details.accessCount,
            alertTriggered: result.user.observed_details.alertTriggered,
            expiresAt: result.user.observed_details.expiresAt,
            potentialMatchUserId:
              result.user.observed_details.potentialMatchUserId,
            faceImageUrl: result.user.observed_details.faceImageUrl || null, // <--- AÑADIDO: Guarda la URL de la imagen aquí
          };
        }
        setUserInfo(newUserInfo);
      } catch (error: unknown) {
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          errorMessage = error.message;
        }

        console.error(
          "❌ ERROR: Error durante la validación del rostro:",
          error
        );
        setFaceDetectionError(`Error: ${errorMessage}`);
        setValidationMessage("Fallo la validación.");
        setUserInfo(null);
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

  // --- Función para capturar foto y extraer descriptor (manual) ---
  const captureAndExtractDescriptorManual = useCallback(async () => {
    if (isProcessingAttemptRef.current || isCurrentlyInCooldownRef.current) {
      return;
    }

    isProcessingAttemptRef.current = true;

    if (!webcamRef.current || !faceApiModelsLoaded) {
      setValidationMessage(
        "Los modelos de reconocimiento facial aún están cargando o la cámara no está lista."
      );
      isProcessingAttemptRef.current = false;
      return;
    }

    setValidationMessage("Capturando imagen...");
    setFaceDetectionError(null);
    setUserInfo(null);
    setImageSrc(null); // Limpiar la imagen anterior antes de capturar una nueva

    try {
      const imageSrcData = webcamRef.current?.getScreenshot();
      if (imageSrcData) {
        const img = await faceapi.fetchImage(imageSrcData);

        const detectionOptions = new faceapi.SsdMobilenetv1Options({
          minConfidence: 0.5,
        });

        const detections = await faceapi
          .detectSingleFace(img, detectionOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          console.log(
            "DEBUG FACE-API.JS EMBEDDING:",
            Array.from(detections.descriptor)
          );

          setValidationMessage(
            "Rostro detectado! Procesando para validación..."
          );
          // Pasa imageSrcData a processAndValidateFace
          await processAndValidateFace(detections.descriptor, imageSrcData);
        } else {
          setValidationMessage("No se detectó rostro en la imagen capturada.");
          setFaceDetectionError(
            "No se detectó rostro en la imagen capturada. Asegúrese de que su rostro sea claramente visible y bien iluminado."
          );
          console.warn("⚠️ ADVERTENCIA: No se detectó rostro en la captura.");
        }
      } else {
        throw new Error("No se pudo capturar imagen de la webcam.");
      }
    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        errorMessage = error.message;
      }
      console.error("❌ ERROR: Error durante la captura de imagen:", error);
      setFaceDetectionError(`Error: ${errorMessage}`);
      setValidationMessage("Ocurrió un error durante la captura.");
    } finally {
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
    isProcessingAttemptRef,
    isCurrentlyInCooldownRef,
  ]);

  // --- Main useEffect para la gestión del intervalo de detección automática ---
  useEffect(() => {
    resetStateAndClearTimers();

    if (
      captureMode !== "automatic" ||
      !faceApiModelsLoaded ||
      isLoadingModels ||
      !selectedDeviceId ||
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4
    ) {
      if (
        captureMode === "automatic" &&
        (!faceApiModelsLoaded || isLoadingModels)
      ) {
        setValidationMessage(
          "Esperando modelos o cámara lista para modo automático..."
        );
      } else if (
        captureMode === "automatic" &&
        (!selectedDeviceId ||
          !webcamRef.current ||
          !webcamRef.current.video ||
          webcamRef.current.video.readyState !== 4)
      ) {
        setValidationMessage(
          "Cámara no lista para modo automático. Asegúrese de los permisos."
        );
      } else if (captureMode !== "automatic") {
        setValidationMessage("Seleccione modo de captura y zona.");
      }
      clearAllTimersAndFlags();
      return;
    }

    const runAutomaticDetectionTick = async () => {
      if (isProcessingAttemptRef.current || isCurrentlyInCooldownRef.current) {
        return;
      }

      if (
        !webcamRef.current ||
        !webcamRef.current.video ||
        webcamRef.current.video.readyState !== 4
      ) {
        console.log("⚠️ TICK: Webcam no está lista, deteniendo intervalo.");
        clearAllTimersAndFlags();
        setValidationMessage("Cámara no lista o modelos cargando.");
        setFaceDetectionError(
          "Asegúrese de que la cámara esté activa y los modelos cargados."
        );
        return;
      }

      if (
        !userInfo &&
        !faceDetectionError &&
        !validationMessage?.includes("No se detectó rostro") &&
        !validationMessage?.includes("Buscando rostro")
      ) {
        setValidationMessage("Buscando rostro en tiempo real...");
        setFaceDetectionError(null);
      }

      isProcessingAttemptRef.current = true;

      try {
        let bestDescriptor: Float32Array | null = null;
        let bestImageSrc: string | null = null;
        const ATTEMPTS = 5;
        const ATTEMPT_DELAY_MS = 200;

        for (let i = 0; i < ATTEMPTS; i++) {
          const imageSrcData = webcamRef.current?.getScreenshot();
          if (imageSrcData) {
            const img = await faceapi.fetchImage(imageSrcData);
            const detectionOptions = new faceapi.SsdMobilenetv1Options({
              minConfidence: 0.7,
            });
            const detections = await faceapi
              .detectSingleFace(img, detectionOptions)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detections) {
              bestDescriptor = detections.descriptor;
              bestImageSrc = imageSrcData;
              break;
            }
          }
          if (i < ATTEMPTS - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, ATTEMPT_DELAY_MS)
            );
          }
        }

        if (bestDescriptor && bestImageSrc) {
          console.log(
            "DEBUG FACE-API.JS EMBEDDING (automático):",
            Array.from(bestDescriptor)
          );

          setValidationMessage(
            "Rostro detectado! Procesando para validación..."
          );

          try {
            await processAndValidateFace(bestDescriptor, bestImageSrc);
          } finally {
            isCurrentlyInCooldownRef.current = true;
            cooldownTimeoutIdRef.current = setTimeout(() => {
              isCurrentlyInCooldownRef.current = false;
              setIntervalRestartTrigger((prev) => !prev);
            }, 10000);
          }
        } else {
          if (
            !userInfo &&
            !faceDetectionError &&
            !validationMessage?.includes("No se detectó rostro")
          ) {
            setValidationMessage("No se detectó rostro en este momento.");
          }
        }
      } catch (error: unknown) {
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          errorMessage = error.message;
        }
        console.error(
          "❌ TICK: Error durante el ciclo de detección automática (detección FaceAPI):",
          error
        );
        setFaceDetectionError(`Error en detección automática: ${errorMessage}`);
      } finally {
        isProcessingAttemptRef.current = false;
      }
    };

    if (!detectionIntervalIdRef.current) {
      detectionIntervalIdRef.current = setInterval(
        runAutomaticDetectionTick,
        4000
      );
    }

    return () => {
      clearAllTimersAndFlags();
    };
  }, [
    captureMode,
    faceApiModelsLoaded,
    isLoadingModels,
    selectedDeviceId,
    processAndValidateFace,
    clearAllTimersAndFlags,
    intervalRestartTrigger,
    resetStateAndClearTimers,
    setValidationMessage,
    setFaceDetectionError,
    userInfo,
    webcamRef,
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Validación de Acceso Facial
        </h2>

        {isLoadingModels && (
          <div className="text-center text-blue-500 font-semibold">
            Cargando modelos de reconocimiento facial...
          </div>
        )}

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
                  {device.label || `Cámara ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        {!isLoadingModels && devices.length === 0 && (
          <div className="text-center text-red-500 font-semibold">
            No se encontraron dispositivos de cámara. Asegúrese de que una
            cámara esté conectada y los permisos estén concedidos.
          </div>
        )}

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
                resetStateAndClearTimers();
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

        {isLoadingZones && (
          <div className="text-center text-blue-500 font-semibold">
            Cargando zonas de acceso...
          </div>
        )}

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
                  resetStateAndClearTimers();
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
                  resetStateAndClearTimers();
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

        <button
          onClick={captureAndExtractDescriptorManual}
          disabled={
            !faceApiModelsLoaded ||
            isProcessingFace ||
            !selectedDeviceId ||
            captureMode === "automatic" ||
            isProcessingAttemptRef.current
          }
          className={`w-full py-3 rounded-md font-semibold text-lg ${
            faceApiModelsLoaded &&
            !isProcessingFace &&
            selectedDeviceId &&
            captureMode === "manual" &&
            !isProcessingAttemptRef.current
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300"
              : "bg-gray-400 text-gray-700 cursor-not-allowed"
          }`}
          style={{ display: captureMode === "automatic" ? "none" : "block" }}
        >
          {isProcessingFace ? "Procesando..." : "Capturar Foto"}
        </button>

        {imageSrc && (
          <div className="mt-4 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Imagen Capturada:
            </h3>
            <img
              src={imageSrc}
              alt="Capturada"
              className="max-w-full h-auto rounded-md border border-gray-300 mx-auto"
            />
          </div>
        )}

        {validationMessage && (
          <div
            className="mt-4 p-3 rounded-md text-center text-lg font-medium"
            style={{
              backgroundColor: validationMessage.includes("Acceso Concedido")
                ? "#dcfce7"
                : validationMessage.includes("Acceso Denegado")
                ? "#fee2e2"
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No se detectó rostro") ||
                  validationMessage.includes("Fallo la validación.")
                ? "#fee2e2"
                : "#dbeafe",
              color: validationMessage.includes("Acceso Concedido")
                ? "#166534"
                : validationMessage.includes("Acceso Denegado")
                ? "#b91c1c"
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No se detectó rostro") ||
                  validationMessage.includes("Fallo la validación.")
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

            {/* <--- INICIO DEL CAMBIO CLAVE: Mostrar la imagen si es un Observed User y tiene faceImageUrl ---> */}
            {userInfo.userType === "observed" &&
              userInfo.observedDetails &&
              userInfo.observedDetails.faceImageUrl && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    Foto de Usuario Observado:
                  </h4>
                  <img
                    src={userInfo.observedDetails.faceImageUrl}
                    alt={`Face of ${userInfo.id}`}
                    className="max-w-xs h-auto rounded-md border border-gray-300 mx-auto block"
                  />
                </div>
              )}
            {/* <--- FIN DEL CAMBIO CLAVE ---> */}

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
