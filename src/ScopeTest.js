
import { Scope } from './Scope';
import { expect } from './expect';

let scope = new Scope();

scope.counter = 0;

scope.$watch(
    (scope) => {
        scope.counter++;
        return scope.aValue;
    },
    (newValue, oldValue, scope) => {
    }
);

scope.$applyAsync((scope) => {
    scope.aValue = 'abc';
});

scope.$applyAsync((scope) => {
    scope.aValue = 'def';
});

setTimeout(() => {
    expect(scope.counter).toBe(2);
    //done();
}, 50);