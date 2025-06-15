import { Context } from "aws-lambda";
import {
  LambdaClient,
  InvokeCommand,
  InvokeCommandInput,
} from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "us-east-1",
});

interface InvokerEvent {
  message?: string;
  data?: any;
}

export const handler = async (event: InvokerEvent, context: Context) => {
  console.log(
    "Invoker Lambda started with event:",
    JSON.stringify(event, null, 2)
  );

  const targetFunctionName = process.env.TARGET_FUNCTION_NAME;

  if (!targetFunctionName) {
    throw new Error("TARGET_FUNCTION_NAME environment variable is not set");
  }

  const payload = {
    message: event.message || "Hello from Invoker Lambda!",
    data: event.data || event,
    invokedAt: new Date().toISOString(),
    invokerRequestId: context.awsRequestId,
  };

  const invokeParams: InvokeCommandInput = {
    FunctionName: targetFunctionName,
    InvocationType: "RequestResponse", // Synchronous invocation
    Payload: JSON.stringify(payload),
  };

  try {
    console.log(`Invoking target function: ${targetFunctionName}`);

    const command = new InvokeCommand(invokeParams);
    const result = await lambdaClient.send(command);

    if (result.FunctionError) {
      throw new Error(`Target function error: ${result.FunctionError}`);
    }

    const responsePayload = result.Payload
      ? JSON.parse(Buffer.from(result.Payload).toString())
      : null;

    console.log("Target Lambda response:", responsePayload);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Successfully invoked target Lambda",
        invokerRequestId: context.awsRequestId,
        targetResponse: responsePayload,
        executionTime: Date.now() - new Date(payload.invokedAt).getTime(),
      }),
    };
  } catch (error) {
    console.error("Error invoking target Lambda:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Failed to invoke target Lambda",
        error: error instanceof Error ? error.message : "Unknown error",
        invokerRequestId: context.awsRequestId,
      }),
    };
  }
};
