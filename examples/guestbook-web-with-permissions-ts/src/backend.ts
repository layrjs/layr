import {Component, provide, consume, expose, validators} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';
import {WithRoles, role} from '@liaison/with-roles';
import {MemoryStore} from '@liaison/memory-store';
import {ComponentHTTPServer} from '@liaison/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: ['creator', 'admin']}
  }
})
export class Message extends WithRoles(Storable(Component)) {
  @consume() static Session: typeof Session;

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

export class Session extends Component {
  @expose({get: true, set: true})
  @attribute('string?')
  static secret?: string;

  static isAdmin() {
    return this.secret === process.env.ADMIN_SECRET;
  }
}

export class Backend extends Component {
  @provide() static Message = Message;
  @provide() static Session = Session;
}

const store = new MemoryStore();

store.registerRootComponent(Backend);

const server = new ComponentHTTPServer(Backend, {port: 3210});

server.start();
