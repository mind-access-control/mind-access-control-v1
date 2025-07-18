'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { FaceValidationRequest, UserInfo, Zone } from '@/lib/api/types';
import { ZoneService, FaceService } from '@/lib/api/services';
import { EMPTY_STRING, NA_VALUE } from '@/lib/constants';
import { CaptureMode } from '@/app/enums';

const FacialValidationScreen: React.FC = () => {
  // --- ESTADOS ---
  const webcamRef = useRef<Webcam>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(CaptureMode.MANUAL);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [isProcessingFace, setIsProcessingFace] = useState<boolean>(false);
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isLoadingZones, setIsLoadingZones] = useState<boolean>(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

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
        const zones = await ZoneService.getZones();
        setZones(zones);
        if (zones.length > 0 && selectedZone === null) {
          setSelectedZone(zones[0].id);
        }
      } catch (error) {
        console.error('❌ ERROR: Error al obtener zonas:', error);
        // Manejo de error más robusto
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error); // Convierte cualquier cosa a string
        }
        setFaceDetectionError(`Fallo al cargar las zonas de acceso: ${errorMessage}. Intente de nuevo.`);
      } finally {
        setIsLoadingZones(false);
      }
    };

    fetchZones();
  }, [selectedZone]);

  // --- Cargar modelos de Face-API.js ---
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const MODEL_URL = '/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setFaceApiModelsLoaded(true);
        setValidationMessage('Modelos cargados. Seleccione modo de captura y zona.');
      } catch (error) {
        console.error('❌ ERROR: Error al cargar modelos de Face-API.js:', error);
        // Manejo de error más robusto
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }
        setFaceDetectionError(`Fallo al cargar los modelos de reconocimiento facial: ${errorMessage}. Revise su red o la ruta de los modelos.`);
        setValidationMessage('Error al cargar modelos de reconocimiento facial.');
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
        const videoDevices = mediaDevices.filter((device) => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('❌ ERROR: Error al enumerar dispositivos de medios:', error);
        // Manejo de error más robusto
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }
        setFaceDetectionError(
          `Fallo al acceder a los dispositivos de la cámara: ${errorMessage}. Asegúrese de que los permisos de la cámara estén concedidos.`
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
        console.error('❌ ERROR: Acceso inicial a la cámara denegado:', error);
        // Manejo de error más robusto
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }
        setFaceDetectionError(`Acceso a la cámara denegado: ${errorMessage}. Por favor, conceda los permisos para usar esta función.`);
      });
  }, [selectedDeviceId]);

  // --- Función principal de validación (llamada imperativamente) ---
  const processAndValidateFace = useCallback(
    async (descriptor: Float32Array, capturedImageSrc: string) => {
      if (!selectedZone) {
        setFaceDetectionError('Por favor, seleccione una zona de acceso antes de validar.');
        setValidationMessage('Selección de zona requerida.');
        setIsProcessingFace(false);
        return;
      }

      setIsProcessingFace(true);
      setValidationMessage('Validando rostro contra la base de datos...');
      setFaceDetectionError(null);
      setUserInfo(null);
      setImageSrc(capturedImageSrc);

      try {
        const request: FaceValidationRequest = {
          faceEmbedding: Array.from(descriptor),
          zoneId: selectedZone,
          imageData: capturedImageSrc,
        };


        const result = await FaceService.validateFace(request);

        console.log('✅ VALIDACIÓN: Resultado de validación de rostro:', result);

        // --- Enviar mensaje al microservicio MQTT (ngrok) cuando se detecta un rostro ---
        // (Eliminado: ahora se envía desde el backend)

        // --- Enviar mensaje al microservicio MQTT (ngrok) cuando hasAccess es true ---
        // (Eliminado: ahora se envía desde el backend)

        if (result.error) {
          setFaceDetectionError(`Error de Validación: ${result.error}`);
          setValidationMessage('Fallo la validación debido a un error del servidor.');
          setUserInfo(null);
          return;
        }

        let displayMessage = EMPTY_STRING;
        let userFullNameForDisplay = result.user.full_name;

        if (!userFullNameForDisplay || userFullNameForDisplay === 'System Error') {
          if (result.user.user_type === 'observed') {
            userFullNameForDisplay = `Usuario Observado ${result.user.id.substring(0, 8)}`;
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
          role: result.user.role_details?.name || NA_VALUE,
          status: result.user.status_details?.name || NA_VALUE,
          accessZones: result.user.zones_accessed_details.map((z) => z.name || 'Zona Desconocida'),
          similarity: result.user.similarity,
          hasAccess: result.user.hasAccess,
        };

        if (result.user.user_type === 'observed' && result.user.observed_details) {
          newUserInfo.observedDetails = {
            firstSeenAt: result.user.observed_details.firstSeenAt,
            lastSeenAt: result.user.observed_details.lastSeenAt,
            accessCount: result.user.observed_details.accessCount,
            alertTriggered: result.user.observed_details.alertTriggered,
            expiresAt: result.user.observed_details.expiresAt || EMPTY_STRING,
            potentialMatchUserId: result.user.observed_details.potentialMatchUserId,
            faceImageUrl: result.user.observed_details.faceImageUrl || null,
          };
        }
        setUserInfo(newUserInfo);
      } catch (error: unknown) {
        let errorMessage = 'An unknown error occurred.';
        // CAMBIO CLAVE: Manejo de error más robusto para 'unknown'
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error); // Convierte cualquier cosa a string
        }

        console.error('❌ ERROR: Error durante la validación del rostro:', error);
        setFaceDetectionError(`Error: ${errorMessage}`);
        setValidationMessage('Fallo la validación.');
        setUserInfo(null);
      } finally {
        setIsProcessingFace(false);
      }
    },
    [selectedZone, setValidationMessage, setFaceDetectionError, setIsProcessingFace, setUserInfo, setImageSrc]
  );

  // --- Función para capturar foto y extraer descriptor (manual) ---
  const captureAndExtractDescriptorManual = useCallback(async () => {
    if (!selectedZone) {
      setFaceDetectionError('Por favor, seleccione una zona de acceso antes de capturar.');
      setValidationMessage('Selección de zona requerida.');
      return;
    }

    if (isProcessingAttemptRef.current || isCurrentlyInCooldownRef.current) {
      return;
    }

    isProcessingAttemptRef.current = true;

    if (!webcamRef.current || !faceApiModelsLoaded) {
      setValidationMessage('Los modelos de reconocimiento facial aún están cargando o la cámara no está lista.');
      isProcessingAttemptRef.current = false;
      return;
    }

    setValidationMessage('Capturando imagen...');
    setFaceDetectionError(null);
    setUserInfo(null);
    setImageSrc(null);

    try {
      const imageSrcData = webcamRef.current?.getScreenshot();
      if (imageSrcData) {
        const img = await faceapi.fetchImage(imageSrcData);

        const detectionOptions = new faceapi.SsdMobilenetv1Options({
          minConfidence: 0.5,
        });

        const detections = await faceapi.detectSingleFace(img, detectionOptions).withFaceLandmarks().withFaceDescriptor();

        if (detections) {
          console.log('DEBUG FACE-API.JS EMBEDDING:', Array.from(detections.descriptor));

          setValidationMessage('Rostro detectado! Procesando para validación...');
          await processAndValidateFace(detections.descriptor, imageSrcData);
        } else {
          setValidationMessage('No se detectó rostro en la imagen capturada.');
          setFaceDetectionError('No se detectó rostro en la imagen capturada. Asegúrese de que su rostro sea claramente visible y bien iluminado.');
          console.warn('⚠️ ADVERTENCIA: No se detectó rostro en la captura.');
        }
      } else {
        throw new Error('No se pudo capturar imagen de la webcam.');
      }
    } catch (error: unknown) {
      let errorMessage = 'An unknown error occurred.';
      // CAMBIO CLAVE: Manejo de error más robusto para 'unknown'
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = String(error);
      }
      console.error('❌ ERROR: Error durante la captura de imagen:', error);
      setFaceDetectionError(`Error: ${errorMessage}`);
      setValidationMessage('Ocurrió un error durante la captura.');
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
    selectedZone,
  ]);

  // --- Main useEffect para la gestión del intervalo de detección automática ---
  useEffect(() => {
    resetStateAndClearTimers();

    if (
      captureMode !== CaptureMode.AUTOMATIC ||
      !faceApiModelsLoaded ||
      isLoadingModels ||
      !selectedDeviceId ||
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4 ||
      !selectedZone
    ) {
      if (captureMode === CaptureMode.AUTOMATIC && (!faceApiModelsLoaded || isLoadingModels)) {
        setValidationMessage('Esperando modelos o cámara lista para modo automático...');
      } else if (
        captureMode === CaptureMode.AUTOMATIC &&
        (!selectedDeviceId || !webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4)
      ) {
        setValidationMessage('Cámara no lista para modo automático. Asegúrese de los permisos.');
      } else if (captureMode !== CaptureMode.AUTOMATIC) {
        setValidationMessage('Seleccione modo de captura y zona.');
      } else if (captureMode === CaptureMode.AUTOMATIC && !selectedZone) {
        setValidationMessage('Seleccione una zona de acceso para el modo automático.');
      }
      clearAllTimersAndFlags();
      return;
    }

    const runAutomaticDetectionTick = async () => {
      if (isProcessingAttemptRef.current || isCurrentlyInCooldownRef.current) {
        return;
      }

      if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
        console.log('⚠️ TICK: Webcam no está lista, deteniendo intervalo.');
        clearAllTimersAndFlags();
        setValidationMessage('Cámara no lista o modelos cargando.');
        setFaceDetectionError('Asegúrese de que la cámara esté activa y los modelos cargados.');
        return;
      }

      if (!userInfo && !faceDetectionError && !validationMessage?.includes('No se detectó rostro') && !validationMessage?.includes('Buscando rostro')) {
        setValidationMessage('Buscando rostro en tiempo real...');
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
            const detections = await faceapi.detectSingleFace(img, detectionOptions).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
              bestDescriptor = detections.descriptor;
              bestImageSrc = imageSrcData;
              break;
            }
          }
          if (i < ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_MS));
          }
        }

        if (bestDescriptor && bestImageSrc) {
          console.log('DEBUG FACE-API.JS EMBEDDING (automático):', Array.from(bestDescriptor));

          setValidationMessage('Rostro detectado! Procesando para validación...');

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
          if (!userInfo && !faceDetectionError && !validationMessage?.includes('No se detectó rostro')) {
            setValidationMessage('No se detectó rostro en este momento.');
          }
        }
      } catch (error: unknown) {
        let errorMessage = 'An unknown error occurred.';
        // CAMBIO CLAVE: Manejo de error más robusto para 'unknown'
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }
        console.error('❌ TICK: Error durante el ciclo de detección automática (detección FaceAPI):', error);
        setFaceDetectionError(`Error en detección automática: ${errorMessage}`);
      } finally {
        isProcessingAttemptRef.current = false;
      }
    };

    if (!detectionIntervalIdRef.current) {
      detectionIntervalIdRef.current = setInterval(runAutomaticDetectionTick, 4000);
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
    selectedZone,
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg space-y-6">
        {/* Título principal de la pantalla */}
        <h2 className="text-3xl font-bold text-center text-gray-800" data-cy="validation-title">
          Validación de Acceso Facial
        </h2>

        {/* Mensaje de carga de modelos */}
        {isLoadingModels && (
          <div className="text-center text-blue-500 font-semibold" data-cy="loading-models-message">
            Cargando modelos de reconocimiento facial...
          </div>
        )}

        {/* Selector de cámara */}
        {!isLoadingModels && devices.length > 1 && (
          <div className="w-full">
            <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Cámara:
            </label>
            <select
              id="camera-select"
              data-cy="camera-select"
              value={selectedDeviceId || EMPTY_STRING}
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
        {/* Mensaje si no hay cámaras */}
        {!isLoadingModels && devices.length === 0 && (
          <div className="text-center text-red-500 font-semibold" data-cy="no-camera-message">
            No se encontraron dispositivos de cámara. Asegúrese de que una cámara esté conectada y los permisos estén concedidos.
          </div>
        )}

        {/* Selector de zona de acceso */}
        {!isLoadingZones && (
          <div className="w-full">
            <label htmlFor="zone-select" className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Zona de Acceso:
            </label>
            <select
              id="zone-select"
              data-cy="zone-select"
              value={selectedZone || EMPTY_STRING}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                resetStateAndClearTimers();
                setIntervalRestartTrigger((prev) => !prev);
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="" disabled={zones.length > 0}>
                {isLoadingZones ? 'Cargando zonas...' : 'Seleccione una zona'}
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mensaje de carga de zonas */}
        {isLoadingZones && (
          <div className="text-center text-blue-500 font-semibold" data-cy="loading-zones-message">
            Cargando zonas de acceso...
          </div>
        )}

        {/* Selectores de modo de captura */}
        <div className="w-full mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Captura:</label>
          <div className="flex items-center space-x-4">
            <label htmlFor="manual-mode" className="flex items-center cursor-pointer">
              <input
                type="radio"
                id="manual-mode"
                data-cy="manual-mode-radio"
                name="captureMode"
                value="manual"
                checked={captureMode === CaptureMode.MANUAL}
                onChange={() => {
                  setCaptureMode(CaptureMode.MANUAL);
                  resetStateAndClearTimers();
                  setIntervalRestartTrigger((prev) => !prev);
                }}
                className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-gray-800">Manual</span>
            </label>
            <label htmlFor="automatic-mode" className="flex items-center cursor-pointer">
              <input
                type="radio"
                id="automatic-mode"
                data-cy="automatic-mode-radio"
                name="captureMode"
                value="automatic"
                checked={captureMode === CaptureMode.AUTOMATIC}
                onChange={() => {
                  setCaptureMode(CaptureMode.AUTOMATIC);
                  resetStateAndClearTimers();
                  setIntervalRestartTrigger((prev) => !prev);
                }}
                className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-gray-800">Automático (Detección Facial)</span>
            </label>
          </div>
        </div>

        {/* Feed de la webcam */}
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
                facingMode: { ideal: 'user' },
              }}
              className="absolute inset-0 w-full h-full object-cover"
              data-cy="webcam-feed"
            />
          )}
        </div>

        {/* Botón de Capturar Foto */}
        <button
          onClick={captureAndExtractDescriptorManual}
          data-cy="capture-button"
          disabled={
            !faceApiModelsLoaded ||
            isProcessingFace ||
            !selectedDeviceId ||
            captureMode === CaptureMode.AUTOMATIC ||
            isProcessingAttemptRef.current ||
            !selectedZone ||
            isLoadingZones
          }
          className={`w-full py-3 rounded-md font-semibold text-lg ${
            faceApiModelsLoaded &&
            !isProcessingFace &&
            selectedDeviceId &&
            captureMode === CaptureMode.MANUAL &&
            !isProcessingAttemptRef.current &&
            selectedZone &&
            !isLoadingZones
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300'
              : 'bg-gray-400 text-gray-700 cursor-not-allowed'
          }`}
          style={{ display: captureMode === CaptureMode.AUTOMATIC ? 'none' : 'block' }}
        >
          {isProcessingFace ? 'Procesando...' : 'Capturar Foto'}
        </button>

        {/* Imagen capturada */}
        {imageSrc && (
          <div className="mt-4 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Imagen Capturada:</h3>
            <img src={imageSrc} alt="Capturada" className="max-w-full h-auto rounded-md border border-gray-300 mx-auto" data-cy="captured-image" />
          </div>
        )}

        {/* Mensaje de validación */}
        {validationMessage && (
          <div
            className="mt-4 p-3 rounded-md text-center text-lg font-medium"
            data-cy="validation-message"
            style={{
              backgroundColor: validationMessage.includes('Acceso Concedido')
                ? '#dcfce7'
                : validationMessage.includes('Acceso Denegado')
                ? '#fee2e2'
                : validationMessage.includes('Error:') ||
                  validationMessage.includes('No se detectó rostro') ||
                  validationMessage.includes('Fallo la validación.')
                ? '#fee2e2'
                : '#dbeafe',
              color: validationMessage.includes('Acceso Concedido')
                ? '#166534'
                : validationMessage.includes('Acceso Denegado')
                ? '#b91c1c'
                : validationMessage.includes('Error:') ||
                  validationMessage.includes('No se detectó rostro') ||
                  validationMessage.includes('Fallo la validación.')
                ? '#b91c1c'
                : '#2563eb',
            }}
          >
            {validationMessage}
          </div>
        )}
        {/* Mensaje de error de detección facial */}
        {faceDetectionError && (
          <div className="mt-2 p-3 rounded-md bg-red-100 text-red-700 text-center font-medium" data-cy="error-message">
            Error: {faceDetectionError}
          </div>
        )}

        {/* Tarjeta de información del usuario */}
        {userInfo && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md shadow-inner text-gray-700" data-cy="user-info-card">
            <h3 className="text-xl font-semibold text-gray-800 mb-3" data-cy="user-info-title">
              Detalles del Usuario:
            </h3>
            <p data-cy="user-id">
              <strong>ID:</strong> {userInfo.id}
            </p>
            {userInfo.fullName && userInfo.fullName !== 'System Error' && (
              <p data-cy="user-full-name">
                <strong>Nombre Completo:</strong> {userInfo.fullName}
              </p>
            )}
            <p data-cy="user-type">
              <strong>Tipo de Usuario:</strong> {userInfo.userType === 'registered' ? 'Registrado' : 'Observado'}
            </p>
            <p data-cy="user-role">
              <strong>Rol:</strong> {userInfo.role}
            </p>
            <p data-cy="user-status">
              <strong>Estado:</strong> {userInfo.status}
            </p>
            <p data-cy="user-similarity">
              <strong>Similitud:</strong> {(userInfo.similarity * 100).toFixed(2)}%
            </p>
            <p data-cy="user-has-access">
              <strong>Acceso Concedido:</strong> {userInfo.hasAccess ? 'Sí' : 'No'}
            </p>
            <p data-cy="user-zones-accessed">
              <strong>Zonas Accedidas:</strong> {userInfo.accessZones.length > 0 ? userInfo.accessZones.join(', ') : NA_VALUE}
            </p>

            {/* Mostrar la imagen si es un Observed User y tiene faceImageUrl */}
            {userInfo.userType === 'observed' && userInfo.observedDetails && userInfo.observedDetails.faceImageUrl && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Foto de Usuario Observado:</h4>
                <img
                  src={userInfo.observedDetails.faceImageUrl}
                  alt={`Face of ${userInfo.id}`}
                  className="max-w-xs h-auto rounded-md border border-gray-300 mx-auto block"
                  data-cy="observed-user-face-image"
                />
              </div>
            )}

            {/* Detalles de usuario observado */}
            {userInfo.userType === 'observed' && userInfo.observedDetails && (
              <div className="mt-4 pt-4 border-t border-gray-200" data-cy="observed-details-card">
                <h4 className="text-lg font-medium text-gray-800 mb-2" data-cy="observed-details-title">
                  Detalles de Usuario Observado:
                </h4>
                <p data-cy="observed-first-seen">
                  <strong>Visto por primera vez:</strong> {new Date(userInfo.observedDetails.firstSeenAt).toLocaleString()}
                </p>
                <p data-cy="observed-last-seen">
                  <strong>Visto por última vez:</strong> {new Date(userInfo.observedDetails.lastSeenAt).toLocaleString()}
                </p>
                <p data-cy="observed-access-count">
                  <strong>Conteo de Accesos:</strong> {userInfo.observedDetails.accessCount}
                </p>
                <p data-cy="observed-alert-triggered">
                  <strong>Alerta Activada:</strong> {userInfo.observedDetails.alertTriggered ? 'Sí' : 'No'}
                </p>
                <p data-cy="observed-expires-at">
                  <strong>Expira en:</strong> {new Date(userInfo.observedDetails.expiresAt).toLocaleString()}
                </p>
                {userInfo.observedDetails.potentialMatchUserId && (
                  <p data-cy="observed-potential-match">
                    <strong>Posible Match con ID:</strong> {userInfo.observedDetails.potentialMatchUserId.substring(0, 8)}
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
