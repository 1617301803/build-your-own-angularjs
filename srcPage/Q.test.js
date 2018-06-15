import { publishExternalAPI } from '../src/angular_public';
import { createInjector } from '../src/Injector';
var jest = {
    fn: function () {
        return function () { }
    }
}

var $q, $rootScope;

publishExternalAPI();
var injector = createInjector(['ng']);
$q = injector.get('$q');
$rootScope = injector.get('$rootScope');



var d = $q.defer();

var firstSpy = function () {
    debugger
};
var secondSpy = function () {
    debugger;
};

d.promise.then(firstSpy);
d.resolve(42);
$rootScope.$apply();


d.promise.then(secondSpy);



$rootScope.$apply();
