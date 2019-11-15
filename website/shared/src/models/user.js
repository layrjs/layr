import {field, validators} from '@liaison/liaison';
import compact from 'lodash/compact';

const {notEmpty, maxLength, rangeLength} = validators;

export const User = Base =>
  class User extends Base {
    @field('string', {isUnique: true, validators: [rangeLength([3, 100])]}) email = '';

    @field('string?', {validators: [notEmpty(), maxLength(100)]}) password = '';

    @field('string', {validators: [maxLength(32)]}) firstName = '';

    @field('string', {validators: [maxLength(32)]}) lastName = '';

    @field('string', {validators: [maxLength(128)]}) url = '';

    getFullName() {
      return compact([this.firstName, this.lastName]).join(' ');
    }
  };
