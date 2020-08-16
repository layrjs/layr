import {Component, expose, validators} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';
import {MemoryStore} from '@liaison/memory-store';
import {ComponentHTTPServer} from '@liaison/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
export class Entry extends Storable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  message = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();
}

const store = new MemoryStore();

store.registerStorable(Entry);

const server = new ComponentHTTPServer(Entry, {port: 3210});

server.start();
