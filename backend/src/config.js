module.exports = {
  port: process.env.PORT || 3001,
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_plant',
  topics: {
    sensorData: 'plant/sensor/data',
    controlPump: 'plant/control/pump',
    controlFan: 'plant/control/fan',
    configThreshold: 'plant/config/threshold',
    alert: 'plant/alert',
    deviceStatus: 'plant/device/status',
    thresholdAck: 'plant/config/threshold/ack',
  },
  defaults: {
    soilMin: Number(process.env.DEFAULT_SOIL_MIN) || 40,
    tempMax: Number(process.env.DEFAULT_TEMP_MAX) || 35,
    humidityMin: Number(process.env.DEFAULT_HUMIDITY_MIN) || 30,
  },
};
