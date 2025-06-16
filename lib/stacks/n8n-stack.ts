import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import * as path from "path";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class N8nStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const keyName = "n8n-cdk-key";

    const publicKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "SshPublicKeySecret",
      "n8n/ssh-public-key"
    );

    const keyPairHandler = new NodejsFunction(this, "KeyPairHandler", {
      entry: path.join(__dirname, "../../lambda/keyPair/importer.ts"),
      handler: "handler",
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
    });

    publicKeySecret.grantRead(keyPairHandler);
    keyPairHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ec2:ImportKeyPair", "ec2:DeleteKeyPair"],
        resources: ["*"],
      })
    );

    const keyPairProvider = new cr.Provider(this, "KeyPairProvider", {
      onEventHandler: keyPairHandler,
    });

    const keyPairCustomResource = new cdk.CustomResource(
      this,
      "KeyPairCustomResource",
      {
        serviceToken: keyPairProvider.serviceToken,
        properties: {
          KeyName: keyName,
          SecretArn: publicKeySecret.secretArn,
        },
      }
    );

    const keyPair = ec2.KeyPair.fromKeyPairName(this, "N8nKeyPair", keyName);

    const vpc = ec2.Vpc.fromLookup(this, "VPC", { isDefault: true });

    const securityGroup = new ec2.SecurityGroup(this, "N8nSecurityGroup", {
      vpc,
      description: "Allow traffic to n8n instance",
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "Allow SSH access"
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP for Caddy"
    );

    // Allow HTTPS traffic for users to access n8n via Caddy
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS for Caddy"
    );

    const role = new iam.Role(this, "N8nInstanceRole", {
      // The role can be assumed by the EC2 service AND your specific IAM user
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("ec2.amazonaws.com"),
        new iam.ArnPrincipal(process.env.MY_ROLE || "")
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    // Add Lambda invoke permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [
          "arn:aws:lambda:us-east-1:308830239283:function:LambdaInvocationStack-invoker",
          "arn:aws:lambda:us-east-1:308830239283:function:LambdaInvocationStack-invoker:*",
        ],
      })
    );

    // Define the EC2 instance
    const instance = new ec2.Instance(this, "N8nInstance", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      securityGroup,
      role,
      keyPair: keyPair,
    });

    const eip = new ec2.CfnEIP(this, "N8nEIP");

    // 2. Associate the Elastic IP with the EC2 instance
    new ec2.CfnEIPAssociation(this, "N8nEIPAssociation", {
      eip: eip.ref,
      instanceId: instance.instanceId,
    });

    instance.node.addDependency(keyPairCustomResource);

    const userData = readFileSync("./lib/user-data.sh", "utf8");
    instance.addUserData(userData);

    new cdk.CfnOutput(this, "N8nInstanceElasticIp", {
      value: eip.ref,
      description: "The static Elastic IP address of the n8n instance.",
    });

    new cdk.CfnOutput(this, "N8nInstanceRoleArn", {
      value: role.roleArn,
      description: "The ARN of the N8n EC2 instance role.",
    });
  }
}
