
import { Scope } from './Scope';
import { expect } from './expect';

let scope = new Scope();

let counter = 0;

scope.aValue = 1;
scope.antherValue = 2;

scope.$watchGroup([
    (scope) => {
        return scope.aValue;
    },
    (scope) => {
        return scope.anthorValue;
    }
], (newValues, oldValues, scope) => {
    counter++;
});

scope.$digest();
expect(counter).toEqual(1);