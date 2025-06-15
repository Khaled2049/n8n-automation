import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaInvocationStack } from "../../../lib/stacks/n8n";

describe("LambdaInvocationStack", () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  test("creates stack with Lambda pair", () => {
    // WHEN
    const stack = new LambdaInvocationStack(app, "TestStack");

    // THEN
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::Lambda::Function", 3);
    template.resourceCountIs("AWS::IAM::Role", 3);
    template.resourceCountIs("AWS::IAM::Policy", 3);
  });

  test("creates outputs for function names and ARNs", () => {
    // WHEN
    const stack = new LambdaInvocationStack(app, "TestStack");

    // THEN
    const template = Template.fromStack(stack);

    template.hasOutput("InvokerFunctionName", {
      Export: {
        Name: "TestStack-InvokerFunctionName",
      },
    });

    template.hasOutput("InvokerFunctionArn", {
      Export: {
        Name: "TestStack-InvokerFunctionArn",
      },
    });

    template.hasOutput("TargetFunctionName", {
      Export: {
        Name: "TestStack-TargetFunctionName",
      },
    });

    template.hasOutput("TargetFunctionArn", {
      Export: {
        Name: "TestStack-TargetFunctionArn",
      },
    });
  });

  test("sets correct function names based on stack name", () => {
    // WHEN
    const stack = new LambdaInvocationStack(app, "MyTestStack");

    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "MyTestStack-invoker",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "MyTestStack-target",
    });
  });

  test("configures Lambda functions with correct timeout and memory", () => {
    // WHEN
    const stack = new LambdaInvocationStack(app, "TestStack");

    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Timeout: 60,
      MemorySize: 256,
    });
  });
});
