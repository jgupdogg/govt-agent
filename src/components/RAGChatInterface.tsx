import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType } from '../services/VectorClient';
import EnhancedChatMessage from './EnhancedChatMessage';
import CitationPanel from './CitationPanel';
import chatService from '../services/ChatService';

/**
 * Retrieval Augmented Generation (RAG) Chat Interface that uses 
 * vector search to provide context to the AI assistant
 */
const RAGChatInterface: React.FC = () => {
  // State for chat
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  // State for citations panel
  const [showSourcesPanel, setShowSourcesPanel] = useState<boolean>(false);
  const [currentSources, setCurrentSources] = useState<any[]>([]);
  
  // Reference for chat container to auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Handle chat message submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessageType = {
      role: 'user',
      content: currentMessage
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    
    try {
      // Add a placeholder message while generating
      const placeholderMessage: ChatMessageType = {
        role: 'assistant',
        content: ''
      };
      
      setChatMessages(prev => [...prev, placeholderMessage]);
      setIsStreaming(true);
      
      // Get chat history (excluding the placeholder)
      const chatHistory = chatMessages;
      
      // Use the chat service to generate a response with context
      const response = await chatService.generateResponse(
        userMessage.content, 
        chatHistory
      );
      
      // Replace the placeholder with the actual response
      setChatMessages(prev => [
        ...prev.slice(0, prev.length - 1),
        response.message
      ]);
      
      // Store the sources for the citation panel
      setCurrentSources(response.sources);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessageType = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
      
      // Replace the placeholder with the error message
      setChatMessages(prev => [
        ...prev.slice(0, prev.length - 1),
        errorMessage
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };
  
  // Toggle the sources panel
  const toggleSourcesPanel = () => {
    setShowSourcesPanel(!showSourcesPanel);
  };
  
  return (
    <div className="flex flex-col h-[600px] bg-oddBlock dark:bg-oddBlockDark rounded-lg shadow-md transition-colors duration-300 relative">
      <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-textDark dark:text-textLight">
            RAG Chat Assistant
          </h2>
          <p className="text-sm text-textDark dark:text-textLight opacity-70 mt-1">
            Ask questions about our knowledge base
          </p>
        </div>
        
        {currentSources.length > 0 && (
          <button
            onClick={toggleSourcesPanel}
            className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>View Sources ({currentSources.length})</span>
          </button>
        )}
      </div>
      
      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 text-textDark dark:text-textLight opacity-70">
            <p>Start a conversation by typing a message below</p>
          </div>
        ) : (
          chatMessages.map((message, index) => (
            <EnhancedChatMessage 
              key={index} 
              message={message} 
              isStreaming={isStreaming && index === chatMessages.length - 1}
            />
          ))
        )}
        
        {isLoading && !isStreaming && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-pulse flex space-x-2">
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-600">
        <form onSubmit={handleChatSubmit} className="flex">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none text-textDark dark:text-textLight"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !currentMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
      
      {/* Citation Panel */}
      <CitationPanel 
        sources={currentSources}
        isVisible={showSourcesPanel}
        onClose={() => setShowSourcesPanel(false)}
      />
    </div>
  );
};

export default RAGChatInterface;