import {ComponentServer} from '@liaison/component-server';
import {getTypeOf} from 'core-helpers';
import ow from 'ow';

import {isLayerServer} from './utilities';

export class LayerServer {
  constructor(layer, options = {}) {
    if (typeof layer?.constructor?.isLayer !== 'function') {
      throw new Error(`Expected a layer, but received a value of type '${getTypeOf(layer)}'`);
    }

    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version} = options;

    this._componentServer = this._createComponentServer(layer, {version});
  }

  _createComponentServer(layer, {version}) {
    const componentProvider = this._createComponentProvider(layer);

    const name = layer.getName();

    return new ComponentServer(componentProvider, {name, version});
  }

  _createComponentProvider(originalLayer) {
    const getComponent = function(name, {autoFork = true, cache} = {}) {
      let layer = originalLayer;

      if (autoFork) {
        if (cache.forkedLayer === undefined) {
          cache.forkedLayer = layer.fork();
        }

        layer = cache.forkedLayer;
      }

      return layer.getComponent(name);
    };

    let componentNames;

    const getComponentNames = function() {
      if (componentNames === undefined) {
        componentNames = originalLayer.getComponentNames();
      }

      return componentNames;
    };

    return {getComponent, getComponentNames};
  }

  receiveQuery(request) {
    ow(request, 'request', ow.object);

    return this._componentServer.receiveQuery(request);
  }

  static isLayerServer(object) {
    return isLayerServer(object);
  }
}
