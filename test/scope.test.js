import { Scope } from '../src/Scope.js';


describe('Scope', () => {
    var scope;

    beforeEach(() => {
        scope = new Scope();
    });

    test('scope', () => {
        const watchFn = () => 'watch';
        const listenerFn = jest.fn();
        scope.$watch(watchFn, listenerFn);

        scope.$digest();

        expect(listenerFn).toHaveBeenCalled();
    });
});