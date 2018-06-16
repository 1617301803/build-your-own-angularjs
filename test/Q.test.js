import { publishExternalAPI } from '../src/angular_public';
import { createInjector } from '../src/Injector';
describe.only("$q", function () {
    var $q, $rootScope;

    beforeEach(function () {
        publishExternalAPI();
        var injector = createInjector(['ng']);
        $q = injector.get('$q');
        $rootScope = injector.get('$rootScope');
    });

    it('can create a Deferred', function () {
        var d = $q.defer();
        expect(d).toBeDefined();
    });

    it('has a promise for each Deferred', function () {
        var d = $q.defer();
        expect(d.promise).toBeDefined();
    });

    it('can resolve a promise', function (done) {
        var deferred = $q.defer();
        var promise = deferred.promise;

        var fn = jest.fn();
        promise.then(fn);
        deferred.resolve('a - ok');
        setTimeout(function () {
            expect(fn).toHaveBeenCalledWith('a - ok');
            done();
        }, 1);
    });

    it('works when resolved before promise listener', function (done) {
        var d = $q.defer();
        d.resolve(42);

        var fn = jest.fn();

        d.promise.then(fn);
        setTimeout(function () {
            expect(fn).toHaveBeenCalledWith(42); done();
        }, 0);
    });

    it('does not resolve promise immediately', function () {
        var d = $q.defer();

        var fn = jest.fn();
        d.promise.then(fn);

        d.resolve(42);
        expect(fn).not.toHaveBeenCalled();
    });

    it('resolves promise at next digest', function () {
        var d = $q.defer();

        var fn = jest.fn();
        d.promise.then(fn);

        d.resolve(42);
        $rootScope.$apply();
        expect(fn).toHaveBeenCalledWith(42);
    });

    it('may only be resolved once', function () {
        var d = $q.defer();

        var fn = jest.fn();
        d.promise.then(fn);

        d.resolve(42);
        d.resolve(43);
        $rootScope.$apply();

        expect(fn.mock.calls.length).toEqual(1);
        expect(fn).toHaveBeenCalledWith(42);
    });

    it('may only ever be resolved once', function () {
        var d = $q.defer();

        var fn = jest.fn();
        d.promise.then(fn);

        d.resolve(42);
        $rootScope.$apply();
        expect(fn).toHaveBeenCalledWith(42);

        d.resolve(43);
        $rootScope.$apply();
        expect(fn.mock.calls.length).toEqual(1);
    });

    it('resolves a listener added after resolution', function () {
        var d = $q.defer();
        d.resolve(42);
        $rootScope.$apply();

        var fn = jest.fn();
        d.promise.then(fn);
        $rootScope.$apply();

        expect(fn).toHaveBeenCalledWith(42);
    });

    it('may have multiple callbacks', function () {
        var d = $q.defer();
        var firstSpy = jest.fn();
        var secondSpy = jest.fn();
        d.promise.then(firstSpy);
        d.promise.then(secondSpy);

        d.resolve(42);
        $rootScope.$apply();

        expect(firstSpy).toHaveBeenCalledWith(42);
        expect(secondSpy).toHaveBeenCalledWith(42);
    });

    it('invokes callbacks once', function () {
        var d = $q.defer();

        var firstSpy = jest.fn();
        var secondSpy = jest.fn();

        d.promise.then(firstSpy);
        d.resolve(42);
        $rootScope.$apply();

        expect(firstSpy.mock.calls.length).toBe(1);
        expect(secondSpy.mock.calls.length).toBe(0);
        d.promise.then(secondSpy);

        expect(firstSpy.mock.calls.length).toBe(1);
        expect(secondSpy.mock.calls.length).toBe(0);

        $rootScope.$apply();

        expect(firstSpy.mock.calls.length).toBe(1);
        expect(secondSpy.mock.calls.length).toBe(1);
    });

    it('can reject a deferred', function () {
        var d = $q.defer();

        var fulfillSpy = jest.fn();
        var rejectSpy = jest.fn();

        d.promise.then(fulfillSpy, rejectSpy);
        d.reject(fail);
        $rootScope.$apply();

        expect(fulfillSpy).not.toHaveBeenCalled();
        expect(rejectSpy).toHaveBeenCalledWith(fail);
    });

    it('can reject just once', function () {
        var d = $q.defer();

        var rejectSpy = jest.fn()
        d.promise.then(null, rejectSpy);

        d.reject('fail');
        $rootScope.$apply();

        expect(rejectSpy.mock.calls.length).toBe(1);

        d.reject('fail again');
        $rootScope.$apply();
        expect(rejectSpy.mock.calls.length).toBe(1);
    });

    it('cannot fulfill a promise once rejected', function () {
        var d = $q.defer();
        var fulfillSpy = jest.fn();
        var rejectSpy = jest.fn();

        d.promise.then(fulfillSpy, rejectSpy);
        d.reject('fail');
        $rootScope.$apply();
        d.resolve('success');
        $rootScope.$apply();
        expect(fulfillSpy).not.toHaveBeenCalled();
    });

    it('does not require a failure handler each time', function () {
        var d = $q.defer();
        var fulfillSpy = jest.fn();
        var rejectSpy = jest.fn();

        d.promise.then(fulfillSpy);
        d.promise.then(null, rejectSpy);
        d.reject('fail');
        $rootScope.$apply();
        expect(rejectSpy).toHaveBeenCalledWith('fail');
    });

    it('does not require a success handler each time', function () {
        var d = $q.defer();
        var fulfillSpy = jest.fn();
        var rejectSpy = jest.fn();

        d.promise.then(fulfillSpy);
        d.promise.then(null, rejectSpy);

        d.resolve('ok');
        $rootScope.$apply();
        expect(fulfillSpy).toHaveBeenCalledWith('ok');
    });

    it('can register rejection handler with catch', function () {
        var d = $q.defer();
        var rejectSpy = jest.fn();
        d.promise.catch(rejectSpy);

        d.reject('fail');
        $rootScope.$apply();
        expect(rejectSpy).toHaveBeenCalled();
    });

    it('invokes a finally handler when fulfilled', function () {
        var d = $q.defer();
        var finallySpy = jest.fn()

        d.promise.finally(finallySpy);
        d.resolve(42);
        $rootScope.$apply();
        expect(finallySpy).toHaveBeenCalledWith();
    });

    it('invokes a finally handler when rejected', function () {
        var d = $q.defer();
        var finallySpy = jest.fn();

        d.promise.finally(finallySpy);
        d.reject('fail');
        $rootScope.$apply();
        expect(finallySpy).toHaveBeenCalledWith();
    });

    it('allows chaining handlers', function () {
        var d = $q.defer();
        var fulfilledSpy = jest.fn();
        d.promise.then(function (result) {
            return result + 1;
        }).then(function (result) {
            return result * 2;
        }).then(fulfilledSpy);
        d.resolve(20);
        $rootScope.$apply();
        expect(fulfilledSpy).toHaveBeenCalledWith(42);
    });

    it('does not modify original resolution in chains', function () {
        var d = $q.defer();
        var fulfilledSpy = jest.fn()
        d.promise.then(function (result) {
            return result + 1;
        }).then(function (result) {
            return result * 2;
        });
        d.promise.then(fulfilledSpy);
        d.resolve(20);
        $rootScope.$apply();
        expect(fulfilledSpy).toHaveBeenCalledWith(20);
    });
});