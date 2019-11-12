import {Layer, BrowserRouter} from '@liaison/liaison';
import {ReactRouterPlugin} from '@liaison/react-integration';

import {Root} from './models/root';
import {Home} from './models/home';
import {Common} from './models/common';
import {UI} from './models/ui';

export async function createLayer() {
  const router = new BrowserRouter({plugins: [ReactRouterPlugin()]});

  const common = new Common();
  const ui = new UI();

  return new Layer({Root, Home, router, common, ui}, {name: 'frontend'});
}
