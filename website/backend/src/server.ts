import {ComponentServer} from '@layr/component-server';

import {Application} from './components/application';
import {createStore} from './store';

createStore(Application);

export const server = new ComponentServer(Application);
