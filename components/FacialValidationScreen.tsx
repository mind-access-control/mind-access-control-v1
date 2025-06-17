import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam"; // Importación estándar desde npm
import * as faceapi from "face-api.js"; // Importación estándar desde npm
import { createClient } from "@supabase/supabase-js"; // Importación estándar desde npm
import { v4 as uuidv4 } from "uuid"; // Para generar IDs (aunque no se use directamente en esta UI, es útil tenerlo)

// Configuración de Supabase (las variables globales se inyectan en el entorno Canvas)
// Estas son variables de entorno que tu proyecto React/Next.js debería tener configuradas.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL"; // Asegúrate de reemplazar YOUR_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY"; // Asegúrate de reemplazar YOUR_SUPABASE_ANON_KEY

// Inicialización del cliente Supabase (usando la clave anon para una pantalla pública)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FacialValidationScreen: React.FC = () => {
  const webcamRef = useRef<Webcam>(null); // Referencia al componente Webcam
  const [imageSrc, setImageSrc] = useState<string | null>(null); // Guarda la URL de la imagen capturada
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] =
    useState<boolean>(false); // Estado para saber si los modelos de Face-API.js han cargado
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(
    null
  ); // Almacena el embedding facial detectado
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  ); // Mensajes mostrados al usuario (éxito, progreso, etc.)
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true); // Controla el estado de carga de los modelos
  const [isProcessingFace, setIsProcessingFace] = useState<boolean>(false); // Controla si se está procesando una cara
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(
    null
  ); // Mensajes de error específicos de detección facial

  // Efecto para cargar los modelos de Face-API.js cuando el componente se monta
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        // La URL donde se encuentran los modelos de Face-API.js en tu carpeta 'public'
        const MODEL_URL = "/models";
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setFaceApiModelsLoaded(true);
        console.log("Face-API.js models loaded successfully!");
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
  }, []); // El array vacío asegura que se ejecute solo una vez al montar

  // Función useCallback para capturar la foto de la webcam
  const capture = useCallback(async () => {
    // Evita capturar si la webcam no está lista, los modelos no han cargado o ya se está procesando una cara
    if (!webcamRef.current || !faceApiModelsLoaded || isProcessingFace) {
      if (!faceApiModelsLoaded) {
        setValidationMessage(
          "Facial recognition models are still loading. Please wait."
        );
      }
      return;
    }

    setValidationMessage("Capturing and processing image...");
    setFaceDescriptor(null); // Limpia el descriptor anterior
    setFaceDetectionError(null); // Limpia errores anteriores
    setIsProcessingFace(true); // Indica que el procesamiento ha comenzado

    try {
      const imageSrc = webcamRef.current.getScreenshot(); // Toma una captura de pantalla
      if (imageSrc) {
        setImageSrc(imageSrc); // Muestra la imagen capturada en la UI
        const img = await faceapi.fetchImage(imageSrc); // Carga la imagen para Face-API.js

        // Detecta una única cara y genera su embedding facial
        const detections = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          setFaceDescriptor(detections.descriptor); // Almacena el embedding
          setValidationMessage("Face detected! Proceeding to validation...");
          console.log("Captured Face Embedding:", detections.descriptor);
          // La lógica de validación se disparará en el useEffect cuando faceDescriptor cambie
        } else {
          setFaceDescriptor(null); // No se detectó cara, resetea el descriptor
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
      setIsProcessingFace(false); // Finaliza el estado de procesamiento
    }
  }, [webcamRef, faceApiModelsLoaded, isProcessingFace]); // Dependencias del useCallback

  // Efecto para activar la lógica de validación cuando se tiene un embedding facial
  useEffect(() => {
    const validateFace = async () => {
      if (faceDescriptor && faceApiModelsLoaded) {
        setValidationMessage("Validating face against database...");
        setFaceDetectionError(null);

        try {
          // Aquí se realizará la llamada a la NUEVA Edge Function 'validate-user-face'
          // ¡Importante! Reemplaza 'YOUR_PROJECT_REF' con la URL real de tu Edge Function
          const validateEdgeFunctionUrl =
            "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/validate-user-face";

          const payload = {
            faceEmbedding: Array.from(faceDescriptor), // Envía el embedding como un array de números
          };

          const response = await fetch(validateEdgeFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          // Manejo de la respuesta de la Edge Function
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error ||
                errorData.details ||
                `HTTP Error: ${response.status}`
            );
          }

          const result = await response.json();
          console.log("Validation Result:", result);

          // Actualiza el mensaje de validación en la UI según el resultado
          if (result.matchedUser) {
            // Si hay una coincidencia con un usuario registrado
            const {
              id,
              full_name,
              role_name,
              status_name,
              access_zones,
              distance,
            } = result.matchedUser;
            setValidationMessage(
              `Match Found! User: ${full_name} (ID: ${id.substring(
                0,
                8
              )}...), Role: ${role_name}, Status: ${status_name}. ` +
                `Access Zones: ${access_zones.join(
                  ", "
                )}. Similarity: ${distance.toFixed(4)}`
            );
          } else if (result.observedUser) {
            // Si hay una coincidencia con un usuario previamente observado (no registrado en 'users')
            const { id, status_name, distance } = result.observedUser;
            setValidationMessage(
              `Observed User Detected! ID: ${id.substring(
                0,
                8
              )}... Status: ${status_name}. Similarity: ${distance.toFixed(
                4
              )} ` + `This user is not registered in the main system.`
            );
          } else {
            // Si no se encontró ninguna coincidencia
            setValidationMessage("No registered or observed user matched.");
          }
        } catch (error: any) {
          console.error("Error during face validation:", error);
          setFaceDetectionError(`Validation Error: ${error.message}`);
          setValidationMessage("Validation failed.");
        }
      }
    };

    validateFace();
  }, [faceDescriptor, faceApiModelsLoaded]); // Este efecto se ejecuta cuando faceDescriptor o faceApiModelsLoaded cambian

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

        {/* Área de la cámara */}
        <div className="relative w-full aspect-video bg-gray-200 rounded-md overflow-hidden">
          {!isLoadingModels && (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              height="100%"
              videoConstraints={{
                facingMode: "user", // 'user' para cámara frontal, 'environment' para trasera (si disponible)
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Botón de captura */}
        <button
          onClick={capture}
          disabled={!faceApiModelsLoaded || isProcessingFace}
          className={`w-full py-3 rounded-md font-semibold text-lg ${
            faceApiModelsLoaded && !isProcessingFace
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
              backgroundColor: validationMessage.includes("Match Found!")
                ? "#dcfce7" // Tailwind bg-green-100
                : validationMessage.includes("Observed User Detected!")
                ? "#fffbe6" // Tailwind bg-yellow-100
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No face detected") ||
                  validationMessage.includes("Validation failed.")
                ? "#fee2e2" // Tailwind bg-red-100
                : "#dbeafe", // Tailwind bg-blue-100
              color: validationMessage.includes("Match Found!")
                ? "#166534" // Tailwind text-green-700
                : validationMessage.includes("Observed User Detected!")
                ? "#a16207" // Tailwind text-yellow-700
                : validationMessage.includes("Error:") ||
                  validationMessage.includes("No face detected") ||
                  validationMessage.includes("Validation failed.")
                ? "#b91c1c" // Tailwind text-red-700
                : "#2563eb", // Tailwind text-blue-700
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
