# Backend NVR para Raspberry Pi

Este backend corre en la Raspberry Pi, captura frames de una cámara NVR (RTSP), realiza reconocimiento facial con face-api.js, consulta Supabase para validar acceso, guarda logs/accesos y publica a MQTT (CloudAMQP).

## Flujo General
1. Captura frames de la cámara NVR vía RTSP (usando ffmpeg).
2. Detecta rostro y extrae embedding con face-api.js.
3. Consulta Supabase para comparar embeddings (RPC `match_user_face_embedding` y `match_observed_face_embedding`).
4. Si hay acceso, guarda el log en Supabase (tabla `logs`, igual que la Edge Function).
5. Publica a MQTT (CloudAMQP) si corresponde.

## Requisitos
- Raspberry Pi 3B/4 (recomendado)
- Node.js v16+ instalado
- ffmpeg instalado (`sudo apt install ffmpeg`)
- Dependencias nativas para `canvas` (`sudo apt install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++`)

## Instalación
```bash
# Instala Node.js (si no lo tienes)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instala ffmpeg
sudo apt install ffmpeg

# Instala dependencias nativas para canvas
sudo apt install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++

# Clona el proyecto y entra a la carpeta backend-nvr
cd backend-nvr

# Instala dependencias de Node.js
npm install
```

## Variables de entorno (`.env`)
Crea un archivo `.env` con:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CLOUDAMQP_URL=...
RTSP_URL=rtsp://usuario:pass@ip:puerto/...
```

## Ejecución
```bash
node index.js
```

## Notas
- Puedes usar `pm2` o `systemd` para mantener el proceso siempre activo.
- El backend replica la lógica de la Edge Function para que los logs/accesos sean compatibles con el dashboard. 