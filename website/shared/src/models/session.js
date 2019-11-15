import {Model, field, validators} from '@liaison/liaison';

const {rangeLength} = validators;

export class Session extends Model {
  @field('string?', {validators: [rangeLength([10, 250])]}) token;
}
