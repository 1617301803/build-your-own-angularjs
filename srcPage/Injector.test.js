import _ from 'lodash';
import { setupModuleLoader } from '../src/loader';
import { createInjector } from '../src/Injector';
import { expect } from './expect';
delete window.angular;
setupModuleLoader(window);

var module = angular.module('myModule', []);
module.provider('a', function AProvider() {
    this.$get = function () { return 1; };
});
module.provider('b', function BProvider() {
    this.$get = function (a) { return a; };
});
var injector = createInjector(['myModule']);
expect(function () {
    injector.get('b');
}).toThrow();