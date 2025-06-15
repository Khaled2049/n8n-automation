// lib/constructs/lambda-pair.ts

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

export interface LambdaPairProps {
  readonly invokerFunctionName?: string;
  readonly targetFunctionName?: string;
  readonly runtime?: lambda.Runtime;
  readonly timeout?: cdk.Duration;
  readonly memorySize?: number;
  readonly environment?: { [key: string]: string };
  readonly logRetention?: logs.RetentionDays;
}

export class LambdaPair extends Construct {
  public readonly invokerFunction: NodejsFunction;
  public readonly targetFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaPairProps = {}) {
    super(scope, id);

    const defaultProps = {
      runtime: props.runtime || lambda.Runtime.NODEJS_20_X,
      timeout: props.timeout || cdk.Duration.seconds(30),
      memorySize: props.memorySize || 128,
      logRetention: props.logRetention || logs.RetentionDays.ONE_WEEK,
    };

    const nodeJsFunctionProps = {
      runtime: defaultProps.runtime,
      timeout: defaultProps.timeout,
      memorySize: defaultProps.memorySize,
      logRetention: defaultProps.logRetention,
      tracing: lambda.Tracing.ACTIVE,
      // Explicitly set bundling to output CommonJS
      bundling: {
        format: OutputFormat.CJS,
      },
    };

    // Target Lambda function
    this.targetFunction = new NodejsFunction(this, "TargetFunction", {
      ...nodeJsFunctionProps,
      functionName: props.targetFunctionName,
      entry: path.join(__dirname, "../../lambda/target/index.ts"),
      handler: "handler",
      environment: {
        NODE_ENV: process.env.NODE_ENV || "development",
        ...props.environment,
      },
      description: "Target Lambda function that processes invocation requests",
    });

    // Invoker Lambda function
    this.invokerFunction = new NodejsFunction(this, "InvokerFunction", {
      ...nodeJsFunctionProps,
      functionName: props.invokerFunctionName,
      entry: path.join(__dirname, "../../lambda/invoker/index.ts"),
      handler: "handler",
      environment: {
        TARGET_FUNCTION_NAME: this.targetFunction.functionName,
        NODE_ENV: process.env.NODE_ENV || "development",
        ...props.environment,
      },
      description: "Invoker Lambda function that calls the target function",
    });

    // Grant invoker permission to invoke target
    this.targetFunction.grantInvoke(this.invokerFunction);

    // Add tags
    cdk.Tags.of(this.targetFunction).add("Component", "TargetLambda");
    cdk.Tags.of(this.invokerFunction).add("Component", "InvokerLambda");
  }
}
