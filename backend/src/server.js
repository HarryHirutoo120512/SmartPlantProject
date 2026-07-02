require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const config = require('./config');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const chatbotRoutes = require('./routes/chatbot');
const mqttClient = require('./mqtt/client');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT'] },
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'smart-plant-backend' });
});

async function start() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('[DB] Đã kết nối MongoDB Atlas');

    await mqttClient.loadThresholds();
    mqttClient.initMqtt(io);

    server.listen(config.port, () => {
      console.log(`[Server] Backend chạy tại http://localhost:${config.port}`);
      console.log('[Server] Đảm bảo Mosquitto MQTT đang chạy tại', config.mqttBrokerUrl);
    });
  } catch (err) {
    console.error('[Server] Không khởi động được:', err.message);
    process.exit(1);
  }
}

start();
