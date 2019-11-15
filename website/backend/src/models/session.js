import {field, method} from '@liaison/liaison';
import {Session as BaseSession} from '@liaison/liaison-website-shared';

const ACCESS_TOKEN_DURATION = 31536000000; // 1 year

export class Session extends BaseSession {
  @field({expose: {get: true, set: true}}) token;

  async $open() {
    this.user = await this.getUser({fields: {}});
  }

  @method({expose: {call: true}}) async getUser({fields} = {}) {
    const {User} = this.$layer;

    let user;

    const id = this.getUserIdFromToken();
    if (id !== undefined) {
      user = await User.$get({id}, {fields, throwIfNotFound: false});
    }

    if (!user) {
      // The token is invalid or the user doesn't exist anymore
      this.token = undefined;
    }

    return user;
  }

  getUserIdFromToken() {
    let id;

    const token = this.$getFieldValue('token', {throwIfInactive: false});
    if (token !== undefined) {
      const payload = this.$layer.jwt.verify(token);
      id = payload?.sub;
    }

    return id;
  }

  setTokenForUserId(id, {expiresIn = ACCESS_TOKEN_DURATION} = {}) {
    if (id === undefined) {
      throw new Error(`User 'id' is missing`);
    }

    this.token = this.$layer.jwt.generate({
      sub: id,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });
  }
}
