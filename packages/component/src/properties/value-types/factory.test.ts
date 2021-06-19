import {Component} from '../../component';
import {Attribute} from '../attribute';
import {createValueType} from './factory';
import {sanitizers} from '../../sanitization';
import {validators} from '../../validation';
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

    expect(type.getSanitizers()).toEqual([]);
    expect(type.getValidators()).toEqual([]);

    const trim = sanitizers.trim();
    const notEmpty = validators.notEmpty();
    type = createValueType('string', attribute, {sanitizers: [trim], validators: [notEmpty]});

    expect(type.getSanitizers()).toEqual([trim]);
    expect(type.getValidators()).toEqual([notEmpty]);

    const compact = sanitizers.compact();
    type = createValueType('string[]', attribute, {
      sanitizers: [compact],
      validators: [notEmpty],
      items: {sanitizers: [trim], validators: [notEmpty]}
    });

    expect(type.getSanitizers()).toEqual([compact]);
    expect(type.getValidators()).toEqual([notEmpty]);
    expect((type as ArrayValueType).getItemType().getSanitizers()).toEqual([trim]);
    expect((type as ArrayValueType).getItemType().getValidators()).toEqual([notEmpty]);

    type = createValueType('string[][]', attribute, {
      items: {items: {sanitizers: [trim], validators: [notEmpty]}}
    });

    expect(
      ((type as ArrayValueType).getItemType() as ArrayValueType).getItemType().getSanitizers()
    ).toEqual([trim]);
    expect(
      ((type as ArrayValueType).getItemType() as ArrayValueType).getItemType().getValidators()
    ).toEqual([notEmpty]);

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
      "The specified type is invalid (attribute: 'TestComponent.prototype.testAttribute', type: 'date')"
    );
    expect(() => createValueType('movie', attribute)).toThrow(
      "The specified type is invalid (attribute: 'TestComponent.prototype.testAttribute', type: 'movie')"
    );
    expect(() => createValueType('date?', attribute)).toThrow(
      "The specified type is invalid (attribute: 'TestComponent.prototype.testAttribute', type: 'date?')"
    );
    expect(() => createValueType('[movie]', attribute)).toThrow(
      "The specified type is invalid (attribute: 'TestComponent.prototype.testAttribute', type: '[movie]')"
    );
  });

  test('Sanitization', async () => {
    const trim = sanitizers.trim();
    const compact = sanitizers.compact();

    let type = createValueType('string', attribute, {sanitizers: [trim]});

    expect(type.sanitizeValue('hello')).toBe('hello');
    expect(type.sanitizeValue(' hello ')).toBe('hello');
    expect(type.sanitizeValue(undefined)).toBe(undefined);

    type = createValueType('string[]', attribute, {
      sanitizers: [compact],
      items: {sanitizers: [trim]}
    });

    expect(type.sanitizeValue(['hello'])).toStrictEqual(['hello']);
    expect(type.sanitizeValue(['hello', ' '])).toStrictEqual(['hello']);
    expect(type.sanitizeValue([' '])).toStrictEqual([]);
    expect(type.sanitizeValue(undefined)).toBe(undefined);
  });

  test('Validation', async () => {
    const notEmpty = validators.notEmpty();

    let type = createValueType('string', attribute, {validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([{validator: notEmpty, path: ''}]);

    type = createValueType('string[]', attribute, {
      validators: [notEmpty],
      items: {validators: [notEmpty]}
    });

    expect(type.runValidators(['Inception'])).toEqual([]);
    expect(type.runValidators([])).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(['Inception', ''])).toEqual([{validator: notEmpty, path: '[1]'}]);
    expect(type.runValidators(['Inception', undefined])).toEqual([
      {validator: notEmpty, path: '[1]'}
    ]);

    type = createValueType('string[][]', attribute, {items: {items: {validators: [notEmpty]}}});

    expect(type.runValidators([['Inception', '']])).toEqual([
      {validator: notEmpty, path: '[0][1]'}
    ]);
  });
});
