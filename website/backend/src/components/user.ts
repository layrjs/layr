import {consume, expose, validators} from '@layr/component';
import {secondaryIdentifier, attribute, method, loader} from '@layr/storable';
import {role} from '@layr/with-roles';
import bcrypt from 'bcryptjs';
import compact from 'lodash/compact';

import {Entity} from './entity';
import type {JWT} from './jwt';

const BCRYPT_SALT_ROUNDS = 5;
const INVITE_TOKEN_DURATION = 604800000; // 1 week

const {rangeLength} = validators;

@expose({get: {call: 'anyone'}, prototype: {load: {call: 'anyone'}, save: {call: 'self'}}})
export class User extends Entity {
  ['constructor']!: typeof User;

  @consume() static JWT: typeof JWT;

  @expose({get: 'self', set: ['creator', 'self']})
  @secondaryIdentifier('string', {
    validators: [rangeLength([3, 100])],

    async beforeSave(this: User) {
      const User = this.constructor.fork().detach();

      const existingUser = await User.get({email: this.email}, {}, {throwIfMissing: false});

      if (existingUser !== undefined && existingUser.id !== this.id) {
        throw Object.assign(new Error('Email already registered'), {
          displayMessage: 'This email address is already registered.'
        });
      }
    }
  })
  email = '';

  @expose({set: ['creator', 'self']})
  @attribute('string', {
    validators: [rangeLength([1, 100])],

    async beforeSave(this: User) {
      this.password = await this.constructor.hashPassword(this.password);
    }
  })
  password = '';

  @expose({get: 'anyone', set: ['creator', 'self']})
  @attribute('string', {validators: [rangeLength([1, 32])]})
  firstName = '';

  @expose({get: 'anyone', set: ['creator', 'self']})
  @attribute('string', {validators: [rangeLength([1, 32])]})
  lastName = '';

  @expose({get: 'anyone'})
  @loader(async function (this: User) {
    const ghost = this.getGhost();

    await ghost.load({firstName: true, lastName: true});

    return compact([ghost.firstName, ghost.lastName]).join(' ');
  })
  @attribute('string')
  fullName!: string;

  @expose({get: 'anyone', set: ['creator', 'self']})
  @attribute('string', {validators: [rangeLength([10, 128])]})
  url = '';

  @role('creator') creatorRoleResolver() {
    return this.isNew();
  }

  @role('self') selfRoleResolver() {
    if (this.resolveRole('creator') || this.resolveRole('guest')) {
      return undefined;
    }

    return this === this.constructor.Session.user;
  }

  @expose({call: 'creator'}) @method() async signUp({inviteToken}: {inviteToken?: string} = {}) {
    const {Session} = this.constructor;

    const isAllowed = await (async () => {
      if (inviteToken) {
        return this.constructor.verifyInviteToken(inviteToken);
      }

      const numberOfUsers = await this.constructor.count();
      return numberOfUsers === 0;
    })();

    if (!isAllowed) {
      throw Object.assign(new Error('Signing up is not allowed'), {
        displayMessage: 'Signing up requires a valid invite token.'
      });
    }

    await this.save();

    Session.token = Session.generateToken(this.id);
  }

  @expose({call: 'creator'}) @method() async signIn() {
    const {Session} = this.constructor;

    this.validate({email: true, password: true});

    const existingUser = await this.constructor
      .fork()
      .detach()
      .get({email: this.email}, {password: true}, {throwIfMissing: false});

    if (existingUser === undefined) {
      throw Object.assign(new Error('User not found'), {
        displayMessage: 'There is no user registered with that email address.'
      });
    }

    if (!(await this.verifyPassword(existingUser))) {
      throw Object.assign(new Error('Wrong password'), {
        displayMessage: 'The password you entered is incorrect.'
      });
    }

    Session.token = Session.generateToken(existingUser.id);
  }

  static async hashPassword(password: string) {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  async verifyPassword(existingUser: User) {
    return await bcrypt.compare(this.password, existingUser.password);
  }

  @expose({call: 'user'}) @method() static generateInviteToken({
    expiresIn = INVITE_TOKEN_DURATION
  } = {}) {
    return this.JWT.generate({
      isInvited: true,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });
  }

  static verifyInviteToken(token: string) {
    const payload = this.JWT.verify(token) as {isInvited: boolean} | undefined;
    return payload?.isInvited === true;
  }
}
