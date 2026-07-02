import { useEffect, useState, useCallback } from 'react';
import {
  fetchStatus,
  fetchHistory,
  fetchAlerts,
  fetchThresholds,
  controlPump,
  controlFan,
  updateThresholds,
  getToken,
} from './api';
import { useSocket, useToasts } from './hooks/useSocket';
import HistoryChart from './components/HistoryChart';
import ToastContainer from './components/ToastContainer';
import LoginPage from './components/LoginPage';
import Chatbot from './components/Chatbot';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved && getToken() ? JSON.parse(saved) : null;
  });
  const [latest, setLatest] = useState(null);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState({ soilMin: 40, tempMax: 35, humidityMin: 30 });
  const [thresholdForm, setThresholdForm] = useState({ soilMin: 40, tempMax: 35, humidityMin: 30 });
  const [loading, setLoading] = useState(!!getToken());
  const [controlling, setControlling] = useState(false);

  const { connected: socketConnected, on } = useSocket();
  const { toasts, addToast, removeToast } = useToasts();

  const loadInitial = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [status, hist, alertList, thresh] = await Promise.all([
        fetchStatus(),
        fetchHistory(24, 200),
        fetchAlerts(30),
        fetchThresholds(),
      ]);
      setLatest(status.latest);
      setDeviceOnline(status.deviceOnline);
      setHistory(hist);
      setAlerts(alertList);
      setThresholds(thresh);
      setThresholdForm(thresh);
    } catch (err) {
      if (err.message.includes('đăng nhập') || err.message.includes('Token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadInitial();
  }, [user, loadInitial]);

  useEffect(() => {
    if (!user) return;
    const unsubSensor = on('sensor:update', (data) => {
      setLatest(data);
      setDeviceOnline(true);
    });
    const unsubAlert = on('alert:new', (alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
      addToast(alert);
    });
    const unsubHistory = on('history:new', (reading) => {
      setHistory((prev) => [...prev, reading].slice(-200));
    });
    const unsubStatus = on('device:status', (data) => {
      setDeviceOnline(data.online);
    });
    const unsubThreshold = on('threshold:ack', (data) => {
      setThresholds(data);
      setThresholdForm(data);
    });

    return () => {
      unsubSensor?.();
      unsubAlert?.();
      unsubHistory?.();
      unsubStatus?.();
      unsubThreshold?.();
    };
  }, [user, on, addToast]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handlePump = async (onState) => {
    setControlling(true);
    try {
      await controlPump(onState);
      setLatest((prev) => prev ? { ...prev, pumpOn: onState } : prev);
    } catch (err) {
      alert(err.message);
    } finally {
      setControlling(false);
    }
  };

  const handleFan = async (onState) => {
    setControlling(true);
    try {
      await controlFan(onState);
      setLatest((prev) => prev ? { ...prev, fanOn: onState } : prev);
    } catch (err) {
      alert(err.message);
    } finally {
      setControlling(false);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    try {
      const saved = await updateThresholds(thresholdForm);
      setThresholds(saved);
      alert('Đã gửi cấu hình ngưỡng xuống ESP32 qua MQTT');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (loading) {
    return <div className="app"><div className="empty">Đang tải hệ thống...</div></div>;
  }

  return (
    <div className="app">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <header className="header">
        <div>
          <h1>🌱 Hệ thống giám sát môi trường đất & chăm sóc cây thông minh</h1>
          <p>ESP32 + MQTT + Website + MongoDB Atlas | Sản phẩm thật</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`status-badge ${deviceOnline ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            ESP32: {deviceOnline ? 'Online' : 'Offline'}
          </span>
          <span className={`status-badge ${socketConnected ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            Realtime: {socketConnected ? 'OK' : '...'}
          </span>
          <span className="status-badge online">👤 {user.username}</span>
          <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      <div className="grid grid-3">
        <div className="card metric">
          <div className="metric-value soil">{latest?.soilMoisture ?? '--'}%</div>
          <div className="metric-label">Độ ẩm đất</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${latest?.soilMoisture ?? 0}%`, background: '#22c55e' }} />
          </div>
        </div>
        <div className="card metric">
          <div className="metric-value temp">{latest?.temperature ?? '--'}°C</div>
          <div className="metric-label">Nhiệt độ không khí</div>
        </div>
        <div className="card metric">
          <div className="metric-value humid">{latest?.humidity ?? '--'}%</div>
          <div className="metric-label">Độ ẩm không khí</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Điều khiển thiết bị (CN03)</h2>
          <div className="controls">
            <button
              className={`btn ${latest?.pumpOn ? 'btn-pump-off' : 'btn-pump-on'}`}
              onClick={() => handlePump(!latest?.pumpOn)}
              disabled={controlling}
            >
              💧 Bơm: {latest?.pumpOn ? 'TẮT' : 'BẬT'}
            </button>
            <button
              className={`btn ${latest?.fanOn ? 'btn-fan-off' : 'btn-fan-on'}`}
              onClick={() => handleFan(!latest?.fanOn)}
              disabled={controlling}
            >
              🌀 Quạt: {latest?.fanOn ? 'TẮT' : 'BẬT'}
            </button>
          </div>
          <div className="device-state">
            <span className={`device-chip ${latest?.pumpOn ? 'active' : ''}`}>Bơm: {latest?.pumpOn ? 'CHẠY' : 'TẮT'}</span>
            <span className={`device-chip ${latest?.fanOn ? 'active' : ''}`}>Quạt: {latest?.fanOn ? 'CHẠY' : 'TẮT'}</span>
          </div>
        </div>

        <div className="card">
          <h2>Cấu hình ngưỡng (CN08)</h2>
          <form onSubmit={handleSaveThresholds}>
            <div className="form-group">
              <label>Độ ẩm đất tối thiểu (%)</label>
              <input type="number" min="10" max="90" value={thresholdForm.soilMin}
                onChange={(e) => setThresholdForm({ ...thresholdForm, soilMin: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Nhiệt độ tối đa (°C)</label>
              <input type="number" min="20" max="50" value={thresholdForm.tempMax}
                onChange={(e) => setThresholdForm({ ...thresholdForm, tempMax: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Độ ẩm KK tối thiểu (%)</label>
              <input type="number" min="10" max="90" value={thresholdForm.humidityMin}
                onChange={(e) => setThresholdForm({ ...thresholdForm, humidityMin: Number(e.target.value) })} />
            </div>
            <button type="submit" className="btn-save">Lưu & gửi xuống ESP32</button>
          </form>
        </div>
      </div>

      <h2 className="section-title">Biểu đồ lịch sử Cloud (CN05 + CN06)</h2>
      <div className="card"><HistoryChart data={history} /></div>

      <h2 className="section-title">Cảnh báo (CN07)</h2>
      <div className="card">
        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="empty">Chưa có cảnh báo</div>
          ) : (
            alerts.map((a) => (
              <div key={a.id || a._id} className={`alert-item ${a.level}`}>
                <strong>{a.type}</strong> — {a.message}
                <time>{new Date(a.createdAt).toLocaleString('vi-VN')}</time>
              </div>
            ))
          )}
        </div>
      </div>

      <h2 className="section-title">Chatbot hệ thống (YCNC #8)</h2>
      <div className="card"><Chatbot /></div>
    </div>
  );
}
