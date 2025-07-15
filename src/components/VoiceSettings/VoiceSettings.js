import React, { useState, useEffect } from 'react';
import './VoiceSettings.css';
import voiceService from '../../services/voiceService';

const VoiceSettings = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Load saved API key from localStorage
    const savedKey = localStorage.getItem('hume_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      voiceService.setApiKey(savedKey);
      setIsValid(true);
    }

    // Voice is always Ito - no need to save preference
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('hume_api_key', apiKey.trim());
      voiceService.setApiKey(apiKey.trim());
      setIsValid(true);
      console.log('✅ Hume API key saved');
    }
  };

  const handleTestVoice = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'API key is already configured' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test with a simple message using Ito voice
      const result = await voiceService.speakResponse("Hello! This is a test of Robbi's voice using the Ito voice from Hume AI.");
      
      if (result.success) {
        setTestResult({ success: true, message: 'Voice test successful with Ito voice! 🎉' });
      } else {
        setTestResult({ success: false, message: `Voice test failed: ${result.error}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: `Test error: ${error.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setIsValid(false);
    localStorage.removeItem('hume_api_key');
    voiceService.setApiKey('');
    setTestResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="voice-settings-overlay">
      <div className="voice-settings-modal">
        <div className="voice-settings-header">
          <h3>🎤 Voice Settings</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="voice-settings-content">
          <div className="setting-section">
            <label htmlFor="hume-api-key">Hume.ai API Key</label>
            <div className="api-key-input-group">
              <input
                id="hume-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Hume.ai API key..."
                className="api-key-input"
              />
              <button 
                onClick={handleSaveApiKey}
                className="save-button"
                disabled={!apiKey.trim()}
              >
                Save
              </button>
            </div>
            {isValid && (
              <div className="api-key-status valid">
                ✅ API key configured
              </div>
            )}
          </div>

          <div className="setting-section">
            <h4>Voice Configuration</h4>
            <p>Robbi uses the Ito voice from Hume.ai for natural speech responses.</p>
            <div className="voice-info">
              <div className="voice-display">
                <span className="voice-name">🎤 Ito Voice</span>
                <span className="voice-description">Natural, expressive AI voice</span>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h4>Test Voice</h4>
            <p>Test Robbi's Ito voice to make sure everything is working correctly.</p>
            <div className="test-controls">
              <button
                onClick={handleTestVoice}
                disabled={isTesting}
                className="test-button"
              >
                {isTesting ? '🔄 Testing...' : '🎵 Test Ito Voice'}
              </button>
              
              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          <div className="setting-section">
            <h4>Voice Features</h4>
            <ul className="feature-list">
              <li>🎯 Hume.ai integration for natural voice synthesis</li>
              <li>🔄 Automatic fallback to browser speech synthesis</li>
              <li>⏸️ Stop speaking at any time</li>
              <li>🎛️ Toggle voice responses on/off</li>
            </ul>
          </div>

          <div className="setting-section">
            <h4>Getting Your Hume.ai API Key</h4>
            <ol className="instructions-list">
              <li>Visit <a href="https://hume.ai" target="_blank" rel="noopener noreferrer">hume.ai</a></li>
              <li>Sign up or log in to your account</li>
              <li>Navigate to your API dashboard</li>
              <li>Generate a new API key</li>
              <li>Copy and paste it above</li>
            </ol>
          </div>
        </div>

        <div className="voice-settings-footer">
          <button onClick={handleClearApiKey} className="clear-button">
            Clear API Key
          </button>
          <button onClick={onClose} className="done-button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;