import {Model} from './model';

export class Entity extends Model {
  isOfType(name) {
    return name === 'Entity' ? true : super.isOfType(name); // Optimization
  }
}
