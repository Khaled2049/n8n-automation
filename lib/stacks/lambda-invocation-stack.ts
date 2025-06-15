import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaPair } from "../constructs/lambda-pair";

export class LambdaInvocationStack extends cdk.Stack {
  public readonly lambdaPair: LambdaPair;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Lambda pair
    this.lambdaPair = new LambdaPair(this, "LambdaPair", {
      invokerFunctionName: `${this.stackName}-invoker`,
      targetFunctionName: `${this.stackName}-target`,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
    });

    // Outputs
    new cdk.CfnOutput(this, "InvokerFunctionName", {
      value: this.lambdaPair.invokerFunction.functionName,
      description: "Name of the invoker Lambda function",
      exportName: `${this.stackName}-InvokerFunctionName`,
    });

    new cdk.CfnOutput(this, "InvokerFunctionArn", {
      value: this.lambdaPair.invokerFunction.functionArn,
      description: "ARN of the invoker Lambda function",
      exportName: `${this.stackName}-InvokerFunctionArn`,
    });

    new cdk.CfnOutput(this, "TargetFunctionName", {
      value: this.lambdaPair.targetFunction.functionName,
      description: "Name of the target Lambda function",
      exportName: `${this.stackName}-TargetFunctionName`,
    });

    new cdk.CfnOutput(this, "TargetFunctionArn", {
      value: this.lambdaPair.targetFunction.functionArn,
      description: "ARN of the target Lambda function",
      exportName: `${this.stackName}-TargetFunctionArn`,
    });
  }
}
