#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { LambdaInvocationStack } from "../lib/stacks/lambda-invocation-stack";

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
