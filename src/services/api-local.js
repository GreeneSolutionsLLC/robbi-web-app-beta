// LOCAL DEVELOPMENT VERSION - Uses localhost:8000 NinjaTech AI Server
// This version is for local testing before deployment

// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners() {
    this.events = {};
  }
}

class NinjaTechAPIService extends SimpleEventEmitter {
  constructor() {
    super();
    
    // LOCAL DEVELOPMENT NINJATECH AI CONFIGURATION
    this.baseURL = 'http://localhost:8000';
    this.apiKey = 'pwRSjw0.99GLKn_ReUP5PTUSYA3ehUBWk0ZNP3R9UQXhiVYWPIYT';
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Detect environment
    this.isProduction = this.detectProductionEnvironment();
    
    console.log(`🔗 Initializing NinjaTech AI API Service (LOCAL DEVELOPMENT)`);
    console.log(`📡 API URL: ${this.baseURL}`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
    console.log(`🌍 Environment: ${this.isProduction ? 'Production' : 'Development'}`);
    
    // Initialize connection
    this.initializeConnection();
  }

  detectProductionEnvironment() {
    return window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1' &&
           !window.location.hostname.includes('localhost');
  }

  async initializeConnection() {
    console.log('🔍 Testing NinjaTech AI connection...');
    try {
      await this.testConnection();
    } catch (error) {
      console.error('❌ Failed to connect to NinjaTech AI API:', error.message);
      await this.tryFallbackEndpoints();
    }
  }

  async testConnection() {
    const response = await this.makeRequest('/health', 'GET');
    if (response) {
      this.connected = true;
      console.log('✅ Connected to NinjaTech AI API');
      this.emit('connected');
      return true;
    }
    throw new Error('Health check failed');
  }

  async tryFallbackEndpoints() {
    const fallbackEndpoints = ['/echo', '/status', '/time'];
    
    console.log('🔄 Trying fallback endpoints...');
    
    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying fallback endpoint: ${endpoint}`);
        const response = await this.makeRequest(endpoint, endpoint === '/echo' ? 'POST' : 'GET', 
          endpoint === '/echo' ? { test: 'connection' } : undefined);
        
        if (response) {
          this.connected = true;
          console.log(`✅ Connected via fallback endpoint: ${endpoint}`);
          this.emit('connected');
          return true;
        }
      } catch (error) {
        console.log(`❌ Fallback endpoint ${endpoint} failed:`, error.message);
      }
    }
    
    console.log('❌ All endpoints failed - using fallback mode');
    this.emit('disconnected');
    return false;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`🚀 Making request to: ${url}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Request successful:', result);
      return result;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }

  async sendMessage(message) {
    console.log(`💬 Sending message to NinjaTech AI: "${message}"`);
    
    if (!this.connected) {
      console.log('⚠️ Not connected to API, attempting to reconnect...');
      await this.initializeConnection();
    }

    try {
      const response = await this.makeRequest('/chat', 'POST', { message });
      console.log('✅ Message sent successfully');
      
      // Format response to match CompactChat expectations
      return {
        success: true,
        response: response.response || response.message || "I received your message!"
      };
    } catch (error) {
      console.error('❌ Send message failed:', error);
      // Return fallback response instead of throwing
      return {
        success: false,
        response: "I'm having trouble connecting right now. Please try again later."
      };
    }
  }

  async getHealth() {
    return await this.makeRequest('/health', 'GET');
  }

  async getStatus() {
    return await this.makeRequest('/status', 'GET');
  }

  async getTime() {
    return await this.makeRequest('/time', 'GET');
  }

  async echo(data) {
    return await this.makeRequest('/echo', 'POST', data);
  }

  isConnected() {
    return this.connected;
  }
}

// Create and export a single instance
const apiService = new NinjaTechAPIService();
export default apiService;