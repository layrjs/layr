import {ComponentHTTPServer} from '@layr/component-http-server';

import {server} from './server';

const backendURL = process.env.BACKEND_URL;

if (!backendURL) {
  throw new Error(`'BACKEND_URL' environment variable is missing`);
}

const port = Number(new URL(backendURL).port);

if (!port) {
  throw new Error(`'BACKEND_URL' environment variable should include a port`);
}

const httpServer = new ComponentHTTPServer(server, {port});
httpServer.start();
