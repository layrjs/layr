import {Component, provide, expose, validators} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';
import {WithRoles, role} from '@liaison/with-roles';
import {MemoryStore} from '@liaison/memory-store';
import {ComponentHTTPServer} from '@liaison/component-http-server';

const {notEmpty, maxLength} = validators;

export class Session extends Component {
  @expose({set: true})
  @attribute('string?')
  static secret?: string;

  static isAdmin() {
    return this.secret === process.env.ADMIN_SECRET;
  }
}

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: ['creator', 'admin']}
  }
})
export class Message extends WithRoles(Storable(Component)) {
  @provide() static Session = Session;

  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  text = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();

  @role('creator') creatorRoleResolver() {
    return this.isNew();
  }

  @role('admin') static adminRoleResolver() {
    return this.Session.isAdmin();
  }
}

const store = new MemoryStore();

store.registerStorable(Message);

const server = new ComponentHTTPServer(Message, {port: 3210});

server.start();
