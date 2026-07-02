const mqtt = require('mqtt');
const config = require('../config');
const { SensorReading, Alert, Threshold } = require('../models');
const { notifyAlert } = require('../services/notificationService');

let client = null;
let io = null;

const state = {
  latest: null,
  deviceOnline: false,
  lastSeen: null,
  thresholds: { ...config.defaults },
};

function getState() {
  return { ...state };
}

function initMqtt(socketIo) {
  io = socketIo;

  client = mqtt.connect(config.mqttBrokerUrl, {
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    console.log('[MQTT] Đã kết nối broker:', config.mqttBrokerUrl);
    const topics = Object.values(config.topics);
    client.subscribe(topics, (err) => {
      if (err) console.error('[MQTT] Lỗi subscribe:', err.message);
      else console.log('[MQTT] Đã subscribe:', topics.join(', '));
    });
  });

  client.on('message', async (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      await handleMessage(topic, data);
    } catch (err) {
      console.error('[MQTT] Lỗi xử lý message:', topic, err.message);
    }
  });

  client.on('error', (err) => console.error('[MQTT] Lỗi:', err.message));
  client.on('reconnect', () => console.log('[MQTT] Đang kết nối lại...'));

  return client;
}

async function handleMessage(topic, data) {
  switch (topic) {
    case config.topics.sensorData:
      await handleSensorData(data);
      break;
    case config.topics.alert:
      await handleAlert(data);
      break;
    case config.topics.deviceStatus:
      handleDeviceStatus(data);
      break;
    case config.topics.thresholdAck:
      handleThresholdAck(data);
      break;
    default:
      break;
  }
}

async function handleSensorData(data) {
  state.latest = {
    soilMoisture: data.soilMoisture,
    temperature: data.temperature,
    humidity: data.humidity,
    pumpOn: data.pumpOn ?? false,
    fanOn: data.fanOn ?? false,
    autoMode: data.autoMode ?? true,
    deviceId: data.deviceId || 'esp32-01',
    timestamp: data.timestamp || new Date().toISOString(),
  };
  state.deviceOnline = true;
  state.lastSeen = new Date();

  const reading = await SensorReading.create({
    ...state.latest,
    source: data.source || 'esp32',
  });

  if (io) {
    io.emit('sensor:update', state.latest);
    io.emit('history:new', {
      id: reading._id,
      ...state.latest,
      createdAt: reading.createdAt,
    });
  }
}

async function handleAlert(data) {
  const alertDoc = await Alert.create({
    type: data.type || 'UNKNOWN',
    message: data.message || 'Cảnh báo không xác định',
    level: data.level || 'warning',
    soilMoisture: data.soilMoisture,
    temperature: data.temperature,
    humidity: data.humidity,
    deviceId: data.deviceId || 'esp32-01',
  });

  if (io) {
    io.emit('alert:new', {
      id: alertDoc._id,
      type: alertDoc.type,
      message: alertDoc.message,
      level: alertDoc.level,
      soilMoisture: alertDoc.soilMoisture,
      temperature: alertDoc.temperature,
      humidity: alertDoc.humidity,
      createdAt: alertDoc.createdAt,
    });
  }

  if (data.level === 'critical') {
    await notifyAlert(alertDoc);
  }
}

function handleDeviceStatus(data) {
  state.deviceOnline = data.online ?? true;
  state.lastSeen = new Date();
  if (io) io.emit('device:status', { online: state.deviceOnline, lastSeen: state.lastSeen });
}

function handleThresholdAck(data) {
  if (data.soilMin != null) state.thresholds.soilMin = data.soilMin;
  if (data.tempMax != null) state.thresholds.tempMax = data.tempMax;
  if (data.humidityMin != null) state.thresholds.humidityMin = data.humidityMin;
  if (io) io.emit('threshold:ack', state.thresholds);
}

function publish(topic, payload) {
  if (!client || !client.connected) {
    throw new Error('MQTT client chưa kết nối');
  }
  client.publish(topic, JSON.stringify(payload), { qos: 1 });
}

function controlPump(on) {
  publish(config.topics.controlPump, { pump: on ? 'ON' : 'OFF', timestamp: Date.now() });
}

function controlFan(on) {
  publish(config.topics.controlFan, { fan: on ? 'ON' : 'OFF', timestamp: Date.now() });
}

async function setThresholds(thresholds) {
  const saved = await Threshold.findOneAndUpdate(
    { deviceId: 'esp32-01' },
    thresholds,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  state.thresholds = {
    soilMin: saved.soilMin,
    tempMax: saved.tempMax,
    humidityMin: saved.humidityMin,
  };

  publish(config.topics.configThreshold, {
    soilMin: saved.soilMin,
    tempMax: saved.tempMax,
    humidityMin: saved.humidityMin,
    timestamp: Date.now(),
  });

  return saved;
}

async function loadThresholds() {
  const saved = await Threshold.findOne({ deviceId: 'esp32-01' });
  if (saved) {
    state.thresholds = {
      soilMin: saved.soilMin,
      tempMax: saved.tempMax,
      humidityMin: saved.humidityMin,
    };
  }
  return state.thresholds;
}

module.exports = {
  initMqtt,
  getState,
  controlPump,
  controlFan,
  setThresholds,
  loadThresholds,
  publish,
};
