import React, { useState, useRef, useEffect } from 'react';
import './BrowserPanel.css';
import BrowserAutomationService from '../../services/browserAutomation';
import PlaywrightBrowserService from '../../services/playwrightBrowser';

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
  const [playwrightBrowser, setPlaywrightBrowser] = useState(null);
  const [isPlaywrightConnected, setIsPlaywrightConnected] = useState(false);
  const [browserScreenshot, setBrowserScreenshot] = useState(null);
  const [browserTitle, setBrowserTitle] = useState('');
  const [usePlaywright, setUsePlaywright] = useState(false);
  
  // Chrome DevTools Protocol states
  const [chromeDebugStatus, setChromeDebugStatus] = useState('checking'); // checking, available, needs_setup, error
  const [showChromeSetup, setShowChromeSetup] = useState(false);
  const [isConnectingToChrome, setIsConnectingToChrome] = useState(false);
  
  const webviewRef = useRef(null);

  useEffect(() => {
    // Check Chrome debugging availability first
    checkChromeDebugging();
    
    // Initialize Playwright browser service
    const initPlaywrightBrowser = async () => {
      const pwBrowser = new PlaywrightBrowserService();
      setPlaywrightBrowser(pwBrowser);

      // Set up event listeners
      pwBrowser.on('connected', () => {
        setIsPlaywrightConnected(true);
        addToLog('🎭 Connected to Playwright browser server', 'success');
      });

      pwBrowser.on('disconnected', () => {
        setIsPlaywrightConnected(false);
        addToLog('🎭 Disconnected from Playwright browser server', 'error');
      });

      pwBrowser.on('browser_disconnected', () => {
        setIsPlaywrightConnected(false);
        setBrowserScreenshot(null);
        addToLog('⚠️ Browser window was closed. Attempting to reconnect...', 'error');
        
        // Attempt to reconnect after a short delay
        setTimeout(async () => {
          try {
            addToLog('🔄 Attempting to reconnect to Playwright server...', 'info');
            await pwBrowser.connect();
          } catch (error) {
            addToLog('❌ Reconnection failed. Please restart the Playwright server.', 'error');
          }
        }, 3000);
      });

      pwBrowser.on('state_updated', (state) => {
        setUrl(state.url);
        setBrowserTitle(state.title);
        if (state.screenshot) {
          setBrowserScreenshot(state.screenshot);
        }
      });

      pwBrowser.on('screenshot_updated', (screenshot) => {
        setBrowserScreenshot(screenshot);
      });

      pwBrowser.on('navigation', (data) => {
        setUrl(data.url);
        setBrowserTitle(data.title);
        addToLog(`🧭 Navigated to: ${data.url}`, 'info');
      });

      pwBrowser.on('ai_action_started', (data) => {
        addToLog(`🤖 AI executing: ${data.command}`, 'automation');
        setIsExecutingCommand(true);
      });

      pwBrowser.on('ai_action_completed', (data) => {
        addToLog(`✅ AI completed: ${data.result.action}`, 'success');
        setIsExecutingCommand(false);
      });

      pwBrowser.on('ai_action_error', (data) => {
        addToLog(`❌ AI error: ${data.error}`, 'error');
        setIsExecutingCommand(false);
      });

      // Try to connect
      try {
        await pwBrowser.connect();
      } catch (error) {
        addToLog('⚠️ Playwright server not available. Choose your automation mode below.', 'info');
      }
    };

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

      // Initialize Playwright browser
      initPlaywrightBrowser();

      return () => {
        automation.cleanup();
        if (playwrightBrowser) {
          playwrightBrowser.disconnect();
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
      if (usePlaywright && playwrightBrowser && isPlaywrightConnected) {
        // Use Playwright browser
        await playwrightBrowser.navigate(formattedUrl);
        addToLog(`🎭 Playwright navigated to: ${formattedUrl}`, 'info');
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
      // Check if Playwright browser is available and connected
      if (playwrightBrowser && isPlaywrightConnected) {
        addToLog('🎭 Using Playwright browser for execution...', 'info');
        
        // Verify connection before executing
        const connectionStatus = playwrightBrowser.getConnectionStatus();
        if (!connectionStatus.isConnected) {
          throw new Error('Playwright browser connection lost');
        }

        const result = await playwrightBrowser.executeAICommand(aiCommand, {
          currentUrl: url,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          viewport: { width: 1280, height: 800 }
        });

        if (result && result.success) {
          addToLog(`✅ Playwright executed: ${result.result.action}`, 'success');
          if (result.result.searchTerm) {
            addToLog(`🔍 Search term: ${result.result.searchTerm}`, 'info');
          }
          if (result.result.url) {
            addToLog(`🌐 Navigated to: ${result.result.url}`, 'info');
          }
        } else {
          const errorMsg = result?.error || 'Unknown error occurred';
          addToLog(`❌ Playwright error: ${errorMsg}`, 'error');
        }
      } else {
        // No automation available
        addToLog('❌ No browser automation available. Please set up Chrome Watch Mode or Playwright Mode.', 'error');
      }
      
    } catch (error) {
      addToLog(`❌ Command execution failed: ${error.message}`, 'error');
    }

    setIsExecutingCommand(false);
    setAiCommand('');
  };

  // Chrome DevTools Protocol functions
  const checkChromeDebugging = async () => {
    try {
      const response = await fetch('http://localhost:9222/json/version');
      if (response.ok) {
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
echo "🌐 You can now return to the web app and the browser will connect automatically"
`;
      filename = 'start-chrome-debug.sh';
    } else if (platform.includes('win')) {
      script = `@echo off
REM Chrome Debug Launcher for Windows
echo 🚀 Starting Chrome with debugging enabled...
start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome-debug" --disable-web-security --disable-features=VizDisplayCompositor
echo ✅ Chrome debugging enabled on port 9222
echo 🌐 You can now return to the web app and the browser will connect automatically
pause
`;
      filename = 'start-chrome-debug.bat';
    } else {
      script = `#!/bin/bash
# Chrome Debug Launcher for Linux
echo "🚀 Starting Chrome with debugging enabled..."
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug --disable-web-security --disable-features=VizDisplayCompositor &
echo "✅ Chrome debugging enabled on port 9222"
echo "🌐 You can now return to the web app and the browser will connect automatically"
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
    
    // Start checking for Chrome debugging every 3 seconds
    const checkInterval = setInterval(async () => {
      await checkChromeDebugging();
      if (chromeDebugStatus === 'available') {
        clearInterval(checkInterval);
        setShowChromeSetup(false);
        addToLog('🎉 Chrome debugging connected! Browser automation is now ready.', 'success');
      }
    }, 3000);
  };

  const connectToChrome = async () => {
    setIsConnectingToChrome(true);
    
    try {
      const response = await fetch('http://localhost:9222/json/version');
      if (response.ok) {
        setChromeDebugStatus('available');
        setShowChromeSetup(false);
        addToLog('🌐 Successfully connected to Chrome debugging!', 'success');
      } else {
        addToLog('❌ Chrome debugging not detected. Please run the downloaded script first.', 'error');
      }
    } catch (error) {
      addToLog('❌ Cannot connect to Chrome. Make sure Chrome is running with debugging enabled.', 'error');
    } finally {
      setIsConnectingToChrome(false);
    }
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
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setAutomationLog(prev => [...prev.slice(-9), logEntry]); // Keep last 10 entries
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
      </div>

      {/* Browser Automation Setup Panel */}
      {(!isPlaywrightConnected && chromeDebugStatus !== 'available') && (
        <div className="chrome-setup-panel">
          <button
            className="close-setup"
            onClick={() => setShowChromeSetup(false)}
            title="Close setup panel"
          >
            ✕
          </button>
          
          <h3>🤖 Choose Your Browser Automation Method</h3>
          
          <p>Select how you want Robbi to control browsers for automation tasks:</p>
          
          <div className="setup-options">
            <div className="setup-option">
              <h4>👀 Chrome Watch Mode</h4>
              <p>Watch Robbi work in real-time in your Chrome browser. Perfect for learning and verification.</p>
              <div className="setup-buttons">
                <button
                  className="setup-btn"
                  onClick={downloadChromeHelper}
                >
                  📥 Enable Chrome Watching
                </button>
                <button
                  className="setup-btn secondary"
                  onClick={copyTerminalCommand}
                >
                  📋 Manual Setup
                </button>
              </div>
              <small>✅ Real Chrome browser • 👁️ Visual feedback • 🎯 Great for learning</small>
            </div>

            <div className="setup-option">
              <h4>🎭 Playwright Web Mode</h4>
              <p>Robbi uses a headless browser instance. Works with any browser, faster execution.</p>
              <div className="setup-buttons">
                <button
                  className="setup-btn"
                  onClick={async () => {
                    addToLog('🎭 Starting Playwright browser service...', 'info');
                    try {
                      if (playwrightBrowser) {
                        await playwrightBrowser.connect();
                        setUsePlaywright(true);
                        setShowChromeSetup(false);
                        addToLog('🎉 Playwright browser ready! You can now use browser automation.', 'success');
                      }
                    } catch (error) {
                      addToLog('❌ Failed to start Playwright. Server may not be running.', 'error');
                    }
                  }}
                  disabled={!playwrightBrowser}
                >
                  🚀 Start Playwright Mode
                </button>
              </div>
              <small>✅ Works with any browser • ⚡ Faster execution • 🔒 More reliable</small>
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
          {isPlaywrightConnected && (
            <div className="status-message success">
              <span>🎭 Playwright mode ready!</span>
            </div>
          )}
          {isConnectingToChrome && (
            <div className="status-message connecting">
              <div className="spinner"></div>
              <span>Connecting to Chrome...</span>
            </div>
          )}

          <div className="help-section">
            <h5>Which mode should I choose?</h5>
            <ul>
              <li><strong>Chrome Watch Mode:</strong> Best for learning how Robbi works and verifying actions in real-time</li>
              <li><strong>Playwright Mode:</strong> Best for production use, faster and works regardless of your browser</li>
            </ul>
            
            <h5>How does Chrome detection work?</h5>
            <ul>
              <li>The web app automatically checks for Chrome debugging on port 9222 every few seconds</li>
              <li>When you run the Chrome script, it will detect the connection automatically</li>
              <li>You'll see a green "Chrome watch mode ready!" message when connected</li>
              <li>No manual refresh needed - detection is automatic</li>
            </ul>
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
          <div className="mode-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={usePlaywright}
                onChange={(e) => setUsePlaywright(e.target.checked)}
                disabled={!isPlaywrightConnected}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                {usePlaywright ? '🎭 Playwright' : '🌐 Standard'}
              </span>
            </label>
          </div>
          <div className="connection-status">
            <span className={`status-indicator ${isPlaywrightConnected ? 'connected' : 'disconnected'}`}>
              {isPlaywrightConnected ? '🟢 Connected' : '🔴 Disconnected'}
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
            {usePlaywright && isPlaywrightConnected && browserScreenshot ? (
              <div className="playwright-browser">
                <img
                  src={browserScreenshot}
                  alt="Playwright Browser"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#fff',
                    cursor: 'crosshair'
                  }}
                  onClick={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    const x = Math.round((e.clientX - rect.left) * (1280 / rect.width));
                    const y = Math.round((e.clientY - rect.top) * (800 / rect.height));
                    if (playwrightBrowser) {
                      playwrightBrowser.click(x, y);
                      addToLog(`🎭 Clicked at (${x}, ${y})`, 'info');
                    }
                  }}
                />
                <div className="playwright-overlay">
                  <span className="playwright-indicator">🎭 Playwright Browser</span>
                  <span className="playwright-title">{browserTitle}</span>
                </div>
              </div>
            ) : window.require ? (
              <webview
                src={url}
                className="web-frame"
                allowpopups="true"
                webpreferences="allowRunningInsecureContent=true"
              />
            ) : (
              <div className="browser-placeholder">
                <div className="placeholder-content">
                  <h3>🌐 Browser View</h3>
                  <p>Current URL: <strong>{url}</strong></p>
                  <p>The integrated browser is available in the desktop app.</p>
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
            {isLoading ? 'Loading...' : 'Ready'}
          </span>
          <span className="url-display">{url}</span>
        </div>
      </div>
    </div>
  );
};

export default BrowserPanel;