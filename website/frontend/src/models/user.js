import {Routable, route} from '@liaison/liaison';
import {view, useAsyncCallback, useAsyncMemo} from '@liaison/react-integration';
import {useState} from 'react';
import {jsx} from '@emotion/core';
import {User as BaseUser} from '@liaison/liaison-website-shared';

import {Entity} from './entity';

/** @jsx jsx */

export class User extends Routable(BaseUser(Entity)) {
  @route('/sign-up') @view() static SignUp() {
    const {Home, session} = this.$layer;

    if (session.user) {
      Home.Main.$redirect();
      return null;
    }

    const user = new (this.$detach())();

    return <user.SignUp />;
  }

  @view() SignUp() {
    const {Home, common} = this.$layer;

    const [inviteToken, setInviteToken] = useState('');

    const [handleSignUp, isSigningUp, signingUpError] = useAsyncCallback(async () => {
      await this.signUp({inviteToken});
      Home.Main.$reload();
    }, [inviteToken]);

    return (
      <common.Layout title="Sign up" width="400px">
        <h2>Sign Up</h2>

        {signingUpError && <common.ErrorMessage error={signingUpError} />}

        <form
          onSubmit={event => {
            event.preventDefault();
            handleSignUp();
          }}
        >
          <div css={{marginTop: '1rem'}}>
            <input
              type="email"
              placeholder="Email"
              value={this.email}
              onChange={event => {
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
              onChange={event => {
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
              onChange={event => {
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
              onChange={event => {
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
              onChange={event => {
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
              value={this.inviteToken}
              onChange={event => {
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
      </common.Layout>
    );
  }

  @route('/sign-in') @view() static SignIn() {
    const {Home, session} = this.$layer;

    if (session.user) {
      Home.Main.$redirect();
      return null;
    }

    const user = new (this.$detach())();

    return <user.SignIn />;
  }

  @view() SignIn() {
    const {Home, common} = this.$layer;

    const [handleSignIn, isSigningIn, signingInError] = useAsyncCallback(async () => {
      await this.signIn();
      Home.Main.$reload();
    }, []);

    return (
      <common.Layout title="Sign in" width="400px">
        <h2>Sign In</h2>

        {signingInError && <common.ErrorMessage error={signingInError} />}

        <form
          onSubmit={event => {
            event.preventDefault();
            handleSignIn();
          }}
        >
          <div css={{marginTop: '1rem'}}>
            <input
              type="email"
              placeholder="Email"
              value={this.email}
              onChange={event => {
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
              onChange={event => {
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
      </common.Layout>
    );
  }

  @route('/sign-out') static signOut() {
    const {Home, session} = this.$layer;

    session.token = undefined;
    Home.Main.$reload();
  }

  @route('/invite') @view() static Invite() {
    const {common} = this.$layer;

    const [inviteToken, isInviting, invitingError, retryInviting] = useAsyncMemo(async () => {
      return await this.generateInviteToken();
    }, []);

    if (isInviting) {
      return <common.LoadingSpinner />;
    }

    if (invitingError) {
      return <common.ErrorMessage error={invitingError} onRetry={retryInviting} />;
    }

    return (
      <div>
        <p>Invite token:</p>
        <pre>{inviteToken}</pre>
      </div>
    );
  }
}
