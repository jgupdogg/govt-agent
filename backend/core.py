"""
Core classes for the government data pipeline.

This module defines the object-oriented architecture for scraping,
processing, and storing government website data.
"""

import json
import logging
import os
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional, Union, Type

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Processor:
    """
    Handles AI processing of documents:
    - Generating summaries
    - Creating embeddings
    - Storing in vector database
    """
    
    def __init__(
        self, 
        anthropic_api_key: str = None, 
        openai_api_key: str = None,
        pinecone_api_key: str = None,
        pinecone_index: str = "govt-scrape-index",
        pinecone_namespace: str = "govt-content"
    ):
        """
        Initialize the processor with API keys.
        
        Args:
            anthropic_api_key: API key for Anthropic (Claude)
            openai_api_key: API key for OpenAI (embeddings)
            pinecone_api_key: API key for Pinecone
            pinecone_index: Pinecone index name
            pinecone_namespace: Pinecone namespace
        """
        # Store configuration
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.pinecone_api_key = pinecone_api_key or os.getenv("PINECONE_API_KEY")
        self.pinecone_index = pinecone_index
        self.pinecone_namespace = pinecone_namespace
        
        # Initialize models lazily when needed
        self._llm = None
        self._embedding_model = None
        self._vector_store = None
    
    def _init_llm(self):
        """Initialize LLM if not already done."""
        if self._llm is None:
            from langchain_anthropic import ChatAnthropic
            
            self._llm = ChatAnthropic(
                model="claude-3-haiku-20240307",
                anthropic_api_key=self.anthropic_api_key,
                temperature=0.3
            )
            logger.info("Initialized Anthropic Claude model")
    
    def _init_embedding_model(self):
        """Initialize embedding model if not already done."""
        if self._embedding_model is None:
            from langchain_openai import OpenAIEmbeddings
            
            self._embedding_model = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=self.openai_api_key
            )
            logger.info("Initialized OpenAI embedding model")
    
    def _init_vector_store(self):
        """Initialize Pinecone vector store if not already done."""
        if self._vector_store is None:
            try:
                # Initialize embedding model first if needed
                self._init_embedding_model()
                
                # Import the recommended langchain_pinecone package
                from langchain_pinecone import PineconeVectorStore
                
                # Set up Pinecone environment
                import pinecone
                pc = pinecone.Pinecone(api_key=self.pinecone_api_key)
                
                # Check if index exists, create if it doesn't
                if self.pinecone_index not in [idx.name for idx in pc.list_indexes()]:
                    logger.warning(f"Index {self.pinecone_index} not found, creating...")
                    # Create the index with appropriate dimensions for the embedding model
                    pc.create_index(
                        name=self.pinecone_index,
                        dimension=1536,  # Dimension for text-embedding-3-small
                        metric="cosine"
                    )
                
                # Initialize the vector store with LangChain
                self._vector_store = PineconeVectorStore(
                    index_name=self.pinecone_index,
                    embedding=self._embedding_model,
                    text_key="content",  # The key in metadata containing the text to embed
                    namespace=self.pinecone_namespace
                )
                
                logger.info(f"Successfully initialized Pinecone vector store with index: {self.pinecone_index}, namespace: {self.pinecone_namespace}")
            
            except ImportError as ie:
                logger.error(f"Import error: {ie}. Make sure you have langchain-pinecone package installed.")
                raise
            except Exception as e:
                logger.error(f"Error initializing vector store: {e}", exc_info=True)
                raise
    
    def summarize(self, document):
        """
        Generate a summary for a document.
        
        Args:
            document: Document to summarize
            
        Returns:
            Summary text
        """
        if not document.content:
            raise ValueError("Document has no content to summarize")
        
        self._init_llm()
        
        prompt = f"""Please provide a concise summary of the following government website content.
Focus on the key information, main services offered, and important points for citizens.
Keep your summary informative and factual, between 3-5 sentences.

Title: {document.title}
Source: {document.source_name} - {document.subsource_name}
URL: {document.url}

Content:
{document.content[:8000]}  # Limit content length

Summary:"""

        response = self._llm.invoke(prompt)
        summary = response.content.strip()
        
        return summary
    
    def store_embedding(self, document) -> str:
        """
        Store document embedding in Pinecone using LangChain.
        
        Args:
            document: Document with summary
            
        Returns:
            Embedding ID
        """
        if not document.summary:
            raise ValueError("Document has no summary to embed")
        
        self._init_vector_store()
        
        # Create a unique ID
        embedding_id = f"gov-{hashlib.md5(document.url.encode()).hexdigest()[:12]}"
        
        try:
            # Create LangChain Document
            lc_doc = LCDocument(
                page_content=document.summary,
                metadata={
                    "url": document.url,
                    "title": document.title,
                    "source": document.source_name, 
                    "subsource": document.subsource_name,
                    "content": document.summary,  # This is used as text_key for embedding
                    "processed_at": datetime.now().isoformat()
                }
            )
            
            # Store in vector store
            ids = self._vector_store.add_documents([lc_doc], ids=[embedding_id])
            
            logger.info(f"Successfully stored document in vector store with ID: {ids[0]}")
            return ids[0]
        
        except Exception as e:
            logger.error(f"Error storing embedding: {e}", exc_info=True)
            raise
    
    def process_document(self, document) -> bool:
        """
        Process a document end-to-end:
        1. Generate summary
        2. Create embedding
        3. Store in vector database
        
        Args:
            document: Document to process
            
        Returns:
            bool: True if successful
        """
        try:
            # Skip if already processed unless forced
            if document.embedding_id and document.status == "processed":
                logger.info(f"Document already processed with embedding_id: {document.embedding_id}")
                return True
                
            # Generate summary if needed
            if not document.summary:
                document.summary = self.summarize(document)
                logger.info(f"Generated summary for document: {document.url}")
            
            # Create and store embedding
            document.embedding_id = self.store_embedding(document)
            
            # Update status
            document.status = "processed"
            document.process_time = datetime.now()
            
            logger.info(f"Successfully processed document: {document.url}")
            return True
        
        except Exception as e:
            logger.error(f"Error processing document {document.url}: {e}", exc_info=True)
            document.status = "error_processing"
            return False

    def search_similar_documents(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.
        
        Args:
            query: Text query
            k: Number of results to return
            
        Returns:
            List of document dictionaries with similarity scores
        """
        self._init_vector_store()
        
        try:
            results = self._vector_store.similarity_search_with_score(query, k=k)
            
            # Format results
            formatted_results = []
            for doc, score in results:
                formatted_results.append({
                    "title": doc.metadata.get("title", "Untitled"),
                    "url": doc.metadata.get("url", ""),
                    "source": doc.metadata.get("source", ""),
                    "subsource": doc.metadata.get("subsource", ""),
                    "summary": doc.page_content,
                    "similarity_score": score
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching similar documents: {e}", exc_info=True)
            return []
        
        
