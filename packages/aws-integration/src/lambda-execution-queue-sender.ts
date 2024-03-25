import type {LambdaClient, InvokeCommand} from '@aws-sdk/client-lambda';
import type {PlainObject} from 'core-helpers';

export function createAWSLambdaExecutionQueueSender({
  lambdaClient,
  InvokeCommandClass,
  functionName
}: {
  lambdaClient: LambdaClient;
  InvokeCommandClass: typeof InvokeCommand;
  functionName: string;
}) {
  return async (query: PlainObject) => {
    await lambdaClient.send(
      new InvokeCommandClass({
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({query})
      })
    );
  };
}
