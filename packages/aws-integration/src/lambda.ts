import type {ComponentServer} from '@liaison/component-server';
import {assertIsComponentServerInstance} from '@liaison/component-server';
import type {APIGatewayProxyEventV2, Context, APIGatewayProxyStructuredResultV2} from 'aws-lambda';

type CustomRoute = {
  path: string;
  handler: (
    event: APIGatewayProxyEventV2,
    context: Context
  ) => Promise<APIGatewayProxyStructuredResultV2>;
};

/**
 * Creates an [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) for the specified [component server](https://liaison.dev/docs/v1/reference/component-server).
 *
 * The created handler can be hosted in [AWS Lambda](https://aws.amazon.com/lambda/) and consumed by [AWS API Gateway](https://aws.amazon.com/api-gateway/) through an [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * @param componentServer A [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) instance.
 *
 * @returns An [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html).
 *
 * @example
 * ```
 * import {Component, attribute, expose} from '﹫liaison/component';
 * import {ComponentServer} from '﹫liaison/component-server';
 * import {createAWSLambdaHandlerForComponentServer} from '@liaison/aws-integration';
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
  componentServer: ComponentServer,
  {customRoutes = []}: {customRoutes?: CustomRoute[]} = {}
) {
  assertIsComponentServerInstance(componentServer);

  const handler = async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    context.callbackWaitsForEmptyEventLoop = false;

    const path = event.rawPath;

    for (const customRoute of customRoutes) {
      if (customRoute.path === path) {
        return await customRoute.handler(event, context);
      }
    }

    if (path !== '/') {
      return {statusCode: 404, body: 'Not Found'};
    }

    const method = event.requestContext.http.method.toUpperCase();

    if (method === 'GET') {
      return await handleRequest({query: {'introspect=>': {'()': []}}});
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

      return await handleRequest(request);
    }

    if (method === 'OPTIONS') {
      return {statusCode: 200};
    }

    return {statusCode: 405, body: 'Method Not Allowed'};
  };

  const handleRequest = async (request: any): Promise<APIGatewayProxyStructuredResultV2> => {
    const response = await componentServer.receive(request);

    return {
      statusCode: 200,
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(response)
    };
  };

  return handler;
}
