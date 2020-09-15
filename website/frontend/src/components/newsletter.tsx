import {consume} from '@liaison/component';
import {useState} from 'react';
import {view, useAsyncCallback} from '@liaison/react-integration';
import {jsx} from '@emotion/core';

import type {Newsletter as BackendNewsletter} from '../../../backend/src/components/newsletter';
import type {Common} from './common';
import type {UI} from './ui';

export const Newsletter = (Base: typeof BackendNewsletter) => {
  class Newsletter extends Base {
    @consume() static Common: typeof Common;
    @consume() static UI: typeof UI;

    @view() static Subscription({...props}) {
      const {UI, Common} = this;

      const [email, setEmail] = useState('');
      const [isSubscribed, setIsSubscribed] = useState(false);

      const [handleSubscribe, isSubscribingUp, subscribeError] = useAsyncCallback(async () => {
        await this.subscribe({email});
        setIsSubscribed(true);
      }, [email]);

      const theme = UI.useTheme();

      return (
        <div
          id="newsletter"
          css={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}
          {...props}
        >
          <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div
              css={UI.responsive({
                fontSize: ['2rem', , '1.5rem'],
                lineHeight: theme.small.lineHeight,
                textAlign: 'center'
              })}
            >
              {!isSubscribed ? 'Stay updated' : 'Thank you!'}
            </div>
            <div
              css={UI.responsive({
                marginTop: '.75rem',
                fontSize: ['1.25rem', , '1rem'],
                color: theme.muted.textColor,
                textAlign: 'center'
              })}
            >
              {!isSubscribed
                ? 'Know when a new major version is released, and everything else.'
                : "We'll keep you updated."}
            </div>

            {!isSubscribed && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubscribe();
                }}
                css={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: '1.75rem',
                  marginBottom: '.5rem'
                }}
              >
                <UI.Input
                  type="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  value={email}
                  disabled={isSubscribingUp}
                  required
                  placeholder="Your email address"
                  large
                  css={UI.responsive({
                    width: [300, , '100%'],
                    marginRight: ['0.75rem', , 0],
                    marginBottom: [0, , '0.75rem']
                  })}
                />
                <UI.Button
                  type="submit"
                  disabled={isSubscribingUp}
                  primary
                  large
                  css={UI.responsive({width: ['auto', , '100%']})}
                >
                  Subscribe
                </UI.Button>
              </form>
            )}

            {subscribeError && <Common.ErrorMessage error={subscribeError} />}
          </div>
        </div>
      );
    }
  }

  return Newsletter;
};
