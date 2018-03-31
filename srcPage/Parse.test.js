import _ from 'lodash';
import { parse } from '../src/Parse';
import { expect } from './expect';

let fn = parse('42');
expect(fn).toBeDefined();
expect(fn()).toBe(42);