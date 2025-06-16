#!/bin/bash

# --- Configuration ---
# 1. Get the Role ARN from your CDK stack output and paste it here.
ROLE_ARN=process.env.ROLE_ARN

# 2. Define a session name. This can be any identifier.
SESSION_NAME="n8n-lambda-session-$(date +%s)"
# ---------------------

# Check if ROLE_ARN is set
if [ "$ROLE_ARN" == "PASTE_YOUR_N8N_INSTANCE_ROLE_ARN_HERE" ]; then
    echo "❌ Error: Please edit the script and set the ROLE_ARN variable."
    exit 1
fi

echo "🔄 Assuming role: $ROLE_ARN"

# Assume the role and capture the JSON output
CREDS=$(aws sts assume-role \
  --role-arn "$ROLE_ARN" \
  --role-session-name "$SESSION_NAME" \
  --duration-seconds 3600) # Credentials will be valid for 1 hour (3600s)

# Check if the command was successful
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to assume role. Check your AWS credentials and permissions."
    exit 1
fi

# Extract credentials using jq and print them
echo "✅ Success! Temporary credentials generated."
echo "------------------------------------------------------------------"
echo "📋 Copy these into your n8n 'AWS Credentials' configuration:"
echo "------------------------------------------------------------------"

echo "🔑 Access Key ID:"
echo $(echo $CREDS | jq -r '.Credentials.AccessKeyId')
echo ""

echo "🔒 Secret Access Key:"
echo $(echo $CREDS | jq -r '.Credentials.SecretAccessKey')
echo ""

echo " टोकन Session Token:"
echo $(echo $CREDS | jq -r '.Credentials.SessionToken')
echo ""

echo "⏳ Expiration:"
echo $(echo $CREDS | jq -r '.Credentials.Expiration')
echo "------------------------------------------------------------------"