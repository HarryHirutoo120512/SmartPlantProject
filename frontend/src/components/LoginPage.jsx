import { useState } from 'react';
import { login, register } from '../api';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await login(username, password)
        : await register(username, email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🌱 Smart Plant Monitor</h1>
        <p className="auth-sub">Hệ thống giám sát & chăm sóc cây thông minh</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên đăng nhập</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>Chưa có tài khoản? <button type="button" onClick={() => setMode('register')}>Đăng ký</button></>
          ) : (
            <>Đã có tài khoản? <button type="button" onClick={() => setMode('login')}>Đăng nhập</button></>
          )}
        </p>
      </div>
    </div>
  );
}
