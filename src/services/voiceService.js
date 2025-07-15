// Official Hume.ai TTS Voice Service
// Based on official Hume.ai TTS API documentation

class HumeTTSVoiceService {
  constructor() {
    this.humeApiKey = process.env.REACT_APP_HUME_API_KEY || 'BNW4AhGAR9MfntovVtSeg5TglLpYy8iszfJEvQjT1GzPjiRe';
    this.isEnabled = false;
    this.isPlaying = false;
    this.currentAudio = null;
    this.baseURL = 'https://api.hume.ai/v0/tts';
    
    // Ito voice configuration
    this.itoVoice = {
      name: "ITO",
      provider: "HUME_AI"
    };
  }

  setApiKey(apiKey) {
    this.humeApiKey = apiKey;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.stopCurrentAudio();
  }

  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.isEnabled;
  }

  stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  async textToSpeech(text) {
    if (!this.isEnabled || !this.humeApiKey) {
      console.log('Voice service not enabled or API key missing');
      return { success: false, error: 'Voice service not configured' };
    }

    try {
      console.log('🎤 Converting text to speech with Hume.ai TTS (Ito voice):', text.substring(0, 50) + '...');
      
      // Use the official Hume.ai TTS API
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': this.humeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          utterances: [
            {
              text: text,
              description: "Clear, warm, and friendly voice with natural intonation and professional delivery",
              voice: this.itoVoice
            }
          ],
          format: {
            type: "mp3"
          },
          num_generations: 1,
          instant_mode: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hume TTS API Error:', errorText);
        throw new Error(`TTS request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.generations && data.generations.length > 0) {
        const generation = data.generations[0];
        
        if (generation.audio) {
          // Convert base64 audio to blob
          const audioData = atob(generation.audio);
          const audioArray = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            audioArray[i] = audioData.charCodeAt(i);
          }
          const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          console.log('✅ Successfully generated Hume TTS audio');
          return { 
            success: true, 
            audioUrl,
            duration: generation.duration,
            generationId: generation.generation_id
          };
        } else {
          throw new Error('No audio data in TTS response');
        }
      } else {
        throw new Error('No generations in TTS response');
      }
    } catch (error) {
      console.error('❌ Hume TTS error:', error);
      return { success: false, error: error.message };
    }
  }

  async playText(text) {
    if (!this.isEnabled) {
      return { success: false, error: 'Voice service disabled' };
    }

    // Stop any currently playing audio
    this.stopCurrentAudio();

    try {
      const result = await this.textToSpeech(text);
      
      if (!result.success) {
        return result;
      }

      return new Promise((resolve) => {
        this.currentAudio = new Audio(result.audioUrl);
        this.isPlaying = true;

        this.currentAudio.onended = () => {
          this.isPlaying = false;
          this.currentAudio = null;
          URL.revokeObjectURL(result.audioUrl);
          resolve({ success: true, duration: result.duration });
        };

        this.currentAudio.onerror = (error) => {
          this.isPlaying = false;
          this.currentAudio = null;
          URL.revokeObjectURL(result.audioUrl);
          resolve({ success: false, error: 'Audio playback failed' });
        };

        this.currentAudio.play().catch((error) => {
          this.isPlaying = false;
          this.currentAudio = null;
          URL.revokeObjectURL(result.audioUrl);
          resolve({ success: false, error: 'Failed to play audio' });
        });
      });
    } catch (error) {
      console.error('❌ Play text error:', error);
      return { success: false, error: error.message };
    }
  }

  // Alternative method using Web Speech API as fallback
  async playTextFallback(text) {
    if (!this.isEnabled) {
      return { success: false, error: 'Voice service disabled' };
    }

    try {
      // Check if browser supports speech synthesis
      if (!('speechSynthesis' in window)) {
        return { success: false, error: 'Speech synthesis not supported' };
      }

      this.stopCurrentAudio();

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to use a more natural voice if available
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Google') || 
          voice.name.includes('Microsoft') ||
          voice.lang.startsWith('en')
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          this.isPlaying = false;
          resolve({ success: true });
        };

        utterance.onerror = (error) => {
          this.isPlaying = false;
          resolve({ success: false, error: error.error });
        };

        this.isPlaying = true;
        speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.error('❌ Fallback speech error:', error);
      return { success: false, error: error.message };
    }
  }

  async speakResponse(text) {
    console.log('🔊 Attempting to speak response with Hume.ai TTS...');
    
    if (!this.isEnabled) {
      console.log('Voice service is disabled');
      return { success: false, error: 'Voice service disabled' };
    }
    
    // Try Hume.ai TTS first
    let result = await this.playText(text);
    
    if (!result.success) {
      console.log('🔄 Hume.ai TTS failed, trying Web Speech API fallback...', result.error);
      result = await this.playTextFallback(text);
    }

    if (result.success) {
      console.log('✅ Successfully played audio response');
    } else {
      console.error('❌ All voice methods failed:', result.error);
    }

    return result;
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      playing: this.isPlaying,
      hasApiKey: !!this.humeApiKey,
      voice: this.itoVoice
    };
  }
}

// Create singleton instance
const humeTTSVoiceService = new HumeTTSVoiceService();

export default humeTTSVoiceService;