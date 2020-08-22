import {Component, consume} from '@liaison/component';
import {jsx} from '@emotion/core';
import {view, useBrowserRouter} from '@liaison/react-integration';

import type {UI} from './ui';
import type {Common} from './common';

export class Root extends Component {
  @consume() static Frontend: typeof Component;
  @consume() static UI: typeof UI;
  @consume() static Common: typeof Common;

  @view() static Main() {
    const [router, isReady] = useBrowserRouter(this.Frontend);

    if (!isReady) {
      return null;
    }

    const content = router.callCurrentRoute({
      fallback: () => (
        <this.Common.Layout>
          <this.Common.RouteNotFound />
        </this.Common.Layout>
      )
    });

    return <this.UI.Root>{content}</this.UI.Root>;
  }
}
