#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PARAM_PREFIX="/govt-agent"
AWS_REGION=$(aws configure get region)

if [ -z "$AWS_REGION" ]; then
  AWS_REGION="us-east-1"
  echo -e "${YELLOW}No AWS region found, defaulting to: ${AWS_REGION}${NC}"
fi

echo -e "${BLUE}"
echo "============================================================="
echo "     AWS Parameter Store Verification                        "
echo "============================================================="
echo -e "${NC}"

echo -e "${YELLOW}Using AWS region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}Checking parameters under prefix: ${PARAM_PREFIX}${NC}"

# Get all parameters under the prefix
echo -e "\n${BLUE}Retrieving parameters...${NC}"
PARAMS=$(aws ssm get-parameters-by-path \
  --path "$PARAM_PREFIX" \
  --recursive \
  --query "Parameters[].{Name:Name,Type:Type,Modified:LastModifiedDate}" \
  --output json \
  --region "$AWS_REGION")

# Exit if no parameters found
if [ -z "$PARAMS" ] || [ "$PARAMS" == "[]" ]; then
  echo -e "${RED}No parameters found under prefix: ${PARAM_PREFIX}${NC}"
  exit 1
fi

# Display parameters in table format
echo -e "\n${BLUE}Parameters found:${NC}"
echo "$PARAMS" | jq -r '.[] | "\(.Name) | \(.Type) | \(.Modified)"' | column -t -s '|'

# Check for required parameters
echo -e "\n${BLUE}Checking for required parameters:${NC}"

REQUIRED_PARAMS=(
  "$PARAM_PREFIX/anthropic/api_key"
  "$PARAM_PREFIX/openai/api_key"
  "$PARAM_PREFIX/pinecone/api_key"
  "$PARAM_PREFIX/neo4j/uri"
  "$PARAM_PREFIX/neo4j/username"
  "$PARAM_PREFIX/neo4j/password"
  "$PARAM_PREFIX/supabase/url"
  "$PARAM_PREFIX/supabase/key"
)

MISSING_PARAMS=()

for param in "${REQUIRED_PARAMS[@]}"; do
  if echo "$PARAMS" | jq -e --arg p "$param" '.[] | select(.Name == $p)' > /dev/null; then
    echo -e " ${GREEN}✓${NC} $param"
  else
    echo -e " ${RED}✗${NC} $param (MISSING)"
    MISSING_PARAMS+=("$param")
  fi
done

# Check optional parameters
echo -e "\n${BLUE}Checking for optional parameters:${NC}"

OPTIONAL_PARAMS=(
  "$PARAM_PREFIX/pinecone/index"
  "$PARAM_PREFIX/pinecone/namespace"
)

for param in "${OPTIONAL_PARAMS[@]}"; do
  if echo "$PARAMS" | jq -e --arg p "$param" '.[] | select(.Name == $p)' > /dev/null; then
    echo -e " ${GREEN}✓${NC} $param"
  else
    echo -e " ${YELLOW}⚠${NC} $param (NOT SET - will use default)"
  fi
done

# Summary
echo -e "\n${BLUE}Parameter Store Summary:${NC}"
TOTAL_PARAMS=$(echo "$PARAMS" | jq '. | length')
SECURE_PARAMS=$(echo "$PARAMS" | jq '[.[] | select(.Type == "SecureString")] | length')
NORMAL_PARAMS=$(echo "$PARAMS" | jq '[.[] | select(.Type == "String")] | length')
MISSING_COUNT=${#MISSING_PARAMS[@]}

echo -e "Total parameters: ${GREEN}$TOTAL_PARAMS${NC}"
echo -e "Secure parameters: ${GREEN}$SECURE_PARAMS${NC}"
echo -e "String parameters: ${GREEN}$NORMAL_PARAMS${NC}"
echo -e "Missing required parameters: ${RED}$MISSING_COUNT${NC}"

if [ ${#MISSING_PARAMS[@]} -gt 0 ]; then
  echo -e "\n${RED}Warning: Some required parameters are missing!${NC}"
  echo -e "${YELLOW}Please create the following parameters:${NC}"
  for param in "${MISSING_PARAMS[@]}"; do
    echo "  - $param"
  done
  echo -e "\n${YELLOW}You can create these parameters using the setup-aws-params.sh script.${NC}"
else
  echo -e "\n${GREEN}All required parameters are set!${NC}"
fi

# Verify permissions
echo -e "\n${BLUE}Verifying Lambda function's permissions to access parameters:${NC}"

# Get Lambda function name from CloudFormation stack
STACK_NAME="govt-agent-stack-dev"
LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" \
  --output text --region "$AWS_REGION" 2>/dev/null || echo "")

if [ -z "$LAMBDA_FUNCTION_NAME" ]; then
  echo -e "${YELLOW}Could not find Lambda function from CloudFormation stack.${NC}"
  echo -e "${YELLOW}Skipping permission check.${NC}"
else
  echo -e "${YELLOW}Lambda function:${NC} $LAMBDA_FUNCTION_NAME"
  
  # Get Lambda execution role
  ROLE_ARN=$(aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" \
    --query "Configuration.Role" --output text --region "$AWS_REGION")
  
  echo -e "${YELLOW}Lambda execution role:${NC} $ROLE_ARN"
  
  # Extract role name from ARN
  ROLE_NAME=$(echo $ROLE_ARN | sed 's/.*role\///')
  
  # Get SSM permissions
  SSM_PERMS=$(aws iam get-role-policy --role-name "$ROLE_NAME" \
    --policy-name "SSMParameterAccess" --region "$AWS_REGION" 2>/dev/null || echo "")
  
  if [ -z "$SSM_PERMS" ]; then
    echo -e "${RED}Could not find SSMParameterAccess policy on the Lambda execution role.${NC}"
    echo -e "${RED}The Lambda function may not have permission to access the parameters.${NC}"
  else
    echo -e "${GREEN}SSMParameterAccess policy found on the Lambda execution role.${NC}"
    
    # Check if policy allows access to our parameters
    if echo "$SSM_PERMS" | grep -q "$PARAM_PREFIX"; then
      echo -e "${GREEN}✓ Policy allows access to parameters under $PARAM_PREFIX${NC}"
    else
      echo -e "${RED}✗ Policy may not allow access to parameters under $PARAM_PREFIX${NC}"
      echo -e "${YELLOW}Please verify the policy permissions manually.${NC}"
    fi
  fi
fi

echo -e "\n${GREEN}=============================================================${NC}"
echo -e "${GREEN}Parameter Store Verification Complete!${NC}"
echo -e "${GREEN}=============================================================${NC}"