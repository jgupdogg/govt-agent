"""
Core classes for government data search using hybrid approach.
Combines vector search and knowledge graph with Supabase for document retrieval.
"""

import os
import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SupabaseManager:
    """
    Manages database interactions using Supabase.
    Handles document retrieval and storage.
    """
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize the Supabase client.
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase API key
        """
        from supabase import create_client, Client
        
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and API key are required. Set SUPABASE_URL and SUPABASE_KEY environment variables.")
        
        try:
            self.supabase = create_client(self.supabase_url, self.supabase_key)
            logger.info("Successfully initialized Supabase client")
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {e}")
            raise
    
    def get_documents_by_ids(self, doc_ids, urls=None):
        """
        Get multiple documents by their IDs or URLs.
        
        Args:
            doc_ids: List of document IDs to retrieve
            urls: List of document URLs as fallback
            
        Returns:
            List of document dictionaries
        """
        try:
            documents = []
            
            # Try to fetch by IDs first
            if doc_ids:
                # Convert all IDs to integers, stripping any decimal part
                clean_ids = []
                for doc_id in doc_ids:
                    if doc_id is not None:
                        # Handle various possible formats (int, float, string)
                        if isinstance(doc_id, (int, float)):
                            clean_ids.append(int(doc_id))
                        elif isinstance(doc_id, str) and doc_id.strip():
                            # Try to convert string to int, handling potential decimal points
                            try:
                                if '.' in doc_id:
                                    clean_ids.append(int(float(doc_id)))
                                else:
                                    clean_ids.append(int(doc_id))
                            except ValueError:
                                logger.warning(f"Could not convert doc_id '{doc_id}' to integer")
                
                if clean_ids:
                    logger.info(f"Fetching {len(clean_ids)} document summaries from Supabase by IDs")
                    
                    # Query Supabase for documents with these IDs
                    result = self.supabase.table("govt_documents").select(
                        "id", "title", "url", "summary", "source_name", "subsource_name", "content_hash"
                    ).in_("id", clean_ids).execute()
                    
                    if result.data:
                        documents.extend(result.data)
                        logger.info(f"Retrieved {len(result.data)} documents from Supabase by IDs")
            
            # If URLs are provided, fetch documents that weren't found by ID
            if urls:
                # Find URLs that we haven't already got documents for
                found_urls = {doc.get("url") for doc in documents if doc.get("url")}
                missing_urls = [url for url in urls if url and url not in found_urls]
                
                if missing_urls:
                    logger.info(f"Fetching {len(missing_urls)} document summaries from Supabase by URLs")
                    
                    # Create a query that uses 'in' operator for URLs
                    result = self.supabase.table("govt_documents").select(
                        "id", "title", "url", "summary", "source_name", "subsource_name", "content_hash"
                    ).in_("url", missing_urls).execute()
                    
                    if result.data:
                        documents.extend(result.data)
                        logger.info(f"Retrieved {len(result.data)} documents from Supabase by URLs")
            
            logger.info(f"Retrieved {len(documents)} total document summaries from Supabase")
            return documents
            
        except Exception as e:
            logger.error(f"Error getting documents: {e}")
            return []

class KnowledgeGraphManager:
    """
    Manages interactions with Neo4j knowledge graph.
    Handles entity resolution and relationship mapping.
    """
    
    def __init__(self, uri: str = None, username: str = None, password: str = None):
        """
        Initialize the Neo4j connection.
        
        Args:
            uri: Neo4j connection URI
            username: Neo4j username
            password: Neo4j password
        """
        from neo4j import GraphDatabase
        
        self.uri = uri or os.getenv("NEO4J_URI")
        self.username = username or os.getenv("NEO4J_USERNAME") 
        self.password = password or os.getenv("NEO4J_PASSWORD")
        self.driver = None
        
        if not all([self.uri, self.username, self.password]):
            raise ValueError("Neo4j URI, username, and password are required.")
        
        try:
            self.driver = GraphDatabase.driver(
                self.uri, 
                auth=(self.username, self.password)
            )
            # Verify connection
            self.driver.verify_connectivity()
            logger.info("Successfully connected to Neo4j database")
        except Exception as e:
            logger.error(f"Error connecting to Neo4j: {e}")
            raise
    
    def close(self):
        """Close the Neo4j connection."""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def search_related_documents(self, entity_names, limit=5):
        """
        Find documents related to specified entities using knowledge graph.
        
        Args:
            entity_names: List of entity names to search for
            limit: Maximum number of results to return
            
        Returns:
            List of document dictionaries with relationship context
        """
        results = []
        
        with self.driver.session() as session:
            for entity_name in entity_names:
                # First try exact canonical name match
                query = """
                MATCH (e:Entity)
                WHERE e.canonical_name = $entity_name OR e.canonical_name CONTAINS $entity_name
                MATCH path = (e)-[*1..2]-(d:Document)
                RETURN d.url as url, d.title as title, d.source_name as source_name, 
                       d.subsource_name as subsource_name, d.doc_id as doc_id,
                       [r IN relationships(path) | type(r)] as relationship_types,
                       length(path) as path_length
                ORDER BY path_length
                LIMIT $limit
                """
                result = session.run(query, {
                    "entity_name": entity_name,
                    "limit": limit
                })
                
                # Process results
                for record in result:
                    # Build context information
                    context = ""
                    if record.get("relationship_types"):
                        relationship_str = " -> ".join(record["relationship_types"])
                        context = f"Connected to '{entity_name}' via: {relationship_str}"
                    
                    # Ensure doc_id is a string if it exists
                    doc_id = record.get("doc_id")
                    if doc_id is not None:
                        doc_id = str(doc_id)
                    
                    results.append({
                        "url": record["url"],
                        "title": record["title"],
                        "source_name": record["source_name"],
                        "subsource_name": record["subsource_name"],
                        "doc_id": doc_id,
                        "context": context,
                        "matched_entity": entity_name,
                        "relevance_score": 1.0 / (record["path_length"] if "path_length" in record else 1),
                        "search_type": "knowledge_graph"
                    })
            
            # Deduplicate results by URL
            unique_results = []
            seen_urls = set()
            
            for doc in results:
                if doc["url"] not in seen_urls:
                    seen_urls.add(doc["url"])
                    unique_results.append(doc)
                    
                    if len(unique_results) >= limit:
                        break
            
            return unique_results

class HybridSearchEngine:
    """
    Optimized hybrid search engine that combines vector search and knowledge graph querying,
    then fetches full summaries from Supabase.
    """
    
    def __init__(
        self,
        anthropic_api_key: str = None,
        openai_api_key: str = None,
        pinecone_api_key: str = None,
        pinecone_index: str = None,
        pinecone_namespace: str = None,
        neo4j_uri: str = None,
        neo4j_username: str = None,
        neo4j_password: str = None,
        supabase_url: str = None,
        supabase_key: str = None
    ):
        """Initialize the hybrid search engine with API keys and connection details."""
        # Store configuration from parameters or environment variables
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.pinecone_api_key = pinecone_api_key or os.getenv("PINECONE_API_KEY")
        self.pinecone_index = pinecone_index or os.getenv("PINECONE_INDEX_NAME", "govt-scrape-index")
        self.pinecone_namespace = pinecone_namespace or os.getenv("PINECONE_NAMESPACE", "govt-content")
        
        self.neo4j_uri = neo4j_uri or os.getenv("NEO4J_URI")
        self.neo4j_username = neo4j_username or os.getenv("NEO4J_USERNAME")
        self.neo4j_password = neo4j_password or os.getenv("NEO4J_PASSWORD")
        
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_KEY")
        
        # Initialize components lazily when needed
        self._llm = None
        self._embedding_model = None
        self._vector_store = None
        self._kg_manager = None
        self._db_manager = None
        
        # Check which search methods are available
        self.vector_search_available = all([self.anthropic_api_key, self.openai_api_key, self.pinecone_api_key])
        self.kg_search_available = all([self.neo4j_uri, self.neo4j_username, self.neo4j_password])
        
        if not self.vector_search_available and not self.kg_search_available:
            raise ValueError("Neither vector search nor knowledge graph search is available with the provided credentials.")
    
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
            # Initialize embedding model first
            self._init_embedding_model()
            
            # Set up Pinecone environment
            import pinecone
            pc = pinecone.Pinecone(api_key=self.pinecone_api_key)
            
            # Import the vector store
            from langchain_pinecone import PineconeVectorStore
            
            # Initialize the vector store
            self._vector_store = PineconeVectorStore(
                index_name=self.pinecone_index,
                embedding=self._embedding_model,
                text_key="content",
                namespace=self.pinecone_namespace
            )
            
            logger.info(f"Initialized Pinecone vector store with index: {self.pinecone_index}")
    
    def _init_kg_manager(self):
        """Initialize knowledge graph manager if not already done."""
        if self._kg_manager is None and self.kg_search_available:
            self._kg_manager = KnowledgeGraphManager(
                uri=self.neo4j_uri,
                username=self.neo4j_username,
                password=self.neo4j_password
            )
            logger.info("Initialized Neo4j knowledge graph manager")
    
    def _init_db_manager(self):
        """Initialize Supabase database manager if not already done."""
        if self._db_manager is None:
            self._db_manager = SupabaseManager(
                self.supabase_url,
                self.supabase_key
            )
            logger.info("Initialized Supabase database manager")
    
    def extract_entities_from_query(self, query: str) -> List[str]:
        """
        Extract entities from the query for knowledge graph search.
        
        Args:
            query: Search query
            
        Returns:
            List of extracted entity names
        """
        self._init_llm()
        
        # Create a prompt to extract entities
        entities_prompt = f"""
        Extract all entities (people, organizations, agencies, policies, programs, laws, etc.) 
        mentioned in this query. Return ONLY the entity names as a comma-separated list.
        If no entities are found, return "NONE".
        
        Query: {query}
        
        Entities:
        """
        
        try:
            # Get response from Claude
            response = self._llm.invoke(entities_prompt)
            extracted_text = response.content.strip()
            
            # Parse comma-separated entities
            if extracted_text.upper() == "NONE":
                return []
            
            entities = [
                entity.strip() for entity in extracted_text.split(',')
                if entity.strip() and entity.strip().lower() not in ["none", "n/a", "no entities"]
            ]
            
            # Also check for line breaks
            if not entities:
                entities = [
                    entity.strip() for entity in extracted_text.split('\n')
                    if entity.strip() and entity.strip().lower() not in ["none", "n/a", "no entities"]
                ]
            
            logger.info(f"Extracted entities from query: {entities}")
            return entities
            
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return []
    
    def vector_search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Perform vector search using embeddings.
        
        Args:
            query: Search query
            k: Number of results
            
        Returns:
            List of search results with basic metadata
        """
        if not self.vector_search_available:
            logger.warning("Vector search is not available with the provided credentials.")
            return []
        
        self._init_vector_store()
        
        try:
            logger.info(f"Performing vector search for: '{query}'")
            
            # Use similarity_search_with_score to get documents and scores
            results = self._vector_store.similarity_search_with_score(query, k=k)
            
            # Format results - only include basic metadata, not full summaries
            formatted_results = []
            for doc, score in results:
                # Get doc_id, ensuring it's a string
                doc_id = doc.metadata.get("doc_id")
                if doc_id is not None:
                    doc_id = str(doc_id)
                
                formatted_results.append({
                    "doc_id": doc_id,
                    "title": doc.metadata.get("title", "Untitled"),
                    "url": doc.metadata.get("url", ""),
                    "source": doc.metadata.get("source", ""),
                    "subsource": doc.metadata.get("subsource", ""),
                    "similarity_score": score,
                    "search_type": "vector"
                })
            
            logger.info(f"Vector search returned {len(formatted_results)} results")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            return []
    
    def knowledge_graph_search(self, entities: List[str], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents related to entities using the knowledge graph.
        
        Args:
            entities: List of entity names
            limit: Maximum number of results
            
        Returns:
            List of document results with basic metadata
        """
        if not self.kg_search_available:
            logger.warning("Knowledge graph search is not available with the provided credentials.")
            return []
        
        if not entities:
            logger.info("No entities provided for knowledge graph search")
            return []
        
        self._init_kg_manager()
        
        try:
            logger.info(f"Performing knowledge graph search for entities: {entities}")
            
            # Use KnowledgeGraphManager to find related documents
            results = self._kg_manager.search_related_documents(
                entities, 
                limit=limit
            )
            
            logger.info(f"Knowledge graph search returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Error in knowledge graph search: {e}")
            return []
    
    def fetch_summaries_from_supabase(self, doc_ids: List[str], urls: List[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch full document summaries from Supabase by IDs and/or URLs.
        
        Args:
            doc_ids: List of document IDs
            urls: List of document URLs as fallback
            
        Returns:
            List of documents with full summaries
        """
        self._init_db_manager()
        return self._db_manager.get_documents_by_ids(doc_ids, urls)
    
    def hybrid_search(
        self, 
        query: str, 
        limit: int = 10, 
        vector_weight: float = 0.5,
        merge_method: str = "weighted"
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search with optimized summary fetching.
        
        Args:
            query: Search query
            limit: Maximum number of results
            vector_weight: Weight for vector search results (0.0 to 1.0)
            merge_method: How to combine results ('interleave', 'weighted', or 'separate')
            
        Returns:
            List of search results with full summaries
        """
        # Extract entities for knowledge graph search
        entities = []
        if self.kg_search_available:
            entities = self.extract_entities_from_query(query)
        
        # Perform vector search
        vector_results = []
        if self.vector_search_available:
            vector_results = self.vector_search(query, k=limit)
        
        # Perform knowledge graph search if entities were found
        graph_results = []
        if entities and self.kg_search_available:
            graph_results = self.knowledge_graph_search(entities, limit=limit)
        
        # Log search result counts
        logger.info(f"Vector search returned {len(vector_results)} results")
        logger.info(f"Knowledge graph search returned {len(graph_results)} results")
        
        # If one search method returned no results, return results from the other method
        if not vector_results and not graph_results:
            logger.info("No results from either search method")
            return []
        
        if not vector_results:
            logger.info("No vector search results, using only knowledge graph results")
            result_docs = graph_results
        elif not graph_results:
            logger.info("No knowledge graph results, using only vector search results")
            result_docs = vector_results
        else:
            # Combine results based on the specified method
            if merge_method == "separate":
                logger.info("Using separate merge method, returning results separately")
                # Keep results separate - handle this at a higher level
                return {
                    "vector_results": vector_results,
                    "graph_results": graph_results
                }
            
            elif merge_method == "weighted":
                logger.info(f"Using weighted merge method with vector_weight={vector_weight}")
                # Combine and rank by weighted scores
                combined_results = []
                
                # Process vector results
                vector_doc_ids = set()
                for result in vector_results:
                    doc_id = result.get("doc_id")
                    if not doc_id:
                        continue
                        
                    vector_doc_ids.add(doc_id)
                    # Convert similarity score to a normalized score (higher is better)
                    vector_score = 1.0 - min(result.get("similarity_score", 0), 1.0)
                    combined_results.append({
                        **result,
                        "combined_score": vector_score * vector_weight
                    })
                
                # Process graph results
                for result in graph_results:
                    doc_id = result.get("doc_id")
                    if not doc_id:
                        continue
                        
                    # Use relevance score directly
                    graph_score = result.get("relevance_score", 0.5)
                    
                    # Check if this document is already in combined results
                    existing_idx = next(
                        (i for i, r in enumerate(combined_results) if r.get("doc_id") == doc_id),
                        None
                    )
                    
                    if existing_idx is not None:
                        # Update existing result
                        combined_results[existing_idx]["knowledge_graph"] = True
                        combined_results[existing_idx]["graph_context"] = result.get("context", "")
                        combined_results[existing_idx]["matched_entity"] = result.get("matched_entity", "")
                        combined_results[existing_idx]["combined_score"] += graph_score * (1 - vector_weight)
                    else:
                        # Add new result
                        combined_results.append({
                            **result,
                            "knowledge_graph": True,
                            "combined_score": graph_score * (1 - vector_weight)
                        })
                
                # Sort by combined score (descending)
                combined_results.sort(key=lambda x: x.get("combined_score", 0), reverse=True)
                
                # Limit results
                result_docs = combined_results[:limit]
                
            else:  # Default to interleave
                logger.info("Using interleave merge method")
                # Interleave results, removing duplicates
                combined_results = []
                seen_doc_ids = set()
                
                # Get iterators
                vector_iter = iter(vector_results)
                graph_iter = iter(graph_results)
                
                # Interleave until we have enough results or run out
                while len(combined_results) < limit:
                    # Try to get next vector result
                    try:
                        vector_result = next(vector_iter)
                        doc_id = vector_result.get("doc_id")
                        if doc_id and doc_id not in seen_doc_ids:
                            seen_doc_ids.add(doc_id)
                            combined_results.append(vector_result)
                            
                            if len(combined_results) >= limit:
                                break
                    except StopIteration:
                        pass
                    
                    # Try to get next graph result
                    try:
                        graph_result = next(graph_iter)
                        doc_id = graph_result.get("doc_id")
                        if doc_id and doc_id not in seen_doc_ids:
                            seen_doc_ids.add(doc_id)
                            combined_results.append(graph_result)
                            
                            if len(combined_results) >= limit:
                                break
                    except StopIteration:
                        pass
                    
                    # If both iterators are exhausted, break the loop
                    if len(seen_doc_ids) >= len(vector_results) + len(graph_results):
                        break
                
                result_docs = combined_results
        
        # Extract doc IDs from the results and collect URLs as fallback
        doc_ids = [doc.get("doc_id") for doc in result_docs if doc.get("doc_id")]
        doc_urls = [doc.get("url") for doc in result_docs if doc.get("url")]
        
        if not doc_ids and not doc_urls:
            logger.warning("No valid document IDs or URLs found in search results")
            return result_docs
        
        # Fetch full document summaries from Supabase
        documents = self.fetch_summaries_from_supabase(doc_ids, doc_urls)
        
        # Create a lookup dictionary for quick access
        doc_id_lookup = {str(doc.get("id")): doc for doc in documents if doc.get("id")}
        doc_url_lookup = {doc.get("url"): doc for doc in documents if doc.get("url")}
        
        # Enhance results with full summaries
        for result in result_docs:
            doc_id = result.get("doc_id")
            url = result.get("url")
            
            # Try to look up by ID first
            if doc_id and str(doc_id) in doc_id_lookup:
                # Add summary and any other fields from Supabase
                doc = doc_id_lookup[str(doc_id)]
                result["summary"] = doc.get("summary")
                
                # If title wasn't already set, get it from Supabase
                if not result.get("title") and doc.get("title"):
                    result["title"] = doc.get("title")
                    
            # Fall back to URL lookup if ID lookup failed
            elif url and url in doc_url_lookup:
                doc = doc_url_lookup[url]
                result["summary"] = doc.get("summary")
                
                # If ID wasn't set, get it from Supabase
                if not result.get("doc_id") and doc.get("id"):
                    result["doc_id"] = str(doc.get("id"))
                    
                # If title wasn't already set, get it from Supabase
                if not result.get("title") and doc.get("title"):
                    result["title"] = doc.get("title")
        
        logger.info(f"Returning {len(result_docs)} results with full summaries")
        return result_docs