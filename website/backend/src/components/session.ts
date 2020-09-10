import {
  Component,
  consume,
  attribute,
  method,
  expose,
  AttributeSelector,
  validators
} from '@liaison/component';

import type {User} from './user';
import type {JWT} from './jwt';

const TOKEN_DURATION = 31536000000; // 1 year

const {rangeLength} = validators;

export class Session extends Component {
  @consume() static User: typeof User;
  @consume() static JWT: typeof JWT;

  @expose({get: true, set: true})
  @attribute('string?', {validators: [rangeLength([10, 250])]})
  static token?: string;

  @attribute('User?') static user?: User;

  static async initialize() {
    if (this.token !== undefined) {
      this.user = await this.getUser({});
    }
  }

  @expose({call: true}) @method() static async getUser(attributeSelector: AttributeSelector) {
    if (this.token === undefined) {
      return;
    }

    const userId = this.verifyToken(this.token);

    if (userId === undefined) {
      // The token is invalid or expired
      this.token = undefined;
      return;
    }

    const user = await this.User.get(userId, attributeSelector, {throwIfMissing: false});

    if (user === undefined) {
      // The user doesn't exist anymore
      this.token = undefined;
      return;
    }

    return user;
  }

  static verifyToken(token: string) {
    const payload = this.JWT.verify(token) as {sub: string} | undefined;
    const userId = payload?.sub;

    return userId;
  }

  static generateToken(userId: string, {expiresIn = TOKEN_DURATION} = {}) {
    const token = this.JWT.generate({
      sub: userId,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });

    return token;
  }
}
