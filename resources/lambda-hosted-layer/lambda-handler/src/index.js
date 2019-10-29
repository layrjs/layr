let layerCreator;

(() => {
  layerCreator = require('./layer');
  if (layerCreator.default) {
    layerCreator = layerCreator.default;
  }
})();

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  const layer = await layerCreator();

  try {
    const {query, items, source} = event;
    const result = await layer.receiveQuery({query, items, source});
    return {result};
  } catch (err) {
    const error = {message: err.message, ...err};
    console.log(`[ERROR] ${JSON.stringify(error)}`);
    return {error};
  }
}
