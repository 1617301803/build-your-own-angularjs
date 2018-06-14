import _ from 'lodash';
import { setupModuleLoader } from '../src/loader';
import { createInjector } from '../src/Injector';
import { expect } from './expect';
delete window.angular;
setupModuleLoader(window);

var module = angular.module('myModule', []);
var hasRun = false;
module.config(function () {
    hasRun = true;
});
createInjector(['myModule']);
expect(hasRun).toBe(true);