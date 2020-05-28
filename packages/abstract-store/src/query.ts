import {PlainObject} from 'core-helpers';

export type Query = PlainObject;

// [path, operator, value]
export type Expression = [string, string, ExpressionValue | Expression[] | Expression[][]];

export type ExpressionValue = undefined | null | boolean | number | string | Date;
