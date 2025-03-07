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

# Load Snowflake credentials from Parameter Store
def load_snowflake_credentials():
    try:
        account = get_parameter('/solana-traders/snowflake/account')
        if account:
            os.environ['SNOWFLAKE_ACCOUNT'] = account
        
        user = get_parameter('/solana-traders/snowflake/user')
        if user:
            os.environ['SNOWFLAKE_USER'] = user
        
        password = get_parameter('/solana-traders/snowflake/password')
        if password:
            os.environ['SNOWFLAKE_PASSWORD'] = password
        
        os.environ['SNOWFLAKE_WAREHOUSE'] = get_parameter('/solana-traders/snowflake/warehouse', False) or 'DEV_WH'
        os.environ['SNOWFLAKE_DATABASE'] = get_parameter('/solana-traders/snowflake/database', False) or 'DEV'
        os.environ['SNOWFLAKE_SCHEMA'] = get_parameter('/solana-traders/snowflake/schema', False) or 'BRONZE'
        os.environ['SNOWFLAKE_ROLE'] = get_parameter('/solana-traders/snowflake/role', False) or 'AIRFLOW_ROLE'
    except Exception as e:
        logger.error(f"Error loading Snowflake credentials: {e}")
        # Still set default values for non-sensitive parameters
        os.environ.setdefault('SNOWFLAKE_WAREHOUSE', 'DEV_WH')
        os.environ.setdefault('SNOWFLAKE_DATABASE', 'DEV')
        os.environ.setdefault('SNOWFLAKE_SCHEMA', 'BRONZE')
        os.environ.setdefault('SNOWFLAKE_ROLE', 'AIRFLOW_ROLE')

# Create a Mangum adapter for the FastAPI app
handler = Mangum(app)

# Load credentials before any request is processed
def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Load the Snowflake credentials from Parameter Store
        load_snowflake_credentials()
        
        # Handle the request using Mangum
        response = handler(event, context)
        
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
                'Content-Type': 'application/json'
            }
        }