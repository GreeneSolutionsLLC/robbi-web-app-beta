/**
 * Chrome DevTools Protocol Service for Vercel Production Environment
 * Replaces the Playwright stealth server for web deployment
 * Connects directly to user's local Chrome instance via CDP
 */

class CDPService {
  constructor() {
    this.wsConnection = null;
    this.sessionId = null;
    this.isConnected = false;
    this.debugPort = 9222;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
  }

  /**
   * Check if Chrome debugging is available
   */
  async checkChromeDebugging() {
    try {
      const response = await fetch(`http://localhost:${this.debugPort}/json/version`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          version: data['Browser'],
          webSocketDebuggerUrl: data['webSocketDebuggerUrl']
        };
      }
      return { available: false };
    } catch (error) {
      console.log('Chrome debugging not available:', error.message);
      return { available: false, error: error.message };
    }
  }

  /**
   * Get list of available tabs
   */
  async getAvailableTabs() {
    try {
      const response = await fetch(`http://localhost:${this.debugPort}/json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const tabs = await response.json();
        return tabs.filter(tab => tab.type === 'page');
      }
      return [];
    } catch (error) {
      console.error('Failed to get tabs:', error);
      return [];
    }
  }

  /**
   * Connect to Chrome via WebSocket
   */
  async connect(tabId = null) {
    try {
      let wsUrl;
      
      if (tabId) {
        // Connect to specific tab
        const tabs = await this.getAvailableTabs();
        const targetTab = tabs.find(tab => tab.id === tabId);
        if (!targetTab) {
          throw new Error(`Tab with ID ${tabId} not found`);
        }
        wsUrl = targetTab.webSocketDebuggerUrl;
      } else {
        // Connect to browser
        const debugInfo = await this.checkChromeDebugging();
        if (!debugInfo.available) {
          throw new Error('Chrome debugging not available');
        }
        wsUrl = debugInfo.webSocketDebuggerUrl;
      }

      return new Promise((resolve, reject) => {
        this.wsConnection = new WebSocket(wsUrl);
        
        this.wsConnection.onopen = () => {
          console.log('CDP WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse CDP message:', error);
          }
        };

        this.wsConnection.onclose = () => {
          console.log('CDP WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };

        this.wsConnection.onerror = (error) => {
          console.error('CDP WebSocket error:', error);
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to connect to Chrome:', error);
      throw error;
    }
  }

  /**
   * Handle incoming CDP messages
   */
  handleMessage(message) {
    if (message.method) {
      // Event notification
      const listeners = this.eventListeners.get(message.method) || [];
      listeners.forEach(listener => {
        try {
          listener(message.params);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Send CDP command
   */
  async sendCommand(method, params = {}) {
    if (!this.isConnected || !this.wsConnection) {
      throw new Error('Not connected to Chrome');
    }

    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      const command = {
        id,
        method,
        params
      };

      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout: ${method}`));
      }, 10000);

      const messageHandler = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.id === id) {
            clearTimeout(timeout);
            this.wsConnection.removeEventListener('message', messageHandler);
            
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      };

      this.wsConnection.addEventListener('message', messageHandler);
      this.wsConnection.send(JSON.stringify(command));
    });
  }

  /**
   * Navigate to URL
   */
  async navigateToUrl(url) {
    try {
      await this.sendCommand('Page.enable');
      const result = await this.sendCommand('Page.navigate', { url });
      return result;
    } catch (error) {
      console.error('Failed to navigate:', error);
      throw error;
    }
  }

  /**
   * Execute JavaScript in page
   */
  async executeScript(expression) {
    try {
      await this.sendCommand('Runtime.enable');
      const result = await this.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
      }
      
      return result.result.value;
    } catch (error) {
      console.error('Failed to execute script:', error);
      throw error;
    }
  }

  /**
   * Click element by selector
   */
  async clickElement(selector) {
    const script = `
      (function() {
        const element = document.querySelector('${selector}');
        if (element) {
          element.click();
          return true;
        }
        return false;
      })()
    `;
    
    return await this.executeScript(script);
  }

  /**
   * Type text into element
   */
  async typeText(selector, text) {
    const script = `
      (function() {
        const element = document.querySelector('${selector}');
        if (element) {
          element.focus();
          element.value = '${text}';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      })()
    `;
    
    return await this.executeScript(script);
  }

  /**
   * Get page content
   */
  async getPageContent() {
    return await this.executeScript('document.documentElement.outerHTML');
  }

  /**
   * Take screenshot
   */
  async takeScreenshot() {
    try {
      await this.sendCommand('Page.enable');
      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        quality: 80
      });
      return result.data;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType, listener) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, 2000 * this.reconnectAttempts);
  }

  /**
   * Disconnect from Chrome
   */
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    this.eventListeners.clear();
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
const cdpService = new CDPService();
export default cdpService;