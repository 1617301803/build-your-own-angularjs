import _ from 'lodash';
import { expect } from './expect';

import { parse } from '../src/Parse';
import { filter, register } from '../src/Filter.js';

register('upcase', function () {
    return function (str) {
        return str.toUpperCase();
    };
});
var fn = parse('aString | upcase');
expect(fn({ aString: 'Hello' })).toEqual('HELLO');