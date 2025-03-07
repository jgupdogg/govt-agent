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
echo "       Solana Traders Dashboard - Bootstrap Setup Script      "
echo "============================================================="
echo -e "${NC}"

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
  AWS_REGION="us-east-1"
  echo -e "${YELLOW}No AWS region found, defaulting to: ${AWS_REGION}${NC}"
fi

# Get environment from parameter or default to dev
ENVIRONMENT=${1:-dev}
echo -e "${YELLOW}Setting up environment: ${ENVIRONMENT}${NC}"

# Set ECR repository name
ECR_REPOSITORY="solana-traders-repo-${ENVIRONMENT}"

# Create ECR repository if it doesn't exist
echo -e "${YELLOW}Creating ECR repository...${NC}"
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} > /dev/null 2>&1 || \
aws ecr create-repository --repository-name ${ECR_REPOSITORY} > /dev/null

# Get ECR repository URI
ECR_REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
echo -e "${GREEN}ECR Repository URI: ${ECR_REPOSITORY_URI}${NC}"

# Build and push Docker image
echo -e "${YELLOW}Building and pushing Docker image...${NC}"

# Get ECR login password
echo -e "${GREEN}Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build the Docker image
echo -e "${GREEN}Building Docker image...${NC}"
cd backend
docker build -t ${ECR_REPOSITORY}:latest .

# Tag the image
echo -e "${GREEN}Tagging Docker image...${NC}"
docker tag ${ECR_REPOSITORY}:latest ${ECR_REPOSITORY_URI}:latest

# Push the image to ECR
echo -e "${GREEN}Pushing Docker image to ECR...${NC}"
docker push ${ECR_REPOSITORY_URI}:latest
cd ..

# Create modified CloudFormation template with the ECR image reference
echo -e "${YELLOW}Creating CloudFormation template with ECR image reference...${NC}"
sed "s|CONTAINER_IMAGE_PLACEHOLDER|${ECR_REPOSITORY_URI}:latest|g" container-cloudformation-template.yaml > container-cloudformation-deploy.yaml

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Bootstrap complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${YELLOW}You can now deploy the CloudFormation stack with:${NC}"
echo -e "${BLUE}aws cloudformation create-stack --stack-name solana-traders-stack-${ENVIRONMENT} --template-body file://container-cloudformation-deploy.yaml --capabilities CAPABILITY_NAMED_IAM --parameters ParameterKey=Environment,ParameterValue=${ENVIRONMENT}${NC}"