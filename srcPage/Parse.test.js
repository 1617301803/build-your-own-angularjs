import _ from 'lodash';
//import { parse } from '../src/Parse';
import { expect } from './expect';

import { parse } from '../src/Acorn';

var scope = {
    aFunction: function () {
        return this;
    }
};
var fn = parse('aFunction()');
expect(fn(scope)).toBe(scope);