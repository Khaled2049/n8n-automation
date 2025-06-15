import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaInvocationStack } from "../../lib/stacks/n8n";

describe("Lambda Invocation Integration Tests", () => {
  let app: cdk.App;
  let stack: LambdaInvocationStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new LambdaInvocationStack(app, "IntegrationTestStack");
    template = Template.fromStack(stack);
  });

  test("full stack synthesis produces valid CloudFormation", () => {
    // WHEN
    const synthesized = app.synth();

    // THEN
    expect(synthesized.stacks).toHaveLength(1);
    expect(synthesized.stacks[0].stackName).toBe("IntegrationTestStack");

    // Verify the template has all required resources
    template.resourceCountIs("AWS::Lambda::Function", 3);
    template.resourceCountIs("AWS::IAM::Role", 3);
    template.resourceCountIs("AWS::IAM::Policy", 3);
  });
});
