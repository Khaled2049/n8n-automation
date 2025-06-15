#!/bin/bash

set -euo pipefail

KEY_NAME="n8n-cdk-key"
KEY_PATH="$HOME/.ssh/$KEY_NAME"
SECRET_NAME="n8n/ssh-public-key"
AWS_REGION="us-east-1"

# Step 1: Generate SSH key if it doesn't exist
if [[ ! -f "${KEY_PATH}" || ! -f "${KEY_PATH}.pub" ]]; then
    echo "🔐 Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "${KEY_PATH}" -N ""
else
    echo "✅ SSH key already exists at ${KEY_PATH}"
fi

# Step 2: Validate public key format
if ssh-keygen -l -f "${KEY_PATH}.pub" > /dev/null 2>&1; then
    echo "✅ SSH public key format is valid"
else
    echo "❌ SSH public key format is invalid"
    exit 1
fi

# Step 3: Read public key content
PUBLIC_KEY_CONTENT=$(cat ~/.ssh/n8n-cdk-key.pub | awk '{print $1" "$2}')

# Step 4: Create or update the secret
echo "💾 Storing public key in AWS Secrets Manager..."

# Check if the secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "🔄 Secret exists. Updating it..."
    aws secretsmanager update-secret \
        --secret-id "$SECRET_NAME" \
        --secret-string "$PUBLIC_KEY_CONTENT" \
        --region "$AWS_REGION"
else
    echo "🆕 Secret does not exist. Creating it..."
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "Public SSH key for n8n EC2 instance" \
        --secret-string "$PUBLIC_KEY_CONTENT" \
        --region "$AWS_REGION"
fi

# Step 5: Verify the secret content
echo "🔍 Verifying stored secret..."
STORED_KEY=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text)

echo "🔐 Stored Key: $STORED_KEY"

if echo "$STORED_KEY" | ssh-keygen -l -f /dev/stdin > /dev/null 2>&1; then
    echo "✅ Stored key format is valid"
else
    echo "❌ Stored key format is invalid"
    exit 1
fi
