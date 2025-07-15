import React, { useState, useEffect, useRef } from 'react';
import './CompactChat.css';
import apiService from './services/api-production';
import BrowserPanel from './components/BrowserPanel/BrowserPanel-vercel';
import voiceService from './services/voiceService';
import VoiceSettings from './components/VoiceSettings/VoiceSettings';

function CompactChat() {
  // Use the singleton API service
  
  // State management
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [apiStatus, setApiStatus] = useState({ status: 'connecting', message: 'Connecting to NinjaTech API...' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize API service and voice recognition
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setApiStatus({ status: 'connecting', message: 'Connecting to NinjaTech API...' });
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        setApiStatus({ status: 'connected', message: 'Online' });
      } catch (error) {
        setApiStatus({ status: 'disconnected', message: 'Failed to connect to NinjaTech API' });
      }
    };
    
    // Initialize speech recognition
    const initSpeechRecognition = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsRecording(true);
        };
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsRecording(false);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          
          // Show user-friendly error message
          const errorMessage = {
            id: Date.now(),
            text: `Voice input error: ${event.error}. Please try again or check microphone permissions.`,
            sender: 'system',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
        
        setSpeechRecognition(recognition);
        setIsVoiceSupported(true);
      } else {
        setIsVoiceSupported(false);
        console.warn('Speech recognition not supported in this browser');
      }
    };
    
    checkConnection();
    initSpeechRecognition();
  }, []);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const newUserMessage = {
      id: `user_${Date.now()}_${Math.random()}`,
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const result = await apiService.sendMessage(userMessage);
      
      if (result.success) {
        const assistantMessage = {
          id: `assistant_${Date.now()}_${Math.random()}`,
          text: result.response,
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        // Speak the response if voice is enabled
        if (voiceEnabled && result.response) {
          setIsSpeaking(true);
          try {
            await voiceService.speakResponse(result.response);
          } catch (error) {
            console.error('Voice playback error:', error);
          } finally {
            setIsSpeaking(false);
          }
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: `error_${Date.now()}_${Math.random()}`,
        text: "I'm having trouble connecting right now. Please try again later.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = async (action) => {
    const actionMessages = {
      'Deep Research': 'I want to perform deep research on a topic',
      'Fast Search': 'I need to do a fast search for information',
      'Write/Code': 'I need help with writing or coding',
      'Image Generation': 'I want to generate or work with images',
      'Think': 'I need help thinking through a complex problem'
    };
    
    const message = actionMessages[action] || action;
    
    // Add user message
    const newUserMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const result = await apiService.sendMessage(message);
      
      if (result.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          text: result.response,
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please try again later.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      const fileObj = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      };
      
      setUploadedFiles(prev => [...prev, fileObj]);
    });
    
    // Clear the input
    event.target.value = '';
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const newChat = () => {
    setMessages([]);
    setUploadedFiles([]);
  };

  const launchBrowser = () => {
    setShowBrowser(true);
    const browserMessage = {
      id: Date.now(),
      text: "🌐 Browser panel opened! You can now use Playwright automation features.",
      sender: 'system',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, browserMessage]);
  };

  const closeBrowser = () => {
    setShowBrowser(false);
  };

  const activateOperator = () => {
    const operatorMessage = {
      id: Date.now(),
      text: "Operator mode is currently under development. This feature will allow direct human operator assistance for complex tasks.",
      sender: 'system',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, operatorMessage]);
  };

  const handleVoiceInput = () => {
    if (!isVoiceSupported) {
      const errorMessage = {
        id: Date.now(),
        text: "Voice input is not supported in this browser. Please use Chrome, Edge, or Safari for voice functionality.",
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    if (isRecording) {
      // Stop recording
      if (speechRecognition) {
        speechRecognition.stop();
      }
    } else {
      // Start recording
      if (speechRecognition) {
        try {
          speechRecognition.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          const errorMessage = {
            id: Date.now(),
            text: "Could not start voice input. Please check microphone permissions and try again.",
            sender: 'system',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    }
  };

  const toggleVoice = () => {
    const newVoiceState = voiceService.toggle();
    setVoiceEnabled(newVoiceState);
    
    if (!newVoiceState) {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    voiceService.stopCurrentAudio();
    setIsSpeaking(false);
  };

  return (
    <div className="app">
      {/* Browser Panel Modal */}
      {showBrowser && (
        <div className="browser-modal">
          <div className="browser-modal-header">
            <h3>🎭 Playwright Browser Automation</h3>
            <button className="close-browser-btn" onClick={closeBrowser}>✕</button>
          </div>
          <div className="browser-modal-content">
            <BrowserPanel apiService={apiService} />
          </div>
        </div>
      )}
      {/* Sidebar */}
      <div className={`sidebar ${sidebarHidden ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">R</div>
            <span className="logo-text">Chat history</span>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" onClick={newChat} title="New Chat">📝</button>
            <button className="icon-btn" onClick={() => setSidebarHidden(true)} title="Close">✕</button>
          </div>
        </div>
        <div className="chat-history-list">
          <div className="chat-history-item active">
            <div className="preview">Current conversation</div>
            <div className="timestamp">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="chat-history-item">
            <div className="preview">Browser automation demo</div>
            <div className="timestamp">Today, 12:45 PM</div>
          </div>
          <div className="chat-history-item">
            <div className="preview">Deep research query</div>
            <div className="timestamp">Yesterday, 3:30 PM</div>
          </div>
          <div className="chat-history-item">
            <div className="preview">Code review assistance</div>
            <div className="timestamp">Yesterday, 2:15 PM</div>
          </div>
          <div className="chat-history-item">
            <div className="preview">Image generation project</div>
            <div className="timestamp">Dec 6, 4:30 PM</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="mode-selector">
            {sidebarHidden && (
              <button
                className="sidebar-toggle-btn"
                onClick={() => setSidebarHidden(false)}
                title="Show Chat History (Ctrl+H)"
              >
                📋 Chat History
              </button>
            )}
            {!sidebarHidden && (
              <button className="icon-btn">▼</button>
            )}
          </div>
          <div className="top-actions">
            {!sidebarHidden && (
              <button className="icon-btn" onClick={() => setSidebarHidden(false)} title="Chat History">📋</button>
            )}
            <div className="voice-controls">
              <button
                onClick={() => setShowVoiceSettings(true)}
                className="icon-btn voice-settings-button"
                title="Voice settings"
              >
                ⚙️
              </button>
              <button
                onClick={toggleVoice}
                className={`icon-btn voice-toggle ${voiceEnabled ? 'enabled' : 'disabled'}`}
                title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
              >
                {voiceEnabled ? '🔊' : '🔇'}
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="icon-btn stop-speaking"
                  title="Stop speaking"
                >
                  ⏹️
                </button>
              )}
              {isSpeaking && <span className="speaking-indicator">🎤 Speaking...</span>}
            </div>
            <button className="icon-btn">➕</button>
          </div>
        </div>

        {/* Chat Area */}
        <div className={`chat-area ${messages.length > 0 ? 'expanded' : ''}`}>
          {messages.length === 0 && (
            <div className={`api-status ${apiStatus.status}`}>
              <div className="status-dot"></div>
              <span>{apiStatus.message}</span>
            </div>
          )}

          {messages.length === 0 && (
            <div className="welcome-section">
              <h2 className="welcome-title">I'm Robbi! Your Smart AI Agent</h2>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => handleQuickAction('Deep Research')}>
                  <span>🔍</span>
                  <span>Deep Research</span>
                </button>
                <button className="action-btn" onClick={() => handleQuickAction('Fast Search')}>
                  <span>⚡</span>
                  <span>Fast Search</span>
                </button>
                <button className="action-btn" onClick={() => handleQuickAction('Write/Code')}>
                  <span>💻</span>
                  <span>Write/Code</span>
                </button>
                <button className="action-btn" onClick={() => handleQuickAction('Image Generation')}>
                  <span>🖼️</span>
                  <span>Image</span>
                </button>
                <button className="action-btn" onClick={() => handleQuickAction('Think')}>
                  <span>🧠</span>
                  <span>Think</span>
                </button>
              </div>
              <div className="action-buttons secondary-buttons">
                <button className="action-btn browser" onClick={launchBrowser}>
                  <span>🌐</span>
                  <span>Browser</span>
                </button>
                <button className="action-btn operator" onClick={activateOperator}>
                  <span>👨‍💻</span>
                  <span>Operator</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className={`chat-section ${messages.length > 0 ? 'expanded' : ''}`}>
          {messages.length > 0 && (
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  {message.sender === 'assistant' ? (
                    <div className="message-avatar robbi-avatar">
                      ⚛
                    </div>
                  ) : (
                    <div className="message-avatar">
                      {message.sender === 'user' ? 'U' : '⚙'}
                    </div>
                  )}
                  <div className="message-content">{message.text}</div>
                </div>
              ))}
              
              {isLoading && (
                <div className="typing-indicator" style={{ display: 'flex' }}>
                  <span>Robbi is thinking</span>
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="input-area">
            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="uploaded-file">
                    <span>📄 {file.name} ({formatFileSize(file.size)})</span>
                    <button className="remove-file" onClick={() => removeFile(file.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-container">
              <div className="input-controls">
                <button className="file-upload-btn" onClick={() => document.getElementById('file-upload-input').click()} title="Upload files">
                  📎
                </button>
                <button
                  className={`voice-btn ${isRecording ? 'recording' : ''} ${!isVoiceSupported ? 'disabled' : ''}`}
                  onClick={handleVoiceInput}
                  title={isVoiceSupported ? (isRecording ? "Stop recording" : "Start voice input") : "Voice input not supported"}
                  disabled={!isVoiceSupported}
                >
                  {isRecording ? '🔴' : '🎤'}
                </button>
              </div>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything ..."
                className="message-input"
                rows="1"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="send-btn"
              >
                ➤
              </button>
            </div>
            
            {/* Compact Action Buttons - Always show under input */}
            <div className="compact-actions">
              <button className="compact-action-btn" onClick={() => handleQuickAction('Deep Research')} title="Deep Research">
                🔍
              </button>
              <button className="compact-action-btn" onClick={() => handleQuickAction('Fast Search')} title="Fast Search">
                ⚡
              </button>
              <button className="compact-action-btn" onClick={() => handleQuickAction('Write/Code')} title="Write/Code">
                💻
              </button>
              <button className="compact-action-btn" onClick={() => handleQuickAction('Image Generation')} title="Image Generation">
                🖼️
              </button>
              <button className="compact-action-btn" onClick={() => handleQuickAction('Think')} title="Think">
                🧠
              </button>
              <button className="compact-action-btn" onClick={launchBrowser} title="Browser Automation">
                🌐
              </button>
              <button className="compact-action-btn" onClick={activateOperator} title="Operator Mode">
                👨‍💻
              </button>
            </div>
            
            <div className="disclaimer">
              Robbi can make mistakes. Please double check responses.
            </div>
            <input
              type="file"
              id="file-upload-input"
              className="file-upload-input"
              multiple
              accept="*/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />
    </div>
  );
}

export default CompactChat;