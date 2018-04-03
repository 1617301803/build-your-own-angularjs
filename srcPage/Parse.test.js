import _ from 'lodash';
import { parse } from '../src/Parse';
import { expect } from './expect';

var fn = parse('[1, 2, 3, ,]');
expect(fn()).toEqual([1, 2, 3,,]);