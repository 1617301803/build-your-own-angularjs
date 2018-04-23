import _ from 'lodash';
import { parse } from '../src/Parse';
import { expect } from './expect';

let fn = parse('aKey["anotherKey"]');
expect(fn({ aKey: { anotherKey: 42 } })).toBe(42);