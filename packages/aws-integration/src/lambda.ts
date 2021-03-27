import type {ComponentServer} from '@layr/component-server';
import {isComponentServerInstance, assertIsComponentServerInstance} from '@layr/component-server';
import type {APIGatewayProxyEventV2, Context, APIGatewayProxyStructuredResultV2} from 'aws-lambda';

type CustomHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

/**
 * Creates an [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) for the specified [component server](https://layrjs.com/docs/v1/reference/component-server).
 *
 * The created handler can be hosted in [AWS Lambda](https://aws.amazon.com/lambda/) and consumed by [AWS API Gateway](https://aws.amazon.com/api-gateway/) through an [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * @param componentServer A [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) instance.
 *
 * @returns An [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html).
 *
 * @example
 * ```
 * import {Component, attribute, expose} from '﹫layr/component';
 * import {ComponentServer} from '﹫layr/component-server';
 * import {createAWSLambdaHandlerForComponentServer} from '@layr/aws-integration';
 *
 * class Movie extends Component {
 *   ﹫expose({get: true, set: true}) ﹫attribute('string') title = '';
 * }
 *
 * const server = new ComponentServer(Movie);
 *
 * const handler = createAWSLambdaHandlerForComponentServer(server);
 *
 * export {handler};
 * ```
 *
 * @category Functions
 */
export function createAWSLambdaHandlerForComponentServer(
  componentServerOrComponentServerGetter: ComponentServer | (() => Promise<ComponentServer>),
  {customHandler}: {customHandler?: CustomHandler} = {}
) {
  let componentServer: ComponentServer;

  const handler = async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    context.callbackWaitsForEmptyEventLoop = false;

    if (componentServer === undefined) {
      if (isComponentServerInstance(componentServerOrComponentServerGetter)) {
        componentServer = componentServerOrComponentServerGetter;
      } else if (typeof componentServerOrComponentServerGetter === 'function') {
        componentServer = await componentServerOrComponentServerGetter();
        assertIsComponentServerInstance(componentServer);
      } else {
        throw new Error(
          `Expected a componentServer or a function returning a componentServer, but received a value of type '${typeof componentServerOrComponentServerGetter}'`
        );
      }
    }

    if (
      !(
        event.version === '2.0' &&
        event.rawPath !== undefined &&
        event.requestContext !== undefined
      )
    ) {
      // Direct invocation

      return (await componentServer.receive(event as any)) as any;
    }

    // Invocation via API Gateway HTTP API v2

    if (customHandler !== undefined) {
      const result = await customHandler(event, context);

      if (result !== undefined) {
        return result;
      }
    }

    const path = event.rawPath;

    if (path !== '/') {
      return {statusCode: 404, body: 'Not Found'};
    }

    const method = event.requestContext.http.method.toUpperCase();

    if (method === 'GET') {
      return await handleHTTPRequest({query: {'introspect=>': {'()': []}}});
    }

    if (method === 'POST') {
      const body = event.body;

      if (typeof body !== 'string') {
        return {statusCode: 400, body: 'Bad Request'};
      }

      let request: any;

      try {
        request = JSON.parse(body);
      } catch {
        return {statusCode: 400, body: 'Bad Request'};
      }

      return await handleHTTPRequest(request);
    }

    if (method === 'OPTIONS') {
      return {statusCode: 200};
    }

    return {statusCode: 405, body: 'Method Not Allowed'};
  };

  const handleHTTPRequest = async (request: any): Promise<APIGatewayProxyStructuredResultV2> => {
    const response = await componentServer.receive(request);

    return {
      statusCode: 200,
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(response)
    };
  };

  return handler;
}
