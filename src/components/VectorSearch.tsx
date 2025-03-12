// // src/pages/VectorSearch.tsx
// import React, { useState, useEffect } from 'react';
// import vectorClient, { VectorSearchResult, ChatMessage, SearchParams } from '../services/VectorClient';
// import Layout from '../components/Layout';
// import ChatInterface from '../components/ChatInterface';
// import SearchSection from '../components/SearchSection';
// import SearchResults from '../components/SearchResults';
// import AboutTool from '../components/AboutTool';
// import { SearchMode, MergeMethod } from '../components/SearchOptions';

// const VectorSearch: React.FC = () => {
//   // State for vector search
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
//   const [isSearching, setIsSearching] = useState<boolean>(false);
//   const [searchError, setSearchError] = useState<string | null>(null);
  
//   // State for search parameters
//   const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
//   const [vectorWeight, setVectorWeight] = useState<number>(0.5);
//   const [mergeMethod, setMergeMethod] = useState<MergeMethod>('weighted');
//   const [searchLimit, setSearchLimit] = useState<number>(5);
  
//   // State for API capabilities
//   const [apiCapabilities, setApiCapabilities] = useState<{
//     vector_search_available: boolean;
//     knowledge_graph_available: boolean;
//   }>({
//     vector_search_available: true,
//     knowledge_graph_available: true
//   });
  
//   // State for advanced search options visibility
//   const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  
//   // State for chat
//   const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
//   const [currentMessage, setCurrentMessage] = useState<string>('');
//   const [isLoading, setIsLoading] = useState<boolean>(false);
  
//   // Log env variables for debugging
//   useEffect(() => {
//     console.log('Environment check:');
//     console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'Not set');
//     console.log('Mode:', import.meta.env.MODE);
//     console.log('Production?', import.meta.env.PROD);
    
//     // Check API capabilities
//     vectorClient.getDebugInfo()
//       .then(info => {
//         if (info.search_capabilities) {
//           setApiCapabilities(info.search_capabilities);
          
//           // Set appropriate default search mode based on available capabilities
//           if (!info.search_capabilities.vector_search_available && info.search_capabilities.knowledge_graph_available) {
//             setSearchMode('kg');
//           } else if (info.search_capabilities.vector_search_available && !info.search_capabilities.knowledge_graph_available) {
//             setSearchMode('vector');
//           }
//         }
//       })
//       .catch(error => console.error('Failed to get API capabilities:', error));
    
//     // Optional: Perform initial health check
//     vectorClient.healthCheck()
//       .then(response => console.log('API Health Status:', response))
//       .catch(error => console.error('API Health Check Failed:', error));
//   }, []);
  
//   // Handle search submission
//   const handleSearch = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!searchQuery.trim()) return;
    
//     try {
//       setIsSearching(true);
//       setSearchError(null);
      
//       let results: VectorSearchResult[] = [];
//       const searchParams: SearchParams = {
//         query: searchQuery,
//         limit: searchLimit,
//         vector_weight: vectorWeight,
//         merge_method: mergeMethod
//       };
      
//       // Choose search method based on selected mode
//       switch (searchMode) {
//         case 'hybrid':
//           results = await vectorClient.searchHybrid(searchParams);
//           break;
//         case 'vector':
//           results = await vectorClient.searchVectorOnly(searchParams);
//           break;
//         case 'kg':
//           results = await vectorClient.searchKnowledgeGraphOnly(searchParams);
//           break;
//       }
      
//       setSearchResults(results);
      
//       // If no results found
//       if (results.length === 0) {
//         setSearchError('No results found. Try a different search term or search method.');
//       }
//     } catch (error) {
//       console.error('Search error:', error);
//       setSearchError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
//     } finally {
//       setIsSearching(false);
//     }
//   };
  
//   // Handle chat message submission
//   const handleChatSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!currentMessage.trim()) return;
    
//     // Add user message to chat
//     const userMessage: ChatMessage = {
//       role: 'user',
//       content: currentMessage
//     };
    
//     setChatMessages(prev => [...prev, userMessage]);
//     setCurrentMessage('');
//     setIsLoading(true);
    
//     try {
//       // This is just a placeholder until the RAG chat is implemented
//       // In the future, this will use the actual chat endpoint
//       const chatHistory = chatMessages.map(msg => ({
//         role: msg.role,
//         content: msg.content
//       }));
      
//       // Send message to chat API
//       const response = await vectorClient.sendChatMessage(currentMessage, chatHistory);
      
//       // Add assistant response to chat
//       const assistantMessage: ChatMessage = {
//         role: 'assistant',
//         content: response.response
//       };
      
//       setChatMessages(prev => [...prev, assistantMessage]);
      
//       // If there are sources, also update search results
//       if (response.sources && response.sources.length > 0) {
//         setSearchResults(response.sources);
//       }
//     } catch (error) {
//       console.error('Chat error:', error);
      
//       // Add error message to chat
//       const errorMessage: ChatMessage = {
//         role: 'assistant',
//         content: `Error: ${error instanceof Error ? error.message : String(error)}`
//       };
      
//       setChatMessages(prev => [...prev, errorMessage]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Layout 
//       title="Hybrid Search & RAG Chat"
//       subtitle="Search our knowledge base using vector similarity and knowledge graph"
//     >
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Chat Interface */}
//         <ChatInterface
//           chatMessages={chatMessages}
//           currentMessage={currentMessage}
//           setCurrentMessage={setCurrentMessage}
//           isLoading={isLoading}
//           onSubmit={handleChatSubmit}
//         />
        
//         {/* Search Column */}
//         <div className="lg:col-span-2">
//           {/* Search Section */}
//           <SearchSection
//             searchQuery={searchQuery}
//             setSearchQuery={setSearchQuery}
//             isSearching={isSearching}
//             onSearch={handleSearch}
//             searchMode={searchMode}
//             setSearchMode={setSearchMode}
//             showAdvancedOptions={showAdvancedOptions}
//             setShowAdvancedOptions={setShowAdvancedOptions}
//             vectorWeight={vectorWeight}
//             setVectorWeight={setVectorWeight}
//             mergeMethod={mergeMethod}
//             setMergeMethod={setMergeMethod}
//             searchLimit={searchLimit}
//             setSearchLimit={setSearchLimit}
//             apiCapabilities={apiCapabilities}
//           />
          
//           {/* Search Results */}
//           <SearchResults
//             results={searchResults}
//             isSearching={isSearching}
//             searchError={searchError}
//           />
//         </div>
//       </div>
      
//       {/* About This Tool */}
//       <AboutTool />
//     </Layout>
//   );
// };

// export default VectorSearch;