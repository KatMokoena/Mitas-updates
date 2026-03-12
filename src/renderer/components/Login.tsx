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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loginData, setLoginData] = useState<{ sessionId: string; user: any } | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

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
        // Check if user needs to change password
        if (data.needsPasswordChange) {
          // Store login data and show password change modal
          setLoginData({ sessionId: data.sessionId, user: data.user });
          setShowPasswordChange(true);
          setTempPassword(password); // Store the temporary password they just entered
        } else {
          // Normal login - proceed directly
          onLogin(data.sessionId, data.user);
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setForgotPasswordLoading(true);

    try {
      const apiUrl = `${API_BASE_URL || ''}/api/auth/forgot-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage('If an account exists with this email, a password reset email has been sent. Please check your inbox.');
        setForgotPasswordEmail('');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordMessage('');
        }, 3000);
      } else {
        setForgotPasswordMessage(data.error || 'Failed to send password reset email');
      }
    } catch (err) {
      setForgotPasswordMessage('Failed to connect to server');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters long');
      return;
    }

    setPasswordChangeLoading(true);

    try {
      const apiUrl = `${API_BASE_URL || ''}/api/auth/change-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          temporaryPassword: tempPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Password changed successfully - complete login
        if (loginData) {
          onLogin(data.sessionId, data.user);
        }
        setShowPasswordChange(false);
        setTempPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordChangeError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordChangeError('Failed to connect to server');
    } finally {
      setPasswordChangeLoading(false);
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
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f97316',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px',
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0 }}>Forgot Password</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Enter your email address and we'll send you a temporary password to log in.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter your email"
                />
              </div>
              {forgotPasswordMessage && (
                <div
                  className={forgotPasswordMessage.includes('sent') ? 'success-message' : 'error-message'}
                  style={{
                    marginBottom: '15px',
                    padding: '10px',
                    borderRadius: '5px',
                    backgroundColor: forgotPasswordMessage.includes('sent') ? '#d4edda' : '#f8d7da',
                    color: forgotPasswordMessage.includes('sent') ? '#155724' : '#721c24',
                  }}
                >
                  {forgotPasswordMessage}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordMessage('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sign-in-button"
                  disabled={forgotPasswordLoading}
                  style={{ margin: 0 }}
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send Password Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0 }}>Change Password</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              You are using a temporary password. Please enter it again and set a new password.
            </p>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Enter Temporary Password</label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter your temporary password"
                />
              </div>
              <div className="form-group">
                <label>Enter New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                  minLength={6}
                />
              </div>
              {passwordChangeError && (
                <div
                  className="error-message"
                  style={{
                    marginBottom: '15px',
                    padding: '10px',
                    borderRadius: '5px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                  }}
                >
                  {passwordChangeError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="sign-in-button"
                  disabled={passwordChangeLoading}
                  style={{ margin: 0 }}
                >
                  {passwordChangeLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

