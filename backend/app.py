"""
FastAPI application for government data search using hybrid approach.
Combines vector search and knowledge graph with Supabase for document retrieval.
"""

import os
import logging
from typing import List, Optional, Dict, Any, Union
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime
from dotenv import load_dotenv

# Import the HybridSearchEngine class
from core import HybridSearchEngine

# Load environment variables from .env file
load_dotenv()

environment = os.getenv("ENVIRONMENT", "dev")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hybrid Search API", root_path=f"/{environment}", description="API for Government Data Search combining Vector and Knowledge Graph")

# Configure CORS - explicitly allow localhost domains with more permissive settings
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost",
    "http://localhost:8080",
    "https://d1w96xnev7lp1l.cloudfront.net",  # Add your CloudFront domain
]

# Add CORS middleware with detailed configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods for simplicity during development
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
)

# Global search_engine variable
_search_engine = None

# Function to get search engine instance (lazy loading)
def get_search_engine():
    global _search_engine
    if _search_engine is None:
        try:
            logger.info("Initializing search engine...")
            _search_engine = HybridSearchEngine(
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
                openai_api_key=os.getenv("OPENAI_API_KEY"),
                pinecone_api_key=os.getenv("PINECONE_API_KEY"),
                pinecone_index=os.getenv("PINECONE_INDEX_NAME", "govt-scrape-index"),
                pinecone_namespace=os.getenv("PINECONE_NAMESPACE", "govt-content"),
                neo4j_uri=os.getenv("NEO4J_URI"),
                neo4j_username=os.getenv("NEO4J_USERNAME"),
                neo4j_password=os.getenv("NEO4J_PASSWORD"),
                supabase_url=os.getenv("SUPABASE_URL"),
                supabase_key=os.getenv("SUPABASE_KEY")
            )
            logger.info("Search engine initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing search engine: {e}")
            # Return a minimal search engine that won't crash but just returns empty results
            # This prevents startup errors but allows the health check to pass
            return None
    return _search_engine

# Pydantic models for data validation and serialization
class SearchQuery(BaseModel):
    query: str
    limit: int = 10
    vector_weight: float = 0.5
    merge_method: str = "weighted"

class SearchResult(BaseModel):
    doc_id: Optional[str] = None  # String type for document ID
    title: str
    url: str
    source: Optional[str] = None
    subsource: Optional[str] = None
    summary: Optional[str] = None
    search_type: str
    similarity_score: Optional[float] = None
    relevance_score: Optional[float] = None
    combined_score: Optional[float] = None
    matched_entity: Optional[str] = None
    graph_context: Optional[str] = None
    knowledge_graph: Optional[bool] = None



@app.get("/api/health")
def health_check():
    """
    Health check endpoint
    """
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/debug")
async def debug_info():
    """
    Debug endpoint that returns information about the environment and configuration
    """
    # Initialize the search engine
    search_engine = get_search_engine()
    
    # Get environment info (sanitized)
    env_info = {
        "ANTHROPIC_API_KEY": "******" if os.getenv("ANTHROPIC_API_KEY") else "Not set",
        "OPENAI_API_KEY": "******" if os.getenv("OPENAI_API_KEY") else "Not set",
        "PINECONE_API_KEY": "******" if os.getenv("PINECONE_API_KEY") else "Not set",
        "NEO4J_URI": "******" if os.getenv("NEO4J_URI") else "Not set",
        "NEO4J_USERNAME": "******" if os.getenv("NEO4J_USERNAME") else "Not set",
        "NEO4J_PASSWORD": "******" if os.getenv("NEO4J_PASSWORD") else "Not set",
        "SUPABASE_URL": "******" if os.getenv("SUPABASE_URL") else "Not set",
        "SUPABASE_KEY": "******" if os.getenv("SUPABASE_KEY") else "Not set",
        "PINECONE_INDEX": os.getenv("PINECONE_INDEX_NAME", "govt-scrape-index"),
        "PINECONE_NAMESPACE": os.getenv("PINECONE_NAMESPACE", "govt-content"),
    }
    
    # Search capabilities available
    search_capabilities = {}
    if search_engine:
        search_capabilities = {
            "vector_search_available": search_engine.vector_search_available,
            "knowledge_graph_available": search_engine.kg_search_available
        }
    else:
        search_capabilities = {
            "vector_search_available": False,
            "knowledge_graph_available": False,
            "error": "Search engine failed to initialize"
        }
    
    return {
        "timestamp": datetime.now().isoformat(),
        "environment": env_info,
        "search_capabilities": search_capabilities
    }

