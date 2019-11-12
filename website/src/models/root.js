import {Model} from '@liaison/liaison';
import {view} from '@liaison/react-integration';
import {jsx} from '@emotion/core';

/** @jsx jsx */

export class Root extends Model {
  @view() static Main() {
    const {router, common, ui} = this.$layer;

    router.$useRouter();

    const content = router.$callCurrentRoute({fallback: common.RouteNotFound});

    return <ui.Root>{content}</ui.Root>;
  }
}
