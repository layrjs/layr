import {ComponentClient} from '@layr/component-client';
import AWS from 'aws-sdk';
import type {PlainObject} from 'core-helpers';

const lambdaClient = new AWS.Lambda({apiVersion: '2015-03-31'});

export class ComponentAWSLambdaClient extends ComponentClient {
  constructor(functionName: string) {
    const componentServer = createComponentServer(functionName);

    super(componentServer);
  }
}

function createComponentServer(functionName: string) {
  return {
    async receive(request: {
      query: PlainObject;
      components?: PlainObject[];
      version?: number;
    }): Promise<any> {
      await lambdaClient
        .invoke({
          FunctionName: functionName,
          InvocationType: 'Event',
          Payload: JSON.stringify(request)
        })
        .promise();

      return {};
    }
  };
}
