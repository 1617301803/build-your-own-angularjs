
import { Scope } from './Scope';
import { expect } from './expect';

let scope = new Scope();


scope.aValue = [1, 2, 3];
scope.asyncEvaluated = false;
scope.asyncEvaluatedInnediately = false;

scope.$watch(
    (scope) => {
        return scope.aValue;
    },
    (newValue, oldValue, scope) => {
        scope.$evalAsync((scope) => {
            scope.asyncEvaluated = true;
        });
        scope.asyncEvaluatedInnediately = scope.asyncEvaluated;
    }
);

scope.$digest();
expect(scope.asyncEvaluated).toBe(true);
expect(scope.asyncEvaluatedInnediately).toBe(false);