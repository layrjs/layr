import {resolve} from 'path';
import util from 'util';
import {
  print,
  printSuccess,
  formatBold,
  formatDanger,
  formatCode,
  formatValue,
  formatPunctuation,
  formatURL
} from '@resdir/console';
import Koa from 'koa';
import jsonError from 'koa-json-error';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import notifier from 'node-notifier';
import sleep from 'sleep-promise';

Error.stackTraceLimit = 30;
Object.assign(util.inspect.defaultOptions, {depth: 10, colors: true, breakLength: 100});

export default () => ({
  async start({notify}, environment) {
    if (this.environment) {
      Object.assign(process.env, this.environment);
    }

    const layerCreator = this.getLayerCreator();

    const server = this.createServer(layerCreator, environment);

    server.listen(this.port, () => {
      // TODO: Handle errors
      printSuccess(
        `Test server started ${formatPunctuation(`(`)}${formatURL(
          `http://localhost:${this.port}`
        )}${formatPunctuation(`)`)}`,
        environment
      );
      if (notify) {
        notifier.notify({title: 'Test server started', message: `http://localhost:${this.port}`});
      }
    });
  },

  getLayerCreator() {
    const parentResource = this.$getParent();
    const main = resolve(parentResource.$getCurrentDirectory(), parentResource.main);
    let layerCreator = require(main);
    if (layerCreator.default) {
      // ES Module
      layerCreator = layerCreator.default;
    }
    return layerCreator;
  },

  createServer(createLayer, _environment) {
    const server = new Koa();

    server.use(jsonError());
    server.use(cors({maxAge: 900})); // 15 minutes
    server.use(bodyParser({enableTypes: ['json'], jsonLimit: '8mb'}));

    server.use(async ctx => {
      const layer = await createLayer();

      if (ctx.method === 'GET') {
        print(formatBold('→ ') + formatBold(formatCode('introspect()', {addBackticks: false})));
        const result = layer.introspect({
          itemFilter: item => item.$isExposed(),
          propertyFilter: property => property.isExposed()
        });
        ctx.body = result;
        print(formatBold('← ') + formatValue(result, {multiline: false}));
      } else if (ctx.method === 'POST') {
        const {query, items, source} = ctx.request.body;

        print(
          formatBold('→ ') +
            formatBold(formatCode(`invoke(`, {addBackticks: false})) +
            formatValue({query, items, source}, {multiline: false}) +
            formatBold(formatCode(`)`, {addBackticks: false}))
        );

        try {
          if (this.delay) {
            await sleep(this.delay);
          }

          if (this.errorRate) {
            const threshold = this.errorRate / 100;
            // eslint-disable-next-line max-depth
            if (Math.random() < threshold) {
              throw new Error('A simulated error occurred while handling a request');
            }
          }

          const result = await layer.receiveQuery({query, items, source});

          ctx.body = {result};

          print(formatBold('← ') + formatValue(result, {multiline: false}));
        } catch (err) {
          console.error(err);

          const error = {message: err.message, ...err};

          ctx.body = {error};

          print(formatDanger(formatBold('← [ERROR] ') + formatValue(error, {multiline: false})));
        }
      } else {
        throw new Error('Invalid HTTP request');
      }
    });

    return server;
  }
});
