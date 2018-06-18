import _ from 'lodash';
import $ from 'jQuery';
import { publishExternalAPI } from '../src/angular_public';
import { createInjector } from '../src/Injector';

function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
    }]);
}

delete window.angular;
publishExternalAPI();

var injector = makeInjectorWithDirectives('myDirective', function () {
    return {
        compile: function (element) {
            element.data('hasCompiled', true);
        }
    };
});
injector.invoke(function ($compile) {
    var el = $('<my-directive></my-directive>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
});