import React, { useState, useEffect } from 'react';
import './App.css';
import apiService from './services/api-production';
import voiceService from './services/voiceService';
import VoiceSettings from './components/VoiceSettings/VoiceSettings';
import robbiFace from './assets/robbi-face.png';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  useEffect(() => {
    // Listen for connection events
    apiService.on('connected', () => {
      setIsConnected(true);
      console.log('✅ Connected');
    });

    apiService.on('disconnected', () => {
      setIsConnected(false);
      console.log('❌ Disconnected');
    });

    // Add welcome message
    setMessages([{
      id: 1,
      text: "Hello! I'm Robbi, your AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }]);

    return () => {
      apiService.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    // Initialize voice service
    if (isVoiceEnabled) {
      voiceService.enable();
    } else {
      voiceService.disable();
    }
  }, [isVoiceEnabled]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.sendMessage(inputMessage);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.response || "I'm sorry, I couldn't process your message right now.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        source: response.source || 'unknown'
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Speak the response if voice is enabled
      if (isVoiceEnabled && botMessage.text) {
        voiceService.speakResponse(botMessage.text);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm experiencing some technical difficulties. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        source: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="chat-container">
          <div className="chat-header">
            <div className="header-left">
              <img src={robbiFace} alt="Robbi" className="robbi-avatar" />
              <div className="header-text">
                <h1>Robbi - Smart AI Assistant</h1>
                <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
                </span>
              </div>
            </div>
            <div className="header-controls">
              <button
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`voice-toggle ${isVoiceEnabled ? 'enabled' : 'disabled'}`}
                title={isVoiceEnabled ? 'Disable voice' : 'Enable voice'}
              >
                {isVoiceEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={() => setShowVoiceSettings(true)}
                className="voice-settings-btn"
                title="Voice settings"
              >
                ⚙️
              </button>
            </div>
          </div>
          
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="timestamp">
                    {message.timestamp}
                    {message.source && message.source !== 'unknown' && (
                      <span className="source"> • {message.source}</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <p>🤔 Thinking...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              rows="3"
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !inputMessage.trim()}
              className="send-button"
            >
              {isLoading ? '⏳' : '📤'} Send
            </button>
          </div>
        </div>
      </header>
      
      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />
    </div>
  );
}

export default App;