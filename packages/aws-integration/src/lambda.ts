import type {Component} from '@layr/component';
import {isComponentClass} from '@layr/component';
import type {ComponentServer, ComponentServerOptions} from '@layr/component-server';
import {ensureComponentServer, isComponentServerInstance} from '@layr/component-server';
import type {RoutableComponent} from '@layr/routable';
import {callRouteByURL, isRoutableClass} from '@layr/routable';
import type {APIGatewayProxyEventV2, Context, APIGatewayProxyStructuredResultV2} from 'aws-lambda';

type CustomHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

/**
 * Creates an [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) for the specified [ComponentServer](https://layrjs.com/docs/v2/reference/component-server) instance.
 *
 * Alternatively, you can pass a [`Component`](https://layrjs.com/docs/v2/reference/component) class or a function (which can be asynchronous) returning a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance or a [`Component`](https://layrjs.com/docs/v2/reference/component) class. When a [`Component`](https://layrjs.com/docs/v2/reference/component) class is passed (or returned from a passed function), a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance is automatically created from the [`Component`](https://layrjs.com/docs/v2/reference/component) class.
 *
 * The created handler can be hosted in [AWS Lambda](https://aws.amazon.com/lambda/) and consumed by [AWS API Gateway](https://aws.amazon.com/api-gateway/) through an [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * @param componentServer A [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance, a [`Component`](https://layrjs.com/docs/v2/reference/component), or a function (which can be asynchronous) returning a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance or a [`Component`](https://layrjs.com/docs/v2/reference/component).
 *
 * @returns An [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html).
 *
 * @example
 * ```
 * import {Component, attribute, expose} from '﹫layr/component';
 * import {ComponentServer} from '﹫layr/component-server';
 * import {createAWSLambdaHandler} from '@layr/aws-integration';
 *
 * class Movie extends Component {
 *   ﹫expose({get: true, set: true}) ﹫attribute('string') title = '';
 * }
 *
 * const server = new ComponentServer(Movie);
 *
 * const handler = createAWSLambdaHandler(server);
 *
 * export {handler};
 * ```
 *
 * @category Functions
 */
export function createAWSLambdaHandler(
  componentServerProvider:
    | typeof Component
    | ComponentServer
    | (() => Promise<typeof Component | ComponentServer>),
  options: ComponentServerOptions & {customHandler?: CustomHandler} = {}
) {
  const {customHandler, ...componentServerOptions} = options;

  let componentServer: ComponentServer;
  let routableComponent: typeof RoutableComponent | undefined;

  const handler = async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyStructuredResultV2 | undefined> => {
    context.callbackWaitsForEmptyEventLoop = false;

    if (componentServer === undefined) {
      if (
        isComponentClass(componentServerProvider) ||
        isComponentServerInstance(componentServerProvider)
      ) {
        componentServer = ensureComponentServer(componentServerProvider, componentServerOptions);
      } else if (typeof componentServerProvider === 'function') {
        componentServer = ensureComponentServer(
          await componentServerProvider(),
          componentServerOptions
        );
      } else {
        throw new Error(
          `Expected a component class, a componentServer, or a function returning a component class or componentServer, but received a value of type '${typeof componentServerProvider}'`
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
      // === Scheduled or queued invocation ===

      await componentServer.receive(event as any, {executionMode: 'background'});

      return;
    }

    // === Invocation via API Gateway HTTP API v2 ===

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
