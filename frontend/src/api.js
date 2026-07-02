const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi kết nối server');
  return data;
}

export async function login(username, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username, email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function fetchStatus() {
  return apiFetch('/status');
}

export async function fetchHistory(hours = 24, limit = 200) {
  return apiFetch(`/history?hours=${hours}&limit=${limit}`);
}

export async function fetchAlerts(limit = 30) {
  return apiFetch(`/alerts?limit=${limit}`);
}

export async function controlPump(on) {
  return apiFetch('/control/pump', {
    method: 'POST',
    body: JSON.stringify({ on }),
  });
}

export async function controlFan(on) {
  return apiFetch('/control/fan', {
    method: 'POST',
    body: JSON.stringify({ on }),
  });
}

export async function fetchThresholds() {
  return apiFetch('/thresholds');
}

export async function updateThresholds(data) {
  return apiFetch('/thresholds', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function sendChatMessage(message) {
  return apiFetch('/chatbot/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export { API_BASE, SOCKET_URL, getToken };
