import {Layer} from '@liaison/layer';
import {ComponentClient} from '@liaison/component-client';
import {isComponentClass} from '@liaison/component';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('liaison:layer-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=10

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
    const name = this._componentClient.getName();

    let components = this._componentClient.getComponents();

    components = Object.values(components).filter(component => isComponentClass(component));

    this._layer = new Layer(components, {name});

    return this._layer;
  }
}
