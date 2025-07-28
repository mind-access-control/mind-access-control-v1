// Backend NVR para Raspberry Pi
// Esqueleto inicial: carga dependencias, variables de entorno y estructura de flujo principal

require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const faceapi = require('@vladmandic/face-api');
const tf = require('@tensorflow/tfjs-node');
const { createCanvas, Image, loadImage } = require('canvas');
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// --- Variables de entorno ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUDAMQP_URL = process.env.CLOUDAMQP_URL;
const RTSP_URL = process.env.RTSP_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CLOUDAMQP_URL || !RTSP_URL) {
  console.error('❌ Faltan variables de entorno. Revisa tu archivo .env');
  process.exit(1);
}

// --- Inicializar Supabase ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Inicializar MQTT ---
const mqttClient = mqtt.connect(CLOUDAMQP_URL);
mqttClient.on('connect', () => {
  console.log('✅ Conectado a CloudAMQP');
});
mqttClient.on('error', (err) => {
  console.error('❌ Error de conexión MQTT:', err);
});

// --- Cargar modelos de face-api.js ---
async function loadModels() {
  const modelPath = './models'; // Debes descargar los modelos y ponerlos aquí
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  console.log('✅ Modelos de face-api.js cargados');
}

// --- Captura de frame RTSP y procesamiento (esqueleto) ---
async function processFrame() {
  console.log('🔄 [PROCESS_FRAME] Iniciando procesamiento de frame...');
  
  try {
    // 1. Capturar imagen de la cámara USB
    console.log('📷 [CAPTURE] Capturando imagen de la cámara USB...');
    const imageBuffer = await captureImageFromUSB();
    if (!imageBuffer) {
      console.log('❌ [CAPTURE] No se pudo capturar imagen, saltando frame');
      return;
    }
    console.log('✅ [CAPTURE] Imagen capturada exitosamente, tamaño:', imageBuffer.length, 'bytes');

    // 2. Cargar imagen en canvas para face-api.js
    console.log('🖼️ [CANVAS] Cargando imagen en canvas...');
    const canvas = createCanvas(640, 480);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        ctx.drawImage(img, 0, 0);
        console.log('✅ [CANVAS] Imagen cargada en canvas');

        // 3. Detectar rostro con face-api.js
        console.log('👤 [DETECTION] Detectando rostro...');
        const detections = await faceapi.detectSingleFace(canvas)
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (!detections) {
          console.log('❌ [DETECTION] No se detectó rostro en el frame');
          resolve();
          return;
        }
        
        console.log('✅ [DETECTION] Rostro detectado! Extrayendo embedding...');
        const embedding = Array.from(detections.descriptor);
        console.log('📊 [EMBEDDING] Embedding extraído, longitud:', embedding.length);

        // 4. Consultar Supabase para comparar embeddings
        console.log('🔍 [SUPABASE] Consultando base de datos para comparar embeddings...');
        const validationResult = await validateFaceInSupabase(embedding);
        
        if (validationResult) {
          console.log('✅ [SUPABASE] Validación completada:', validationResult.type);
          
          // 5. Guardar log en Supabase
          console.log('📝 [LOG] Guardando log en Supabase...');
          await saveLogToSupabase(validationResult);
          
          // 6. Publicar a MQTT si hay acceso
          if (validationResult.user.hasAccess) {
            console.log('🚪 [MQTT] Acceso concedido, publicando a MQTT...');
            await publishToMQTT(validationResult.user.full_name);
          }
        } else {
          console.log('❌ [SUPABASE] Error en la validación o no se encontró coincidencia');
        }
        
        resolve();
      };
      
      img.onerror = (err) => {
        console.error('❌ [CANVAS] Error cargando imagen:', err);
        reject(err);
      };
      
      img.src = imageBuffer;
    });

  } catch (error) {
    console.error('❌ [PROCESS_FRAME] Error durante el procesamiento:', error);
  }
}

// --- Función para capturar imagen de la cámara USB ---
async function captureImageFromUSB() {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    
    // Usar fswebcam para capturar imagen
    exec('fswebcam -d /dev/video0 --no-banner --jpeg 95 -r 640x480 -', 
      { encoding: null }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ [CAPTURE] Error ejecutando fswebcam:', error);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn('⚠️ [CAPTURE] Warnings de fswebcam:', stderr);
        }
        
        // Convertir stdout a buffer
        const buffer = Buffer.from(stdout, 'binary');
        resolve(buffer);
      });
  });
}

