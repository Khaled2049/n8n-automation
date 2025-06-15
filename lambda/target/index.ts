import { Context, APIGatewayProxyEvent } from "aws-lambda";

interface TargetEvent {
  message?: string;
  data?: any;
  invokedAt?: string;
}

export const handler = async (event: TargetEvent, context: Context) => {
  console.log("Target Lambda received event:", JSON.stringify(event, null, 2));
  console.log("Context:", JSON.stringify(context, null, 2));

  try {
    // Process the incoming data
    const processedData = {
      originalMessage: event.message || "No message provided",
      processedAt: new Date().toISOString(),
      requestId: context.awsRequestId,
      functionName: context.functionName,
      receivedData: event.data,
      invokedAt: event.invokedAt,
    };

    console.log("Processing completed:", processedData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Target Lambda executed successfully",
        data: processedData,
      }),
    };
  } catch (error) {
    console.error("Error in target Lambda:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Target Lambda execution failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
