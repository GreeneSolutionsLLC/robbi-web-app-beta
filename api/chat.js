// Vercel Function for NinjaTech AI Chat
// Updated with REAL NinjaTech AI integration

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get API key from environment variables
  const ninjaApiKey = process.env.NINJA_API_KEY || 'Sysqehl.-IkbwIILsvXrkJVgpg7SBjcLUYX6zFh38Xu3vawbndM';
  
  // Verify API key from request headers
  const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== ninjaApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle different endpoints
  if (req.method === 'GET') {
    // Health check endpoint
    if (req.url === '/api/health' || req.url?.includes('health')) {
      return res.status(200).json({ 
        status: 'healthy', 
        service: 'NinjaTech AI Chat API',
        timestamp: new Date().toISOString(),
        ai_service: 'REAL NinjaTech AI - api.myninja.ai'
      });
    }

    // Default GET response
    return res.status(200).json({ 
      message: 'NinjaTech AI Chat API is running',
      endpoints: ['/api/chat (POST)', '/api/health (GET)'],
      ai_service: 'REAL NinjaTech AI Integration'
    });
  }

  // Handle POST requests for chat
  if (req.method === 'POST') {
    try {
      const { message, model = 'ninja-super-agent:turbo' } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log('🤖 Calling REAL NinjaTech AI:', message);

      // Call the REAL NinjaTech AI API
      const ninjaResponse = await fetch('https://api.myninja.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ninjaApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: message
            }
          ],
          stream: false
        })
      });

      if (!ninjaResponse.ok) {
        console.error('❌ NinjaTech AI API Error:', ninjaResponse.status, ninjaResponse.statusText);
        
        // Fallback response if API fails
        return res.status(200).json({
          response: `I'm having trouble connecting to the AI service right now. However, I can still help you with basic questions. You asked: "${message}". Could you try rephrasing your question or ask me something else?`,
          success: true,
          source: 'fallback',
          timestamp: new Date().toISOString()
        });
      }

      const aiData = await ninjaResponse.json();
      console.log('✅ NinjaTech AI Response received');

      // Extract the AI response
      const aiMessage = aiData.choices?.[0]?.message?.content || 
                       aiData.response || 
                       'I received your message but had trouble generating a response. Please try again.';

      return res.status(200).json({
        response: aiMessage,
        success: true,
        source: 'ninjatech_ai',
        model: model,
        timestamp: new Date().toISOString(),
        usage: aiData.usage || null
      });

    } catch (error) {
      console.error('❌ Chat API Error:', error);

      // Intelligent fallback based on message content
      const { message } = req.body;
      let fallbackResponse = "I'm experiencing some technical difficulties right now, but I'm still here to help! ";

      if (message?.toLowerCase().includes('hello') || message?.toLowerCase().includes('hi')) {
        fallbackResponse += "Hello! I'm Robbi, your AI assistant. How can I help you today?";
      } else if (message?.toLowerCase().includes('help')) {
        fallbackResponse += "I can help you with automation, web scraping, data processing, and business workflows. What specific task are you working on?";
      } else if (message?.toLowerCase().includes('what') && message?.toLowerCase().includes('do')) {
        fallbackResponse += "I specialize in browser automation, data analysis, API integrations, and repetitive task automation. I can save you time on manual processes!";
      } else {
        fallbackResponse += `You asked about: "${message}". While I'm having connectivity issues, I'd be happy to help once the connection is restored. Please try again in a moment.`;
      }

      return res.status(200).json({
        response: fallbackResponse,
        success: true,
        source: 'fallback',
        timestamp: new Date().toISOString(),
        note: 'Temporary fallback response - AI service will be restored shortly'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}