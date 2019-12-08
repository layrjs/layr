import {Registerable} from '@liaison/liaison';
import {Routable, route} from '@liaison/liaison';
import {view} from '@liaison/react-integration';
import {jsx} from '@emotion/core';

/** @jsx jsx */

export class Home extends Routable(Registerable()) {
  @route('/') @view() static Main() {
    const {common, ui} = this.$layer;

    common.useTitle('A love story between the frontend and the backend');

    ui.useAnchor();

    return (
      <div>
        <ui.FullHeight
          css={{display: 'flex', flexDirection: 'column', backgroundColor: ui.colors.blueGrey800}}
        >
          <common.Header />
          <this.Hero css={{flexGrow: 1}} />
          <common.Scroller id="coming-soon" />
        </ui.FullHeight>
        <ui.FullHeight id="coming-soon" css={{display: 'flex', flexDirection: 'column'}}>
          <this.ComingSoon css={{flexGrow: 1}} />
          <common.Footer />
        </ui.FullHeight>
      </div>
    );
  }

  @view() static Hero({...props}) {
    return (
      <div
        css={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem'}}
        {...props}
      >
        <div css={{flexBasis: '600px'}}>
          <img
            src="/assets/f-plus-b-equals-love-20191111.immutable.svg"
            title="Frontend + Backend = Love"
            css={{width: '100%'}}
          />
        </div>
      </div>
    );
  }

  @view() static ComingSoon({...props}) {
    const {ui} = this.$layer;

    const theme = ui.useTheme();

    return (
      <div
        css={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem'}}
        {...props}
      >
        <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div
            css={ui.responsive({
              fontSize: ['3rem', '2rem'],
              lineHeight: theme.small.lineHeight,
              textAlign: 'center'
            })}
          >
            Coming in early&nbsp;2020.
          </div>
          <div
            css={{
              marginTop: '.75rem',
              fontSize: '1.5rem',
              color: theme.muted.textColor,
              textAlign: 'center'
            }}
          >
            In the meantime, you can head over to the GitHub repository.
          </div>
          <ui.Button
            secondary
            large
            onClick={() => location.assign('https://github.com/liaisonjs/liaison')}
            css={{marginTop: '1.75rem'}}
          >
            GitHub
          </ui.Button>
        </div>
      </div>
    );
  }
}
