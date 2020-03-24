import {ComponentHTTPServer} from '@liaison/component-http-server';
import {resolve} from 'path';
import util from 'util';
import {printSuccess, formatPunctuation, formatURL} from '@resdir/console';
import notifier from 'node-notifier';

Error.stackTraceLimit = 30;
Object.assign(util.inspect.defaultOptions, {depth: 10, colors: true, breakLength: 100});

export default () => ({
  async start({notify}, environment) {
    const parentResource = this.$getParent();

    if (parentResource.environment) {
      Object.assign(process.env, parentResource.environment);
    }

    const componentServer = this.getComponentServer();

    const server = new ComponentHTTPServer(componentServer, {
      port: this.port,
      delay: this.delay,
      errorRate: this.errorRate
    });

    await server.start();

    printSuccess(
      `Test server started ${formatPunctuation(`(`)}${formatURL(
        `http://localhost:${this.port}`
      )}${formatPunctuation(`)`)}`,
      environment
    );

    if (notify) {
      notifier.notify({title: 'Test server started', message: `http://localhost:${this.port}`});
    }
  },

  getComponentServer() {
    const parentResource = this.$getParent();
    const main = resolve(parentResource.$getCurrentDirectory(), parentResource.main);

    let componentServer = require(main);

    if (componentServer.default) {
      // ES Module
      componentServer = componentServer.default;
    }

    return componentServer;
  }
});
