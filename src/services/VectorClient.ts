// src/services/VectorClient.ts
import axios from 'axios';

// Define the API base URL with fallback to localhost if the configured URL fails
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Updated interface to match the new response format
export interface VectorSearchResult {
  doc_id?: string;
  title: string;
  url: string;
  source?: string;
  subsource?: string;
  summary?: string;
  search_type: string;
  similarity_score?: number;
  relevance_score?: number;
  combined_score?: number;
  matched_entity?: string;
  graph_context?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  sources: VectorSearchResult[];
}

// Search parameters for hybrid search
export interface SearchParams {
  query: string;
  limit?: number;
  vector_weight?: number;
  merge_method?: 'weighted' | 'interleave' | 'separate';
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
        await axios.get(`${this.apiBaseUrl}/api/health`, { timeout: 3000 });
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

  // Get debug info about the API
  async getDebugInfo(): Promise<any> {
    try {
      await this.switchToLocalIfNeeded();
      const response = await axios.get(`${this.apiBaseUrl}/api/debug`);
      return response.data;
    } catch (error) {
      console.error('Error getting debug info:', error);
      throw error;
    }
  }

  // Search using the hybrid approach (vector + knowledge graph)
  async searchHybrid(params: SearchParams): Promise<VectorSearchResult[]> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Searching with hybrid approach: "${params.query}" at ${this.apiBaseUrl}`);
      
      const response = await axios.post(`${this.apiBaseUrl}/api/search`, {
        query: params.query,
        limit: params.limit || 5,
        vector_weight: params.vector_weight || 0.5,
        merge_method: params.merge_method || 'weighted'
      });
      
      console.log('Hybrid search response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }
  
  // Legacy method - now simply calls searchHybrid with default parameters
  async searchVectors(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    return this.searchHybrid({ query, limit });
  }
  
  // Vector-only search
  async searchVectorOnly(params: SearchParams): Promise<VectorSearchResult[]> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Searching vector-only: "${params.query}" at ${this.apiBaseUrl}`);
      
      const response = await axios.post(`${this.apiBaseUrl}/api/vector-search`, {
        query: params.query,
        limit: params.limit || 5
      });
      
      console.log('Vector-only search response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in vector-only search:', error);
      throw error;
    }
  }
  
  // Knowledge graph-only search
  async searchKnowledgeGraphOnly(params: SearchParams): Promise<VectorSearchResult[]> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Searching knowledge graph-only: "${params.query}" at ${this.apiBaseUrl}`);
      
      const response = await axios.post(`${this.apiBaseUrl}/api/kg-search`, {
        query: params.query,
        limit: params.limit || 5
      });
      
      console.log('Knowledge graph-only search response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in knowledge graph-only search:', error);
      throw error;
    }
  }
  
  // Get sample search results (compatibility method that now uses hybrid search)
  async getSampleSearchResults(): Promise<VectorSearchResult[]> {
    try {
      // Instead of using the specific endpoint, use the hybrid search with a default query
      return this.searchHybrid({ 
        query: "economic data and statistics",
        limit: 5 
      });
    } catch (error) {
      console.error('Error fetching sample search results:', error);
      throw error;
    }
  }

  // Send a message to the chat endpoint with RAG support
  async sendChatMessage(
    query: string,
    chatHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Sending chat message: "${query}" to ${this.apiBaseUrl}`);
      
      // First, get relevant context from vector search
      const searchResults = await this.searchHybrid({
        query,
        limit: 3, // Limit context to 3 most relevant documents
        vector_weight: 0.7 // Prioritize semantic similarity over knowledge graph
      });
      
      // Then, send the chat request with context
      const response = await axios.post(`${this.apiBaseUrl}/api/chat`, {
        query,
        chat_history: chatHistory,
        context: searchResults // Include the search results as context
      });
      
      // Return both the response and sources
      return {
        response: response.data.response,
        sources: searchResults
      };
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }
  
  // Stream a chat message response (for future implementation)
  async streamChatMessage(
    query: string,
    chatHistory: ChatMessage[] = [],
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    try {
      await this.switchToLocalIfNeeded();
      console.log(`Streaming chat message: "${query}" at ${this.apiBaseUrl}`);
      
      // Get context first
      const searchResults = await this.searchHybrid({
        query,
        limit: 3,
        vector_weight: 0.7
      });
      
      // This is a placeholder until the streaming endpoint is implemented
      // For now, we'll simulate streaming by breaking the response into chunks
      const response = await this.sendChatMessage(query, chatHistory);
      
      // Simulate streaming by splitting by spaces and sending chunks
      const words = response.response.split(' ');
      let accumulatedResponse = '';
      
      for (let i = 0; i < words.length; i++) {
        // Add the word and a space
        accumulatedResponse += words[i] + (i < words.length - 1 ? ' ' : '');
        
        // Send the accumulated response
        onChunk(accumulatedResponse);
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      return {
        response: response.response,
        sources: searchResults
      };
    } catch (error) {
      console.error('Error streaming chat message:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new VectorClient();