import vectorClient, { 
    ChatMessage, 
    VectorSearchResult, 
    SearchParams 
  } from './VectorClient';
  
  export interface ChatResponse {
    message: ChatMessage;
    sources: VectorSearchResult[];
  }
  
  /**
   * Service to handle RAG (Retrieval Augmented Generation) chat functionality
   * Uses vector search to retrieve context for the AI and maintains conversation history
   */
  class ChatService {
    private searchLimit: number = 3;
    private vectorWeight: number = 0.7; // Slightly favor vector search over knowledge graph
    
    /**
     * Retrieve relevant documents based on a query
     */
    async retrieveContext(query: string): Promise<VectorSearchResult[]> {
      try {
        // Use hybrid search for best results
        const searchParams: SearchParams = {
          query,
          limit: this.searchLimit,
          vector_weight: this.vectorWeight,
          merge_method: 'weighted'
        };
        
        const results = await vectorClient.searchHybrid(searchParams);
        return results;
      } catch (error) {
        console.error('Error retrieving context:', error);
        return [];
      }
    }
    
    /**
     * Generate a chat response with context from the knowledge base
     */
    async generateResponse(
      query: string, 
      chatHistory: ChatMessage[]
    ): Promise<ChatResponse> {
      try {
        // First retrieve relevant context from the knowledge base
        const contextDocs = await this.retrieveContext(query);
        
        // Now send the query, chat history, and context to the chat endpoint
        const response = await vectorClient.sendChatMessage(query, chatHistory);
        
        // Return both the message and the source documents
        return {
          message: {
            role: 'assistant',
            content: response.response
          },
          sources: contextDocs
        };
      } catch (error) {
        console.error('Error generating chat response:', error);
        
        // Return an error message
        return {
          message: {
            role: 'assistant',
            content: `I'm sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : String(error)}`
          },
          sources: []
        };
      }
    }
  }
  
  // Export a singleton instance
  export default new ChatService();