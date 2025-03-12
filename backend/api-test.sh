#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get API Gateway endpoint
if [ -z "$1" ]; then
  echo -e "${YELLOW}No API endpoint provided as argument.${NC}"
  echo -e "${YELLOW}Attempting to get endpoint from CloudFormation stack...${NC}"
  
  STACK_NAME="govt-agent-stack-dev"
  AWS_REGION=$(aws configure get region)
  
  if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
    echo -e "${YELLOW}No AWS region found, defaulting to: ${AWS_REGION}${NC}"
  fi
  
  API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
    --output text --region "$AWS_REGION")
  
  if [ -z "$API_ENDPOINT" ] || [ "$API_ENDPOINT" == "None" ]; then
    echo -e "${RED}Failed to get API endpoint from CloudFormation stack.${NC}"
    echo -e "${YELLOW}Please provide the API endpoint as an argument:${NC}"
    echo "./test-api.sh https://your-api-gateway.execute-api.region.amazonaws.com/dev/api"
    exit 1
  fi
else
  API_ENDPOINT=$1
fi

# Print header
echo -e "${BLUE}"
echo "============================================================="
echo "       Government Agent API Testing                          "
echo "============================================================="
echo -e "${NC}"

echo -e "${YELLOW}Testing API endpoint: ${API_ENDPOINT}${NC}"

# Function to test an endpoint
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  local data=$3
  local description=$4
  
  echo -e "\n${BLUE}Testing: ${description}${NC}"
  echo -e "${YELLOW}Endpoint: ${method} ${endpoint}${NC}"
  
  if [ "$method" == "GET" ]; then
    response=$(curl -s "${API_ENDPOINT}${endpoint}")
  else
    response=$(curl -s -X ${method} -H "Content-Type: application/json" -d "${data}" "${API_ENDPOINT}${endpoint}")
  fi
  
  # Check if response is valid JSON
  if echo "$response" | jq -e . >/dev/null 2>&1; then
    echo -e "${GREEN}Response (formatted):${NC}"
    echo "$response" | jq .
  else
    echo -e "${YELLOW}Response (raw):${NC}"
    echo "$response"
  fi
}

# 1. Health Check
test_endpoint "/health" "GET" "" "Health Check Endpoint"

# 2. Debug Info
test_endpoint "/debug" "GET" "" "Debug Info Endpoint"

# 3. Sample Search
test_endpoint "/sample-search" "GET" "" "Sample Search Endpoint"

# 4. Vector Search - Basic
vector_query='{
  "query": "economic statistics",
  "limit": 3,
  "vector_weight": 0.7,
  "merge_method": "weighted"
}'
test_endpoint "/vector-search" "POST" "$vector_query" "Vector Search - Basic Query"

# 5. Knowledge Graph Search - Basic
kg_query='{
  "query": "Federal Reserve policy",
  "limit": 3,
  "vector_weight": 0.5,
  "merge_method": "weighted"
}'
test_endpoint "/kg-search" "POST" "$kg_query" "Knowledge Graph Search - Basic Query"

# 6. Hybrid Search - Economic Data
hybrid_query='{
  "query": "unemployment statistics by state",
  "limit": 3,
  "vector_weight": 0.5,
  "merge_method": "weighted"
}'
test_endpoint "/search" "POST" "$hybrid_query" "Hybrid Search - Economic Data"

# 7. Chat Endpoint - Simple Question
chat_query='{
  "query": "Tell me about government data resources for small businesses",
  "chat_history": [],
  "context": []
}'
test_endpoint "/chat" "POST" "$chat_query" "Chat Endpoint - Simple Question"

echo -e "\n${GREEN}=============================================================${NC}"
echo -e "${GREEN}API Testing Complete!${NC}"
echo -e "${GREEN}=============================================================${NC}"