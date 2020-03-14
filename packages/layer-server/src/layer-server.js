import {ComponentServer} from '@liaison/component-server';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

export class LayerServer {
  constructor(layerProvider, options = {}) {
    ow(layerProvider, 'layerProvider', ow.function);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version} = options;

    this._componentServer = this._createComponentServer(layerProvider, {version});
  }

  _createComponentServer(layerProvider, {version}) {
    const layer = layerProvider();

    if (typeof layer?.constructor?.isLayer !== 'function') {
      throw new Error("The 'layerProvider' function didn't return a layer");
    }

    const name = layer.getName();

    const componentProvider = function() {
      const layer = layerProvider();

      return layer.getComponents({includePrototypes: true});
    };

    return new ComponentServer(componentProvider, {name, version});
  }

  receiveQuery(query, options = {}) {
    ow(query, 'query', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version} = options;

    return this._componentServer.receiveQuery(query, {version});
  }
}
