import {createAWSLambdaHandlerForComponentServer} from '@layr/aws-integration';

import {server} from './server';

export const handler = createAWSLambdaHandlerForComponentServer(server, {
  customHandler: async (event) => {
    if (event.rawPath === '/blog/feed') {
      const {result} = await server.receive({
        query: {'<=': {__component: 'typeof Article'}, 'getRSSFeed=>': {'()': []}}
      });

      return {
        statusCode: 200,
        headers: {'content-type': 'application/rss+xml'},
        body: result as string
      };
    }

    return undefined;
  }
});
