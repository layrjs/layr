import {Component, provide} from '@layr/component';

import {Session} from './session';
import {User} from './user';
import {Article} from './article';
import {Newsletter} from './newsletter';
import {JWT} from './jwt';

export class Application extends Component {
  @provide() static Session = Session;
  @provide() static User = User;
  @provide() static Article = Article;
  @provide() static Newsletter = Newsletter;
  @provide() static JWT = JWT;
}
