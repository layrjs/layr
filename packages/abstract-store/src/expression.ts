import type {Path} from './path';
import type {Operator, OperatorValue} from './operator';

export type Expression = [Path, Operator, OperatorValue];
export type ExpressionValue = undefined | null | boolean | number | string | Date;
