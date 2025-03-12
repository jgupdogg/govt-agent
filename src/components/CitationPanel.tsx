import React from 'react';
import { VectorSearchResult } from '../services/VectorClient';
import ResultCard from './ResultCard';

interface CitationPanelProps {
  sources: VectorSearchResult[];
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Panel displaying citation sources from the RAG system
 */
const CitationPanel: React.FC<CitationPanelProps> = ({ sources, isVisible, onClose }) => {
  if (!isVisible || sources.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-1/3 2xl:w-1/4 bg-evenBlock dark:bg-evenBlockDark shadow-xl z-30 overflow-y-auto transition-transform transform ease-in-out duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-evenBlock dark:bg-evenBlockDark z-10">
        <h2 className="text-lg font-semibold text-textDark dark:text-textLight">
          Sources ({sources.length})
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close sources panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {sources.map((source, index) => (
          <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
            <ResultCard result={source} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitationPanel;