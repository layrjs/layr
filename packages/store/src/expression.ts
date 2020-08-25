import type {AttributeValue} from './document';
import type {Path} from './path';
import type {Operator} from './operator';

export type Expression = [Path, Operator, Operand];

export type Operand = AttributeValue | Expression[] | Expression[][];
