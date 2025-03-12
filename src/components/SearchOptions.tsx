import React from 'react';

// Define search modes
export type SearchMode = 'hybrid' | 'vector' | 'kg';
export type MergeMethod = 'weighted' | 'interleave' | 'separate';

interface SearchOptionsProps {
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

const SearchOptions: React.FC<SearchOptionsProps> = ({
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
    <>
      {/* Search Mode Tabs */}
      <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
        {apiCapabilities.vector_search_available && apiCapabilities.knowledge_graph_available && (
          <button
            className={`py-2 px-4 ${
              searchMode === 'hybrid' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setSearchMode('hybrid')}
          >
            Hybrid Search
          </button>
        )}
        
        {apiCapabilities.vector_search_available && (
          <button
            className={`py-2 px-4 ${
              searchMode === 'vector' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setSearchMode('vector')}
          >
            Vector Only
          </button>
        )}
        
        {apiCapabilities.knowledge_graph_available && (
          <button
            className={`py-2 px-4 ${
              searchMode === 'kg' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setSearchMode('kg')}
          >
            Knowledge Graph
          </button>
        )}
        
        {/* Advanced Options Toggle */}
        <button
          className={`ml-auto py-2 px-4 ${
            showAdvancedOptions
              ? 'text-blue-600 dark:text-blue-400 font-medium' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          {showAdvancedOptions ? '- Advanced' : '+ Advanced'}
        </button>
      </div>
      
      {/* Advanced Search Options */}
      {showAdvancedOptions && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Only show vector weight for hybrid search */}
            {searchMode === 'hybrid' && (
              <div>
                <label className="block text-sm font-medium text-textDark dark:text-textLight mb-1">
                  Vector Weight: {vectorWeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={vectorWeight}
                  onChange={(e) => setVectorWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>KG Only</span>
                  <span>Balanced</span>
                  <span>Vector Only</span>
                </div>
              </div>
            )}
            
            {/* Merge method selector for hybrid search */}
            {searchMode === 'hybrid' && (
              <div>
                <label className="block text-sm font-medium text-textDark dark:text-textLight mb-1">
                  Result Merge Method
                </label>
                <select
                  value={mergeMethod}
                  onChange={(e) => setMergeMethod(e.target.value as MergeMethod)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-textDark dark:text-textLight"
                >
                  <option value="weighted">Weighted (Score-based)</option>
                  <option value="interleave">Interleave (Alternating)</option>
                  <option value="separate">Separate (Grouped)</option>
                </select>
              </div>
            )}
            
            {/* Result limit control */}
            <div>
              <label className="block text-sm font-medium text-textDark dark:text-textLight mb-1">
                Max Results: {searchLimit}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={searchLimit}
                onChange={(e) => setSearchLimit(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchOptions;