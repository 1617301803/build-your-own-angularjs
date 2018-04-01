import _ from 'lodash';
import { parse } from '../src/Parse';
import { expect } from './expect';

var fn = parse('null');
expect(fn()).toBe(null);