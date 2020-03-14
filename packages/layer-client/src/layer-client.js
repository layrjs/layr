import {Layer} from '@liaison/layer';
import {ComponentClient} from '@liaison/component-client';
import {isComponentClass} from '@liaison/component';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

export class LayerClient {
  constructor(layerServer, options = {}) {
    ow(layerServer, 'layerServer', ow.object);
    ow(
      options,
      'options',
      ow.object.exactShape({version: ow.optional.number.integer, baseComponents: ow.optional.array})
    );

    if (typeof layerServer.receiveQuery !== 'function') {
      throw new Error(
        'The LayerClient constructor expects a LayerServer instance to be passed as the first parameter'
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
            components = Object.values(components).filter(component => isComponentClass(component));

            this._layer = new Layer(components, {name});

            return this._layer;
          }
        });
      }
    });
  }
}
