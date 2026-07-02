const nodemailer = require('nodemailer');
const https = require('https');

let mailTransporter = null;

function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return mailTransporter;
}

async function sendEmailAlert(alert) {
  const transporter = getMailTransporter();
  const to = process.env.ALERT_EMAIL_TO;
  if (!transporter || !to) {
    console.log('[Email] Chưa cấu hình SMTP, bỏ qua gửi email');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Smart Plant Monitor" <${process.env.SMTP_USER}>`,
      to,
      subject: `[CẢNH BÁO ${alert.level.toUpperCase()}] Hệ thống chăm sóc cây`,
      html: `
        <h2>Cảnh báo từ hệ thống giám sát cây trồng</h2>
        <p><strong>Loại:</strong> ${alert.type}</p>
        <p><strong>Mức độ:</strong> ${alert.level}</p>
        <p><strong>Nội dung:</strong> ${alert.message}</p>
        <hr>
        <p>Độ ẩm đất: ${alert.soilMoisture ?? 'N/A'}%</p>
        <p>Nhiệt độ: ${alert.temperature ?? 'N/A'}°C</p>
        <p>Độ ẩm không khí: ${alert.humidity ?? 'N/A'}%</p>
        <p><em>Thời gian: ${new Date().toLocaleString('vi-VN')}</em></p>
      `,
    });
    return true;
  } catch (err) {
    console.error('[Email] Lỗi gửi email:', err.message);
    return false;
  }
}

function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[Telegram] Chưa cấu hình bot, bỏ qua push notification');
    return Promise.resolve(false);
  }

  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', (err) => {
      console.error('[Telegram] Lỗi:', err.message);
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

async function sendTelegramAlert(alert) {
  const text = [
    '🚨 <b>Cảnh báo Smart Plant</b>',
    `📌 <b>${alert.type}</b> (${alert.level})`,
    alert.message,
    '',
    `🌱 Độ ẩm đất: ${alert.soilMoisture ?? 'N/A'}%`,
    `🌡 Nhiệt độ: ${alert.temperature ?? 'N/A'}°C`,
    `💧 Độ ẩm KK: ${alert.humidity ?? 'N/A'}%`,
  ].join('\n');
  return sendTelegramMessage(text);
}

async function notifyAlert(alertDoc) {
  const [emailSent, telegramSent] = await Promise.all([
    sendEmailAlert(alertDoc),
    sendTelegramAlert(alertDoc),
  ]);

  alertDoc.notifiedEmail = emailSent;
  alertDoc.notifiedTelegram = telegramSent;
  await alertDoc.save();

  return { emailSent, telegramSent };
}

module.exports = { sendEmailAlert, sendTelegramAlert, sendTelegramMessage, notifyAlert };
