import type {Operator} from '@layr/storable';

import type {AttributeValue} from './document';
import type {Path} from './path';

export type Expression = [Path, Operator, Operand];

export type Operand = AttributeValue | Expression[] | Expression[][];
