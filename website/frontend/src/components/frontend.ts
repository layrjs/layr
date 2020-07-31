import {provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';

import type {Backend} from '../../../backend/src/components/backend';
import {Root} from './root';
import {Home} from './home';
import {Docs} from './docs';
import {Session} from './session';
import {User} from './user';
import {Blog} from './blog';
import {Article} from './article';
import {Newsletter} from './newsletter';
import {Common} from './common';
import {UI} from './ui';

export const getFrontend = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendProxy = (await client.getComponent()) as typeof Backend;

  class Frontend extends BackendProxy {
    @provide() static Root = Root;
    @provide() static Home = Home;
    @provide() static Docs = Docs;
    @provide() static Session = Session(BackendProxy.Session);
    @provide() static User = User(BackendProxy.User);
    @provide() static Blog = Blog;
    @provide() static Article = Article(BackendProxy.Article);
    @provide() static Newsletter = Newsletter(BackendProxy.Newsletter);
    @provide() static Common = Common;
    @provide() static UI = UI;
  }

  return Frontend;
};
