import {consume} from '@layr/component';
import {useState} from 'react';
import {view, useAsyncCallback} from '@layr/react-integration';
import {jsx} from '@emotion/core';

import type {Newsletter as BackendNewsletter} from '../../../backend/src/components/newsletter';
import type {Common} from './common';
import type {UI} from './ui';

export const Newsletter = (Base: typeof BackendNewsletter) => {
  class Newsletter extends Base {
    @consume() static Common: typeof Common;
    @consume() static UI: typeof UI;

    @view() static Subscription() {
      const {Common, UI} = this;

      const [email, setEmail] = useState('');
      const [isSubscribed, setIsSubscribed] = useState(false);

      const [handleSubscribe, isSubscribingUp, subscribeError] = useAsyncCallback(async () => {
        await this.subscribe({email});
        setIsSubscribed(true);
      }, [email]);

      return (
        <Common.Feature
          title={!isSubscribed ? 'Stay Updated' : 'Thank You!'}
          description={
            !isSubscribed
              ? "Keep up on all that's happening with Layr!"
              : "We'll keep you updated."
          }
        >
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
        </Common.Feature>
      );
    }
  }

  return Newsletter;
};
