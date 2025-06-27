'use client';

import { Role, UserStatus, Zone, User } from '@/types';
import { useEffect, useState } from 'react';
// --- Face-API.js ---
import * as faceapi from 'face-api.js';
import { edgeFunctions } from '@/lib/edge-functions';

export function useUserApi() {
  // --- New User Form States ---
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>('Inactive'); // Default to 'Inactive'
  // States for data fetched from Edge Functions
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loadingUserStatuses, setLoadingUserStatuses] = useState(true);
  const [errorUserStatuses, setErrorUserStatuses] = useState<string | null>(null);
  const [zonesData, setZonesData] = useState<Zone[]>([]); // Renombrado a zonesData para evitar conflicto con 'zones' mock
  const [loadingZones, setLoadingZones] = useState(true);
  const [errorZones, setErrorZones] = useState<string | null>(null);
  // --- Photo Upload & Face-API.js States ---
  const [currentImage, setCurrentImage] = useState<File | Blob | null>(null); // La imagen activa (File o Blob) para procesar
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null); // El vector 128D resultante de face-api.js
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(null); // Errores específicos de detección facial
  const [isProcessingImage, setIsProcessingImage] = useState(false); // Indica si face-api está trabajando
  const [faceApiModelsLoaded, setFaceApiModelsLoaded] = useState(false); // Para el estado de carga de los modelos de Face-API
  const [faceApiModelsError, setFaceApiModelsError] = useState<string | null>(null); // Errores de carga de los modelos de Face-API
  // --- User Management States ---
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);

  // Define loadUsers function outside useEffect so it can be returned
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorUsers(null);

      const result = await edgeFunctions.ef_users('list', {});
      setUsers(result.users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setErrorUsers(error.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // --- USE EFFECTS PARA CARGA DE DATOS INICIALES ---
  // useEffect para cargar los modelos de Face-API.js
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'; // La URL base donde se encuentran los modelos.
      try {
        setFaceApiModelsLoaded(false);
        setFaceApiModelsError(null);
        await faceapi.nets.ssdMobilenetv1.load(MODEL_URL); // Usamos SSD Mobilenet V1
        await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.load(MODEL_URL);
        setFaceApiModelsLoaded(true);
        console.log('Face-API.js models loaded successfully!');
      } catch (error: any) {
        console.error('Error loading Face-API.js models:', error);
        setFaceApiModelsError(`Failed to load face detection models: ${error.message}`);
      }
    };
    loadModels();
  }, []);

  // useEffect para cargar roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        setErrorRoles(null);

        const result = await edgeFunctions.getUserRoles();
        setRoles(result.roles || []);
        if (result.roles && result.roles.length > 0 && !selectedRole) {
          setSelectedRole(result.roles[0].name);
        }
      } catch (error: any) {
        console.error('Error al obtener roles de Edge Function:', error);
        setErrorRoles(error.message || 'Fallo al cargar los roles.');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // useEffect para cargar estados de usuario
  useEffect(() => {
    const fetchUserStatuses = async () => {
      try {
        setLoadingUserStatuses(true);
        setErrorUserStatuses(null);
        const result = await edgeFunctions.getUserStatuses();
        setUserStatuses(result.statuses || []);
        if (result.statuses && result.statuses.length > 0) {
          const inactiveStatus = result.statuses.find((status: { name: string }) => status.name === 'Inactive');
          if (inactiveStatus) {
            setSelectedUserStatus(inactiveStatus.name);
          } else if (!selectedUserStatus) {
            setSelectedUserStatus(result.statuses[0].name); // Fallback al primero si no existe Inactive y no hay selección previa
          }
        }
      } catch (error: any) {
        console.error('Error al obtener estados de usuario de Edge Function:', error);
        setErrorUserStatuses(error.message || 'Fallo al cargar los estados de usuario.');
      } finally {
        setLoadingUserStatuses(false);
      }
    };
    fetchUserStatuses();
  }, []);

  // useEffect para cargar zonas
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoadingZones(true);
        setErrorZones(null);
        const result = await edgeFunctions.getAccessZones();
        setZonesData(result.zones || []);
      } catch (error: any) {
        console.error('Error al obtener zonas de Edge Function:', error);
        setErrorZones(error.message || 'Fallo al cargar las zonas.');
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  // Nuevo useEffect para procesar la imagen con Face-API.js (se ejecuta cuando currentImage o faceApiModelsLoaded cambian)
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
        // Crea un elemento HTMLImageElement temporal para face-api
        const img = document.createElement('img');
        img.src = currentImage instanceof File ? URL.createObjectURL(currentImage) : URL.createObjectURL(currentImage);

        img.onload = async () => {
          // Detecta todas las caras y sus puntos de referencia
          const detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks().withFaceDescriptors(); // ¡Añadir .withFaceDescriptors() aquí!

          if (detectionsWithLandmarks.length === 0) {
            setFaceDetectionError('No face detected in the image. Please use a clear photo.');
            setFaceEmbedding(null);
            console.warn('No face detected.');
          } else if (detectionsWithLandmarks.length > 1) {
            setFaceDetectionError('Multiple faces detected. Please use a photo with only one person.');
            setFaceEmbedding(null);
            console.warn('Multiple faces detected.');
          } else {
            // Si se detecta exactamente una cara, extrae el descriptor (embedding)
            const faceDescriptor = detectionsWithLandmarks[0].descriptor; // Ahora el descriptor ya está adjunto
            setFaceEmbedding(new Float32Array(faceDescriptor)); // Almacena el embedding
            setFaceDetectionError(null);
            console.log('Face detected and embedding generated successfully!');
            console.log('Generated Embedding:', faceDescriptor); // Para depuración comentar esta línea
          }
          URL.revokeObjectURL(img.src); // Libera la URL del objeto creado
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

  // useEffect to load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  return {
    roles,
    loadingRoles,
    errorRoles,
    userStatuses,
    loadingUserStatuses,
    errorUserStatuses,
    zonesData,
    loadingZones,
    errorZones,
    currentImage,
    setCurrentImage,
    faceEmbedding,
    setFaceEmbedding,
    faceDetectionError,
    setFaceDetectionError,
    isProcessingImage,
    faceApiModelsLoaded,
    users,
    loadingUsers,
    errorUsers,
    setLoadingUsers,
    setErrorUsers,
    setUsers,
    loadUsers,
  };
}
