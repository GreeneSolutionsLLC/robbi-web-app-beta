import React from 'react';

const MessageList = ({ messages, isLoading }) => {
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageAvatar = (type) => {
    switch (type) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'error':
        return '⚠️';
      default:
        return '💬';
    }
  };

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.type}`}>
          <div className="message-avatar">
            {getMessageAvatar(message.type)}
          </div>
          <div className="message-content">
            <p className="message-text">{message.content}</p>
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="message assistant">
          <div className="message-avatar">🤖</div>
          <div className="loading-indicator">
            <span>Robbi is thinking</span>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageList;