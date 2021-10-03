import type AWS from 'aws-sdk';
import type {PlainObject} from 'core-helpers';

export function createAWSLambdaExecutionQueueSender({
  lambdaClient,
  functionName
}: {
  lambdaClient: AWS.Lambda;
  functionName: string;
}) {
  return async (query: PlainObject) => {
    await lambdaClient
      .invoke({
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({query})
      })
      .promise();
  };
}
