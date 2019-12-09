import {Registerable} from '@liaison/liaison';
import {useState} from 'react';
import {view, useAsyncCallback} from '@liaison/react-integration';
import {jsx} from '@emotion/core';

/** @jsx jsx */

export class Newsletter extends Registerable() {
  @view() static Subscription({...props}) {
    const {ui, common} = this.$layer;

    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);

    const [handleSubscribe, isSubscribingUp, subscribeError] = useAsyncCallback(async () => {
      await this.subscribe({email});
      setIsSubscribed(true);
    }, [email]);

    const theme = ui.useTheme();

    return (
      <div
        id="newsletter"
        css={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem'
        }}
        {...props}
      >
        <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div
            css={ui.responsive({
              fontSize: ['2rem', '1.5rem'],
              lineHeight: theme.small.lineHeight,
              textAlign: 'center'
            })}
          >
            {!isSubscribed ? 'Stay updated' : 'Thank you!'}
          </div>
          <div
            css={ui.responsive({
              marginTop: '.75rem',
              fontSize: ['1.25rem', '1rem'],
              color: theme.muted.textColor,
              textAlign: 'center'
            })}
          >
            {!isSubscribed ?
              'Know when Liaison is ready for production, and everything else.' :
              "We'll keep you updated."}
          </div>

          {!isSubscribed && (
            <form
              onSubmit={event => {
                event.preventDefault();
                handleSubscribe();
              }}
              css={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '1.25rem',
                marginBottom: '.5rem'
              }}
            >
              <ui.Input
                type="email"
                onChange={event => {
                  setEmail(event.target.value);
                }}
                value={email}
                disabled={isSubscribingUp}
                required
                placeholder="Your email address"
                large
                css={ui.responsive({
                  width: [300, '100%'],
                  marginRight: ['0.75rem', 0],
                  marginBottom: [0, '0.75rem']
                })}
              />
              <ui.Button
                type="submit"
                disabled={isSubscribingUp}
                secondary
                large
                css={ui.responsive({width: ['auto', '100%']})}
              >
                I'm in!
              </ui.Button>
            </form>
          )}

          {subscribeError && <common.ErrorMessage error={subscribeError} />}
        </div>
      </div>
    );
  }
}
