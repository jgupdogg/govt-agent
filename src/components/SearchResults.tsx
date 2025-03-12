import React from 'react';
import { VectorSearchResult } from '../services/VectorClient';
import ResultCard from './ResultCard';

interface SearchResultsProps {
  results: VectorSearchResult[];
  isSearching: boolean;
  searchError: string | null;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isSearching,
  searchError
}) => {
  return (
    <div className="bg-oddBlock dark:bg-oddBlockDark p-6 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
        {results.length > 0 
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
      ) : results.length === 0 ? (
        <div className="text-center p-12">
          <p className="text-textDark dark:text-textLight">
            No search results to display. Try searching for something!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {results.map((result, index) => (
            <ResultCard key={index} result={result} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;