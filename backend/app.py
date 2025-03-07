import os
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv

# Import the Processor class for handling Pinecone vectors
from core import Processor

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vector Search API", description="API for Vector Search and RAG Chat")

# Configure CORS - explicitly allow localhost domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "*",  # Allow all origins for testing - REMOVE THIS IN PRODUCTION
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Initialize the Processor with API keys from environment variables
processor = Processor(
    anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
    pinecone_api_key=os.getenv("PINECONE_API_KEY")
)

# Pydantic models for data validation and serialization
class VectorSearchQuery(BaseModel):
    query: str
    limit: int = 5

class VectorSearchResult(BaseModel):
    title: str
    url: str
    source: str
    subsource: str
    summary: str
    similarity_score: float

class ChatQuery(BaseModel):
    query: str
    chat_history: List[Dict[str, str]] = []

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
    # Get environment info (sanitized)
    env_info = {
        "ANTHROPIC_API_KEY": "******" if os.getenv("ANTHROPIC_API_KEY") else "Not set",
        "PINECONE_API_KEY": "******" if os.getenv("PINECONE_API_KEY") else "Not set",
        "PINECONE_INDEX": processor.pinecone_index,
        "PINECONE_NAMESPACE": processor.pinecone_namespace,
    }
    
    # Attempt to get CORS settings safely
    cors_settings = {}
    try:
        # Look for the CORSMiddleware in the middleware stack
        cors_middleware = next(
            (mw for mw in app.user_middleware if mw.cls == CORSMiddleware),
            None
        )
        if cors_middleware:
            # Use getattr to safely access attributes
            options = getattr(cors_middleware, "options", {})
            cors_settings["allow_origins"] = options.get("allow_origins", [])
            cors_settings["allow_methods"] = options.get("allow_methods", [])
        else:
            cors_settings = "CORS middleware not found"
    except Exception as e:
        cors_settings = f"Error retrieving CORS settings: {str(e)}"
    
    return {
        "timestamp": datetime.now().isoformat(),
        "environment": env_info,
        "cors_settings": cors_settings
    }

@app.post("/api/search", response_model=List[VectorSearchResult])
async def search_vectors(search_query: VectorSearchQuery):
    """
    Search for vectors similar to the query
    """
    try:
        # Initialize the vector store if needed
        if processor._vector_store is None:
            processor._init_vector_store()
        
        # Search for similar documents
        results = processor.search_similar_documents(search_query.query, k=search_query.limit)
        
        if not results:
            return []
        
        return results
            
    except Exception as e:
        logger.error(f"Error searching vectors: {e}")
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

@app.get("/api/sample-search", response_model=List[VectorSearchResult])
async def sample_search():
    """
    Perform a sample search for "economic data" to demonstrate the vector search functionality
    """
    try:
        # Initialize the vector store if needed
        if processor._vector_store is None:
            processor._init_vector_store()
        
        # Use a sample query related to economic data
        sample_query = "economic data and statistics"
        logger.info(f"Performing sample search with query: {sample_query}")
        
        # Search for similar documents with a limit of 5 results
        results = processor.search_similar_documents(sample_query, k=5)
        
        if not results:
            logger.warning("No results found for sample search")
            return []
        
        logger.info(f"Found {len(results)} results for sample search")
        return results
            
    except Exception as e:
        logger.error(f"Error in sample search: {e}")
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

@app.post("/api/chat")
async def chat(chat_query: ChatQuery):
    """
    Chat endpoint for RAG-based conversation (placeholder for future implementation)
    """
    # This is a placeholder for the future RAG implementation
    # Currently just returns a simple response
    return {
        "response": f"This is a placeholder response for: {chat_query.query}",
        "sources": []
    }

if __name__ == "__main__":
    import uvicorn
    # Use environment variable for port or default to 8000
    port = int(os.getenv("PORT", 8000))
    # Start server
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)