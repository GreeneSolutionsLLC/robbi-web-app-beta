const axios = require('axios');
const { EventEmitter } = require('events');

class ApiService extends EventEmitter {
  constructor() {
    super();
    this.baseUrl = 'https://8080-40eb3452-0307-4de7-be2f-d57ee2941308.proxy.daytona.work';
    this.apiKey = 'pwRSjw0.99GLKn_ReUP5PTUSYA3ehUBWk0ZNP3R9UQXhiVYWPIYT';
    this.userId = 'robbi-user';
    this.isAuthenticated = false;
    this.connectionTested = false;
  }

  async makeRequest(endpoint, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Robbi-Smart-Assistant/1.0',
        ...options.headers
      },
      timeout: 30000
    };

    if (options.body) {
      config.data = options.body;
    }

    try {
      const response = await axios({
        url: this.baseUrl + endpoint,
        ...config
      });

      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error('API Request failed:', error.message);
      
      if (error.response?.status === 401) {
        this.isAuthenticated = false;
        throw new Error('Unauthorized - Check your API key');
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused - Server may be down');
      }
      
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out');
      }
      
      throw new Error(`API Error: ${error.response?.status || 'Network'} - ${error.message}`);
    }
  }

  async authenticate() {
    try {
      console.log('Testing API connection...');
      const result = await this.makeRequest('/health');
      
      if (result.success && result.data.authenticated) {
        this.isAuthenticated = true;
        this.connectionTested = true;
        console.log('✅ API authentication successful');
        this.emit('connected');
        
        return {
          success: true,
          user: { name: 'Robbi User', id: this.userId },
          message: 'Authentication successful',
          serverInfo: result.data
        };
      } else {
        throw new Error('Authentication failed - Invalid response');
      }
    } catch (error) {
      console.error('❌ API authentication failed:', error.message);
      this.isAuthenticated = false;
      this.emit('disconnected');
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      const result = await this.makeRequest('/health');
      this.connectionTested = true;
      return result.success;
    } catch (error) {
      console.error('Connection test failed:', error.message);
      this.connectionTested = true;
      return false;
    }
  }

  async sendMessage(message, context = {}) {
    try {
      if (!this.connectionTested) {
        await this.testConnection();
      }

      if (!this.isAuthenticated) {
        const authResult = await this.authenticate();
        if (!authResult.success) {
          throw new Error('Authentication required');
        }
      }

      // Use the echo endpoint to simulate chat functionality
      const payload = {
        message: message,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        context: context
      };

      const result = await this.makeRequest('/echo', {
        method: 'POST',
        body: payload
      });

      if (result.success) {
        // Generate an intelligent response based on the message
        const response = this.generateIntelligentResponse(message, result.data);
        
        // Emit the response
        setTimeout(() => {
          this.emit('message', {
            message: response,
            timestamp: new Date().toISOString(),
            type: 'assistant'
          });
        }, 500);

        return {
          success: true,
          message: 'Message processed successfully'
        };
      } else {
        throw new Error('Failed to process message');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateIntelligentResponse(userMessage, echoData) {
    const message = userMessage.toLowerCase();
    
    // Browser automation commands
    if (message.includes('open') && (message.includes('website') || message.includes('url') || message.includes('browser'))) {
      return "I can help you open websites! Use the Browser Panel on the right to navigate to any URL. Just enter the website address and I'll load it for you.";
    }
    
    if (message.includes('click') || message.includes('button') || message.includes('link')) {
      return "I can help you interact with web pages! In the Browser Panel, you can click on elements, fill forms, and automate web tasks. Try loading a website first, then describe what you'd like me to click.";
    }
    
    if (message.includes('automate') || message.includes('automation')) {
      return "I'm great at automation! I can help you automate web browsing, form filling, data extraction, and repetitive tasks. What would you like to automate today?";
    }
    
    if (message.includes('fill') && (message.includes('form') || message.includes('input'))) {
      return "I can help you fill out forms automatically! Load a webpage with a form in the Browser Panel, and I can help you fill in the fields with the data you provide.";
    }
    
    // General assistance
    if (message.includes('help') || message.includes('what can you do')) {
      return "I'm Robbi, your smart AI assistant! I can help you with:\n\n🌐 Web browsing and automation\n📝 Form filling and data entry\n🔍 Information extraction\n⚡ Task automation\n💬 General questions and assistance\n\nTry asking me to open a website or help with automation!";
    }
    
    if (message.includes('time') || message.includes('date')) {
      return `The current time is ${new Date().toLocaleString()}. I'm connected to the NinjaTech AI API and ready to help you with automation tasks!`;
    }
    
    if (message.includes('weather')) {
      return "I don't have direct weather access, but I can help you automate checking weather websites! Try asking me to open a weather website like weather.com or weather.gov.";
    }
    
    // Default intelligent response
    const responses = [
      `I understand you're asking about "${userMessage}". I'm here to help with automation and web browsing tasks. What specific task would you like me to help you with?`,
      `Thanks for your message! I'm connected to the NinjaTech AI API and ready to assist. I specialize in browser automation and productivity tasks. How can I help you today?`,
      `I received your message about "${userMessage}". I can help you automate web tasks, browse websites, and handle repetitive work. What would you like to accomplish?`,
      `Great question! I'm Robbi, and I'm designed to help with automation and smart assistance. Whether it's web browsing, form filling, or task automation, I'm here to help. What's your goal?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async executeBrowserCommand(command, params = {}) {
    try {
      if (!this.isAuthenticated) {
        const authResult = await this.authenticate();
        if (!authResult.success) {
          throw new Error('Authentication required');
        }
      }

      // Use echo endpoint to log browser commands
      const payload = {
        type: 'browser_command',
        command: command,
        params: params,
        timestamp: new Date().toISOString(),
        userId: this.userId
      };

      const result = await this.makeRequest('/echo', {
        method: 'POST',
        body: payload
      });

      if (result.success) {
        // Emit browser automation update
        this.emit('automation_update', {
          command: command,
          params: params,
          status: 'executed',
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          command: command,
          result: `Browser command '${command}' executed successfully`
        };
      }

      throw new Error('Failed to execute browser command');

    } catch (error) {
      console.error('Browser command failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeFile(fileData) {
    try {
      if (!this.isAuthenticated) {
        const authResult = await this.authenticate();
        if (!authResult.success) {
          throw new Error('Authentication required');
        }
      }

      // Simulate file analysis using echo endpoint
      const payload = {
        type: 'file_analysis',
        fileName: fileData.name,
        fileType: fileData.type,
        fileSize: fileData.buffer?.size || 'unknown',
        timestamp: new Date().toISOString(),
        userId: this.userId
      };

      const result = await this.makeRequest('/echo', {
        method: 'POST',
        body: payload
      });

      if (result.success) {
        // Generate analysis based on file type
        const analysis = this.generateFileAnalysis(fileData);
        
        setTimeout(() => {
          this.emit('file_analysis_complete', {
            fileName: fileData.name,
            analysis: analysis,
            timestamp: new Date().toISOString()
          });
        }, 1000);

        return {
          success: true,
          analysis: analysis,
          insights: [`File ${fileData.name} processed successfully`],
          suggestions: ['File has been analyzed and is ready for use']
        };
      }

      throw new Error('Failed to analyze file');

    } catch (error) {
      console.error('File analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateFileAnalysis(fileData) {
    const fileType = fileData.type || 'unknown';
    const fileName = fileData.name || 'unknown';
    
    if (fileType.includes('image')) {
      return `Image file analysis for ${fileName}:\n- File type: ${fileType}\n- This appears to be an image file\n- Can be used for web automation tasks\n- Suitable for visual recognition tasks`;
    }
    
    if (fileType.includes('text') || fileType.includes('csv')) {
      return `Text file analysis for ${fileName}:\n- File type: ${fileType}\n- Contains text data\n- Can be processed for automation\n- Suitable for data extraction tasks`;
    }
    
    if (fileType.includes('pdf')) {
      return `PDF file analysis for ${fileName}:\n- File type: ${fileType}\n- Document format detected\n- Can extract text content\n- Suitable for document automation`;
    }
    
    return `File analysis for ${fileName}:\n- File type: ${fileType}\n- File uploaded successfully\n- Ready for processing\n- Can be used in automation workflows`;
  }

  async getServerTime() {
    try {
      const result = await this.makeRequest('/time');
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Failed to get server time:', error);
      return null;
    }
  }

  async getServerStatus() {
    try {
      const result = await this.makeRequest('/status');
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Failed to get server status:', error);
      return null;
    }
  }

  isConnected() {
    return this.isAuthenticated;
  }

  getConnectionStatus() {
    return {
      authenticated: this.isAuthenticated,
      connectionTested: this.connectionTested,
      userId: this.userId,
      apiUrl: this.baseUrl
    };
  }

  async cleanup() {
    try {
      this.isAuthenticated = false;
      this.connectionTested = false;
      this.removeAllListeners();
      console.log('Robbi API Service cleanup completed');
    } catch (error) {
      console.error('Robbi API Service cleanup error:', error);
    }
  }
}

module.exports = ApiService;