#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}"
echo "============================================================="
echo "       Solana Traders Dashboard - Deployment Script          "
echo "============================================================="
echo -e "${NC}"

# Get environment from parameter or default to dev
ENVIRONMENT=${1:-dev}
echo -e "${YELLOW}Deploying to environment: ${ENVIRONMENT}${NC}"

# Set stack name
STACK_NAME="solana-traders-stack-${ENVIRONMENT}"

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
  AWS_REGION="us-east-1"
  echo -e "${YELLOW}No AWS region found, defaulting to: ${AWS_REGION}${NC}"
fi

# Set ECR repository name based on environment
ECR_REPOSITORY="solana-traders-repo-${ENVIRONMENT}"
ECR_REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Get stack outputs
get_cf_output() {
  local output_key=$1
  local output_value=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
    --output text --region "$AWS_REGION")
  
  if [ -z "$output_value" ] || [ "$output_value" == "None" ]; then
    echo -e "${RED}Failed to get $output_key from CloudFormation stack.${NC}" >&2
    return 1
  fi
  
  echo "$output_value"
}

# Check if stack exists
stack_exists() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" > /dev/null 2>&1
  return $?
}

# Build and deploy backend Docker image
echo -e "\n${YELLOW}Building and deploying backend Docker image...${NC}"

# Get ECR login password
echo -e "${GREEN}Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build the Docker image
echo -e "${GREEN}Building Docker image...${NC}"
cd backend
docker build -t $ECR_REPOSITORY:latest .

# Tag the image
echo -e "${GREEN}Tagging Docker image...${NC}"
docker tag $ECR_REPOSITORY:latest $ECR_REPOSITORY_URI:latest

# Push the image to ECR
echo -e "${GREEN}Pushing Docker image to ECR...${NC}"
docker push $ECR_REPOSITORY_URI:latest
cd ..

# If stack exists, update Lambda function
if stack_exists; then
  # Get Lambda function name from stack
  LAMBDA_FUNCTION_NAME=$(get_cf_output "LambdaFunctionName")
  S3_BUCKET=$(get_cf_output "S3BucketName")
  CLOUDFRONT_ID=$(get_cf_output "CloudFrontDistributionId")
  
  # Update Lambda function to use the new container image
  echo -e "${GREEN}Updating Lambda function to use the new container image...${NC}"
  aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --image-uri $ECR_REPOSITORY_URI:latest \
    --region $AWS_REGION

  # Wait for the Lambda update to complete
  echo -e "${YELLOW}Waiting for Lambda update to complete...${NC}"
  aws lambda wait function-updated-v2 \
    --function-name $LAMBDA_FUNCTION_NAME \
    --region $AWS_REGION
    
  # Build and deploy frontend
  echo -e "\n${YELLOW}Building the frontend application...${NC}"
  npm install
  npm run build

  if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend build failed.${NC}"
    exit 1
  fi

  echo -e "${YELLOW}Deploying frontend to S3 bucket...${NC}"
  aws s3 sync dist/ s3://$S3_BUCKET --delete --region $AWS_REGION
  
  # Invalidate CloudFront cache
  echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" \
    --region $AWS_REGION

  echo -e "\n${GREEN}=====\${NC}"
  echo -e "${GREEN}Solana Traders Dashboard has been successfully updated!${NC}"
  echo -e "${GREEN}=====\${NC}"
  
  # Test the Lambda function
  API_ENDPOINT=$(get_cf_output "ApiEndpoint")
  echo -e "\n${YELLOW}Testing Lambda function...${NC}"
  echo -e "${BLUE}Invoking health check endpoint...${NC}"
  HEALTH_CHECK_RESPONSE=$(curl -s "$API_ENDPOINT/health")
  echo -e "${GREEN}Health check response:${NC} $HEALTH_CHECK_RESPONSE"

else
  # Create modified CloudFormation template with the ECR image reference
  echo -e "${YELLOW}Creating CloudFormation template with ECR image reference...${NC}"
  sed "s|CONTAINER_IMAGE_PLACEHOLDER|${ECR_REPOSITORY_URI}:latest|g" container-cloudformation-template.yaml > container-cloudformation-deploy.yaml

  # Create the CloudFormation stack
  echo -e "${YELLOW}Creating CloudFormation stack: ${STACK_NAME}...${NC}"
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://container-cloudformation-deploy.yaml" \
    --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
                 ParameterKey=S3BucketPrefix,ParameterValue="solana-traders" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$AWS_REGION"

  echo -e "${GREEN}CloudFormation stack creation initiated. Waiting for stack to complete...${NC}"
  echo -e "${YELLOW}This may take 5-10 minutes. Please be patient.${NC}"

  # Wait for stack creation to complete with better error handling
  if ! aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$AWS_REGION"; then
    echo -e "${RED}Stack creation failed.${NC}"
    
    # Show the failed resources
    echo -e "${YELLOW}Failed resources:${NC}"
    aws cloudformation describe-stack-events \
      --stack-name "$STACK_NAME" \
      --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[LogicalResourceId,ResourceStatusReason]" \
      --output table
      
    exit 1
  fi

  echo -e "${GREEN}CloudFormation stack created successfully!${NC}"
  
  # Get resources from the stack
  S3_BUCKET=$(get_cf_output "S3BucketName")
  CLOUDFRONT_ID=$(get_cf_output "CloudFrontDistributionId")
  LAMBDA_FUNCTION_NAME=$(get_cf_output "LambdaFunctionName")
  API_ENDPOINT=$(get_cf_output "ApiEndpoint")

  # Build and deploy frontend
  echo -e "\n${YELLOW}Building the frontend application...${NC}"
  npm install
  npm run build

  if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend build failed.${NC}"
    echo -e "${YELLOW}This doesn't affect your infrastructure, which was still created successfully.${NC}"
    echo -e "${YELLOW}Fix the build issues and deploy manually later.${NC}"
  else
    echo -e "${YELLOW}Deploying frontend to S3 bucket...${NC}"
    aws s3 sync dist/ s3://$S3_BUCKET --delete --region $AWS_REGION
  fi

  # Invalidate CloudFront cache
  echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" \
    --region $AWS_REGION

  echo -e "\n${GREEN}=====================================================${NC}"
  echo -e "${GREEN}Solana Traders Dashboard has been successfully set up!${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "\n${YELLOW}Frontend URL:${NC} https://$(aws cloudformation describe-stacks --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" --output text | sed 's|https://||')"
  echo -e "${YELLOW}API Endpoint:${NC} $API_ENDPOINT"

  # Test the Lambda function
  echo -e "\n${YELLOW}Testing Lambda function...${NC}"
  echo -e "${BLUE}Invoking health check endpoint...${NC}"
  HEALTH_CHECK_RESPONSE=$(curl -s "$API_ENDPOINT/health")
  echo -e "${GREEN}Health check response:${NC} $HEALTH_CHECK_RESPONSE"
fi

echo -e "\n${GREEN}Deployment complete!${NC}"