// src/pages/VectorSearch.tsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import vectorClient, { VectorSearchResult, ChatMessage } from '../services/VectorClient';

const VectorSearch: React.FC = () => {
  // Theme context
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  // State for vector search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // State for chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Reference for chat container to auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Log env variables for debugging
  useEffect(() => {
    console.log('Environment check:');
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'Not set');
    console.log('Mode:', import.meta.env.MODE);
    console.log('Production?', import.meta.env.PROD);
    
    // Optional: Perform initial health check
    vectorClient.healthCheck()
      .then(response => console.log('API Health Status:', response))
      .catch(error => console.error('API Health Check Failed:', error));
  }, []);
  
  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Handle search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setSearchError(null);
      
      const results = await vectorClient.searchVectors(searchQuery);
      setSearchResults(results);
      
      // If no results found
      if (results.length === 0) {
        setSearchError('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle chat message submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    
    try {
      // This is just a placeholder until the RAG chat is implemented
      // In the future, this will use the actual chat endpoint
      const chatHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Send message to chat API
      const response = await vectorClient.sendChatMessage(currentMessage, chatHistory);
      
      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // If there are sources, also update search results
      if (response.sources && response.sources.length > 0) {
        setSearchResults(response.sources);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg transition-colors duration-300">
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      
      {/* Header */}
      <header className="bg-oddBlock dark:bg-oddBlockDark p-8 mb-8 transition-colors duration-300">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-textDark dark:text-textLight">
          Vector Search & RAG Chat
        </h1>
        <p className="text-center mt-2 text-textDark dark:text-textLight opacity-80">
          Search our knowledge base and chat with data-backed AI
        </p>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chat Interface */}
          <div className="lg:col-span-1 bg-oddBlock dark:bg-oddBlockDark rounded-lg shadow-md transition-colors duration-300 flex flex-col h-[600px]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-bold text-textDark dark:text-textLight">
                Chat Assistant
              </h2>
              <p className="text-sm text-textDark dark:text-textLight opacity-70 mt-1">
                Ask questions about our knowledge base
              </p>
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
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg max-w-[85%] ${
                      message.role === 'user' 
                        ? 'bg-blue-100 dark:bg-blue-900 ml-auto text-textDark dark:text-textLight' 
                        : 'bg-gray-100 dark:bg-gray-700 mr-auto text-textDark dark:text-textLight'
                    }`}
                  >
                    {message.content}
                  </div>
                ))
              )}
              
              {isLoading && (
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
                  Send
                </button>
              </form>
            </div>
          </div>
          
          {/* Right Column - Vector Search */}
          <div className="lg:col-span-2">
            {/* Search Box */}
            <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md mb-6 transition-colors duration-300">
              <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
                Search Knowledge Base
              </h2>
              
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for information..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none text-textDark dark:text-textLight"
                  disabled={isSearching}
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>
            
            {/* Search Results */}
            <div className="bg-oddBlock dark:bg-oddBlockDark p-6 rounded-lg shadow-md transition-colors duration-300">
              <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
                {searchResults.length > 0 
                  ? 'Search Results' 
                  : 'Knowledge Base Entries'}
              </h2>
              
              {isSearching ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-evenBlock dark:bg-evenBlockDark h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-evenBlock dark:bg-evenBlockDark rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-evenBlock dark:bg-evenBlockDark rounded"></div>
                        <div className="h-4 bg-evenBlock dark:bg-evenBlockDark rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : searchError ? (
                <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
                  <p className="text-red-700 dark:text-red-300">{searchError}</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center p-12">
                  <p className="text-textDark dark:text-textLight">
                    No search results to display. Try searching for something!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {searchResults.map((result, index) => (
                    <div 
                      key={index} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-textDark dark:text-textLight">
                          {result.title}
                        </h3>
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                          {(result.similarity_score * 100).toFixed(1)}% match
                        </span>
                      </div>
                      
                      <p className="text-textDark dark:text-textLight mb-3">
                        {result.summary}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 text-sm text-textDark dark:text-textLight opacity-70">
                        <span>Source: {result.source}</span>
                        {result.subsource && (
                          <span>• {result.subsource}</span>
                        )}
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-auto text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Source
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* About This Tool */}
        <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md mt-8 transition-colors duration-300">
          <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
            About This Tool
          </h2>
          <p className="text-textDark dark:text-textLight mb-4">
            This tool allows you to search through our knowledge base using vector similarity search. 
            The system uses embeddings stored in a Pinecone vector database to find the most relevant 
            information based on your query's semantic meaning, not just keyword matching.
          </p>
          <p className="text-textDark dark:text-textLight">
            Coming soon: A fully-featured RAG (Retrieval Augmented Generation) chat interface
            that will allow you to have conversations with an AI assistant backed by our knowledge base,
            with sources and citations for all information provided.
          </p>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-oddBlock dark:bg-oddBlockDark py-4 px-6 text-center text-textDark dark:text-textLight transition-colors duration-300">
        <p className="opacity-70 text-sm">© 2025 Knowledge Base Search. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default VectorSearch;