import {useState} from 'react';
import {view, useAction} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {Input, Button} from '@emotion-starter/react';

import type {Newsletter as BackendNewsletter} from '../../../backend/src/components/newsletter';
import {FeatureSection} from '../ui';

export const extendNewsletter = (Base: typeof BackendNewsletter) => {
  class Newsletter extends Base {
    @view() static SubscriptionView() {
      const theme = useTheme();

      const [email, setEmail] = useState('');
      const [isSubscribed, setIsSubscribed] = useState(false);

      const subscribe = useAction(async () => {
        await this.subscribe({email});
        setIsSubscribed(true);
      }, [email]);

      return (
        <FeatureSection
          title={!isSubscribed ? 'Stay Updated' : 'Thank You!'}
          description={
            !isSubscribed ? "Keep up on all that's happening with Layr!" : "We'll keep you updated."
          }
        >
          {!isSubscribed && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                subscribe();
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
              <Input
                type="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                value={email}
                required
                placeholder="Your email address"
                size="large"
                css={theme.responsive({
                  width: [300, , '100%'],
                  marginRight: ['0.75rem', , 0],
                  marginBottom: [0, , '0.75rem']
                })}
              />
              <Button
                type="submit"
                size="large"
                color="primary"
                css={theme.responsive({width: ['auto', , '100%']})}
              >
                Subscribe
              </Button>
            </form>
          )}
        </FeatureSection>
      );
    }
  }

  return Newsletter;
};
