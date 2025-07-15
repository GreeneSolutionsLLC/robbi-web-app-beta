import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import MessageList from './MessageList';
import FileUploadZone from './FileUploadZone';
import robbiIcon from '../../assets/robbiicon2.png';
import voiceService from '../../services/voiceService';
import VoiceSettings from '../VoiceSettings/VoiceSettings';

const ChatInterface = ({ apiService }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m Robbi, your Greene Solutions AI assistant powered by NinjaTech AI. I\'m here to help you with automation, productivity, business solutions, and any questions you might have. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (apiService) {
      setIsConnected(apiService.isConnected());

      // Listen for API responses
      apiService.on('message', async (data) => {
        const newMessage = {
          id: Date.now(),
          type: 'assistant',
          content: data.message || data.response || 'I received your message.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
        setIsLoading(false);

        // Speak the response if voice is enabled
        if (voiceEnabled && newMessage.content) {
          setIsSpeaking(true);
          try {
            await voiceService.speakResponse(newMessage.content);
          } catch (error) {
            console.error('Voice playback error:', error);
          } finally {
            setIsSpeaking(false);
          }
        }
      });

      apiService.on('connected', () => {
        setIsConnected(true);
      });

      apiService.on('disconnected', () => {
        setIsConnected(false);
      });

      apiService.on('api_error', (error) => {
        const errorMessage = {
          id: Date.now(),
          type: 'error',
          content: `Error: ${error.message || 'Something went wrong'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      });
    }

    return () => {
      if (apiService) {
        apiService.removeAllListeners('message');
        apiService.removeAllListeners('connected');
        apiService.removeAllListeners('disconnected');
        apiService.removeAllListeners('api_error');
      }
    };
  }, [apiService]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    if (apiService) {
      try {
        const result = await apiService.sendMessage(inputMessage);
        if (!result.success) {
          const errorMessage = {
            id: Date.now() + 1,
            type: 'error',
            content: `Error: ${result.error}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
        }
      } catch (error) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: `Error: ${error.message}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }
    } else {
      // Demo mode response
      setTimeout(() => {
        const demoResponse = {
          id: Date.now() + 1,
          type: 'assistant',
          content: 'This is a demo response from Robbi. In the full version, I would connect to the API to provide intelligent responses and automation capabilities.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, demoResponse]);
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const handleFileUpload = async (files) => {
    if (!apiService) {
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        content: 'File upload is only available when connected to the API service.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    for (const file of files) {
      const fileMessage = {
        id: Date.now(),
        type: 'user',
        content: `📎 Uploaded file: ${file.name}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fileMessage]);

      setIsLoading(true);
      try {
        const result = await apiService.analyzeFile({
          buffer: file,
          name: file.name,
          type: file.type
        });

        if (result.success) {
          const analysisMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: `File analysis complete for ${file.name}:\n\n${result.analysis || 'Analysis completed successfully.'}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, analysisMessage]);
        } else {
          const errorMessage = {
            id: Date.now() + 1,
            type: 'error',
            content: `File analysis failed: ${result.error}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: `File upload error: ${error.message}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-title">
          <img src={robbiIcon} alt="Robbi" className="chat-icon" style={{width: '1.5rem', height: '1.5rem', borderRadius: '50%', objectFit: 'cover'}} />
          <h2>Robbi - Smart AI Assistant</h2>
        </div>
        <div className="header-controls">
          <div className="voice-controls">
            <button
              onClick={() => setShowVoiceSettings(true)}
              className="voice-settings-button"
              title="Voice settings"
            >
              ⚙️
            </button>
            <button
              onClick={toggleVoice}
              className={`voice-toggle ${voiceEnabled ? 'enabled' : 'disabled'}`}
              title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="stop-speaking"
                title="Stop speaking"
              >
                ⏹️
              </button>
            )}
            {isSpeaking && <span className="speaking-indicator">🎤 Speaking...</span>}
          </div>
          <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="indicator-dot"></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        <MessageList messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>

      <FileUploadZone onFileUpload={handleFileUpload} />

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Robbi anything... (Press Enter to send, Shift+Enter for new line)"
            className="chat-input"
            rows="1"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '🚀'}
          </button>
        </div>
      </div>

      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />
    </div>
  );
};

export default ChatInterface;