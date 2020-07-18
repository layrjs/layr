import {createAWSLambdaHandlerForComponentServer} from '@liaison/aws-integration';

import {server} from './server';

export const handler = createAWSLambdaHandlerForComponentServer(server, {
  customRoutes: [
    {
      path: '/blog/feed',
      async handler() {
        const {result} = await server.receive({
          query: {'<=': {__component: 'typeof Article'}, 'getRSSFeed=>': {'()': []}}
        });

        return {
          statusCode: 200,
          headers: {'content-type': 'application/rss+xml'},
          body: result as string
        };
      }
    }
  ]
});
