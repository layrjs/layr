let componentServer;

(() => {
  componentServer = require('./component-server');

  if (componentServer.default) {
    componentServer = componentServer.default;
  }
})();

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  const request = event;

  return await componentServer.receive(request);
}
