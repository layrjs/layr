import {Component} from '../component';
import {Attribute} from '../attribute';
import {createValueType} from './factory';
import {validators, requiredValidator} from '../validation';
import {isAnyValueTypeInstance} from './any-value-type';
import {isNumberValueTypeInstance} from './number-value-type';
import {isStringValueTypeInstance} from './string-value-type';
import {ArrayValueType, isArrayValueTypeInstance} from './array-value-type';

describe('Factory', () => {
  class TestComponent extends Component {}

  const attribute = new Attribute('testAttribute', TestComponent.prototype);

  test('createValueType()', async () => {
    let type = createValueType('string', attribute);

    expect(isStringValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(false);

    type = createValueType('string?', attribute);

    expect(isStringValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(true);

    type = createValueType('number[]', attribute);

    expect(isArrayValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(false);
    expect(isNumberValueTypeInstance((type as ArrayValueType).getItemType())).toBe(true);
    expect((type as ArrayValueType).getItemType().isOptional()).toBe(false);

    type = createValueType('number?[]?', attribute);

    expect(isArrayValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(true);
    expect(isNumberValueTypeInstance((type as ArrayValueType).getItemType())).toBe(true);
    expect((type as ArrayValueType).getItemType().isOptional()).toBe(true);

    type = createValueType('string', attribute);

    expect(type.getValidators()).toEqual([]);

    const notEmpty = validators.notEmpty();
    type = createValueType('string', attribute, {validators: [notEmpty]});

    expect(type.getValidators()).toEqual([notEmpty]);

    const integer = validators.integer();
    type = createValueType('number[]', attribute, {
      validators: [notEmpty],
      items: {validators: [integer]}
    });

    expect(type.getValidators()).toEqual([notEmpty]);
    expect((type as ArrayValueType).getItemType().getValidators()).toEqual([integer]);

    type = createValueType('number[][]', attribute, {items: {items: {validators: [integer]}}});

    expect(
      ((type as ArrayValueType).getItemType() as ArrayValueType).getItemType().getValidators()
    ).toEqual([integer]);

    type = createValueType(undefined, attribute);

    expect(isAnyValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(true);

    type = createValueType('', attribute);

    expect(isAnyValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(true);

    type = createValueType('?', attribute);

    expect(isAnyValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(true);

    type = createValueType('[]', attribute);

    expect(isArrayValueTypeInstance(type)).toBe(true);
    expect(type.isOptional()).toBe(false);
    expect(isAnyValueTypeInstance((type as ArrayValueType).getItemType())).toBe(true);
    expect((type as ArrayValueType).getItemType().isOptional()).toBe(true);

    expect(() => createValueType('date', attribute)).toThrow(
      "The specified type is invalid (component: 'TestComponent', attribute: 'testAttribute', type: 'date')"
    );
    expect(() => createValueType('movie', attribute)).toThrow(
      "The specified type is invalid (component: 'TestComponent', attribute: 'testAttribute', type: 'movie')"
    );
    expect(() => createValueType('date?', attribute)).toThrow(
      "The specified type is invalid (component: 'TestComponent', attribute: 'testAttribute', type: 'date?')"
    );
    expect(() => createValueType('[movie]', attribute)).toThrow(
      "The specified type is invalid (component: 'TestComponent', attribute: 'testAttribute', type: '[movie]')"
    );
  });

  test('Validation', async () => {
    const notEmpty = validators.notEmpty();

    let type = createValueType('string', attribute);

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);

    type = createValueType('string?', attribute);

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators(undefined)).toEqual([]);

    type = createValueType('string', attribute, {validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);

    type = createValueType('string?', attribute, {validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([]);

    type = createValueType('string[]', attribute, {
      validators: [notEmpty],
      items: {validators: [notEmpty]}
    });

    expect(type.runValidators(['Inception'])).toEqual([]);
    expect(type.runValidators([])).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(['Inception', ''])).toEqual([{validator: notEmpty, path: '[1]'}]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);
    expect(type.runValidators(['Inception', undefined])).toEqual([
      {validator: requiredValidator, path: '[1]'}
    ]);

    type = createValueType('string[][]', attribute, {items: {items: {validators: [notEmpty]}}});

    expect(type.runValidators([['Inception', '']])).toEqual([
      {validator: notEmpty, path: '[0][1]'}
    ]);
  });
});
