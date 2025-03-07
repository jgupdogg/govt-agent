#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Make sure environment is set
if [ -z "$ENVIRONMENT" ]; then
  echo -e "${YELLOW}No environment specified, defaulting to 'dev'${NC}"
  ENVIRONMENT="dev"
fi

# Set stack name
STACK_NAME="solana-traders-stack-${ENVIRONMENT}"
echo -e "${GREEN}Deploying Solana Traders Dashboard for ${YELLOW}${ENVIRONMENT}${GREEN} environment...${NC}"

# Function to retrieve CloudFormation outputs
get_cf_output() {
  local output_key=$1
  local output_value=$(aws cloudformation describe-stacks --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
    --output text)
  
  if [ -z "$output_value" ] || [ "$output_value" == "None" ]; then
    echo -e "${RED}Failed to get $output_key from CloudFormation stack.${NC}" >&2
    return 1
  fi
  
  echo "$output_value"
}

# Step 1: Build the frontend application
echo -e "${YELLOW}Building the frontend application...${NC}"
npm run build

# Step 2: Get AWS resource details from CloudFormation
echo -e "${YELLOW}Getting resource details from CloudFormation stack...${NC}"

# Get S3 bucket name
S3_BUCKET=$(get_cf_output "S3BucketName")
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to get S3 bucket name.${NC}"
  exit 1
fi

# Get CloudFront distribution ID
CLOUDFRONT_ID=$(get_cf_output "CloudFrontDistributionId")
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to get CloudFront distribution ID.${NC}"
  exit 1
fi

# Get deployment bucket name
DEPLOYMENT_BUCKET=$(get_cf_output "DeploymentBucketName")
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to get deployment bucket name.${NC}"
  exit 1
fi

# Get Lambda function name
LAMBDA_FUNCTION_NAME=$(get_cf_output "LambdaFunctionName")
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to get Lambda function name.${NC}"
  exit 1
fi

# Step 3: Deploy the frontend to S3
echo -e "${YELLOW}Deploying frontend to S3 bucket: ${S3_BUCKET}...${NC}"
aws s3 sync dist/ s3://$S3_BUCKET --delete

# Step 4: Invalidate CloudFront cache
echo -e "${YELLOW}Invalidating CloudFront cache for distribution: ${CLOUDFRONT_ID}...${NC}"
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*"

# Step 5: Package the Lambda code
echo -e "${YELLOW}Packaging the Lambda code...${NC}"
cd backend

# Create a temporary directory for packaging
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}Created temporary directory: ${TEMP_DIR}${NC}"

# Copy files to the temporary directory
cp -r * $TEMP_DIR

# Install dependencies in the temporary directory
cd $TEMP_DIR
pip install -r requirements.txt --target .
cd ..

# Create zip file
ZIP_FILE="lambda-code.zip"
cd $TEMP_DIR
zip -r $ZIP_FILE .
mv $ZIP_FILE ..
cd ..

# Step 6: Upload Lambda code to S3
echo -e "${YELLOW}Uploading Lambda code to S3...${NC}"
aws s3 cp $ZIP_FILE s3://$DEPLOYMENT_BUCKET/

# Step 7: Update Lambda function
echo -e "${YELLOW}Updating Lambda function code...${NC}"
aws lambda update-function-code \
  --function-name $LAMBDA_FUNCTION_NAME \
  --s3-bucket $DEPLOYMENT_BUCKET \
  --s3-key $ZIP_FILE

# Clean up
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf $TEMP_DIR $ZIP_FILE
cd ..

echo -e "${GREEN}Deployment completed successfully!${NC}"

# Display URLs
FRONTEND_URL=$(get_cf_output "FrontendURL")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Frontend URL: ${YELLOW}${FRONTEND_URL}${NC}"
fi

API_ENDPOINT=$(get_cf_output "ApiEndpoint")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}API Endpoint: ${YELLOW}${API_ENDPOINT}${NC}"
fi