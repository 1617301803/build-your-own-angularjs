import _ from 'lodash';
import { parse } from '../src/Parse';
import { filter, register } from '../src/Filter.js';
import { publishExternalAPI } from '../src/angular_public';
import { createInjector } from '../src/Injector';

describe("filter", function () {

    beforeEach(function () {
        publishExternalAPI();
    });

    it('can be registered and obtained', function () {
        var myFilter = function () { };
        var myFilterFactory = function () {
            return myFilter;
        };
        // register('my', myFilterFactory);
        // expect(filter('my')).toBe(myFilter);
        var injector = createInjector(['ng', function ($filterProvider) {
            $filterProvider.register('my', myFilterFactory);
        }]);
        var $filter = injector.get('$filter');
        expect($filter('my')).toBe(myFilter);
    });

    it('allows registering multiple filters with an object', function () {
        var myFilter = function () { };
        var myOtherFilter = function () { };
        var injector = createInjector(['ng', function ($filterProvider) {
            $filterProvider.register({
                my: function () {
                    return myFilter;
                },
                myOther: function () {
                    return myOtherFilter;
                }
            });
        }]);
        var $filter = injector.get('$filter');
        expect($filter('my')).toBe(myFilter);
        expect($filter('myOther')).toBe(myOtherFilter);
    });

    it('can parse filter expressions', function () {
        register('upcase', function () {
            return function (str) {
                return str.toUpperCase();
            };
        });
        var fn = parse('aString | upcase');
        expect(fn({ aString: 'Hello' })).toEqual('HELLO');
    });

    it('can parse filter chain expressions', function () {
        register('upcase', function () {
            return function (s) {
                return s.toUpperCase();
            };
        });
        register('exclamate', function () {
            return function (s) {
                return s + '!';
            };
        });
        var fn = parse('"hello" | upcase | exclamate');
        expect(fn()).toEqual('HELLO!');
    });

    it('can pass an additional argument to filters', function () {
        register('repeat', function () {
            return function (s, times) {
                return _.repeat(s, times);
            };
        });
        var fn = parse('"hello" | repeat:3');
        expect(fn()).toEqual('hellohellohello');
    });

    it('can pass several additional arguments to filters', function () {
        register('surround', function () {
            return function (s, left, right) {
                return left + s + right;
            };
        });
        var fn = parse('"hello" | surround:"*":"!"');
        expect(fn()).toEqual('*hello!');
    });

    it('is available through injector', function () {
        var myFilter = function () { };
        var injector = createInjector(['ng', function ($filterProvider) {
            $filterProvider.register('my', function () {
                return myFilter;
            });
        }]);
        expect(injector.has('myFilter')).toBe(true);
        expect(injector.get('myFilter')).toBe(myFilter);
    });

    it('may have dependencies in factory', function () {
        var injector = createInjector(['ng', function ($provide, $filterProvider) {
            $provide.constant('suffix', '!');
            $filterProvider.register('my', function (suffix) {
                return function (v) {
                    return suffix + v;
                };
            });
        }]);
        expect(injector.has('myFilter')).toBe(true);
    });

    it('can be registered through module API', function () {
        var myFilter = function () { };
        var module = angular.module('myModule', [])
            .filter('my', function () {
                return myFilter;
            });
        var injector = createInjector(['ng', 'myModule']);
        expect(injector.has('myFilter')).toBe(true);
        expect(injector.get('myFilter')).toBe(myFilter);
    });



});