import os
import json
import boto3
import traceback
import logging
from app import app
from mangum import Mangum

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize SSM client
ssm = boto3.client('ssm')

# Function to get a parameter from Parameter Store
def get_parameter(name, with_decryption=True):
    try:
        response = ssm.get_parameter(
            Name=name,
            WithDecryption=with_decryption
        )
        return response['Parameter']['Value']
    except Exception as e:
        logger.error(f"Error getting parameter {name}: {e}")
        return None

# Load API credentials from Parameter Store
def load_api_credentials():
    try:
        # API keys for LLM and vector search
        anthropic_api_key = get_parameter('/govt-agent/anthropic/api_key')
        if anthropic_api_key:
            os.environ['ANTHROPIC_API_KEY'] = anthropic_api_key
        
        openai_api_key = get_parameter('/govt-agent/openai/api_key')
        if openai_api_key:
            os.environ['OPENAI_API_KEY'] = openai_api_key
        
        pinecone_api_key = get_parameter('/govt-agent/pinecone/api_key')
        if pinecone_api_key:
            os.environ['PINECONE_API_KEY'] = pinecone_api_key
        
        # Optional Pinecone configuration
        os.environ['PINECONE_INDEX_NAME'] = get_parameter('/govt-agent/pinecone/index', False) or 'govt-scrape-index'
        os.environ['PINECONE_NAMESPACE'] = get_parameter('/govt-agent/pinecone/namespace', False) or 'govt-content'
        
        # Neo4j credentials
        neo4j_uri = get_parameter('/govt-agent/neo4j/uri')
        if neo4j_uri:
            os.environ['NEO4J_URI'] = neo4j_uri
        
        neo4j_username = get_parameter('/govt-agent/neo4j/username')
        if neo4j_username:
            os.environ['NEO4J_USERNAME'] = neo4j_username
        
        neo4j_password = get_parameter('/govt-agent/neo4j/password')
        if neo4j_password:
            os.environ['NEO4J_PASSWORD'] = neo4j_password
        
        # Supabase credentials
        supabase_url = get_parameter('/govt-agent/supabase/url')
        if supabase_url:
            os.environ['SUPABASE_URL'] = supabase_url
        
        supabase_key = get_parameter('/govt-agent/supabase/key')
        if supabase_key:
            os.environ['SUPABASE_KEY'] = supabase_key
            
    except Exception as e:
        logger.error(f"Error loading API credentials: {e}")
        # Continue with execution - app.py will handle missing credentials

# Create a Mangum adapter for the FastAPI app
handler = Mangum(app)

# Load credentials before any request is processed

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Log specific request details for debugging
        logger.info(f"HTTP Method: {event.get('httpMethod')}")
        logger.info(f"Path: {event.get('path')}")
        logger.info(f"Resource Path: {event.get('resource')}")
        
        # Load API credentials from Parameter Store
        load_api_credentials()
        
        # Handle the request using Mangum
        response = handler(event, context)
        
        # Ensure CORS headers are always present
        if 'headers' not in response:
            response['headers'] = {}

        
        logger.info(f"Response: {json.dumps(response)}")
        return response
    
    except Exception as e:
        # Log the full traceback
        logger.error("Unhandled exception:")
        logger.error(traceback.format_exc())
        
        # Return a more detailed error response
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'details': str(e),
                'traceback': traceback.format_exc().split('\n')
            }),
            'headers': {
                'Content-Type': 'application/json',
            }
        }