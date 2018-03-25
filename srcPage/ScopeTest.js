
import { Scope } from '../src/Scope';
import { expect } from './expect';

let scope = new Scope();

scope.obj = { length: 42, otherKey: 'abc' };
scope.counter = 0;

scope.$watchCollection(
    function (scope) { return scope.obj; },
    function (newValue, oldValue, scope) {
        scope.counter++;
    }
);

scope.$digest();

scope.obj.newKey = 'def';
scope.$digest();
expect(scope.counter).toBe(2);