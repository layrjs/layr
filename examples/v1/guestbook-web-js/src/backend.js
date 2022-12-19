import {Component, expose, validators} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';
import {MemoryStore} from '@layr/memory-store';
import {ComponentHTTPServer} from '@layr/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
export class Message extends Storable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  text = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();
}

const store = new MemoryStore();

store.registerStorable(Message);

const server = new ComponentHTTPServer(Message, {port: 3210});

server.start();