// --- Función para validar rostro en Supabase (replica lógica de Edge Function) ---
async function validateFaceInSupabase(embedding) {
  try {
    console.log('🔍 [SUPABASE_RPC] Llamando match_user_face_embedding...');
    
    // 1. Buscar en usuarios registrados
    const { data: userData, error: userRpcError } = await supabase.rpc('match_user_face_embedding', {
      match_count: 1,
      match_threshold: 0.15, // USER_MATCH_THRESHOLD_DISTANCE
      query_embedding: embedding,
    });
    
    if (userRpcError) {
      console.error('❌ [SUPABASE_RPC] Error en match_user_face_embedding:', userRpcError);
      return null;
    }
    
    console.log('📊 [SUPABASE_RPC] Resultado usuarios registrados:', userData?.length || 0, 'coincidencias');
    
    if (userData && userData.length > 0) {
      const matchedUser = userData[0];
      const actualDistance = matchedUser.distance || 0;
      const matchSimilarity = 1 - actualDistance / 2;
      
      console.log('👤 [SUPABASE_MATCH] Usuario registrado encontrado:', {
        userId: matchedUser.user_id,
        distance: actualDistance,
        similarity: matchSimilarity
      });
      
      if (actualDistance <= 0.15) {
        // Obtener detalles completos del usuario
        const { data: fullUserData, error: fullUserError } = await supabase
          .from('user_full_details_view')
          .select('*')
          .eq('id', matchedUser.user_id)
          .maybeSingle();
          
        if (fullUserError) {
          console.error('❌ [SUPABASE_DETAILS] Error obteniendo detalles del usuario:', fullUserError);
          return null;
        }
        
        if (fullUserData) {
          // Verificar acceso (simplificado - puedes agregar lógica de zonas)
          const hasAccess = true; // Por ahora, siempre concede acceso si hay match
          
          return {
            user: {
              id: fullUserData.id,
              full_name: fullUserData.full_name,
              user_type: 'registered',
              hasAccess: hasAccess,
              similarity: matchSimilarity,
              role_details: fullUserData.roles,
              status_details: fullUserData.statuses,
              zones_accessed_details: fullUserData.zones || [],
            },
            type: hasAccess ? 'registered_user_matched' : 'registered_user_access_denied',
            message: hasAccess ? 'Registered user matched and has access.' : 'Registered user matched but access denied.'
          };
        }
      }
    }
    
    // 2. Si no hay match en usuarios registrados, buscar en observados
    console.log('🔍 [SUPABASE_RPC] Llamando match_observed_face_embedding...');
    
    const { data: observedUserData, error: observedRpcError } = await supabase.rpc('match_observed_face_embedding', {
      match_count: 1,
      match_threshold: 0.08, // OBSERVED_USER_MATCH_THRESHOLD_DISTANCE
      query_embedding: embedding,
    });
    
    if (observedRpcError) {
      console.error('❌ [SUPABASE_RPC] Error en match_observed_face_embedding:', observedRpcError);
      return null;
    }
    
    console.log('📊 [SUPABASE_RPC] Resultado usuarios observados:', observedUserData?.length || 0, 'coincidencias');
    
    if (observedUserData && observedUserData.length > 0) {
      const matchedObservedUser = observedUserData[0];
      const actualDistance = matchedObservedUser.distance || 0;
      const matchSimilarity = 1 - actualDistance / 2;
      
      console.log('👤 [SUPABASE_MATCH] Usuario observado encontrado:', {
        userId: matchedObservedUser.id,
        distance: actualDistance,
        similarity: matchSimilarity
      });
      
      if (actualDistance <= 0.08) {
        // Verificar si el usuario observado tiene acceso activo
        const hasExpired = matchedObservedUser.expires_at && new Date(matchedObservedUser.expires_at) < new Date();
        const hasAccess = !hasExpired;
        
        return {
          user: {
            id: matchedObservedUser.id,
            full_name: `Observado ${matchedObservedUser.id.substring(0, 8)}`,
            user_type: 'observed',
            hasAccess: hasAccess,
            similarity: matchSimilarity,
            role_details: null,
            status_details: { id: matchedObservedUser.status_id, name: 'Estado Desconocido' },
            zones_accessed_details: [],
            observed_details: {
              firstSeenAt: matchedObservedUser.first_seen_at,
              lastSeenAt: matchedObservedUser.last_seen_at,
              accessCount: matchedObservedUser.access_count,
              alertTriggered: matchedObservedUser.alert_triggered,
              expiresAt: matchedObservedUser.expires_at || '',
              potentialMatchUserId: matchedObservedUser.potential_match_user_id,
              similarity: matchSimilarity,
              distance: actualDistance,
              faceImageUrl: matchedObservedUser.face_image_url,
            },
          },
          type: hasAccess ? 'observed_user_updated' : 'observed_user_access_denied_expired',
          message: hasAccess ? 'Observed user matched and has active temporary access.' : 'Observed user access expired.'
        };
      }
    }
    
    // 3. Si no hay match, registrar nuevo usuario observado
    console.log('🆕 [SUPABASE_NEW] No se encontró coincidencia, registrando nuevo usuario observado...');
    
    const { data: newObservedUser, error: insertError } = await supabase
      .from('observed_users')
      .insert({
        embedding: embedding,
        status_id: 'c70bbe40-afe3-4357-8454-16b457705db5', // NEW_OBSERVED_USER_STATUS_ID
        last_accessed_zones: [], // Por ahora vacío
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        consecutive_denied_accesses: 0,
      })
      .select()
      .maybeSingle();
      
    if (insertError) {
      console.error('❌ [SUPABASE_NEW] Error registrando nuevo usuario observado:', insertError);
      return null;
    }
    
    if (newObservedUser) {
      console.log('✅ [SUPABASE_NEW] Nuevo usuario observado registrado:', newObservedUser.id);
      
      return {
        user: {
          id: newObservedUser.id,
          full_name: `Nuevo Observado ${newObservedUser.id.substring(0, 8)}`,
          user_type: 'observed',
          hasAccess: true,
          similarity: 0,
          role_details: null,
          status_details: { id: newObservedUser.status_id, name: 'Estado Desconocido' },
          zones_accessed_details: [],
          observed_details: {
            firstSeenAt: newObservedUser.first_seen_at,
            lastSeenAt: newObservedUser.last_seen_at,
            accessCount: newObservedUser.access_count,
            alertTriggered: newObservedUser.alert_triggered,
            expiresAt: newObservedUser.expires_at || '',
            potentialMatchUserId: newObservedUser.potential_match_user_id,
            similarity: 0,
            distance: 0,
            faceImageUrl: newObservedUser.face_image_url,
          },
        },
        type: 'new_observed_user_registered',
        message: 'New observed user registered and access granted.'
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ [SUPABASE_VALIDATION] Error en validación:', error);
    return null;
  }
}

// --- Función para guardar log en Supabase (replica formato de Edge Function) ---
async function saveLogToSupabase(validationResult) {
  try {
    const logEntry = {
      user_id: validationResult.user.id !== 'N/A' ? validationResult.user.id : null,
      camera_id: null, // Por ahora null, puedes agregar ID de cámara si lo necesitas
      result: validationResult.user.hasAccess,
      observed_user_id: validationResult.user.user_type === 'observed' ? validationResult.user.id : null,
      user_type: validationResult.user.user_type,
      vector_attempted: null, // Por ahora null, puedes agregar el embedding si lo necesitas
      match_status: validationResult.type,
      decision: validationResult.user.hasAccess ? 'access_granted' : 'access_denied',
      reason: validationResult.message,
      confidence_score: validationResult.user.similarity,
      requested_zone_id: null, // Por ahora null, puedes agregar zona si lo necesitas
    };
    
    console.log('📝 [LOG_ENTRY] Preparando log:', logEntry);
    
    const { error: logError } = await supabase.from('logs').insert([logEntry]);
    
    if (logError) {
      console.error('❌ [LOG_SAVE] Error guardando log:', logError);
    } else {
      console.log('✅ [LOG_SAVE] Log guardado exitosamente en Supabase');
    }
    
  } catch (error) {
    console.error('❌ [LOG_SAVE] Error en guardado de log:', error);
  }
}

// --- Función para publicar a MQTT ---
async function publishToMQTT(fullName) {
  try {
    const payload = JSON.stringify({ hasAccess: true, full_name: fullName });
    
    mqttClient.publish('acceso/puerta1', payload, (err) => {
      if (err) {
        console.error('❌ [MQTT] Error enviando mensaje MQTT:', err);
      } else {
        console.log('✅ [MQTT] Mensaje MQTT enviado:', payload);
      }
    });
    
  } catch (error) {
    console.error('❌ [MQTT] Error en publicación MQTT:', error);
  }
}

// --- Main loop ---
(async () => {
  await loadModels();
  setInterval(processFrame, 5000); // Procesar un frame cada 5 segundos (ajustable)
})(); 