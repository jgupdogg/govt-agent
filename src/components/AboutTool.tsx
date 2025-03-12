import React from 'react';

interface AboutToolProps {
  defaultQuery?: string;
}

const AboutTool: React.FC<AboutToolProps> = ({ defaultQuery }) => {
  return (
    <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md mt-8 transition-colors duration-300">
      <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
        About This Tool
      </h2>
      <p className="text-textDark dark:text-textLight mb-4">
        This tool allows you to search through our knowledge base using a hybrid approach combining vector search and knowledge graph technologies.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-2">Vector Search</h3>
          <p className="text-textDark dark:text-textLight">
            Uses AI embeddings to find semantically similar content based on meaning, 
            not just keywords. Great for conceptual or exploratory searches.
          </p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="font-bold text-green-700 dark:text-green-300 mb-2">Knowledge Graph</h3>
          <p className="text-textDark dark:text-textLight">
            Finds connections between entities (people, organizations, policies, etc.) 
            using a graph database. Excellent for relationship-based searches.
          </p>
        </div>
      </div>
      {defaultQuery && (
        <p className="text-textDark dark:text-textLight mb-4">
          The default search query is set to "<strong>{defaultQuery}</strong>". 
          You can try your own searches using the search box above. Each result includes the title, 
          content summary, source information, and a link to the original content.
        </p>
      )}
      <p className="text-textDark dark:text-textLight">
        Coming soon: A fully-featured RAG (Retrieval Augmented Generation) chat interface
        that will allow you to have conversations with an AI assistant backed by our knowledge base,
        with sources and citations for all information provided.
      </p>
    </div>
  );
};

export default AboutTool;