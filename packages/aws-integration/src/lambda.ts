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
