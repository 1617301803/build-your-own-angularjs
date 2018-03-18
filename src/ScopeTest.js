
import { Scope } from './Scope';

let scope = new Scope();


scope.aValue = 'abc';
scope.counter = 0;

scope.$watch(
    () => {
        return scope.aValue;
    },
    (newValue, oldValue, scope) => {
        scope.$watch(
            () => {
                return scope.aValue;
            },
            (newValue, oldValue, scope) => {
                scope.counter++;
            }
        );
    }
);

scope.$digest();
//expect(scope.counter).toBe(1);

scope.aValue = 'a';
scope.$digest();
//expect(scope.counter).toBe(3);