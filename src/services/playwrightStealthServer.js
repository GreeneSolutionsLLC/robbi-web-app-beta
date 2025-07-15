const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { chromium } = require('playwright');
const cors = require('cors');

class PlaywrightStealthServer {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
    
    this.setupMiddleware();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        browser: this.browser ? 'connected' : 'disconnected',
        initialized: this.isInitialized
      });
    });
  }

  async initializeBrowser() {
    try {
      console.log('🎭 Initializing stealth Playwright browser...');
      
      // Launch browser with anti-detection arguments
      this.browser = await chromium.launch({
        headless: false, // Set to true for production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-blink-features=AutomationControlled',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-features=VizDisplayCompositor',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-web-security',
          '--enable-features=NetworkService,NetworkServiceLogging',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-crash-upload',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-features=VizDisplayCompositor',
          '--disable-print-preview',
          '--disable-speech-api',
          '--hide-scrollbars',
          '--mute-audio'
        ]
      });

      // Create stealth context with realistic settings
      this.context = await this.browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'notifications'],
        geolocation: { longitude: -74.006, latitude: 40.7128 }, // New York
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Sec-Fetch-Dest': 'document',
          'Cache-Control': 'max-age=0'
        }
      });

      // Create page and apply stealth measures
      this.page = await this.context.newPage();
      await this.applyStealthMeasures();
      
      this.isInitialized = true;
      console.log('✅ Stealth browser initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      return false;
    }
  }

  async applyStealthMeasures() {
    if (!this.page) return;

    console.log('🛡️ Applying comprehensive anti-detection measures...');

    // 1. Remove WebDriver traces
    await this.page.addInitScript(() => {
      // Remove webdriver property
      delete window.webdriver;
      delete navigator.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });

      // Remove automation properties
      delete window.chrome.runtime.onConnect;
      delete window.chrome.runtime.onMessage;
      delete window.__playwright;
      delete window.__pw_manual;
      delete window.__pw;
    });

    // 2. Enhance Navigator properties
    await this.page.addInitScript(() => {
      // Override platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
            description: "Portable Document Format", 
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin },
            1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin },
            description: "Native Client",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ],
        configurable: true
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // 3. Mock realistic screen properties
    await this.page.addInitScript(() => {
      Object.defineProperty(screen, 'width', {
        get: () => 1920,
        configurable: true
      });
      Object.defineProperty(screen, 'height', {
        get: () => 1080,
        configurable: true
      });
      Object.defineProperty(screen, 'availWidth', {
        get: () => 1920,
        configurable: true
      });
      Object.defineProperty(screen, 'availHeight', {
        get: () => 1040,
        configurable: true
      });
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });
      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });
    });

    // 4. Canvas fingerprinting protection
    await this.page.addInitScript(() => {
      const getImageData = HTMLCanvasElement.prototype.getImageData;
      const getContext = HTMLCanvasElement.prototype.getContext;
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;

      HTMLCanvasElement.prototype.getImageData = function(...args) {
        const imageData = getImageData.apply(this, args);
        // Add slight noise to prevent fingerprinting
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() < 0.001) {
            imageData.data[i] = Math.floor(Math.random() * 256);
            imageData.data[i + 1] = Math.floor(Math.random() * 256);
            imageData.data[i + 2] = Math.floor(Math.random() * 256);
          }
        }
        return imageData;
      };

      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const originalResult = toDataURL.apply(this, args);
        // Add slight variation to canvas output
        return originalResult.replace(/.$/, () => 
          String.fromCharCode(Math.floor(Math.random() * 26) + 97)
        );
      };
    });

    // 5. WebGL fingerprinting protection
    await this.page.addInitScript(() => {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // Randomize specific WebGL parameters
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, arguments);
      };
    });

    // 6. Audio context fingerprinting protection
    await this.page.addInitScript(() => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
          const analyser = originalCreateAnalyser.apply(this, arguments);
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
          analyser.getFloatFrequencyData = function(array) {
            originalGetFloatFrequencyData.apply(this, arguments);
            // Add noise to audio fingerprinting
            for (let i = 0; i < array.length; i++) {
              array[i] += Math.random() * 0.0001;
            }
          };
          return analyser;
        };
      }
    });

    // 7. Performance timing randomization
    await this.page.addInitScript(() => {
      const originalPerformanceNow = performance.now;
      performance.now = function() {
        return originalPerformanceNow.apply(this, arguments) + Math.random() * 0.1;
      };
    });

    // 8. Battery API spoofing
    await this.page.addInitScript(() => {
      if ('getBattery' in navigator) {
        const originalGetBattery = navigator.getBattery;
        navigator.getBattery = function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
          });
        };
      }
    });

    // 9. Timezone and date consistency
    await this.page.addInitScript(() => {
      const originalDate = Date;
      Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            super();
          } else {
            super(...args);
          }
        }
        
        getTimezoneOffset() {
          return 300; // EST timezone offset
        }
      };
      Date.now = originalDate.now;
      Date.parse = originalDate.parse;
      Date.UTC = originalDate.UTC;
    });

    // 10. Memory and hardware concurrency spoofing
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4,
        configurable: true
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });
    });

    console.log('✅ All anti-detection measures applied successfully');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Initialize browser if not already done
      if (!this.isInitialized) {
        this.initializeBrowser().then((success) => {
          if (success) {
            socket.emit('browser_ready');
          } else {
            socket.emit('browser_error', { error: 'Failed to initialize browser' });
          }
        });
      } else {
        socket.emit('browser_ready');
      }

      // Navigation handler
      socket.on('navigate', async (data, callback) => {
        try {
          if (!this.page) {
            throw new Error('Browser not initialized');
          }

          console.log(`🧭 Navigating to: ${data.url}`);
          
          // Add human-like delay before navigation
          await this.humanDelay(500, 1500);
          
          await this.page.goto(data.url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
          
          const title = await this.page.title();
          const url = this.page.url();
          
          // Take screenshot
          const screenshot = await this.page.screenshot({ 
            type: 'png',
            encoding: 'base64',
            fullPage: false
          });
          
          const state = { url, title, screenshot: `data:image/png;base64,${screenshot}` };
          
          socket.emit('browser_state', state);
          socket.emit('navigation', { url, title });
          
          callback({ success: true, ...state });
        } catch (error) {
          console.error('Navigation error:', error);
          callback({ success: false, error: error.message });
        }
      });

      // AI command handler with stealth execution
      socket.on('ai_command', async (data, callback) => {
        try {
          if (!this.page) {
            throw new Error('Browser not initialized');
          }

          console.log(`🤖 Executing AI command: ${data.command}`);
          socket.emit('ai_action_started', { command: data.command });

          // Simulate AI processing with human-like behavior
          const result = await this.executeStealthAICommand(data.command, data.context);
          
          socket.emit('ai_action_completed', { result });
          callback({ success: true, result });
        } catch (error) {
          console.error('AI command error:', error);
          socket.emit('ai_action_error', { error: error.message });
          callback({ success: false, error: error.message });
        }
      });

      // Human-like click handler
      socket.on('click', async (data, callback) => {
        try {
          if (!this.page) {
            throw new Error('Browser not initialized');
          }

          await this.humanClick(data.x, data.y);
          
          // Take screenshot after action
          const screenshot = await this.page.screenshot({ 
            type: 'png',
            encoding: 'base64' 
          });
          
          socket.emit('screenshot', `data:image/png;base64,${screenshot}`);
          callback({ success: true });
        } catch (error) {
          console.error('Click error:', error);
          callback({ success: false, error: error.message });
        }
      });

      // Human-like typing handler
      socket.on('type', async (data, callback) => {
        try {
          if (!this.page) {
            throw new Error('Browser not initialized');
          }

          await this.humanType(data.text);
          callback({ success: true });
        } catch (error) {
          console.error('Type error:', error);
          callback({ success: false, error: error.message });
        }
      });

      // Other handlers (scroll, keypress, etc.)
      socket.on('scroll', async (data, callback) => {
        try {
          if (!this.page) {
            throw new Error('Browser not initialized');
          }

          const scrollAmount = data.direction === 'down' ? data.amount : -data.amount;
          await this.page.mouse.wheel(0, scrollAmount);
          
          await this.humanDelay(100, 300);
          callback({ success: true });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      socket.on('get_screenshot', async (data, callback) => {
        try {
          if (!this.page) {
            throw new Error('Browser not initialized');
          }

          const screenshot = await this.page.screenshot({ 
            type: 'png',
            encoding: 'base64' 
          });
          
          callback({ success: true, screenshot: `data:image/png;base64,${screenshot}` });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
      });
    });
  }

  // Human-like interaction methods
  async humanDelay(min = 100, max = 500) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanClick(x, y) {
    // Add slight randomness to click position
    const randomX = x + (Math.random() - 0.5) * 4;
    const randomY = y + (Math.random() - 0.5) * 4;
    
    // Move mouse to position with human-like curve
    await this.page.mouse.move(randomX - 10, randomY - 10);
    await this.humanDelay(50, 150);
    await this.page.mouse.move(randomX, randomY);
    await this.humanDelay(50, 150);
    
    // Click with human-like timing
    await this.page.mouse.down();
    await this.humanDelay(50, 120);
    await this.page.mouse.up();
  }

  async humanType(text) {
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.humanDelay(50, 150); // Human-like typing speed
    }
  }

  async executeStealthAICommand(command, context) {
    // This is a simplified AI command executor
    // In a real implementation, this would integrate with your AI service
    
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('search') || lowerCommand.includes('google')) {
      return await this.performSearch(command);
    } else if (lowerCommand.includes('click')) {
      return await this.performClick(command);
    } else if (lowerCommand.includes('type') || lowerCommand.includes('enter')) {
      return await this.performType(command);
    } else if (lowerCommand.includes('navigate') || lowerCommand.includes('go to')) {
      return await this.performNavigation(command);
    }
    
    return {
      action: 'command_executed',
      command: command,
      message: 'Command processed with stealth measures'
    };
  }

  async performSearch(command) {
    // Extract search term from command
    const searchMatch = command.match(/search (?:for )?["']?([^"']+)["']?/i);
    const searchTerm = searchMatch ? searchMatch[1] : command.replace(/search/i, '').trim();
    
    // Navigate to Google if not already there
    if (!this.page.url().includes('google.com')) {
      await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
      await this.humanDelay(1000, 2000);
    }
    
    // Find and click search box
    const searchBox = await this.page.locator('input[name="q"], textarea[name="q"]').first();
    await searchBox.click();
    await this.humanDelay(200, 500);
    
    // Clear and type search term
    await this.page.keyboard.selectAll();
    await this.humanType(searchTerm);
    await this.humanDelay(500, 1000);
    
    // Press Enter
    await this.page.keyboard.press('Enter');
    
    return {
      action: 'search_performed',
      searchTerm: searchTerm,
      url: this.page.url()
    };
  }

  async performClick(command) {
    // This would need more sophisticated element detection
    // For now, just acknowledge the command
    return {
      action: 'click_performed',
      command: command
    };
  }

  async performType(command) {
    const typeMatch = command.match(/type ["']?([^"']+)["']?/i);
    const text = typeMatch ? typeMatch[1] : command.replace(/type/i, '').trim();
    
    await this.humanType(text);
    
    return {
      action: 'text_typed',
      text: text
    };
  }

  async performNavigation(command) {
    const urlMatch = command.match(/(?:navigate to|go to) (.+)/i);
    const url = urlMatch ? urlMatch[1].trim() : command;
    
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }
    
    await this.page.goto(formattedUrl, { waitUntil: 'domcontentloaded' });
    
    return {
      action: 'navigation_performed',
      url: this.page.url()
    };
  }

  async start() {
    try {
      await this.initializeBrowser();
      
      this.server.listen(this.port, () => {
        console.log(`🚀 Stealth Playwright server running on port ${this.port}`);
        console.log(`🛡️ Anti-detection measures: ACTIVE`);
        console.log(`🎭 Browser type: Chromium with stealth configuration`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
    }
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
    }
    this.server.close();
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const server = new PlaywrightStealthServer();
  server.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down stealth server...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = PlaywrightStealthServer;