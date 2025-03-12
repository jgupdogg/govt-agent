// src/pages/SolanaTraders.tsx
import React, { useState, useEffect } from 'react';
import vectorClient, { VectorSearchResult, SearchParams } from '../services/VectorClient';
import Layout from '../components/Layout';
import RAGChatInterface from '../components/RAGChatInterface';
import SearchSection from '../components/SearchSection';
import SearchResults from '../components/SearchResults';
import AboutTool from '../components/AboutTool';
import { SearchMode, MergeMethod } from '../components/SearchOptions';

const SolanaTraders: React.FC = () => {
  // State for vector search
  const [searchQuery, setSearchQuery] = useState<string>('economic data and statistics');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // State for search parameters
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [vectorWeight, setVectorWeight] = useState<number>(0.5);
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('weighted');
  const [searchLimit, setSearchLimit] = useState<number>(5);
  
  // State for API capabilities
  const [apiCapabilities, setApiCapabilities] = useState<{
    vector_search_available: boolean;
    knowledge_graph_available: boolean;
  }>({
    vector_search_available: true,
    knowledge_graph_available: true
  });
  
  // State for advanced search options visibility
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  
  // Log env variables for debugging and load initial search
  useEffect(() => {
    console.log('Environment check:');
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'Not set');
    console.log('Mode:', import.meta.env.MODE);
    console.log('Production?', import.meta.env.PROD);
    
    // Check API capabilities
    vectorClient.getDebugInfo()
      .then(info => {
        if (info.search_capabilities) {
          setApiCapabilities(info.search_capabilities);
          
          // Set appropriate default search mode based on available capabilities
          if (!info.search_capabilities.vector_search_available && info.search_capabilities.knowledge_graph_available) {
            setSearchMode('kg');
          } else if (info.search_capabilities.vector_search_available && !info.search_capabilities.knowledge_graph_available) {
            setSearchMode('vector');
          }
        }
      })
      .catch(error => console.error('Failed to get API capabilities:', error));
    
    // Perform initial health check and then perform initial search
    vectorClient.healthCheck()
      .then(response => {
        console.log('API Health Status:', response);
        
        // Instead of using getSampleSearchResults, perform an initial search
        return loadInitialResults();
      })
      .catch(error => {
        console.error('API Connection Failed:', error);
        setSearchError(`Failed to connect to API: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, []);
  
  // Function to load initial search results
  const loadInitialResults = async () => {
    try {
      setIsSearching(true);
      
      // Use the hybrid search directly with our default query
      const results = await vectorClient.searchHybrid({
        query: searchQuery,
        limit: searchLimit,
        vector_weight: vectorWeight,
        merge_method: mergeMethod
      });
      
      console.log('Loaded initial search results:', results);
      setSearchResults(results);
      
      if (results.length === 0) {
        setSearchError('No results found for the initial search query.');
      }
    } catch (error) {
      console.error('Error loading initial results:', error);
      setSearchError(`Failed to load initial results: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setSearchError(null);
      
      let results: VectorSearchResult[] = [];
      const searchParams: SearchParams = {
        query: searchQuery,
        limit: searchLimit,
        vector_weight: vectorWeight,
        merge_method: mergeMethod
      };
      
      // Choose search method based on selected mode
      switch (searchMode) {
        case 'hybrid':
          results = await vectorClient.searchHybrid(searchParams);
          break;
        case 'vector':
          results = await vectorClient.searchVectorOnly(searchParams);
          break;
        case 'kg':
          results = await vectorClient.searchKnowledgeGraphOnly(searchParams);
          break;
      }
      
      setSearchResults(results);
      
      // If no results found
      if (results.length === 0) {
        setSearchError('No results found. Try a different search term or search method.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Layout 
      title="Hybrid Search & RAG Chat"
      subtitle="Search our knowledge base using vector similarity and knowledge graph"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RAG Chat Interface - replaces the old simple chat */}
        <RAGChatInterface />
        
        {/* Search Column */}
        <div className="lg:col-span-2">
          {/* Search Section */}
          <SearchSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearching={isSearching}
            onSearch={handleSearch}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            showAdvancedOptions={showAdvancedOptions}
            setShowAdvancedOptions={setShowAdvancedOptions}
            vectorWeight={vectorWeight}
            setVectorWeight={setVectorWeight}
            mergeMethod={mergeMethod}
            setMergeMethod={setMergeMethod}
            searchLimit={searchLimit}
            setSearchLimit={setSearchLimit}
            apiCapabilities={apiCapabilities}
          />
          
          {/* Search Results */}
          <SearchResults
            results={searchResults}
            isSearching={isSearching}
            searchError={searchError}
          />
        </div>
      </div>
      
      {/* About This Tool */}
      <AboutTool defaultQuery="economic data and statistics" />
    </Layout>
  );
};

export default SolanaTraders;