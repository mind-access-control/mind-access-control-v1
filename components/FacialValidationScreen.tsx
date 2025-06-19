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

  // NUEVO ESTADO para forzar el reinicio del useEffect principal
  const [intervalRestartTrigger, setIntervalRestartTrigger] = useState(false);

  // --- REFERENCIAS (para valores mutables que no disparan re-renders) ---
  const detectionIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyInCooldownRef = useRef(false); // Flag de cooldown
  const isProcessingAttemptRef = useRef(false); // Flag de intento de procesamiento EN CURSO (manual o automático)

  // --- FUNCIÓN HELPER PARA LIMPIAR TODOS LOS TIMERS Y RESETEAR FLAGS ---
  const clearAllTimersAndFlags = useCallback(() => {
    if (detectionIntervalIdRef.current) {
      clearInterval(detectionIntervalIdRef.current);
      detectionIntervalIdRef.current = null;
      console.log("🧹 LIMPIEZA: Intervalo de detección limpiado.");
    }
    if (cooldownTimeoutIdRef.current) {
      clearTimeout(cooldownTimeoutIdRef.current);
      cooldownTimeoutIdRef.current = null;
      console.log("🧹 LIMPIEZA: Timeout de cooldown limpiado.");
    }
    isCurrentlyInCooldownRef.current = false;
    isProcessingAttemptRef.current = false; // CLAVE: Siempre resetear este flag
    setIsProcessingFace(false); // Asegurar que el estado de UI también se resetee
    console.log("🧹 LIMPIEZA: Todos los timers y flags reseteados.");
  }, []); // Sin dependencias, es una función estable

  // --- FUNCIÓN DE LIMPIEZA GENÉRICA PARA CAMBIOS DE MODO/ZONA/CÁMARA ---
  const resetStateAndClearTimers = useCallback(() => {
    setImageSrc(null);
    setValidationMessage(null);
    setFaceDetectionError(null);
    clearAllTimersAndFlags();
  }, [clearAllTimersAndFlags]);

  // --- Manejador de cambio de cámara (useCallback para estabilidad) ---
  const handleDeviceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(event.target.value);
      resetStateAndClearTimers();
      // Forzar re-evaluación del useEffect principal para reiniciar el intervalo si es necesario
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

  // --- Carga de modelos de Face-API.js ---
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

  // --- Función principal de validación (llamada imperativamente) ---
  const processAndValidateFace = useCallback(
    async (descriptor: Float32Array, capturedImageSrc: string) => {
      setIsProcessingFace(true); // Activa el indicador de procesamiento para la UI
      setValidationMessage("Validating face against database...");
      setFaceDetectionError(null);
      setImageSrc(capturedImageSrc); // Muestra la imagen capturada

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
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              errorData.details ||
              `HTTP Error: ${response.status}`
          );
        }

        const result = await response.json();
        console.log(
          "✅ VALIDACIÓN: Resultado de validación de rostro:",
          result
        );

        let finalAccessStatusMessage = "Access Denied.";
        if (result.matchedUser) {
          const { id, full_name } = result.matchedUser;
          finalAccessStatusMessage = result.matchedUser.hasAccess
            ? "Access Granted"
            : "Access Denied";
          setValidationMessage(
            `${finalAccessStatusMessage} - User: ${full_name} (ID: ${id.substring(
              0,
              8
            )}...)`
          );
        } else if (result.observedUser) {
          const { id } = result.observedUser;
          finalAccessStatusMessage = result.observedUser.hasAccess
            ? "Access Granted (Observed User)"
            : "Access Denied (Observed User)";
          setValidationMessage(
            `${finalAccessStatusMessage} - Observed User ID: ${id.substring(
              0,
              8
            )}...`
          );
        } else {
          setValidationMessage(
            "No registered or observed user matched. Access Denied."
          );
        }
      } catch (error: any) {
        console.error(
          "❌ ERROR: Error durante la validación del rostro:",
          error
        );
        setFaceDetectionError(`Validation Error: ${error.message}`);
        setValidationMessage("Validation failed.");
      } finally {
        setIsProcessingFace(false); // Liberar el flag de procesamiento de UI
        // isProcessingAttemptRef se maneja en el caller (runDetectionStep o el botón manual)
        console.log(
          "🔄 PROCESAMIENTO: Flag de procesamiento de UI reiniciado."
        );
      }
    },
    [
      selectedZone,
      setValidationMessage,
      setFaceDetectionError,
      setIsProcessingFace,
      setImageSrc,
    ]
  );

  // --- Función para capturar foto y extraer descriptor (manual o automática) ---
  // Esta función AHORA NO MANEJA isProcessingAttemptRef.current
  // Solo se encarga de la captura y la llamada a processAndValidateFace
  const captureAndExtractDescriptorLogic = useCallback(async () => {
    // isProcessingAttemptRef.current se setea a true ANTES de llamar esta función (en el onClick/runDetectionStep)
    // para que no haya duplicidad. Aquí solo verificamos que esté activa.
    if (!isProcessingAttemptRef.current) {
      console.log(
        "CaptureAndExtractDescriptorLogic called but isProcessingAttemptRef is false. Skipping."
      );
      return;
    }

    if (!webcamRef.current || !faceApiModelsLoaded) {
      setValidationMessage(
        "Facial recognition models are still loading or camera not ready."
      );
      isProcessingAttemptRef.current = false; // Liberar si no está listo
      return;
    }

    setValidationMessage("Capturing image...");
    setFaceDetectionError(null);
    setImageSrc(null); // Limpia la imagen previa al iniciar una nueva captura

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
          isProcessingAttemptRef.current = false; // Liberar si no se detecta cara
        }
      } else {
        throw new Error("Could not capture image from webcam.");
      }
    } catch (error: any) {
      console.error("❌ ERROR: Error durante la captura de imagen:", error);
      setFaceDetectionError(`Error: ${error.message}`);
      setValidationMessage("An error occurred during capture.");
      isProcessingAttemptRef.current = false; // Liberar en caso de error
    }
  }, [
    webcamRef,
    faceApiModelsLoaded,
    processAndValidateFace,
    setValidationMessage,
    setFaceDetectionError,
    setImageSrc,
  ]);

  // --- useEffect principal para la gestión del intervalo de detección automática ---
  // Este useEffect es CLAVE. Solo se dispara cuando cambian las condiciones que dictan
  // si el modo automático debe estar activo o no.
  useEffect(() => {
    console.log(
      "🔄 EFECTO_PRINCIPAL: Ejecutando efecto. Modo de captura:",
      captureMode
    );

    // --- LÓGICA DE LIMPIEZA INICIAL DEL EFECTO ---
    // Siempre limpiamos cualquier intervalo y timeout existente al inicio de este useEffect
    // Esto asegura que cada vez que sus dependencias cambian, se reinicia de forma limpia.
    if (detectionIntervalIdRef.current) {
      clearInterval(detectionIntervalIdRef.current);
      detectionIntervalIdRef.current = null;
      console.log(
        "🧹 EFECTO_PRINCIPAL: Intervalo de detección anterior limpiado."
      );
    }
    if (cooldownTimeoutIdRef.current) {
      clearTimeout(cooldownTimeoutIdRef.current);
      cooldownTimeoutIdRef.current = null;
      console.log("🧹 EFECTO_PRINCIPAL: Tiempo de espera anterior limpiado.");
    }
    isCurrentlyInCooldownRef.current = false;
    isProcessingAttemptRef.current = false; // CLAVE: Asegurar que se resetea al REINICIAR el useEffect
    setIsProcessingFace(false); // Asegurar que el estado de UI también se resetee

    // --- CONDICIONES PARA INICIAR UN NUEVO INTERVALO DE DETECCIÓN ---
    if (
      captureMode !== "automatic" || // Si el modo no es automático, no iniciar
      !faceApiModelsLoaded || // Modelos no cargados
      isLoadingModels || // Modelos aún cargando
      !selectedDeviceId || // No hay cámara seleccionada
      !webcamRef.current || // Ref de webcam no lista
      !webcamRef.current.video || // Video de webcam no listo
      webcamRef.current.video.readyState !== 4 // Video no cargado completamente
    ) {
      console.log(
        "⚠️ EFECTO_PRINCIPAL: Condiciones no cumplidas para iniciar nuevo intervalo. Retornando."
      );
      return; // No intentar iniciar el intervalo si las condiciones no son favorables
    }

    console.log(
      "🚀 EFECTO_PRINCIPAL: Intentando INICIAR nuevo intervalo de detección automática."
    );

    // --- FUNCIÓN QUE SE EJECUTA EN CADA TICK DEL setInterval ---
    const runDetectionStep = async () => {
      // LOGS DE DEPURACIÓN CRÍTICOS dentro del TICK
      //console.log(
      //  `⏱️ TICK: enEspera: ${isCurrentlyInCooldownRef.current}, intentoProcesando: ${isProcessingAttemptRef.current}, modoCaptura: ${captureMode}`
      //);

      // CLAVE: BLOQUEO DE EJECUCIÓN (Mutex para el tick)
      // Si ya estamos en cooldown, o ya hay un intento de procesamiento en curso
      // (ya sea de un tick anterior o de una captura manual), NO proceder.
      if (isCurrentlyInCooldownRef.current || isProcessingAttemptRef.current) {
        //console.log(
        //  "⏭️ TICK: Saltando detección debido a condiciones de estado (espera o procesamiento)."
        //);
        return; // Salir tempranamente si las condiciones no lo permiten
      }

      // Verificaciones adicionales de recursos para robustez (si la cámara se desconecta durante el intervalo)
      if (
        !webcamRef.current ||
        !webcamRef.current.video ||
        webcamRef.current.video.readyState !== 4
      ) {
        console.log("⚠️ TICK: Webcam no está lista, deteniendo intervalo.");
        clearAllTimersAndFlags(); // Limpia todos los timers, incluyendo este intervalo
        return;
      }

      // Intentar procesar una detección, activando el flag de procesamiento
      isProcessingAttemptRef.current = true; // CLAVE: Activar el flag AQUÍ, al inicio del procesamiento del TICK
      //console.log(
      //  "🚀 TICK: Iniciando intento de detección y marcando isProcessingAttemptRef como true."
      //);

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
          console.log(
            "👤 TICK: ¡Rostro detectado! Iniciando tiempo de espera y procesamiento."
          );

          // Detener el intervalo de detección *inmediatamente* al detectar una cara
          if (detectionIntervalIdRef.current) {
            clearInterval(detectionIntervalIdRef.current);
            detectionIntervalIdRef.current = null;
            console.log(
              "🧹 TICK: Intervalo de detección limpiado después de detectar rostro."
            );
          }

          isCurrentlyInCooldownRef.current = true; // Activar el flag de cooldown

          // Programar el fin del cooldown y reiniciar el ciclo
          cooldownTimeoutIdRef.current = setTimeout(() => {
            console.log(
              "⏰ ESPERA_TERMINADA: Tiempo de espera finalizado. Reiniciando lógica del ciclo de detección."
            );
            isCurrentlyInCooldownRef.current = false; // Desactivar cooldown.
            // Forzar al useEffect principal a re-evaluarse para reiniciar el setInterval
            setIntervalRestartTrigger((prev) => !prev);
          }, 10000); // 10 segundos de delay

          // Disparar el proceso de captura y validación.
          // isProcessingAttemptRef.current ya está en true desde el inicio de runDetectionStep
          // y se seteará a false en el finally de processAndValidateFace
          await captureAndExtractDescriptorLogic();
        } else {
          console
            .log
            //"🤷‍♀️ TICK: No se detectó rostro en este intento, continuando escaneo."
            ();
          // Si no se detecta rostro, liberamos el flag de intento para el próximo tick
          isProcessingAttemptRef.current = false;
        }
      } catch (error) {
        console.error(
          "❌ TICK: Error durante el intervalo de detección automática de rostro:",
          error
        );
        clearAllTimersAndFlags(); // Si hay un error, limpiar todo para no bloquear el sistema.
      }
    };

    // --- INICIA EL setInterval ---
    // Solo si no hay un intervalo ya corriendo (doble chequeo)
    if (!detectionIntervalIdRef.current) {
      detectionIntervalIdRef.current = setInterval(runDetectionStep, 500);
      console.log(
        "✅ EFECTO_PRINCIPAL: Intervalo de detección automática iniciado."
      );
    } else {
      console.log(
        "⚠️ EFECTO_PRINCIPAL: Intervalo ya activo, no se creará uno nuevo. (Esto NO debería pasar si la lógica es correcta)."
      );
    }

    // --- FUNCIÓN DE LIMPIEZA DEL useEffect ---
    return () => {
      console.log(
        "🧹 EFECTO_PRINCIPAL: Ejecutando función de limpieza (desmontaje de componente o cambio de dependencias)."
      );
      clearAllTimersAndFlags(); // Asegura que todos los timers se limpien.
    };
  }, [
    captureMode, // Re-evalúa cuando el modo de captura cambia
    faceApiModelsLoaded, // Re-evalúa cuando los modelos cargan
    isLoadingModels, // Re-evalúa si cambia el estado de carga de modelos
    selectedDeviceId, // Re-evalúa cuando la cámara seleccionada cambia
    captureAndExtractDescriptorLogic, // Dependencia de useCallback (estable)
    clearAllTimersAndFlags, // Dependencia de useCallback (estable)
    intervalRestartTrigger, // NUEVA DEPENDENCIA: Para forzar el reinicio después del cooldown
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
        {!isLoadingModels &&
          devices.length > 1 && ( // Mostrar selector solo si hay más de una cámara
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
                    {device.label ||
                      `Cámara ${device.deviceId.substring(0, 8)}`}{" "}
                    {/* Mostrar nombre o ID parcial */}
                  </option>
                ))}
              </select>
            </div>
          )}
        {/* Advertencia si no hay cámaras detectadas */}
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
                resetStateAndClearTimers();
                // Forzar re-evaluación del useEffect principal para reiniciar el intervalo si es necesario
                setIntervalRestartTrigger((prev) => !prev);
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            >
              {zones.map(
                (
                  zone // <-- ASEGÚRATE DE QUE ESTAS LÍNEAS ESTÉN AQUÍ
                ) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                )
              )}
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
                  resetStateAndClearTimers(); // Limpia al cambiar de modo
                  setIntervalRestartTrigger((prev) => !prev); // Forzar re-evaluación
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
                  resetStateAndClearTimers(); // Limpia al cambiar de modo
                  setIntervalRestartTrigger((prev) => !prev); // Forzar re-evaluación
                }}
                className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-gray-800">
                Automático (Detección Facial)
              </span>
            </label>
          </div>
        </div>

        {/* Área de la cámara */}
        <div className="relative w-full aspect-video bg-gray-200 rounded-md overflow-hidden">
          {!isLoadingModels &&
            selectedDeviceId && ( // Renderizar Webcam solo si hay un dispositivo seleccionado
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                height="100%"
                videoConstraints={{
                  deviceId: selectedDeviceId, // Usar el ID del dispositivo seleccionado
                  facingMode: { ideal: "user" }, // Preferir cámara frontal si es 'user', sino se usará la seleccionada
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
        </div>

        {/* Botón de captura */}
        <button
          onClick={() => {
            // Activar el flag de intento de procesamiento justo antes de llamar a la lógica.
            isProcessingAttemptRef.current = true;
            captureAndExtractDescriptorLogic(); // Llama a la función de captura y procesamiento
          }}
          // Deshabilitado si hay carga, procesamiento, no hay cámara, o modo automático
          disabled={
            !faceApiModelsLoaded ||
            isProcessingFace || // UI estado de procesamiento
            !selectedDeviceId ||
            captureMode === "automatic"
          }
          className={`w-full py-3 rounded-md font-semibold text-lg ${
            faceApiModelsLoaded &&
            !isProcessingFace && // Solo si no está procesando
            selectedDeviceId &&
            captureMode === "manual" // Solo si está en modo manual
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300"
              : "bg-gray-400 text-gray-700 cursor-not-allowed"
          }`}
          // Ocultar el botón si el modo es automático
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
              alt="Captured"
              className="max-w-full h-auto rounded-md border border-gray-300 mx-auto"
            />
          </div>
        )}

        {/* Mensajes de estado y errores */}
        {validationMessage && (
          <div
            className="mt-4 p-3 rounded-md text-center text-lg font-medium"
            style={{
              backgroundColor: validationMessage.includes("Access Granted")
                ? "#dcfce7" // Verde claro para "Access Granted"
                : validationMessage.includes("Access Denied")
                ? "#fee2e2" // Rojo claro para "Access Denied"
                : validationMessage.includes("Observed User Detected!")
                ? "#fffbe6"
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No face detected") ||
                  validationMessage.includes("Validation failed.")
                ? "#fee2e2"
                : "#dbeafe", // Color por defecto (azul claro) para otros mensajes
              color: validationMessage.includes("Access Granted")
                ? "#166534" // Verde oscuro para "Access Granted"
                : validationMessage.includes("Access Denied")
                ? "#b91c1c" // Rojo oscuro para "Access Denied"
                : validationMessage.includes("Observed User Detected!")
                ? "#a16207"
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No face detected") ||
                  validationMessage.includes("Validation failed.")
                ? "#b91c1c"
                : "#2563eb", // Color por defecto (azul oscuro) para otros mensajes
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
      </div>
    </div>
  );
};

export default FacialValidationScreen;