# Add a simple sample-search endpoint for backward compatibility
@app.get("/api/sample-search")
async def sample_search():
    """
    Return sample search results for "economic data and statistics"
    """
    search_engine = get_search_engine()
    if not search_engine:
        return []
        
    try:
        results = search_engine.hybrid_search(
            query="economic data and statistics",
            limit=5,
            vector_weight=0.5,
            merge_method="weighted"
        )
        return results
    except Exception as e:
        logger.error(f"Error in sample search: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search", response_model=List[SearchResult])
async def search(search_query: SearchQuery):
    """
    Perform a hybrid search using vector similarity and knowledge graph
    """
    search_engine = get_search_engine()
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine is not available")
        
    try:
        results = search_engine.hybrid_search(
            query=search_query.query,
            limit=search_query.limit,
            vector_weight=search_query.vector_weight,
            merge_method=search_query.merge_method
        )
        
        if not results:
            return []
        
        # Process the separate format if using that merge method
        if isinstance(results, dict) and search_query.merge_method == "separate":
            # Combine vector and graph results with a label
            combined = []
            for r in results.get("vector_results", []):
                # Ensure doc_id is a string
                if r.get("doc_id") is not None:
                    r["doc_id"] = str(r["doc_id"])
                combined.append(r)
                
            for r in results.get("graph_results", []):
                # Ensure doc_id is a string
                if r.get("doc_id") is not None:
                    r["doc_id"] = str(r["doc_id"])
                combined.append(r)
                
            return combined[:search_query.limit]
        
        # Ensure all doc_ids are strings for standard results
        for result in results:
            if result.get("doc_id") is not None:
                result["doc_id"] = str(result["doc_id"])
            
        return results
            
    except Exception as e:
        logger.error(f"Error in search: {e}")
        # Log full traceback
        import traceback
        logger.error(traceback.format_exc())
        
        # Return a more detailed error response for debugging
        error_detail = {
            "message": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc().split("\n")
        }
        raise HTTPException(status_code=500, detail=error_detail)

