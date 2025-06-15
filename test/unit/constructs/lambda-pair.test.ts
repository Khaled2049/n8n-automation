import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions"; // Import Match for more flexible assertions
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaPair } from "../../../lib/constructs/lambda-pair";

describe("LambdaPair Construct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
  });

  test("creates Lambda functions with default properties", () => {
    // WHEN
    new LambdaPair(stack, "TestLambdaPair");

    // THEN
    const template = Template.fromStack(stack);

    // Assert that both functions have the default properties
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs18.x",
      Timeout: 30,
      MemorySize: 128,
      TracingConfig: {
        Mode: "Active",
      },
    });

    template.resourceCountIs("AWS::Lambda::Function", 3);
  });

  test("adds tags to both functions", () => {
    // WHEN
    new LambdaPair(stack, "TestLambdaPair");

    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Description: "Target Lambda function that processes invocation requests",
      Tags: Match.arrayWith([
        {
          Key: "Component",
          Value: "TargetLambda",
        },
      ]),
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      Description: "Invoker Lambda function that calls the target function",
      Tags: Match.arrayWith([
        {
          Key: "Component",
          Value: "InvokerLambda",
        },
      ]),
    });
  });
});
