import {Component} from './component';

export class EmbeddedComponent extends Component {
  static isEmbedded() {
    return true;
  }
}
