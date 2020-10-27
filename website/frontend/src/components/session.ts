import {attribute} from '@layr/component';

import type {Session as BackendSession} from '../../../backend/src/components/session';

export const Session = (Base: typeof BackendSession) => {
  class Session extends Base {
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

    static async loadUser() {
      if (this.token !== undefined) {
        this.user = await this.getUser({email: true, username: true, bio: true, imageURL: true});
      }
    }
  }

  return Session;
};
