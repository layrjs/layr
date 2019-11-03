import {Entity, field} from '@liaison/liaison';

export class Counter extends Entity {
  // The shared class define a field to keep track of the counter's value
  @field('number') value = 0;
}
