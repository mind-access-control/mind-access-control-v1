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
      firstSeenAt: string; // Cambio a firstSeenAt para consistencia en el FE
      lastSeenAt: string; // Cambio a lastSeenAt para consistencia en el FE
      accessCount: number; // Cambio a accessCount para consistencia en el FE
      alertTriggered: boolean; // Cambio a alertTriggered para consistencia en el FE
      expiresAt: string; // Cambio a expiresAt para consistencia en el FE
      potentialMatchUserId: string | null; // Cambio a potentialMatchUserId para consistencia en el FE
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

  // Nuevo estado para forzar el reinicio del useEffect principal
  const [intervalRestartTrigger, setIntervalRestartTrigger] = useState(false);

  // --- REFERENCIAS (para valores mutables que no disparan re-renders) ---
  const detectionIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyInCooldownRef = useRef(false); // Bandera de enfriamiento
  const isProcessingAttemptRef = useRef(false); // Bandera para intento de procesamiento en curso (manual o automático)

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
    setUserInfo(null); // Limpiar la información del usuario en cada reinicio
    clearAllTimersAndFlags();
  }, [clearAllTimersAndFlags]);

  // --- Manejador de cambio de cámara (useCallback para estabilidad) ---
  const handleDeviceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(event.target.value);
      resetStateAndClearTimers(); // Resetear estado al cambiar de cámara
      setIntervalRestartTrigger((prev) => !prev); // Forzar reinicio del efecto
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
      setIsProcessingFace(true); // Indica que hay una validación en curso
      setValidationMessage("Validando rostro contra la base de datos...");
      setFaceDetectionError(null);
      setUserInfo(null); // Limpiar userInfo al inicio de CADA validación
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
            firstSeenAt: result.user.observed_details.firstSeenAt, // Corregido el nombre de la propiedad
            lastSeenAt: result.user.observed_details.lastSeenAt, // Corregido el nombre de la propiedad
            accessCount: result.user.observed_details.accessCount, // Corregido el nombre de la propiedad
            alertTriggered: result.user.observed_details.alertTriggered, // Corregido el nombre de la propiedad
            expiresAt: result.user.observed_details.expiresAt, // Corregido el nombre de la propiedad
            potentialMatchUserId:
              result.user.observed_details.potentialMatchUserId, // Corregido el nombre de la propiedad
          };
        }
        setUserInfo(newUserInfo);
      } catch (error: unknown) {
        // Usar unknown en lugar de any
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
        setUserInfo(null); // Limpiar info si hay error
      } finally {
        setIsProcessingFace(false); // Siempre resetear el estado de procesamiento al finalizar
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
    // Evitar procesamiento si ya hay un intento en curso o estamos en cooldown
    if (isProcessingAttemptRef.current || isCurrentlyInCooldownRef.current) {
      return;
    }

    isProcessingAttemptRef.current = true; // Establecer bandera de procesamiento para modo manual

    if (!webcamRef.current || !faceApiModelsLoaded) {
      setValidationMessage(
        "Los modelos de reconocimiento facial aún están cargando o la cámara no está lista."
      );
      isProcessingAttemptRef.current = false; // Resetear bandera
      return;
    }

    setValidationMessage("Capturando imagen...");
    setFaceDetectionError(null);
    setUserInfo(null); // Limpiar userInfo al inicio de CADA captura
    setImageSrc(null);

    try {
      const imageSrcData = webcamRef.current?.getScreenshot();
      if (imageSrcData) {
        const img = await faceapi.fetchImage(imageSrcData);

        // Opciones de detección con un umbral de confianza para el modo manual
        const detectionOptions = new faceapi.SsdMobilenetv1Options({
          minConfidence: 0.5, // Umbral estándar para modo manual
        });

        const detections = await faceapi
          .detectSingleFace(img, detectionOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          // *** LOG DE DIAGNÓSTICO CLAVE: EMBEDDING GENERADO POR FACE-API.JS ***
          console.log(
            "DEBUG FACE-API.JS EMBEDDING:",
            Array.from(detections.descriptor)
          );

          setValidationMessage(
            "Rostro detectado! Procesando para validación..."
          );
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
      // Usar unknown en lugar de any
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
      isProcessingAttemptRef.current = false; // Siempre resetear al finalizar el intento manual
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
    // --- LÓGICA DE LIMPIEZA INICIAL DEL EFECTO ---
    resetStateAndClearTimers(); // Asegurar que todo se limpia al inicio de cada ciclo de vida del efecto

    // --- CONDICIONES PARA INICIAR UN NUEVO INTERVALO DE DETECCIÓN ---
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
      clearAllTimersAndFlags(); // Asegurarse de que no haya intervalos antiguos
      return;
    }

    // --- FUNCIÓN QUE SE EJECUTA EN CADA TICK DE setInterval ---
    const runAutomaticDetectionTick = async () => {
      // Evitar procesamiento si ya hay un intento en curso o estamos en cooldown
      if (isProcessingAttemptRef.current || isCurrentlyInCooldownRef.current) {
        return;
      }

      // Re-verificar la webcam antes de intentar procesar
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

      // Mensaje de estado cuando se está buscando un rostro
      if (
        !userInfo &&
        !faceDetectionError &&
        !validationMessage?.includes("No se detectó rostro") &&
        !validationMessage?.includes("Buscando rostro")
      ) {
        setValidationMessage("Buscando rostro en tiempo real...");
        setFaceDetectionError(null);
      }

      isProcessingAttemptRef.current = true; // Establecer bandera de procesamiento para este tick

      try {
        let bestDescriptor: Float32Array | null = null;
        let bestImageSrc: string | null = null;
        const ATTEMPTS = 5; // Más intentos para mejor detección
        const ATTEMPT_DELAY_MS = 200; // Pequeño retraso entre intentos

        for (let i = 0; i < ATTEMPTS; i++) {
          const imageSrcData = webcamRef.current?.getScreenshot();
          if (imageSrcData) {
            const img = await faceapi.fetchImage(imageSrcData);
            const detectionOptions = new faceapi.SsdMobilenetv1Options({
              minConfidence: 0.7, // Un umbral un poco más alto para calidad en automático
            });
            const detections = await faceapi
              .detectSingleFace(img, detectionOptions)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detections) {
              bestDescriptor = detections.descriptor;
              bestImageSrc = imageSrcData;
              break; // Salir del bucle si se encuentra una buena detección
            }
          }
          if (i < ATTEMPTS - 1) {
            // No esperar después del último intento
            await new Promise((resolve) =>
              setTimeout(resolve, ATTEMPT_DELAY_MS)
            );
          }
        }

        if (bestDescriptor && bestImageSrc) {
          // *** LOG DE DIAGNÓSTICO CLAVE: EMBEDDING GENERADO POR FACE-API.JS ***
          console.log(
            "DEBUG FACE-API.JS EMBEDDING (automático):",
            Array.from(bestDescriptor)
          );

          // Si se detectó un rostro, procesarlo
          setValidationMessage(
            "Rostro detectado! Procesando para validación..."
          );

          // --- INICIO DEL CAMBIO CLAVE: Bloque try/finally para la validación de la cara y cooldown ---
          try {
            await processAndValidateFace(bestDescriptor, bestImageSrc);
          } finally {
            // Siempre iniciar cooldown DESPUÉS de un intento de validación (exitoso o fallido)
            isCurrentlyInCooldownRef.current = true;
            cooldownTimeoutIdRef.current = setTimeout(() => {
              isCurrentlyInCooldownRef.current = false;
              // Forzar el reinicio del useEffect para re-evaluar y (re)iniciar el intervalo
              setIntervalRestartTrigger((prev) => !prev);
            }, 10000); // 10 segundos de cooldown
          }
          // --- FIN DEL CAMBIO CLAVE ---
        } else {
          // Si no se detectó rostro después de varios intentos
          if (
            !userInfo &&
            !faceDetectionError &&
            !validationMessage?.includes("No se detectó rostro")
          ) {
            setValidationMessage("No se detectó rostro en este momento.");
          }
        }
      } catch (error: unknown) {
        // Este bloque catch maneja errores en la *detección* de FaceAPI (ej. problemas de webcam, modelos)
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
        // NO iniciamos cooldown aquí si la detección falló. Queremos que siga intentando encontrar una cara.
      } finally {
        isProcessingAttemptRef.current = false; // Siempre resetear esta bandera de intento
      }
    };

    // Solo iniciar el intervalo si no hay uno activo
    if (!detectionIntervalIdRef.current) {
      detectionIntervalIdRef.current = setInterval(
        runAutomaticDetectionTick,
        4000 // Frecuencia de detección ajustada (4 segundos)
      );
    }

    // Función de limpieza para cuando el componente se desmonte o las dependencias cambien
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

        {/* Indicador de carga de modelos */}
        {isLoadingModels && (
          <div className="text-center text-blue-500 font-semibold">
            Cargando modelos de reconocimiento facial...
          </div>
        )}

        {/* Selector de Cámara */}
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
        {/* Advertencia si no se detectan cámaras */}
        {!isLoadingModels && devices.length === 0 && (
          <div className="text-center text-red-500 font-semibold">
            No se encontraron dispositivos de cámara. Asegúrese de que una
            cámara esté conectada y los permisos estén concedidos.
          </div>
        )}

        {/* Selector de Zona */}
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
                setIntervalRestartTrigger((prev) => !prev); // Forzar reinicio del efecto
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

        {/* Indicador de carga de zonas */}
        {isLoadingZones && (
          <div className="text-center text-blue-500 font-semibold">
            Cargando zonas de acceso...
          </div>
        )}

        {/* MODO DE CAPTURA: Manual vs. Automático */}
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
                  setIntervalRestartTrigger((prev) => !prev); // Forzar reinicio del efecto
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
                  setIntervalRestartTrigger((prev) => !prev); // Forzar reinicio del efecto
                }}
                className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-gray-800">
                Automático (Detección Facial)
              </span>
            </label>
          </div>
        </div>

        {/* Área de la Cámara */}
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

        {/* Botón de Captura */}
        <button
          onClick={captureAndExtractDescriptorManual}
          disabled={
            !faceApiModelsLoaded ||
            isProcessingFace ||
            !selectedDeviceId ||
            captureMode === "automatic" ||
            isProcessingAttemptRef.current // Deshabilitar si ya hay un intento en curso
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

        {/* Previsualización de la imagen capturada */}
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

        {/* Mensajes de estado y error */}
        {validationMessage && (
          <div
            className="mt-4 p-3 rounded-md text-center text-lg font-medium"
            style={{
              backgroundColor: validationMessage.includes("Acceso Concedido")
                ? "#dcfce7" // Verde claro
                : validationMessage.includes("Acceso Denegado")
                ? "#fee2e2" // Rojo claro
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No se detectó rostro") ||
                  validationMessage.includes("Fallo la validación.")
                ? "#fee2e2" // Rojo claro para errores
                : "#dbeafe", // Azul claro por defecto
              color: validationMessage.includes("Acceso Concedido")
                ? "#166534" // Verde oscuro
                : validationMessage.includes("Acceso Denegado")
                ? "#b91c1c" // Rojo oscuro
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No se detectó rostro") ||
                  validationMessage.includes("Fallo la validación.")
                ? "#b91c1c" // Rojo oscuro para errores
                : "#2563eb", // Azul oscuro por defecto
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
