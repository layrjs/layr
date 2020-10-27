import {provide} from '@layr/component';
import {Storable} from '@layr/storable';
import {ComponentHTTPClient} from '@layr/component-http-client';
import {jsx} from '@emotion/core';
import {view, useBrowserRouter} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {Home} from './home';
import {Docs} from './docs';
import {Session} from './session';
import {User} from './user';
import {Blog} from './blog';
import {Article} from './article';
import {Newsletter} from './newsletter';
import {Common} from './common';
import {UI} from './ui';

export const getApplication = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  class Application extends BackendApplicationProxy {
    @provide() static Home = Home;
    @provide() static Docs = Docs;
    @provide() static Session = Session(BackendApplicationProxy.Session);
    @provide() static User = User(BackendApplicationProxy.User);
    @provide() static Blog = Blog;
    @provide() static Article = Article(BackendApplicationProxy.Article);
    @provide() static Newsletter = Newsletter(BackendApplicationProxy.Newsletter);
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

  return Application;
};
