import {provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {jsx} from '@emotion/core';
import {view, useBrowserRouter} from '@liaison/react-integration';

import type {Backend} from '../../../backend/src/components/backend';
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
    @provide() static Home = Home;
    @provide() static Docs = Docs;
    @provide() static Session = Session(BackendProxy.Session);
    @provide() static User = User(BackendProxy.User);
    @provide() static Blog = Blog;
    @provide() static Article = Article(BackendProxy.Article);
    @provide() static Newsletter = Newsletter(BackendProxy.Newsletter);
    @provide() static Common = Common;
    @provide() static UI = UI;

    @view() static Root() {
      const {Common, UI} = this;

      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({
        fallback: () => (
          <Common.Layout>
            <Common.RouteNotFound />
          </Common.Layout>
        )
      });

      return <UI.Root>{content}</UI.Root>;
    }
  }

  return Frontend;
};
