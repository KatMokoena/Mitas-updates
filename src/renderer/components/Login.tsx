import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import './Login.css';

interface LoginProps {
  onLogin: (sessionId: string, user: { id: string; name: string; surname: string; email: string; role: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = `${API_BASE_URL || ''}/api/auth/login`;
      console.log('Login request to:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.sessionId, data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Light Watermarks - Mitas Corp Pic */}
      <div className="watermark-container">
        <div className="watermark watermark-1">
          <img src="/Mitas Corp Pic.png" alt="Mitas" className="watermark-image" />
        </div>
        <div className="watermark watermark-2">
          <img src="/Mitas Corp Pic.png" alt="Mitas" className="watermark-image" />
        </div>
        <div className="watermark watermark-3">
          <img src="/Mitas Corp Pic.png" alt="Mitas" className="watermark-image" />
        </div>
        <div className="watermark watermark-4">
          <img src="/Mitas Corp Pic.png" alt="Mitas" className="watermark-image" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="login-content-wrapper">
        {/* Left Section - Dark Teal Background with Large MITAS Logo */}
        <div className="login-left-section">
          <img src="/Mitas Corp Pic.png" alt="Mitas Corporation" className="left-mitas-logo" />
        </div>

        {/* Center - Login Form */}
        <div className="login-form-section">
          <div className="login-box">
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to access your dashboard</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="sign-in-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="login-footer">
              <p>Mitas - Internal Project Management Platform</p>
              <p>Industry Experts in Traceability Solutions</p>
            </div>
          </div>
        </div>

        {/* Right Section - Dark Panel with MITAS Branding */}
        <div className="login-right-section">
          <div className="mitas-branding">
            <div className="branding-logo-box">
              <div className="branding-m-logo">M</div>
              <p className="branding-company-main">MITAS</p>
              <p className="branding-company-sub">CORPORATION</p>
            </div>
            <div className="branding-main-text">
              <h1 className="branding-title">MITAS</h1>
              <p className="branding-subtitle">CORPORATION</p>
              <div className="branding-divider"></div>
            </div>
            <div className="branding-platform-box">
              <div className="branding-platform-content">
                <p className="branding-platform">INTERNAL PROJECT MANAGEMENT PLATFORM</p>
                <p className="branding-platform-sub">Track & Trace Solutions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

