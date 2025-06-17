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
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] =
    useState<boolean>(false);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(
    null
  );
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

  // NUEVOS ESTADOS para la selección de cámara
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]); // Lista de dispositivos de video disponibles
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined
  ); // ID de la cámara seleccionada

  // --- Carga de modelos de Face-API.js ---
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const MODEL_URL = "/models"; // Asegúrate de que los modelos estén disponibles en esta ruta
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setFaceApiModelsLoaded(true);
        //console.log("Face-API.js models loaded successfully!");
      } catch (error) {
        console.error("Error loading Face-API.js models:", error);
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
        // Si no hay ninguna cámara seleccionada, selecciona la primera por defecto
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error enumerating media devices:", error);
        setFaceDetectionError(
          "Failed to access camera devices. Please ensure camera permissions are granted."
        );
      }
    };

    // Asegúrate de solicitar permisos de cámara al menos una vez para que los nombres de los dispositivos sean visibles
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        // Detener la pista de video para liberar la cámara después de obtener permisos
        stream.getTracks().forEach((track) => track.stop());
        enumerateDevices(); // Ahora enumerar dispositivos para obtener nombres reales
      })
      .catch((error) => {
        console.error("Initial camera access denied:", error);
        setFaceDetectionError(
          "Camera access denied. Please grant permissions to use this feature."
        );
      });
  }, [selectedDeviceId]); // Re-ejecutar si selectedDeviceId cambia para re-seleccionar la cámara

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
        //console.log("ZONES RESPONSE:", data);

        // SOPORTA VARIAS FORMAS DE RESPUESTA
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
        console.error("Error fetching zones:", error);
        setFaceDetectionError("Failed to load access zones. Please try again.");
      } finally {
        setIsLoadingZones(false);
      }
    };

    fetchZones();
  }, []);

  // --- Manejador de cambio de cámara ---
  const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(event.target.value);
    setImageSrc(null); // Limpiar imagen capturada al cambiar de cámara
    setFaceDescriptor(null); // Limpiar descriptor facial
    setValidationMessage(null); // Limpiar mensaje de validación
    setFaceDetectionError(null); // Limpiar errores
    setIsProcessingFace(false); // Resetear estado de procesamiento
  };

  // --- Función para capturar foto ---
  const capture = useCallback(async () => {
    if (!webcamRef.current || !faceApiModelsLoaded || isProcessingFace) {
      if (!faceApiModelsLoaded) {
        setValidationMessage(
          "Facial recognition models are still loading. Please wait."
        );
      }
      return;
    }

    setValidationMessage("Capturing and processing image...");
    setFaceDescriptor(null);
    setFaceDetectionError(null);
    setIsProcessingFace(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImageSrc(imageSrc);
        const img = await faceapi.fetchImage(imageSrc);

        const detections = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          setFaceDescriptor(detections.descriptor);
          setValidationMessage("Face detected! Proceeding to validation...");
          //console.log("Captured Face Embedding:", detections.descriptor);
        } else {
          setFaceDescriptor(null);
          setFaceDetectionError(
            "No face detected in the captured image. Please ensure your face is clearly visible."
          );
          setValidationMessage("No face detected.");
          console.warn("No face detected in screenshot.");
        }
      } else {
        throw new Error("Could not capture image from webcam.");
      }
    } catch (error: any) {
      console.error("Error capturing or processing image:", error);
      setFaceDetectionError(`Error: ${error.message}`);
      setValidationMessage("An error occurred during capture or processing.");
    } finally {
      setIsProcessingFace(false);
    }
  }, [webcamRef, faceApiModelsLoaded, isProcessingFace]);

  // --- Lógica de validación (se activará cuando faceDescriptor cambie) ---
  useEffect(() => {
    const validateFace = async () => {
      if (faceDescriptor && faceApiModelsLoaded) {
        setValidationMessage("Validating face against database...");
        setFaceDetectionError(null);

        try {
          const validateEdgeFunctionUrl =
            "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/validate-user-face";

          const payload = {
            faceEmbedding: Array.from(faceDescriptor),
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
          // *** ESTO MANTIENE EL LOG COMPLETO EN LA CONSOLA ***
          console.log("validate-user-face result:", result);

          if (result.matchedUser) {
            const { id, full_name } = result.matchedUser;
            const accessStatusMessage = result.matchedUser.hasAccess // <-- Accede directamente al booleano de la respuesta
              ? "Access Granted"
              : "Access Denied";
            console.log("Access Status:", accessStatusMessage);
            setValidationMessage(
              `${accessStatusMessage} - User: ${full_name} (ID: ${id.substring(
                0,
                8
              )}...)`
            );
          } else if (result.observedUser) {
            const { id } = result.observedUser;
            // Para Observed Users, la política es 'Access Denied', incluso si hasAccess viene como true de la Edge Function
            // porque no son usuarios registrados. Si quieres que se muestre como 'Access Granted' para observados,
            // tendrías que cambiar la política en la Edge Function y aquí.
            const accessStatusMessage = result.observedUser.hasAccess // Accede directamente al booleano de la respuesta
              ? "Access Granted" // Esto solo se mostraría si tu Edge Function permite acceso a observados
              : "Access Denied";
            console.log("Access Status:", accessStatusMessage); // Log para depuración
            setValidationMessage(
              `${accessStatusMessage} - Observed User ID: ${id.substring(
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
          console.error("Error during face validation:", error);
          setFaceDetectionError(`Validation Error: ${error.message}`);
          setValidationMessage("Validation failed.");
        }
      }
    };

    validateFace();
  }, [faceDescriptor, faceApiModelsLoaded, selectedZone]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Facial Access Validation
        </h2>

        {/* Indicador de carga de modelos */}
        {isLoadingModels && (
          <div className="text-center text-blue-500 font-semibold">
            Loading facial recognition models...
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
                Select Camera:
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
                      `Camera ${device.deviceId.substring(0, 8)}`}{" "}
                    {/* Mostrar nombre o ID parcial */}
                  </option>
                ))}
              </select>
            </div>
          )}
        {/* Advertencia si no hay cámaras detectadas */}
        {!isLoadingModels && devices.length === 0 && (
          <div className="text-center text-red-500 font-semibold">
            No camera devices found. Please ensure a camera is connected and
            permissions are granted.
          </div>
        )}

        {/* Zone Selector */}
        {!isLoadingZones && (
          <div className="w-full">
            <label
              htmlFor="zone-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Access Zone:
            </label>
            <select
              id="zone-select"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            >
              {zones.map((zone, idx) => (
                <option key={zone.id || idx} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loading indicator for zones */}
        {isLoadingZones && (
          <div className="text-center text-blue-500 font-semibold">
            Loading access zones...
          </div>
        )}

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
          onClick={capture}
          disabled={
            !faceApiModelsLoaded || isProcessingFace || !selectedDeviceId
          } // Deshabilitar si no hay cámara seleccionada
          className={`w-full py-3 rounded-md font-semibold text-lg ${
            faceApiModelsLoaded && !isProcessingFace && selectedDeviceId
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300"
              : "bg-gray-400 text-gray-700 cursor-not-allowed"
          }`}
        >
          {isProcessingFace ? "Processing..." : "Capture Photo"}
        </button>

        {/* Previsualización de la imagen capturada */}
        {imageSrc && (
          <div className="mt-4 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Captured Image:
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
