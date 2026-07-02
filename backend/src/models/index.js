const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    soilMoisture: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    pumpOn: { type: Boolean, default: false },
    fanOn: { type: Boolean, default: false },
    autoMode: { type: Boolean, default: true },
    deviceId: { type: String, default: 'esp32-01' },
    source: { type: String, enum: ['esp32'], default: 'esp32' },
  },
  { timestamps: true }
);

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    level: { type: String, enum: ['warning', 'critical'], default: 'warning' },
    soilMoisture: Number,
    temperature: Number,
    humidity: Number,
    deviceId: { type: String, default: 'esp32-01' },
    notifiedEmail: { type: Boolean, default: false },
    notifiedTelegram: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const thresholdSchema = new mongoose.Schema(
  {
    soilMin: { type: Number, default: 40 },
    tempMax: { type: Number, default: 35 },
    humidityMin: { type: Number, default: 30 },
    deviceId: { type: String, default: 'esp32-01' },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);
const Alert = mongoose.model('Alert', alertSchema);
const Threshold = mongoose.model('Threshold', thresholdSchema);
const User = mongoose.model('User', userSchema);

module.exports = { SensorReading, Alert, Threshold, User };
