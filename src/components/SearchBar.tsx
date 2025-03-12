import React, { useState } from 'react';

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  onSearch: (e: React.FormEvent) => Promise<void>;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  query, 
  setQuery, 
  isSearching, 
  onSearch 
}) => {
  return (
    <form onSubmit={onSearch} className="flex">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for information..."
        className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none text-textDark dark:text-textLight"
        disabled={isSearching}
      />
      <button
        type="submit"
        disabled={isSearching || !query.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSearching ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};

export default SearchBar;