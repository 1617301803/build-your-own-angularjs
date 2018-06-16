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
var fulfilledSpy = function () {
    debugger;
};
d.promise.then(function (result) {
    return result + 1;
}).then(function (result) {
    return result * 2;
}).then(fulfilledSpy);
d.resolve(20);
$rootScope.$apply();
