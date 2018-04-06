import _ from 'lodash';
import { parse } from '../src/Parse';
import { expect } from './expect';

let fn = parse('aKey');
let scope = { aKey: 42 };
let locals = { otherKey: 43 };
expect(fn(scope, locals)).toBe(42);