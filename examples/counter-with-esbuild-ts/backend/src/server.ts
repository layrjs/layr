import {ComponentServer} from '@layr/component-server';

import {Counter} from './components/counter';

export const server = new ComponentServer(Counter);
