// src/services/VectorClient.ts
import axios from 'axios';

// Define the API base URL with fallback to localhost if the configured URL fails
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Define types for the API responses
export interface VectorSearchResult {
  title: string;
  url: string;
  source: string;
  subsource: string;
  summary: string;
  similarity_score: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  sources: VectorSearchResult[];
}

class VectorClient {
  private apiBaseUrl: string;
  private usingFallback: boolean = false;

  constructor(baseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = baseUrl;
    console.log('VectorClient initialized with base URL:', this.apiBaseUrl);
  }

  // Switch to localhost if the remote URL fails
  private async switchToLocalIfNeeded() {
    if (!this.usingFallback && !this.apiBaseUrl.includes('localhost')) {
      try {
        // Try the configured URL first
        await axios.get(`${this.apiBaseUrl}/health`, { timeout: 3000 });
      } catch (error) {
        console.warn('Remote API unavailable, switching to local development server');
        this.apiBaseUrl = 'http://localhost:8000';
        this.usingFallback = true;
        console.log('Using fallback URL:', this.apiBaseUrl);
      }
    }
  }

  // Health check to verify API connection
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.switchToLocalIfNeeded();
      const response = await axios.get(`${this.apiBaseUrl}/api/health`);
      return response.data;
    } catch (error) {
      // If we're not already using the fallback, try localhost
      if (!this.usingFallback) {
        this.apiBaseUrl = 'http://localhost:8000';
        this.usingFallback = true;
        console.log('Switched to fallback URL after error:', this.apiBaseUrl);
        try {
          const response = await axios.get(`${this.apiBaseUrl}/api/health`);
          return response.data;
        } catch (fallbackError) {
          console.error('Health check failed on fallback URL too:', fallbackError);
          throw fallbackError;
        }
      }
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Search vectors with a text query
  async searchVectors(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Searching vectors with query: "${query}", limit: ${limit} at ${this.apiBaseUrl}`);
      const response = await axios.post(`${this.apiBaseUrl}/api/search`, {
        query,
        limit
      });
      
      console.log('Search response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error searching vectors:', error);
      throw error;
    }
  }
  
  // Get sample search results for "economic data"
  async getSampleSearchResults(): Promise<VectorSearchResult[]> {
    try {
      await this.switchToLocalIfNeeded();
      console.log('Fetching sample search results from', this.apiBaseUrl);
      const response = await axios.get(`${this.apiBaseUrl}/api/sample-search`);
      
      console.log('Sample search response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching sample search results:', error);
      throw error;
    }
  }

  // Send a message to the chat endpoint
  async sendChatMessage(
    query: string,
    chatHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Sending chat message: "${query}" to ${this.apiBaseUrl}`);
      const response = await axios.post(`${this.apiBaseUrl}/api/chat`, {
        query,
        chat_history: chatHistory
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new VectorClient();