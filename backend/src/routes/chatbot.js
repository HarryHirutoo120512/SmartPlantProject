const mqttClient = require('../mqtt/client');
const { Alert } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = require('express').Router();

router.use(authMiddleware);

router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Tin nhắn trống' });
    }

    const text = message.toLowerCase().trim();
    const state = mqttClient.getState();
    const latest = state.latest;
    let reply = '';

    if (/xin chào|hello|hi/.test(text)) {
      reply = 'Xin chào! Tôi là trợ lý Smart Plant. Hỏi tôi về độ ẩm đất, nhiệt độ, bơm, quạt, cảnh báo...';
    } else if (/độ ẩm đất|do am dat|đất/.test(text)) {
      reply = latest
        ? `Độ ẩm đất hiện tại: ${latest.soilMoisture}% (ngưỡng tối thiểu: ${state.thresholds.soilMin}%)`
        : 'Chưa nhận dữ liệu từ ESP32. Kiểm tra kết nối WiFi/MQTT.';
    } else if (/nhiệt độ|nhiet do|temp/.test(text)) {
      reply = latest
        ? `Nhiệt độ không khí: ${latest.temperature}°C (ngưỡng tối đa: ${state.thresholds.tempMax}°C)`
        : 'Chưa có dữ liệu nhiệt độ.';
    } else if (/độ ẩm không khí|do am kk|không khí/.test(text)) {
      reply = latest
        ? `Độ ẩm không khí: ${latest.humidity}%`
        : 'Chưa có dữ liệu độ ẩm không khí.';
    } else if (/bật bơm|bat bom|mo bom/.test(text)) {
      mqttClient.controlPump(true);
      reply = 'Đã gửi lệnh BẬT máy bơm qua MQTT → ESP32.';
    } else if (/tắt bơm|tat bom/.test(text)) {
      mqttClient.controlPump(false);
      reply = 'Đã gửi lệnh TẮT máy bơm.';
    } else if (/bật quạt|bat quat/.test(text)) {
      mqttClient.controlFan(true);
      reply = 'Đã gửi lệnh BẬT quạt tản nhiệt.';
    } else if (/tắt quạt|tat quat/.test(text)) {
      mqttClient.controlFan(false);
      reply = 'Đã gửi lệnh TẮT quạt.';
    } else if (/trạng thái|status|he thong/.test(text)) {
      reply = latest
        ? `ESP32: ${state.deviceOnline ? 'Online' : 'Offline'} | Đất: ${latest.soilMoisture}% | Nhiệt: ${latest.temperature}°C | Bơm: ${latest.pumpOn ? 'BẬT' : 'TẮT'} | Quạt: ${latest.fanOn ? 'BẬT' : 'TẮT'}`
        : `ESP32: ${state.deviceOnline ? 'Online' : 'Offline'} — chưa có dữ liệu cảm biến.`;
    } else if (/cảnh báo|canh bao|alert/.test(text)) {
      const alerts = await Alert.find().sort({ createdAt: -1 }).limit(3).lean();
      if (alerts.length === 0) {
        reply = 'Không có cảnh báo gần đây.';
      } else {
        reply = 'Cảnh báo gần nhất:\n' + alerts.map((a) =>
          `• [${a.level}] ${a.message}`
        ).join('\n');
      }
    } else if (/ngưỡng|nguong|threshold/.test(text)) {
      reply = `Ngưỡng hiện tại — Đất tối thiểu: ${state.thresholds.soilMin}% | Nhiệt tối đa: ${state.thresholds.tempMax}°C | Độ ẩm KK tối thiểu: ${state.thresholds.humidityMin}%`;
    } else if (/giúp|help|huong dan/.test(text)) {
      reply = [
        'Các lệnh hỗ trợ:',
        '• "độ ẩm đất" — xem độ ẩm đất',
        '• "nhiệt độ" — xem nhiệt độ',
        '• "bật bơm" / "tắt bơm" — điều khiển bơm',
        '• "bật quạt" / "tắt quạt" — điều khiển quạt',
        '• "trạng thái" — tổng quan hệ thống',
        '• "cảnh báo" — cảnh báo gần đây',
        '• "ngưỡng" — xem ngưỡng tự động',
      ].join('\n');
    } else {
      reply = 'Tôi chưa hiểu câu hỏi. Gõ "giúp" để xem danh sách lệnh.';
    }

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
