#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { LambdaInvocationStack } from "../lib/stacks/lambda-invocation-stack";
import { N8nStack } from "../lib/stacks/n8n-stack"; // Import the new stack

const app = new cdk.App();

new LambdaInvocationStack(app, "LambdaInvocationStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  description: "Stack for demonstrating Lambda-to-Lambda invocation pattern",
  tags: {
    Project: "LambdaInvocation",
    Environment: process.env.NODE_ENV || "development",
  },
});

// Instantiate the n8n stack
new N8nStack(app, "N8nStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  description: "Stack for self-hosting n8n on an EC2 instance",
  tags: {
    Project: "LambdaInvocation",
    Environment: process.env.NODE_ENV || "development",
  },
});
