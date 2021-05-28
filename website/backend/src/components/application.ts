import {Component, provide} from '@layr/component';
import {Routable} from '@layr/routable';

import {User} from './user';
import {Article} from './article';
import {Newsletter} from './newsletter';

export class Application extends Routable(Component) {
  @provide() static User = User;
  @provide() static Article = Article;
  @provide() static Newsletter = Newsletter;
}
