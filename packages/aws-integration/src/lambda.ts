import type {ComponentServer} from '@layr/component-server';
import {isComponentServerInstance, assertIsComponentServerInstance} from '@layr/component-server';
import type {RoutableComponent} from '@layr/routable';
import {callRouteByURL, isRoutableClass} from '@layr/routable';
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
  let routableComponent: typeof RoutableComponent | undefined;

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

      const component = componentServer.getComponent();
      routableComponent = isRoutableClass(component) ? component : undefined;
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

    const method = event.requestContext.http.method;

    if (method === 'OPTIONS') {
      return {statusCode: 200};
    }

    const path = event.rawPath;

    if (path === '/') {
      if (method === 'GET') {
        return await receiveRequest({query: {'introspect=>': {'()': []}}});
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

        return await receiveRequest(request);
      }

      return {statusCode: 405, body: 'Method Not Allowed'};
    }

    if (routableComponent !== undefined) {
      const routableComponentFork = routableComponent.fork();

      await routableComponentFork.initialize();

      let url = path;

      if (event.rawQueryString) {
        url += `?${event.rawQueryString}`;
      }

      const headers = event.headers;

      let body: string | Buffer | undefined = event.body;

      if (body !== undefined && event.isBase64Encoded) {
        body = Buffer.from(body, 'base64');
      }

      const response: {
        status: number;
        headers?: Record<string, string>;
        body?: string | Buffer;
      } = await callRouteByURL(routableComponentFork, url, {method, headers, body});

      if (typeof response?.status !== 'number') {
        throw new Error(
          `Unexpected response \`${JSON.stringify(
            response
          )}\` returned by a component route (a proper response should be an object of the shape \`{status: number; headers?: Record<string, string>; body?: string | Buffer;}\`)`
        );
      }

      return {
        statusCode: response.status,
        headers: response.headers,
        body: Buffer.isBuffer(response.body) ? response.body.toString('base64') : response.body,
        isBase64Encoded: Buffer.isBuffer(response.body)
      };
    }

    return {statusCode: 404, body: 'Not Found'};
  };

  const receiveRequest = async (request: any): Promise<APIGatewayProxyStructuredResultV2> => {
    const response = await componentServer.receive(request);

    return {
      statusCode: 200,
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(response)
    };
  };

  return handler;
}
