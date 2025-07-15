import React, { useState, useRef, useEffect } from 'react';
import './BrowserPanel.css';
import BrowserAutomationService from '../../services/browserAutomation';
import cdpService from '../../services/cdpService';

const BrowserPanel = ({ apiService }) => {
  const [url, setUrl] = useState('https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState(['https://www.google.com']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiCommand, setAiCommand] = useState('');
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [automationLog, setAutomationLog] = useState([]);
  const [browserAutomation, setBrowserAutomation] = useState(null);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [currentAutomationStep, setCurrentAutomationStep] = useState('');
  const [browserScreenshot, setBrowserScreenshot] = useState(null);
  const [browserTitle, setBrowserTitle] = useState('');
  
  // Environment detection
  const [isProduction, setIsProduction] = useState(false);
  const [environment, setEnvironment] = useState('local');
  
  // Chrome DevTools Protocol states
  const [chromeDebugStatus, setChromeDebugStatus] = useState('checking');
  const [showChromeSetup, setShowChromeSetup] = useState(false);
  const [isConnectingToChrome, setIsConnectingToChrome] = useState(false);
  const [isCdpConnected, setIsCdpConnected] = useState(false);
  
  const webviewRef = useRef(null);

  useEffect(() => {
    // Detect environment
    const detectEnvironment = () => {
      const hostname = window.location.hostname;
      const isProd = hostname.includes('vercel.app') || 
                     hostname.includes('netlify.app') || 
                     hostname !== 'localhost';
      
      setIsProduction(isProd);
      setEnvironment(isProd ? 'production' : 'local');
      
      if (isProd) {
        addToLog('🌐 Production environment detected - using CDP service', 'info');
      } else {
        addToLog('🏠 Local environment detected - full automation available', 'info');
      }
    };

    detectEnvironment();
    
    // Check Chrome debugging availability
    checkChromeDebugging();
    
    // Initialize browser automation service
    if (apiService) {
      const automation = new BrowserAutomationService(apiService);
      setBrowserAutomation(automation);

      // Listen for automation events
      automation.on('automation_started', (data) => {
        addToLog(`🚀 Starting automation: ${data.command}`, 'automation');
        setIsExecutingCommand(true);
        setAutomationProgress(0);
      });

      automation.on('automation_progress', (data) => {
        setAutomationProgress(data.progress);
        setCurrentAutomationStep(data.message);
        addToLog(`🔄 ${data.message}`, 'progress');
      });

      automation.on('automation_completed', (data) => {
        addToLog(`✅ Automation completed: ${data.result.action}`, 'success');
        setIsExecutingCommand(false);
        setAutomationProgress(100);
        setCurrentAutomationStep('');
      });

      automation.on('automation_error', (data) => {
        addToLog(`❌ Automation error: ${data.error}`, 'error');
        setIsExecutingCommand(false);
        setAutomationProgress(0);
        setCurrentAutomationStep('');
      });

      automation.on('automation_retry', (data) => {
        addToLog(`🔄 Retrying automation (attempt ${data.attempt})`, 'info');
      });

      return () => {
        automation.cleanup();
        if (isCdpConnected) {
          cdpService.disconnect();
        }
      };
    }
  }, [apiService]);

  const handleNavigate = async (newUrl) => {
    setIsLoading(true);
    
    // Ensure URL has protocol
    let formattedUrl = newUrl;
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      formattedUrl = 'https://' + newUrl;
    }
    
    try {
      if (isCdpConnected) {
        // Use CDP service for navigation
        await cdpService.navigateToUrl(formattedUrl);
        addToLog(`🌐 CDP navigated to: ${formattedUrl}`, 'info');
        
        // Take screenshot if available
        try {
          const screenshot = await cdpService.takeScreenshot();
          setBrowserScreenshot(`data:image/png;base64,${screenshot}`);
        } catch (error) {
          console.log('Screenshot not available:', error.message);
        }
      } else {
        // Fallback to local state
        setUrl(formattedUrl);
        
        // Add to history
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(formattedUrl);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
      }
    } catch (error) {
      addToLog(`❌ Navigation failed: ${error.message}`, 'error');
    }
    
    setIsLoading(false);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setUrl(history[newIndex]);
    }
  };

  const handleForward = () => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setUrl(history[newIndex]);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNavigate(e.target.value);
    }
  };

  const executeAiCommand = async () => {
    if (!aiCommand.trim()) {
      addToLog('Please enter a command', 'error');
      return;
    }

    addToLog(`🚀 Executing: ${aiCommand}`, 'command');
    setIsExecutingCommand(true);

    try {
      if (isCdpConnected) {
        // Use CDP service for AI commands
        addToLog('🌐 Using Chrome DevTools Protocol for execution...', 'info');
        
        // Parse AI command and execute appropriate CDP actions
        const result = await executeAiCommandViaCDP(aiCommand);
        
        if (result.success) {
          addToLog(`✅ CDP executed: ${result.action}`, 'success');
          if (result.screenshot) {
            setBrowserScreenshot(`data:image/png;base64,${result.screenshot}`);
          }
        } else {
          addToLog(`❌ CDP error: ${result.error}`, 'error');
        }
      } else {
        // No automation available
        addToLog('❌ No browser automation available. Please set up Chrome Watch Mode.', 'error');
      }
      
    } catch (error) {
      addToLog(`❌ Command execution failed: ${error.message}`, 'error');
    }

    setIsExecutingCommand(false);
    setAiCommand('');
  };

  // AI command execution via CDP
  const executeAiCommandViaCDP = async (command) => {
    try {
      const lowerCommand = command.toLowerCase();
      
      // Simple command parsing
      if (lowerCommand.includes('navigate') || lowerCommand.includes('go to')) {
        const urlMatch = command.match(/(?:navigate to|go to)\s+(.+)/i);
        if (urlMatch) {
          const targetUrl = urlMatch[1].trim();
          await cdpService.navigateToUrl(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
          const screenshot = await cdpService.takeScreenshot();
          return { success: true, action: `Navigated to ${targetUrl}`, screenshot };
        }
      }
      
      if (lowerCommand.includes('click')) {
        const selectorMatch = command.match(/click\s+(.+)/i);
        if (selectorMatch) {
          const selector = selectorMatch[1].trim();
          const clicked = await cdpService.clickElement(selector);
          const screenshot = await cdpService.takeScreenshot();
          return { 
            success: clicked, 
            action: clicked ? `Clicked ${selector}` : `Could not find ${selector}`,
            screenshot 
          };
        }
      }
      
      if (lowerCommand.includes('type') || lowerCommand.includes('enter')) {
        const typeMatch = command.match(/(?:type|enter)\s+"([^"]+)"\s+(?:in|into)\s+(.+)/i);
        if (typeMatch) {
          const text = typeMatch[1];
          const selector = typeMatch[2].trim();
          const typed = await cdpService.typeText(selector, text);
          const screenshot = await cdpService.takeScreenshot();
          return { 
            success: typed, 
            action: typed ? `Typed "${text}" into ${selector}` : `Could not find ${selector}`,
            screenshot 
          };
        }
      }
      
      if (lowerCommand.includes('search')) {
        const searchMatch = command.match(/search\s+(?:for\s+)?(.+)/i);
        if (searchMatch) {
          const searchTerm = searchMatch[1].trim();
          
          // Navigate to Google if not already there
          const currentUrl = await cdpService.executeScript('window.location.href');
          if (!currentUrl.includes('google.com')) {
            await cdpService.navigateToUrl('https://www.google.com');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for load
          }
          
          // Type in search box and submit
          await cdpService.typeText('input[name="q"]', searchTerm);
          await cdpService.executeScript('document.querySelector("input[name=\'q\']").form.submit()');
          
          const screenshot = await cdpService.takeScreenshot();
          return { success: true, action: `Searched for "${searchTerm}"`, screenshot };
        }
      }
      
      // Fallback: execute as JavaScript
      const result = await cdpService.executeScript(command);
      const screenshot = await cdpService.takeScreenshot();
      return { success: true, action: `Executed: ${command}`, result, screenshot };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Chrome DevTools Protocol functions
  const checkChromeDebugging = async () => {
    try {
      const debugInfo = await cdpService.checkChromeDebugging();
      if (debugInfo.available) {
        setChromeDebugStatus('available');
        setShowChromeSetup(false);
        addToLog('🌐 Chrome debugging detected and ready', 'success');
      } else {
        setChromeDebugStatus('needs_setup');
        setShowChromeSetup(true);
        addToLog('🌐 Chrome debugging not available - setup required', 'info');
      }
    } catch (error) {
      setChromeDebugStatus('needs_setup');
      setShowChromeSetup(true);
      addToLog('🌐 Chrome debugging not detected', 'info');
    }
  };

  const connectToChrome = async () => {
    setIsConnectingToChrome(true);
    
    try {
      await cdpService.connect();
      setIsCdpConnected(true);
      setChromeDebugStatus('available');
      setShowChromeSetup(false);
      addToLog('🌐 Successfully connected to Chrome via CDP!', 'success');
      
      // Set up CDP event listeners
      cdpService.addEventListener('Page.loadEventFired', () => {
        addToLog('📄 Page loaded', 'info');
      });
      
      cdpService.addEventListener('Page.frameNavigated', (params) => {
        if (params.frame.parentId === undefined) { // Main frame only
          setUrl(params.frame.url);
          addToLog(`🧭 Navigated to: ${params.frame.url}`, 'info');
        }
      });
      
    } catch (error) {
      addToLog(`❌ CDP connection failed: ${error.message}`, 'error');
    } finally {
      setIsConnectingToChrome(false);
    }
  };

  const downloadChromeHelper = () => {
    const platform = navigator.platform.toLowerCase();
    let script = '';
    let filename = '';

    if (platform.includes('mac')) {
      script = `#!/bin/bash
# Chrome Debug Launcher for macOS
echo "🚀 Starting Chrome with debugging enabled..."
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug --disable-web-security --disable-features=VizDisplayCompositor &
echo "✅ Chrome debugging enabled on port 9222"
echo "🌐 You can now return to the web app and click 'Connect to Chrome'"
`;
      filename = 'start-chrome-debug.sh';
    } else if (platform.includes('win')) {
      script = `@echo off
REM Chrome Debug Launcher for Windows
echo 🚀 Starting Chrome with debugging enabled...
start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome-debug" --disable-web-security --disable-features=VizDisplayCompositor
echo ✅ Chrome debugging enabled on port 9222
echo 🌐 You can now return to the web app and click 'Connect to Chrome'
pause
`;
      filename = 'start-chrome-debug.bat';
    } else {
      script = `#!/bin/bash
# Chrome Debug Launcher for Linux
echo "🚀 Starting Chrome with debugging enabled..."
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug --disable-web-security --disable-features=VizDisplayCompositor &
echo "✅ Chrome debugging enabled on port 9222"
echo "🌐 You can now return to the web app and click 'Connect to Chrome'"
`;
      filename = 'start-chrome-debug.sh';
    }

    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    addToLog(`📥 Downloaded ${filename} - run this script to enable Chrome debugging`, 'info');
  };

  const copyTerminalCommand = () => {
    const platform = navigator.platform.toLowerCase();
    let command = '';

    if (platform.includes('mac')) {
      command = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug --disable-web-security &';
    } else if (platform.includes('win')) {
      command = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome-debug" --disable-web-security';
    } else {
      command = 'google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug --disable-web-security &';
    }

    navigator.clipboard.writeText(command).then(() => {
      addToLog('📋 Command copied to clipboard! Paste it in your terminal.', 'info');
    }).catch(() => {
      addToLog(`💻 Copy this command: ${command}`, 'info');
    });
  };

  const addToLog = (message, type = 'info') => {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setAutomationLog(prev => [...prev.slice(-9), logEntry]);
  };

  const handleAiKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeAiCommand();
    }
  };

  const quickLinks = [
    { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
    { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚' },
    { name: 'MDN Docs', url: 'https://developer.mozilla.org', icon: '📖' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: '📺' }
  ];

  return (
    <div className="browser-panel">
      <div className="browser-header">
        <h2>🤖 Browser Operation Agent Mode</h2>
        <p>Browse the web with Robbi's intelligent automation</p>
        <div className="environment-indicator">
          <span className={`env-badge ${environment}`}>
            {isProduction ? '🌐 Production' : '🏠 Local'} Environment
          </span>
        </div>
      </div>

      {/* Browser Automation Setup Panel */}
      {chromeDebugStatus !== 'available' && (
        <div className="chrome-setup-panel">
          <button
            className="close-setup"
            onClick={() => setShowChromeSetup(false)}
            title="Close setup panel"
          >
            ✕
          </button>
          
          <h3>🤖 Chrome Browser Automation Setup</h3>
          
          <p>
            {isProduction 
              ? 'In production, Robbi connects to your local Chrome browser via Chrome DevTools Protocol.'
              : 'Set up Chrome debugging to enable browser automation.'
            }
          </p>
          
          <div className="setup-options">
            <div className="setup-option">
              <h4>👀 Chrome Watch Mode</h4>
              <p>Watch Robbi work in real-time in your Chrome browser. Perfect for learning and verification.</p>
              <div className="setup-buttons">
                <button
                  className="setup-btn"
                  onClick={downloadChromeHelper}
                >
                  📥 Download Chrome Script
                </button>
                <button
                  className="setup-btn secondary"
                  onClick={copyTerminalCommand}
                >
                  📋 Copy Terminal Command
                </button>
                <button
                  className="setup-btn primary"
                  onClick={connectToChrome}
                  disabled={isConnectingToChrome}
                >
                  {isConnectingToChrome ? '⏳ Connecting...' : '🔗 Connect to Chrome'}
                </button>
              </div>
              <small>✅ Real Chrome browser • 👁️ Visual feedback • 🎯 Works in production</small>
            </div>
          </div>

          {/* Status Messages */}
          {chromeDebugStatus === 'checking' && (
            <div className="status-message checking">
              <div className="spinner"></div>
              <span>Checking Chrome debugging...</span>
            </div>
          )}
          {chromeDebugStatus === 'available' && (
            <div className="status-message success">
              <span>✅ Chrome watch mode ready!</span>
            </div>
          )}
          {isConnectingToChrome && (
            <div className="status-message connecting">
              <div className="spinner"></div>
              <span>Connecting to Chrome...</span>
            </div>
          )}

          <div className="help-section">
            <h5>How to set up Chrome debugging:</h5>
            <ol>
              <li>Download and run the Chrome script, or copy the terminal command</li>
              <li>Chrome will open with debugging enabled</li>
              <li>Click "Connect to Chrome" button above</li>
              <li>Start using browser automation commands!</li>
            </ol>
            
            {isProduction && (
              <div className="production-note">
                <h5>🌐 Production Environment</h5>
                <p>You're using the live web app! Chrome debugging connects directly to your local browser for secure automation.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="browser-controls">
        <div className="navigation-buttons">
          <button
            className="nav-btn"
            onClick={handleBack}
            disabled={currentIndex === 0}
            title="Back"
          >
            ⬅️
          </button>
          <button
            className="nav-btn"
            onClick={handleForward}
            disabled={currentIndex === history.length - 1}
            title="Forward"
          >
            ➡️
          </button>
          <button
            className="nav-btn"
            onClick={handleRefresh}
            title="Refresh"
          >
            🔄
          </button>
        </div>

        <div className="address-bar">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter URL or search term..."
            className="url-input"
          />
          <button
            className="go-button"
            onClick={() => handleNavigate(url)}
          >
            Go
          </button>
        </div>

        <div className="browser-mode-controls">
          <div className="connection-status">
            <span className={`status-indicator ${isCdpConnected ? 'connected' : 'disconnected'}`}>
              {isCdpConnected ? '🟢 CDP Connected' : '🔴 Not Connected'}
            </span>
          </div>
        </div>
      </div>

      <div className="ai-automation-panel">
        <h3>🤖 AI Browser Control</h3>
        <div className="ai-command-input">
          <textarea
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            onKeyPress={handleAiKeyPress}
            placeholder="Tell Robbi what to do... (e.g., 'Search for React tutorials', 'Navigate to GitHub', 'Click the login button')"
            className="ai-input"
            rows="2"
            disabled={isExecutingCommand}
          />
          <button
            onClick={executeAiCommand}
            disabled={!aiCommand.trim() || isExecutingCommand}
            className="ai-execute-btn"
          >
            {isExecutingCommand ? '⏳' : '🚀'} Execute
          </button>
        </div>
        
        {isExecutingCommand && automationProgress > 0 && (
          <div className="automation-progress">
            <div className="progress-header">
              <h4>🤖 Automation in Progress</h4>
              <span className="progress-percentage">{Math.round(automationProgress)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${automationProgress}%` }}
              ></div>
            </div>
            {currentAutomationStep && (
              <div className="progress-step">{currentAutomationStep}</div>
            )}
          </div>
        )}
        
        <div className="automation-log">
          <h4>Automation Log</h4>
          <div className="log-entries">
            {automationLog.length === 0 ? (
              <div className="log-entry info">
                <span className="log-time">--:--:--</span>
                <span className="log-message">Ready for browser automation commands...</span>
              </div>
            ) : (
              automationLog.map(entry => (
                <div key={entry.id} className={`log-entry ${entry.type}`}>
                  <span className="log-time">{entry.timestamp}</span>
                  <span className="log-message">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="quick-links">
        <h3>Quick Links</h3>
        <div className="links-grid">
          {quickLinks.map((link, index) => (
            <button
              key={index}
              className="quick-link"
              onClick={() => handleNavigate(link.url)}
            >
              <span className="link-icon">{link.icon}</span>
              <span className="link-name">{link.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="browser-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {url}...</p>
          </div>
        ) : (
          <div className="browser-frame">
            {isCdpConnected && browserScreenshot ? (
              <div className="cdp-browser">
                <img
                  src={browserScreenshot}
                  alt="Chrome Browser via CDP"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#fff',
                    cursor: 'crosshair'
                  }}
                  onClick={async (e) => {
                    const rect = e.target.getBoundingClientRect();
                    const x = Math.round((e.clientX - rect.left) * (1280 / rect.width));
                    const y = Math.round((e.clientY - rect.top) * (800 / rect.height));
                    try {
                      await cdpService.executeScript(`
                        document.elementFromPoint(${x}, ${y})?.click();
                      `);
                      addToLog(`🌐 Clicked at (${x}, ${y})`, 'info');
                      
                      // Update screenshot
                      setTimeout(async () => {
                        try {
                          const screenshot = await cdpService.takeScreenshot();
                          setBrowserScreenshot(`data:image/png;base64,${screenshot}`);
                        } catch (error) {
                          console.log('Screenshot update failed:', error);
                        }
                      }, 1000);
                    } catch (error) {
                      addToLog(`❌ Click failed: ${error.message}`, 'error');
                    }
                  }}
                />
                <div className="cdp-overlay">
                  <span className="cdp-indicator">🌐 Chrome DevTools Protocol</span>
                  <span className="cdp-title">{browserTitle}</span>
                </div>
              </div>
            ) : (
              <div className="browser-placeholder">
                <div className="placeholder-content">
                  <h3>🌐 Browser View</h3>
                  <p>Current URL: <strong>{url}</strong></p>
                  <p>
                    {isProduction 
                      ? 'Connect to your local Chrome browser to see live automation.'
                      : 'Set up Chrome debugging to enable browser automation.'
                    }
                  </p>
                  <button
                    className="open-external"
                    onClick={() => window.open(url, '_blank')}
                  >
                    Open in External Browser
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="browser-footer">
        <div className="status-info">
          <span className="status-text">
            {isLoading ? 'Loading...' : isCdpConnected ? 'CDP Connected' : 'Ready'}
          </span>
          <span className="url-display">{url}</span>
        </div>
      </div>
    </div>
  );
};

export default BrowserPanel;