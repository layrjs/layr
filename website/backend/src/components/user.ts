import {expose, validators, AttributeSelector} from '@layr/component';
import {secondaryIdentifier, attribute, method, loader} from '@layr/storable';
import {role} from '@layr/with-roles';
import {throwError} from '@layr/utilities';
import bcrypt from 'bcryptjs';
import compact from 'lodash/compact';

import {Entity} from './entity';
import {generateJWT, verifyJWT} from '../jwt';

const TOKEN_DURATION = 31536000000; // 1 year
const INVITE_TOKEN_DURATION = 604800000; // 1 week
const BCRYPT_SALT_ROUNDS = 5;

const {rangeLength} = validators;

@expose({get: {call: true}, prototype: {load: {call: true}, save: {call: 'self'}}})
export class User extends Entity {
  declare ['constructor']: typeof User;

  @expose({get: 'self', set: ['creator', 'self']})
  @secondaryIdentifier('string', {
    validators: [rangeLength([3, 100])],

    async beforeSave(this: User) {
      const User = this.constructor.fork().detach();

      const existingUser = await User.get({email: this.email}, {}, {throwIfMissing: false});

      if (existingUser !== undefined && existingUser.id !== this.id) {
        throwError('Email already registered', {
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

  @expose({get: true, set: ['creator', 'self']})
  @attribute('string', {validators: [rangeLength([1, 32])]})
  firstName = '';

  @expose({get: true, set: ['creator', 'self']})
  @attribute('string', {validators: [rangeLength([1, 32])]})
  lastName = '';

  @expose({get: true})
  @loader(async function (this: User) {
    const ghost = this.getGhost();

    await ghost.load({firstName: true, lastName: true});

    return compact([ghost.firstName, ghost.lastName]).join(' ');
  })
  @attribute('string')
  fullName!: string;

  @expose({get: true, set: ['creator', 'self']})
  @attribute('string', {validators: [rangeLength([10, 128])]})
  url = '';

  @expose({get: true, set: true})
  @attribute('string?')
  static token?: string;

  @role('creator') creatorRoleResolver() {
    return this.isNew();
  }

  @role('self') async selfRoleResolver() {
    if ((await this.resolveRole('creator')) || (await this.resolveRole('guest'))) {
      return undefined;
    }

    return this === (await this.constructor.getAuthenticatedUser());
  }

  @expose({call: true}) @method() static async getAuthenticatedUser(
    attributeSelector: AttributeSelector = {}
  ) {
    if (this.token === undefined) {
      return;
    }

    const userId = this.verifyToken(this.token);

    if (userId === undefined) {
      // The token is invalid or expired
      this.token = undefined;
      return;
    }

    const user = await this.get(userId, attributeSelector, {throwIfMissing: false});

    if (user === undefined) {
      // The user doesn't exist anymore
      this.token = undefined;
      return;
    }

    return user;
  }

  static verifyToken(token: string) {
    const payload = verifyJWT(token) as {sub: string} | undefined;
    const userId = payload?.sub;

    return userId;
  }

  static generateToken(userId: string, {expiresIn = TOKEN_DURATION} = {}) {
    const token = generateJWT({
      sub: userId,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });

    return token;
  }

  @expose({call: 'creator'}) @method() async signUp({inviteToken}: {inviteToken?: string} = {}) {
    const {User} = this.constructor;

    const isAllowed = await (async () => {
      if (inviteToken) {
        return User.verifyInviteToken(inviteToken);
      }

      const numberOfUsers = await User.count();
      return numberOfUsers === 0;
    })();

    if (!isAllowed) {
      throwError('Signing up is not allowed', {
        displayMessage: 'Signing up requires a valid invite token.'
      });
    }

    await this.save();

    User.token = User.generateToken(this.id);
  }

  @expose({call: 'creator'}) @method() async signIn() {
    const {User} = this.constructor;

    this.validate({email: true, password: true});

    const existingUser = await User.fork()
      .detach()
      .get({email: this.email}, {password: true}, {throwIfMissing: false});

    if (existingUser === undefined) {
      throwError('User not found', {
        displayMessage: 'There is no user registered with that email address.'
      });
    }

    if (!(await this.verifyPassword(existingUser))) {
      throwError('Wrong password', {displayMessage: 'The password you entered is incorrect.'});
    }

    User.token = User.generateToken(existingUser.id);
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
    return generateJWT({
      isInvited: true,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });
  }

  static verifyInviteToken(token: string) {
    const payload = verifyJWT(token) as {isInvited: boolean} | undefined;
    return payload?.isInvited === true;
  }
}
