const express = require('express');
const mqtt = require('mqtt');
const app = express();

app.use(express.json());

// --- HABILITAR CORS ---
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
// --- FIN CORS ---
console.log('Microservicio iniciado, esperando conexiones...');
// Configura la IP y puerto del broker MQTT (Raspberry Pi o broker en la nube)
const mqttClient = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  protocol: 'mqtt'
}); 

mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');
});

mqttClient.on('error', (err) => {
  console.error('Error de conexión MQTT:', err);
});

// Endpoint para recibir el POST desde la Edge Function
app.post('/publish', (req, res) => {
  const { hasAccess, full_name, event } = req.body;

  // Si es un evento de rostro detectado
  if (event === 'face_detected') {
    console.log(`[EVENTO] Rostro detectado para: ${full_name || 'desconocido'}`);
    // Puedes publicar en otro topic MQTT si lo deseas
    // mqttClient.publish('evento/rostro_detectado', JSON.stringify({ event, full_name }));
    return res.send({ status: 'ok', info: 'Evento face_detected recibido' });
  }

  // Si es acceso concedido
  if (hasAccess === true) {
    const payload = JSON.stringify({ hasAccess, full_name });
    mqttClient.publish('acceso/puerta1', payload, (err) => {
      if (err) {
        console.error('Error enviando mensaje MQTT:', err);
        return res.status(500).send({ error: 'Error enviando mensaje MQTT' });
      }
      console.log('Mensaje MQTT enviado:', payload);
      res.send({ status: 'ok' });
    });
  } else {
    res.status(400).send({ error: 'hasAccess debe ser true o event debe ser face_detected' });
  }
});

// Usa el puerto proporcionado por la plataforma cloud o 3001 por defecto
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio MQTT escuchando en http://0.0.0.0:${PORT}/publish`);
});