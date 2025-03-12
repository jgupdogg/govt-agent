import React from 'react';
import { VectorSearchResult } from '../services/VectorClient';

interface ResultCardProps {
  result: VectorSearchResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  // Generate badge color based on search type
  const getSearchTypeBadgeColor = (searchType: string) => {
    switch (searchType) {
      case 'vector':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'knowledge_graph':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-textDark dark:text-textLight">
          {result.title}
        </h3>
        <div className="flex space-x-2">
          {/* Search type badge */}
          {result.search_type && (
            <span className={`${getSearchTypeBadgeColor(result.search_type)} text-xs px-2 py-1 rounded-full`}>
              {result.search_type === 'vector' ? 'Vector' : 'Knowledge Graph'}
            </span>
          )}
          
          {/* Score badge - show appropriate score based on search type */}
          {result.combined_score !== undefined ? (
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full">
              {(result.combined_score * 100).toFixed(1)}% combined
            </span>
          ) : result.similarity_score !== undefined ? (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {(result.similarity_score * 100).toFixed(1)}% match
            </span>
          ) : result.relevance_score !== undefined ? (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
              {(result.relevance_score * 100).toFixed(1)}% relevant
            </span>
          ) : (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              Result
            </span>
          )}
        </div>
      </div>
      
      {/* Entity match info for knowledge graph results */}
      {result.matched_entity && (
        <div className="mb-2 bg-green-50 dark:bg-green-900/30 p-2 rounded text-sm text-textDark dark:text-textLight">
          <span className="font-medium">Matched Entity:</span> {result.matched_entity}
          {result.graph_context && (
            <div className="mt-1 text-gray-600 dark:text-gray-300">
              {result.graph_context}
            </div>
          )}
        </div>
      )}
      
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
  );
};

export default ResultCard;