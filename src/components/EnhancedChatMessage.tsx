import React from 'react';
import { ChatMessage as ChatMessageType } from '../services/VectorClient';

interface EnhancedChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

/**
 * Enhanced chat message component with formatting for citations and code blocks
 */
const EnhancedChatMessage: React.FC<EnhancedChatMessageProps> = ({ message, isStreaming = false }) => {
  // Function to parse and format message content with citations and code blocks
  const formatContent = (content: string) => {
    // Handle code blocks
    const formattedContent = content.split('```').map((segment, index) => {
      // Even indexes are regular text, odd indexes are code blocks
      if (index % 2 === 0) {
        return (
          <span key={index} className="whitespace-pre-wrap">
            {segment}
          </span>
        );
      } else {
        // Handle code block
        const codeLines = segment.split('\n');
        const language = codeLines[0] || '';
        const code = codeLines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-2 p-2 rounded bg-gray-100 dark:bg-gray-800 font-mono text-sm overflow-x-auto">
            {code && (
              <>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{language}</div>
                <pre>{code}</pre>
              </>
            )}
          </div>
        );
      }
    });
    
    return <div>{formattedContent}</div>;
  };
  
  return (
    <div 
      className={`p-3 rounded-lg max-w-[85%] ${
        message.role === 'user' 
          ? 'bg-blue-100 dark:bg-blue-900 ml-auto text-textDark dark:text-textLight' 
          : 'bg-gray-100 dark:bg-gray-700 mr-auto text-textDark dark:text-textLight'
      } ${isStreaming ? 'border-l-4 border-green-500 dark:border-green-400' : ''}`}
    >
      {formatContent(message.content)}
    </div>
  );
};

export default EnhancedChatMessage;