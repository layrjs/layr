import {Component, consume} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {view} from '@liaison/react-integration';
import {jsx} from '@emotion/core';

import type {Newsletter} from './newsletter';
import type {Common} from './common';
import type {UI} from './ui';
// @ts-ignore
import heroImage from '../assets/f-plus-b-equals-love-20191111.immutable.svg';

export class Home extends Routable(Component) {
  @consume() static Newsletter: ReturnType<typeof Newsletter>;
  @consume() static Common: typeof Common;
  @consume() static UI: typeof UI;

  @route('/') @view() static Main() {
    const {Newsletter, Common, UI} = this;

    const theme = UI.useTheme();

    Common.useTitle('A love story between the frontend and the backend');

    UI.useAnchor();

    return (
      <div>
        <UI.FullHeight
          css={{display: 'flex', flexDirection: 'column', backgroundColor: UI.colors.blueGrey800}}
        >
          <Common.Header />
          <this.Hero css={{flexGrow: 1}} />
          <Common.Scroller id="coming-soon" />
        </UI.FullHeight>
        <UI.FullHeight id="coming-soon" css={{display: 'flex', flexDirection: 'column'}}>
          <div css={{flexGrow: 1, display: 'flex', justifyContent: 'center'}}>
            <div css={{flexBasis: 960, display: 'flex', flexDirection: 'column'}}>
              <this.ComingSoon css={{flexGrow: 1}} />
              <Newsletter.Subscription
                css={{
                  flexGrow: 1,
                  borderTop: `${theme.borderWidth} solid ${theme.borderColor}`
                }}
              />
            </div>
          </div>
          <Common.Footer />
        </UI.FullHeight>
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
          <img src={heroImage} title="Frontend + Backend = Love" css={{width: '100%'}} />
        </div>
      </div>
    );
  }

  @view() static ComingSoon({...props}) {
    const {UI} = this;

    const theme = UI.useTheme();

    return (
      <div
        css={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem'}}
        {...props}
      >
        <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div
            css={UI.responsive({
              fontSize: ['3rem', , '2rem'],
              lineHeight: theme.small.lineHeight,
              textAlign: 'center'
            })}
          >
            Coming this fall
          </div>
          <div
            css={UI.responsive({
              marginTop: '.75rem',
              fontSize: ['1.5rem', , '1.25rem'],
              color: theme.muted.textColor,
              textAlign: 'center'
            })}
          >
            In the meantime, you can head over to the GitHub repository.
          </div>
          <UI.Button
            secondary
            large
            onClick={() => location.assign('https://github.com/liaisonjs/liaison')}
            css={{marginTop: '1.75rem', marginBottom: '.5rem'}}
          >
            GitHub
          </UI.Button>
        </div>
      </div>
    );
  }
}
