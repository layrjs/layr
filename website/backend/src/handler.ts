import {createAWSLambdaHandlerForComponentServer} from '@liaison/aws-integration';

import {server} from './server';

export const handler = createAWSLambdaHandlerForComponentServer(server);
