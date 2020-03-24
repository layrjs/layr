let componentServer;

(() => {
  componentServer = require('./component-server');

  if (componentServer.default) {
    componentServer = componentServer.default;
  }
})();

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  const {query, version} = event;

  return await componentServer.receiveQuery(query, {version});
}
