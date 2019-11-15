import {field, method, role} from '@liaison/liaison';
import {User as BaseUser} from '@liaison/liaison-website-shared';
import bcrypt from 'bcryptjs';

import {Entity} from './entity';

const BCRYPT_SALT_ROUNDS = 5;
const INVITE_TOKEN_DURATION = 604800000; // 1 week

export class User extends BaseUser(Entity) {
  @field({
    expose: {get: 'self', set: ['creator', 'self']},

    async beforeSave(email) {
      const {User} = this.$layer.$fork().$detach();
      if (await User.$has({email}, {exclude: this})) {
        throw Object.assign(new Error('Email already registered'), {
          displayMessage: 'This email address is already registered.'
        });
      }
    }
  })
  email;

  @field('string', {
    expose: {set: ['creator', 'self']},

    async saver(password) {
      return await this.constructor.hashPassword(password);
    }
  })
  password;

  @field({expose: {get: 'anyone', set: ['creator', 'self']}}) firstName;

  @field({expose: {get: 'anyone', set: ['creator', 'self']}}) lastName;

  @field({expose: {get: 'anyone', set: ['creator', 'self']}}) url;

  @role('self') selfRoleResolver() {
    if (this.$resolveRole('creator') || this.$resolveRole('guest')) {
      return undefined;
    }

    return this === this.$layer.session.user;
  }

  @method({expose: {call: 'anyone'}}) static $get;

  @method({expose: {call: 'anyone'}}) $load;

  @method({expose: {call: 'self'}}) $save;

  @method({expose: {call: 'creator'}}) async signUp({inviteToken} = {}) {
    const isAllowed = await (async () => {
      if (inviteToken) {
        return this.constructor.verifyInviteToken(inviteToken);
      }

      const numberOfUsers = await this.constructor.$count();
      return numberOfUsers === 0;
    })();

    if (!isAllowed) {
      throw Object.assign(new Error('Signing up is not allowed'), {
        displayMessage: 'Signing up requires a valid invite token.'
      });
    }

    await this.$save();

    this.$layer.session.setTokenForUserId(this.id);
  }

  @method({expose: {call: 'creator'}}) async signIn() {
    this.$validate({fields: {email: true, password: true}});

    const {User} = this.$layer.$fork().$detach();

    const existingUser = await User.$get(
      {email: this.email},
      {fields: {password: true}, throwIfNotFound: false}
    );

    if (!existingUser) {
      throw Object.assign(new Error('User not found'), {
        displayMessage: 'There is no user registered with that email address.'
      });
    }

    if (!(await this.verifyPassword(existingUser))) {
      throw Object.assign(new Error('Wrong password'), {
        displayMessage: 'The password you entered is incorrect.'
      });
    }

    this.$layer.session.setTokenForUserId(existingUser.id);
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  async verifyPassword(existingUser) {
    return await bcrypt.compare(this.password, existingUser.password);
  }

  @method({expose: {call: 'user'}}) static generateInviteToken({
    expiresIn = INVITE_TOKEN_DURATION
  } = {}) {
    return this.$layer.jwt.generate({
      isInvited: true,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });
  }

  static verifyInviteToken(token) {
    const payload = this.$layer.jwt.verify(token);
    return payload?.isInvited === true;
  }
}
