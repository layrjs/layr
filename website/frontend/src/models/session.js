import {field} from '@liaison/liaison';
import {Session as BaseSession} from '@liaison/liaison-website-shared';

export class Session extends BaseSession {
  @field({
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
  token;

  async $open() {
    if (this.token !== undefined) {
      this.user = await this.getUser({fields: {}});
    }
  }
}
