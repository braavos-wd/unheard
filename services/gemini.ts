import { GoogleGenerativeAI } from '@google/generative-ai';

// Utility function to decode base64 to ArrayBuffer
function decodeBase64(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * GEMINI SERVICE
 * Handles all interactions with the Google Gemini AI API
 */
class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any; // Using any to bypass TypeScript issues with the SDK

  private constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for Gemini service');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  public static getInstance(apiKey?: string): GeminiService {
    if (!GeminiService.instance && apiKey) {
      GeminiService.instance = new GeminiService(apiKey);
    } else if (!GeminiService.instance) {
      throw new Error('GeminiService must be initialized with an API key first');
    }
    return GeminiService.instance;
  }

  public static initialize(apiKey: string): void {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService(apiKey);
    }
  }

  /**
   * Transcribe audio and format it into a structured reflection
   */
  public async transcribeAndFormat(audioBase64: string): Promise<{ title: string; content: string }> {
    try {
      // Remove data URL prefix if present
      const base64Data = audioBase64.includes('base64,') 
        ? audioBase64.split(',')[1] 
        : audioBase64;
      
      const mimeType = this.determineMimeType(audioBase64);
      
      // Create a chat session
      const chat = this.model.startChat({
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      // Send the audio as a file
      const result = await chat.sendMessage([
        {
          text: `Please analyze this audio and create a structured reflection with:
          1. A concise, engaging title (max 10 words)
          2. A well-formatted content section with paragraphs
          3. Key insights or action items as bullet points
          
          Format the response as follows:
          
          [Title]: Your Title Here
          [Content]: 
          Your detailed content here with proper paragraphs.
          
          [Key Insights]:
          - Insight 1
          - Insight 2`
        },
        {
          fileData: {
            mimeType,
            fileUri: `data:${mimeType};base64,${base64Data}`
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      return this.parseResponse(text);
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to process audio with Gemini: ' + (error as Error).message);
    }
  }

  /**
   * Parse the response from Gemini into title and content
   */
  private parseResponse(text: string): { title: string; content: string } {
    // Default values
    let title = 'Untitled Reflection';
    let content = 'No content available';

    try {
      // Try to extract title and content using regex
      const titleMatch = text.match(/\[Title\]:\s*(.+?)(?=\n|$)/i);
      const contentMatch = text.match(/\[Content\]:\s*([\s\S]+?)(?=\n\[|$)/i);
      
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      } else {
        // Fallback: Use first line as title if no [Title] tag found
        const firstLine = text.split('\n')[0]?.trim();
        if (firstLine) title = firstLine;
      }

      if (contentMatch && contentMatch[1]) {
        content = contentMatch[1].trim();
      } else {
        // Fallback: Use everything after the title as content
        const contentStart = text.indexOf('\n');
        if (contentStart > 0) {
          content = text.substring(contentStart).trim();
        }
      }
    } catch (e) {
      console.warn('Error parsing Gemini response, using fallback formatting', e);
      content = text.trim();
    }

    return { title, content };
  }

  /**
   * Determine MIME type from base64 string
   */
  private determineMimeType(base64: string): string {
    // Default to WAV, but you can extend this to detect other formats
    if (base64.startsWith('data:audio/wav')) return 'audio/wav';
    if (base64.startsWith('data:audio/mp3')) return 'audio/mp3';
    if (base64.startsWith('data:audio/mpeg')) return 'audio/mpeg';
    if (base64.startsWith('data:audio/ogg')) return 'audio/ogg';
    if (base64.startsWith('data:audio/webm')) return 'audio/webm';
    return 'audio/wav'; // default
  }
}

// Initialize with environment variable
const API_KEY = (() => {
  // In browser, check for globally defined API key
  if (typeof window !== 'undefined' && (window as any).API_KEY) {
    return (window as any).API_KEY;
  }
  // In Node.js, check environment variables
  if (typeof process !== 'undefined' && process.env) {
    return process.env.API_KEY;
  }
  return null;
})();

// Only initialize if API key is available
if (API_KEY) {
  try {
    GeminiService.initialize(API_KEY);
  } catch (error) {
    console.error('Failed to initialize Gemini service:', error);
  }
}

// Export a singleton instance
export const geminiService = GeminiService.getInstance();