#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env"
PARAM_PREFIX="/govt-agent"
AWS_REGION=$(aws configure get region)

if [ -z "$AWS_REGION" ]; then
  AWS_REGION="us-east-1"
  echo -e "${YELLOW}No AWS region found, defaulting to: ${AWS_REGION}${NC}"
fi

# Function to create or update a parameter
create_or_update_parameter() {
  local name=$1
  local value=$2
  local type=$3
  local description=$4

  # Check if parameter already exists
  if aws ssm get-parameter --name "$name" --region "$AWS_REGION" &>/dev/null; then
    echo -e "${BLUE}Updating parameter:${NC} $name"
    aws ssm put-parameter \
      --name "$name" \
      --value "$value" \
      --type "$type" \
      --overwrite \
      --description "$description" \
      --region "$AWS_REGION"
  else
    echo -e "${GREEN}Creating parameter:${NC} $name"
    aws ssm put-parameter \
      --name "$name" \
      --value "$value" \
      --type "$type" \
      --description "$description" \
      --region "$AWS_REGION"
  fi
}

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error: $ENV_FILE file not found!${NC}"
  exit 1
fi

echo -e "${BLUE}"
echo "============================================================="
echo "      Setting up AWS Parameter Store from .env file          "
echo "============================================================="
echo -e "${NC}"

echo -e "${YELLOW}Using AWS region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}Parameters will be created with prefix: ${PARAM_PREFIX}${NC}"

# Create temporary file with normalized line endings
TMP_FILE=$(mktemp)
cat "$ENV_FILE" | tr -d '\r' > "$TMP_FILE"

# Define the mapping of env vars to SSM parameters
declare -A PARAM_MAPPINGS=(
  ["ANTHROPIC_API_KEY"]="${PARAM_PREFIX}/anthropic/api_key|SecureString|Anthropic API Key for LLM access"
  ["OPENAI_API_KEY"]="${PARAM_PREFIX}/openai/api_key|SecureString|OpenAI API Key for embeddings"
  ["PINECONE_API_KEY"]="${PARAM_PREFIX}/pinecone/api_key|SecureString|Pinecone API Key for vector database"
  ["PINECONE_INDEX_NAME"]="${PARAM_PREFIX}/pinecone/index|String|Pinecone index name"
  ["PINECONE_NAMESPACE"]="${PARAM_PREFIX}/pinecone/namespace|String|Pinecone namespace"
  ["NEO4J_URI"]="${PARAM_PREFIX}/neo4j/uri|String|Neo4j database URI"
  ["NEO4J_USERNAME"]="${PARAM_PREFIX}/neo4j/username|String|Neo4j database username"
  ["NEO4J_PASSWORD"]="${PARAM_PREFIX}/neo4j/password|SecureString|Neo4j database password"
  ["SUPABASE_URL"]="${PARAM_PREFIX}/supabase/url|String|Supabase project URL"
  ["SUPABASE_KEY"]="${PARAM_PREFIX}/supabase/key|SecureString|Supabase API key"
)

# Process the file line by line, handling comments and values with special chars
echo -e "\n${BLUE}Processing .env file (showing first 10 characters of values)...${NC}"

# Keep track of successful and failed parameters
success_count=0
declare -a failed_params

while IFS= read -r line; do
  # Skip empty lines and comment-only lines
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    continue
  fi
  
  # Extract key and value, handling comments at the end of the line
  # This regex matches KEY=VALUE format, capturing the key in group 1 and the value in group 2
  # It stops at a # character which would indicate a comment
  if [[ "$line" =~ ^[[:space:]]*([A-Za-z0-9_]+)[[:space:]]*=[[:space:]]*([^#]*) ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    
    # Trim leading and trailing whitespace from value
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    
    # Remove quotes if present
    if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    
    # Skip if there's no mapping for this key
    if [[ -z "${PARAM_MAPPINGS[$key]}" ]]; then
      echo -e "${YELLOW}No mapping for: $key${NC}"
      continue
    fi
    
    # Skip if value is empty
    if [[ -z "$value" ]]; then
      echo -e "${RED}Empty value for: $key${NC}"
      failed_params+=("$key")
      continue
    fi
    
    # Get the parameter details
    IFS='|' read -r param_name param_type param_desc <<< "${PARAM_MAPPINGS[$key]}"
    
    # Display what we're processing (with truncated value for security)
    echo -e "${GREEN}Processing: $key -> $param_name${NC}"
    echo -e "${BLUE}Value begins with: ${value:0:10}...${NC}"
    
    # Create or update the parameter
    if create_or_update_parameter "$param_name" "$value" "$param_type" "$param_desc"; then
      ((success_count++))
    else
      failed_params+=("$key")
    fi
  else
    echo -e "${YELLOW}Skipping malformed line: $line${NC}"
  fi
done < "$TMP_FILE"

# Clean up
rm "$TMP_FILE"

echo -e "\n${GREEN}=============================================================${NC}"
echo -e "${GREEN}AWS Parameter Store setup complete!${NC}"
echo -e "${GREEN}=============================================================${NC}"

# List all parameters under our prefix
echo -e "\n${BLUE}Parameters created under ${PARAM_PREFIX}:${NC}"
aws ssm get-parameters-by-path \
  --path "$PARAM_PREFIX" \
  --recursive \
  --query "Parameters[].{Name:Name,Type:Type}" \
  --output table \
  --region "$AWS_REGION"

# Display summary
echo -e "\n${BLUE}Summary:${NC}"
echo -e "${GREEN}Successfully created/updated: $success_count parameters${NC}"

if [ ${#failed_params[@]} -gt 0 ]; then
  echo -e "${RED}Failed to create/update: ${#failed_params[@]} parameters${NC}"
  for param in "${failed_params[@]}"; do
    echo -e "${RED}- $param${NC}"
  done
fi

# Show detailed status for debugging
echo -e "\n${BLUE}Let's verify the values directly in your .env file:${NC}"
for key in "${!PARAM_MAPPINGS[@]}"; do
  echo -e "${YELLOW}Checking $key:${NC}"
  grep -E "^[[:space:]]*$key[[:space:]]*=" "$ENV_FILE" || echo -e "${RED}Not found!${NC}"
done

echo -e "\n${YELLOW}Note: Actual parameter values are not displayed for security reasons.${NC}"