@app.post("/api/vector-search")
async def vector_search(search_query: SearchQuery):
    """
    Perform only vector search
    """
    search_engine = get_search_engine()
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine is not available")
        
    try:
        if not search_engine.vector_search_available:
            raise HTTPException(status_code=400, detail="Vector search is not available")
            
        results = search_engine.vector_search(
            query=search_query.query,
            k=search_query.limit
        )
        
        # Fetch full document info from Supabase
        doc_ids = [r.get("doc_id") for r in results if r.get("doc_id")]
        urls = [r.get("url") for r in results if r.get("url")]
        
        documents = search_engine.fetch_summaries_from_supabase(doc_ids, urls)
        
        # Create lookup dictionaries
        doc_id_lookup = {str(doc.get("id")): doc for doc in documents if doc.get("id")}
        url_lookup = {doc.get("url"): doc for doc in documents if doc.get("url")}
        
        # Enhance results with full summaries
        for result in results:
            # Ensure doc_id is a string
            if result.get("doc_id") is not None:
                result["doc_id"] = str(result["doc_id"])
                
            doc_id = result.get("doc_id")
            url = result.get("url")
            
            if doc_id and doc_id in doc_id_lookup:
                doc = doc_id_lookup[doc_id]
                result["summary"] = doc.get("summary")
            elif url and url in url_lookup:
                doc = url_lookup[url]
                result["summary"] = doc.get("summary")
        
        return results
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in vector search: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/kg-search")
async def kg_search(search_query: SearchQuery):
    """
    Perform only knowledge graph search
    """
    search_engine = get_search_engine()
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine is not available")
        
    try:
        if not search_engine.kg_search_available:
            raise HTTPException(status_code=400, detail="Knowledge graph search is not available")
            
        # Extract entities from the query
        entities = search_engine.extract_entities_from_query(search_query.query)
        
        if not entities:
            return []
            
        results = search_engine.knowledge_graph_search(
            entities=entities,
            limit=search_query.limit
        )
        
        # Fetch full document info from Supabase
        doc_ids = [r.get("doc_id") for r in results if r.get("doc_id")]
        urls = [r.get("url") for r in results if r.get("url")]
        
        documents = search_engine.fetch_summaries_from_supabase(doc_ids, urls)
        
        # Create lookup dictionaries
        doc_id_lookup = {str(doc.get("id")): doc for doc in documents if doc.get("id")}
        url_lookup = {doc.get("url"): doc for doc in documents if doc.get("url")}
        
        # Enhance results with full summaries
        for result in results:
            # Ensure doc_id is a string
            if result.get("doc_id") is not None:
                result["doc_id"] = str(result["doc_id"])
                
            doc_id = result.get("doc_id")
            url = result.get("url")
            
            if doc_id and doc_id in doc_id_lookup:
                doc = doc_id_lookup[doc_id]
                result["summary"] = doc.get("summary")
            elif url and url in url_lookup:
                doc = url_lookup[url]
                result["summary"] = doc.get("summary")
        
        return results
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in knowledge graph search: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(chat_query: dict):
    """
    Enhanced chat endpoint for RAG-based conversation
    """
    search_engine = get_search_engine()
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine is not available")
        
    try:
        # Extract query, chat history, and context
        query = chat_query.get("query", "")
        chat_history = chat_query.get("chat_history", [])
        context_docs = chat_query.get("context", [])
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Build system prompt with context
        system_message = "You are a helpful assistant that answers questions based on the provided knowledge base. "
        
        # Format documents as context
        if context_docs:
            system_message += "Here are some relevant documents from our knowledge base that may help you answer the user's question:\n\n"
            
            for i, doc in enumerate(context_docs, 1):
                system_message += f"[Document {i}]\n"
                system_message += f"Title: {doc.get('title', 'Untitled')}\n"
                system_message += f"Source: {doc.get('source', 'Unknown source')}\n"
                if doc.get('subsource'):
                    system_message += f"Subsource: {doc.get('subsource')}\n"
                system_message += f"Summary: {doc.get('summary', 'No summary available')}\n\n"
            
            # Add instructions for using the context
            system_message += "Use the information from these documents to answer the user's question. "
            system_message += "If the answer is not in the provided documents, use your general knowledge but clearly indicate this. "
            system_message += "If you refer to information from a specific document, mention which document ([Document X]) it came from.\n\n"
        
        # Log the request details
        logger.info(f"Chat request: query='{query[:50]}...', context_docs={len(context_docs)}")
        
        # Initialize the LLM if needed
        search_engine._init_llm()
        llm = search_engine._llm
        
        # Create a message list with system, history, and new query
        messages = []
        
        # Add system message with context
        messages.append({"role": "system", "content": system_message})
        
        # Add chat history
        for msg in chat_history:
            role = msg.get("role", "user").lower()
            content = msg.get("content", "")
            
            # Ensure role is valid (user or assistant)
            if role not in ["user", "assistant"]:
                role = "user"
                
            messages.append({"role": role, "content": content})
        
        # Add the current query
        messages.append({"role": "user", "content": query})
        
        # Generate the response
        response = llm.invoke(messages)
        
        # Extract the response content
        return {
            "response": response.content,
            "sources": context_docs  # Return the source documents
        }
        
    except Exception as e:
        logger.error(f"Error in chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")