
import { Scope } from './Scope';
import { expect } from './expect';

let scope = new Scope();

scope.aValue = 'abc';
scope.counter = 0;

let destroyWatch1 = scope.$watch(
    (scope) => {
        destroyWatch1();
        destoryWatch2();
    }
);

let destoryWatch2 = scope.$watch(
    (scope) => {
        return scope.aValue;
    },
    (newValue, oldValue, scope) => {
        scope.counter++;
    }
);

scope.$digest();
expect(scope.counter).toBe(0);