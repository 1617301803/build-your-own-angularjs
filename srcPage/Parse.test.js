import _ from 'lodash';
import { parse } from '../src/Parse';
import { expect } from './expect';

let fn = parse('aKey');
expect(fn({ aKey: 42 })).toBe(42);
expect(fn({})).toBeUndefined();