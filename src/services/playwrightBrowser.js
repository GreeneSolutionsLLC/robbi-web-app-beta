import { io } from 'socket.io-client';

class PlaywrightBrowserService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.browserState = {
      url: '',
      title: '',
      screenshot: null,
      isLoading: false
    };
    this.eventListeners = new Map();
  }

  // Connect to the Playwright browser server
  async connect(serverUrl = 'http://localhost:3001') {
    try {
      this.socket = io(serverUrl);
      
      this.socket.on('connect', () => {
        console.log('Connected to Playwright browser server');
        this.isConnected = true;
        this.emit('connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from Playwright browser server');
        this.isConnected = false;
        this.emit('disconnected');
      });

      // Browser state updates
      this.socket.on('browser_state', (state) => {
        this.browserState = { ...this.browserState, ...state };
        this.emit('state_updated', this.browserState);
      });

      // Screenshot updates
      this.socket.on('screenshot', (screenshot) => {
        this.browserState.screenshot = screenshot;
        this.emit('screenshot_updated', screenshot);
      });

      // Navigation events
      this.socket.on('navigation', (data) => {
        this.browserState.url = data.url;
        this.browserState.title = data.title;
        this.emit('navigation', data);
      });

      // AI automation events
      this.socket.on('ai_action_started', (data) => {
        this.emit('ai_action_started', data);
      });

      this.socket.on('ai_action_completed', (data) => {
        this.emit('ai_action_completed', data);
      });

      this.socket.on('ai_action_error', (data) => {
        this.emit('ai_action_error', data);
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to Playwright browser server:', error);
      return false;
    }
  }

  // Disconnect from the server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Navigate to a URL
  async navigate(url) {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('navigate', { url }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Execute AI command
  async executeAICommand(command, context = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('ai_command', { 
        command, 
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Human interaction methods
  async click(x, y) {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('click', { x, y }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  async type(text) {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('type', { text }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  async scroll(direction, amount = 100) {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('scroll', { direction, amount }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  async keyPress(key) {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('keypress', { key }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Get current screenshot
  async getScreenshot() {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('get_screenshot', {}, (response) => {
        if (response.success) {
          resolve(response.screenshot);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Browser controls
  async goBack() {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('go_back', {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  async goForward() {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('go_forward', {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  async refresh() {
    if (!this.isConnected) {
      throw new Error('Not connected to browser server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('refresh', {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get current browser state
  getBrowserState() {
    return { ...this.browserState };
  }

  // Check connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      serverUrl: this.socket?.io?.uri || null
    };
  }
}

export default PlaywrightBrowserService;