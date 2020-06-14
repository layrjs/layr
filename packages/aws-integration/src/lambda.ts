import type {ComponentServer} from '@liaison/component-server';
import {assertIsComponentServerInstance} from '@liaison/component-server';
import {APIGatewayProxyHandlerV2} from 'aws-lambda';

export function createAWSLambdaHandlerForComponentServer(componentServer: ComponentServer) {
  assertIsComponentServerInstance(componentServer);

  const handler: APIGatewayProxyHandlerV2<object> = async function handler(event, context) {
    context.callbackWaitsForEmptyEventLoop = false;

    const path = event.rawPath;

    if (path !== '/') {
      return {statusCode: 404, body: 'Not Found'};
    }

    const method = event.requestContext.http.method.toUpperCase();

    if (method === 'GET') {
      return await componentServer.receive({query: {'introspect=>': {'()': []}}});
    }

    if (method === 'POST') {
      const body = event.body;

      if (typeof body !== 'string') {
        return {statusCode: 400, body: 'Bad Request'};
      }

      let request;

      try {
        request = JSON.parse(body);
      } catch {
        return {statusCode: 400, body: 'Bad Request'};
      }

      return await componentServer.receive(request);
    }

    if (method === 'OPTIONS') {
      return {statusCode: 200};
    }

    return {statusCode: 405, body: 'Method Not Allowed'};
  };

  return handler;
}
