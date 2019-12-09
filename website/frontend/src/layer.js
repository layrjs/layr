import {Layer, BrowserRouter} from '@liaison/liaison';
import {LayerHTTPClient} from '@liaison/layer-http-client';
import {ReactRouterPlugin} from '@liaison/react-integration';

import {Article} from './models/article';
import {Blog} from './models/blog';
import {Common} from './models/common';
import {Home} from './models/home';
import {Newsletter} from './models/newsletter';
import {Root} from './models/root';
import {Session} from './models/session';
import {UI} from './models/ui';
import {User} from './models/user';
import {BACKEND_URL} from './environment';

export async function createLayer() {
  const client = new LayerHTTPClient(BACKEND_URL);
  const backendLayer = await client.$getLayer();

  const router = new BrowserRouter({plugins: [ReactRouterPlugin()]});

  const common = new Common();
  const ui = new UI();

  const session = Session.$deserialize();

  return new Layer(
    {Root, Home, Newsletter, Blog, Article, User, router, common, ui, session},
    {name: 'frontend', parent: backendLayer}
  );
}
