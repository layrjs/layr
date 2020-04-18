import {Layer} from '@liaison/layer';
import {ComponentClient} from '@liaison/component-client';
import {possiblyAsync} from 'possibly-async';
import {getTypeOf} from 'core-helpers';
import ow from 'ow';

import {isLayerClient} from './utilities';

export class LayerClient {
  constructor(layerServer, options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({version: ow.optional.number.integer, baseComponents: ow.optional.array})
    );

    if (typeof layerServer?.receive !== 'function') {
      throw new Error(
        `Expected a layer server, but received a value of type '${getTypeOf(layerServer)}'`
      );
    }

    const {version, baseComponents} = options;

    this._componentClient = this._createComponentClient(layerServer, {version, baseComponents});
  }

  _createComponentClient(layerServer, {version, baseComponents}) {
    const componentServer = layerServer;

    return new ComponentClient(componentServer, {version, baseComponents});
  }

  getLayer() {
    if (this._layer === undefined) {
      return this._createLayer();
    }

    return this._layer;
  }

  _createLayer() {
    return possiblyAsync(this._componentClient.getName(), {
      then: name => {
        return possiblyAsync(this._componentClient.getComponents(), {
          then: components => {
            this._layer = new Layer(components, {name});

            return this._layer;
          }
        });
      }
    });
  }

  static isLayerClient(object) {
    return isLayerClient(object);
  }
}
