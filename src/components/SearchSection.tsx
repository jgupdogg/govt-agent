import React from 'react';
import SearchBar from './SearchBar';
import SearchOptions, { SearchMode, MergeMethod } from './SearchOptions';

interface SearchSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  onSearch: (e: React.FormEvent) => Promise<void>;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: (show: boolean) => void;
  vectorWeight: number;
  setVectorWeight: (weight: number) => void;
  mergeMethod: MergeMethod;
  setMergeMethod: (method: MergeMethod) => void;
  searchLimit: number;
  setSearchLimit: (limit: number) => void;
  apiCapabilities: {
    vector_search_available: boolean;
    knowledge_graph_available: boolean;
  };
}

const SearchSection: React.FC<SearchSectionProps> = ({
  searchQuery,
  setSearchQuery,
  isSearching,
  onSearch,
  searchMode,
  setSearchMode,
  showAdvancedOptions,
  setShowAdvancedOptions,
  vectorWeight,
  setVectorWeight,
  mergeMethod,
  setMergeMethod,
  searchLimit,
  setSearchLimit,
  apiCapabilities
}) => {
  return (
    <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md mb-6 transition-colors duration-300">
      <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
        Search Knowledge Base
      </h2>
      
      <SearchOptions
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
      
      <SearchBar
        query={searchQuery}
        setQuery={setSearchQuery}
        isSearching={isSearching}
        onSearch={onSearch}
      />
    </div>
  );
};

export default SearchSection;