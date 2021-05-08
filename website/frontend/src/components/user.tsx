import {consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {page, view, useData, useAction} from '@layr/react-integration';
import {useState, useMemo} from 'react';
import {jsx} from '@emotion/core';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {createSessionComponent} from './session';
import type {Home} from './home';
import {useTitle} from '../utilities';

export const createUserComponent = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Session: ReturnType<typeof createSessionComponent>;
    @consume() static Home: typeof Home;

    @page('[/]sign-up') static SignUpPage() {
      const {Session, Home} = this;

      if (Session.user !== undefined) {
        Home.MainPage.redirect(undefined, {defer: true});
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
          >
            <div css={{marginTop: '1rem'}}>
              <input
                type="email"
                placeholder="Email"
                value={this.email}
                onChange={(event) => {
                  this.email = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <input
                type="password"
                placeholder="Password"
                value={this.password}
                onChange={(event) => {
                  this.password = event.target.value;
                }}
                autoComplete="new-password"
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <input
                type="text"
                placeholder="First name"
                value={this.firstName}
                onChange={(event) => {
                  this.firstName = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <input
                type="text"
                placeholder="Last name"
                value={this.lastName}
                onChange={(event) => {
                  this.lastName = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <input
                type="url"
                placeholder="URL"
                value={this.url}
                onChange={(event) => {
                  this.url = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <input
                type="text"
                placeholder="Invite token"
                value={inviteToken}
                onChange={(event) => {
                  setInviteToken(event.target.value);
                }}
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <button type="submit">Sign up</button>
            </div>
          </form>
        </div>
      );
    }

    @page('[/]sign-in') static SignInPage() {
      const {Session, Home} = this;

      if (Session.user !== undefined) {
        Home.MainPage.redirect(undefined, {defer: true});
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
          >
            <div css={{marginTop: '1rem'}}>
              <input
                type="email"
                placeholder="Email"
                value={this.email}
                onChange={(event) => {
                  this.email = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <input
                type="password"
                placeholder="Password"
                value={this.password}
                onChange={(event) => {
                  this.password = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <button type="submit">Sign in</button>
            </div>
          </form>
        </div>
      );
    }

    @page('/sign-out') static signOutPage() {
      const {Session, Home} = this;

      Session.token = undefined;
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
