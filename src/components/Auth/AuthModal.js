import React, { useState } from 'react';
import './AuthModal.css';
import robbiIcon from '../../assets/robbiicon2.png';

const AuthModal = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAutoLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await onLogin({
        username: 'robbi-user',
        password: 'auto-auth'
      });
      
      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-header">
          <div className="auth-logo">
            <img src={robbiIcon} alt="Robbi" className="logo-icon" style={{width: '3rem', height: '3rem', borderRadius: '50%', objectFit: 'cover'}} />
            <h1>Robbi</h1>
          </div>
          <p className="auth-subtitle">Smart AI Assistant</p>
        </div>

        <div className="auth-content">
          <div className="welcome-message">
            <h2>Welcome to Greene Solutions</h2>
            <p>Your intelligent AI assistant powered by NinjaTech AI for automation, productivity, and smart business solutions.</p>
          </div>

          <div className="auth-features">
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Intelligent Chat Interface</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📁</span>
              <span>File Analysis & Management</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>Smart Automation Tools</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🌐</span>
              <span>Web Integration</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            className="login-button"
            onClick={handleAutoLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Connecting to NinjaTech AI...
              </>
            ) : (
              <>
                <span className="button-icon">🚀</span>
                Launch Greene Solutions AI
              </>
            )}
          </button>

          <div className="auth-footer">
            <p>Powered by NinjaTech AI & Greene Solutions</p>
            <p className="version-info">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;