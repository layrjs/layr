import {consume} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {view, useAsyncCallback, useAsyncMemo} from '@liaison/react-integration';
import {useState} from 'react';
import {jsx} from '@emotion/core';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {Session} from './session';
import type {Home} from './home';
import type {Common} from './common';

export const User = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Session: ReturnType<typeof Session>;
    @consume() static Home: typeof Home;
    @consume() static Common: typeof Common;

    @route('/sign-up') @view() static SignUp() {
      const {Session, Home} = this;

      if (Session.user) {
        Home.Main.redirect();
        return null;
      }

      const user = new (this.fork())();

      return <user.SignUp />;
    }

    @view() SignUp() {
      const {Home, Common} = this.constructor;

      const [inviteToken, setInviteToken] = useState('');

      const [handleSignUp, isSigningUp, signingUpError] = useAsyncCallback(async () => {
        await this.signUp({inviteToken});
        Home.Main.reload();
      }, [inviteToken]);

      return (
        <Common.Layout title="Sign up" width="400px">
          <h2>Sign Up</h2>

          {signingUpError && <Common.ErrorMessage error={signingUpError} />}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSignUp();
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
              <button type="submit" disabled={isSigningUp}>
                Sign up
              </button>
            </div>
          </form>
        </Common.Layout>
      );
    }

    @route('/sign-in') @view() static SignIn() {
      const {Session, Home} = this;

      if (Session.user) {
        Home.Main.redirect();
        return null;
      }

      const user = new (this.fork())();

      return <user.SignIn />;
    }

    @view() SignIn() {
      const {Home, Common} = this.constructor;

      const [handleSignIn, isSigningIn, signingInError] = useAsyncCallback(async () => {
        await this.signIn();
        Home.Main.reload();
      }, []);

      return (
        <Common.Layout title="Sign in" width="400px">
          <h2>Sign In</h2>

          {signingInError && <Common.ErrorMessage error={signingInError} />}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSignIn();
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
              <button type="submit" disabled={isSigningIn}>
                Sign in
              </button>
            </div>
          </form>
        </Common.Layout>
      );
    }

    @route('/sign-out') static signOut() {
      const {Session, Home} = this;

      Session.token = undefined;
      Home.Main.reload();
    }

    @route('/invite') @view() static Invite() {
      const {Common} = this;

      const [inviteToken, isInviting, invitingError, retryInviting] = useAsyncMemo(async () => {
        return await this.generateInviteToken();
      }, []);

      if (isInviting) {
        return <Common.LoadingSpinner />;
      }

      if (invitingError) {
        return <Common.ErrorMessage error={invitingError} onRetry={retryInviting} />;
      }

      return (
        <div>
          <p>Invite token:</p>
          <pre>{inviteToken}</pre>
        </div>
      );
    }
  }

  return User;
};
