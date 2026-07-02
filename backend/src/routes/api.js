const express = require('express');
const { SensorReading, Alert } = require('../models');
const mqttClient = require('../mqtt/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/status', (req, res) => {
  const state = mqttClient.getState();
  res.json({
    latest: state.latest,
    deviceOnline: state.deviceOnline,
    lastSeen: state.lastSeen,
    thresholds: state.thresholds,
  });
});

router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await SensorReading.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(readings.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/control/pump', (req, res) => {
  try {
    const { on } = req.body;
    if (typeof on !== 'boolean') {
      return res.status(400).json({ error: 'Tham số "on" phải là boolean' });
    }
    mqttClient.controlPump(on);
    res.json({ success: true, pump: on ? 'ON' : 'OFF' });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.post('/control/fan', (req, res) => {
  try {
    const { on } = req.body;
    if (typeof on !== 'boolean') {
      return res.status(400).json({ error: 'Tham số "on" phải là boolean' });
    }
    mqttClient.controlFan(on);
    res.json({ success: true, fan: on ? 'ON' : 'OFF' });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.get('/thresholds', async (req, res) => {
  try {
    const thresholds = await mqttClient.loadThresholds();
    res.json(thresholds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/thresholds', async (req, res) => {
  try {
    const { soilMin, tempMax, humidityMin } = req.body;
    const payload = {};
    if (soilMin != null) payload.soilMin = Number(soilMin);
    if (tempMax != null) payload.tempMax = Number(tempMax);
    if (humidityMin != null) payload.humidityMin = Number(humidityMin);

    const saved = await mqttClient.setThresholds(payload);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
