import {consume} from '@layr/component';
import {attribute} from '@layr/storable';
import {Routable} from '@layr/routable';
import {page, view, useData, useAction} from '@layr/react-integration';
import {useState, useMemo} from 'react';
import {jsx} from '@emotion/react';
import {Input, Button} from '@emotion-starter/react';
import {Stack} from '@emotion-kit/react';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {Home} from './home';
import {useTitle} from '../utilities';

export const createUserComponent = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Home: typeof Home;

    @attribute('string?', {
      getter() {
        return window.localStorage.getItem('token') || undefined;
      },
      setter(token) {
        if (token !== undefined) {
          window.localStorage.setItem('token', token);
        } else {
          window.localStorage.removeItem('token');
        }
      }
    })
    static token?: string;

    static authenticatedUser?: User;

    static async initializer() {
      this.authenticatedUser = (await this.getAuthenticatedUser()) as User;
    }

    @page('[/]sign-up') static SignUpPage() {
      const {Home} = this;

      if (this.authenticatedUser !== undefined) {
        Home.MainPage.redirect();
        return null;
      }

      const user = useMemo(() => new this(), []);

      useTitle('Sign up');

      return <user.SignUpView />;
    }

    @view() SignUpView() {
      const {Home} = this.constructor;

      const [inviteToken, setInviteToken] = useState('');

      const signUp = useAction(async () => {
        await this.signUp({inviteToken});
        Home.MainPage.reload();
      }, [inviteToken]);

      return (
        <div css={{flexBasis: 400}}>
          <h2>Sign Up</h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              signUp();
            }}
            css={{marginTop: '2rem'}}
          >
            <Stack direction="column">
              <Input
                type="email"
                value={this.email}
                onChange={(event) => {
                  this.email = event.target.value;
                }}
                placeholder="Email"
                required
                size="large"
              />

              <Input
                type="password"
                value={this.password}
                onChange={(event) => {
                  this.password = event.target.value;
                }}
                placeholder="Password"
                autoComplete="new-password"
                required
                size="large"
              />

              <Input
                type="text"
                value={this.firstName}
                onChange={(event) => {
                  this.firstName = event.target.value;
                }}
                placeholder="First name"
                required
                size="large"
              />

              <Input
                type="text"
                value={this.lastName}
                onChange={(event) => {
                  this.lastName = event.target.value;
                }}
                placeholder="Last name"
                required
                size="large"
              />

              <Input
                type="url"
                value={this.url}
                onChange={(event) => {
                  this.url = event.target.value;
                }}
                placeholder="URL"
                required
                size="large"
              />

              <Input
                type="text"
                value={inviteToken}
                onChange={(event) => {
                  setInviteToken(event.target.value);
                }}
                placeholder="Invite token"
                size="large"
              />
            </Stack>

            <Button type="submit" size="large" color="primary" css={{marginTop: '2rem'}}>
              Sign up
            </Button>
          </form>
        </div>
      );
    }

    @page('[/]sign-in') static SignInPage() {
      const {Home} = this;

      if (this.authenticatedUser !== undefined) {
        Home.MainPage.redirect();
        return null;
      }

      const user = useMemo(() => new this(), []);

      useTitle('Sign in');

      return <user.SignInView />;
    }

    @view() SignInView() {
      const {Home} = this.constructor;

      const signIn = useAction(async () => {
        await this.signIn();
        Home.MainPage.reload();
      });

      return (
        <div css={{flexBasis: 400}}>
          <h2>Sign In</h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              signIn();
            }}
            css={{marginTop: '2rem'}}
          >
            <Stack direction="column">
              <Input
                type="email"
                value={this.email}
                onChange={(event) => {
                  this.email = event.target.value;
                }}
                placeholder="Email"
                required
                size="large"
              />

              <Input
                type="password"
                value={this.password}
                onChange={(event) => {
                  this.password = event.target.value;
                }}
                placeholder="Password"
                required
                size="large"
              />
            </Stack>

            <Button type="submit" size="large" color="primary" css={{marginTop: '2rem'}}>
              Sign in
            </Button>
          </form>
        </div>
      );
    }

    @page('/sign-out') static signOutPage() {
      const {Home} = this;

      this.token = undefined;
      Home.MainPage.reload();

      return null;
    }

    @page('[/]invite') static InvitePage() {
      return useData(
        async () => {
          return await this.generateInviteToken();
        },

        (inviteToken) => (
          <div>
            <p>Invite token:</p>
            <pre>{inviteToken}</pre>
          </div>
        )
      );
    }
  }

  return User;
};
