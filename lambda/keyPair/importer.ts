import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  EC2Client,
  ImportKeyPairCommand,
  DeleteKeyPairCommand,
} from "@aws-sdk/client-ec2";

const secretsManager = new SecretsManagerClient();
const ec2 = new EC2Client();

interface ResourceProperties {
  KeyName: string;
  SecretArn: string;
}

interface CustomResourceEvent {
  RequestType: "Create" | "Update" | "Delete";
  ResourceProperties: ResourceProperties;
}

interface HandlerResponse {
  PhysicalResourceId?: string;
}

export const handler = async (
  event: CustomResourceEvent
): Promise<HandlerResponse | void> => {
  const { KeyName, SecretArn } = event.ResourceProperties;

  try {
    if (event.RequestType === "Delete") {
      console.log(`Attempting to delete KeyPair: ${KeyName}`);
      await ec2.send(new DeleteKeyPairCommand({ KeyName: KeyName }));
      return;
    }

    // For Create and Update
    console.log(`Fetching secret from ARN: ${SecretArn}`);
    const secretCommand = new GetSecretValueCommand({ SecretId: SecretArn });
    const secretValue = await secretsManager.send(secretCommand);

    if (!secretValue.SecretString) {
      throw new Error("SecretString in the specified secret is empty.");
    }

    console.log(`Importing key pair with name: ${KeyName}`);
    const importCommand = new ImportKeyPairCommand({
      KeyName: KeyName,
      PublicKeyMaterial: Buffer.from(secretValue.SecretString),
    });
    const response = await ec2.send(importCommand);

    // Return the KeyPairId as the PhysicalResourceId
    return { PhysicalResourceId: response.KeyPairId };
  } catch (error) {
    // Don't log the error content in production for security
    console.error("An error occurred during the custom resource execution.");
    // Re-throw to signal failure to CloudFormation
    throw error;
  }
};
