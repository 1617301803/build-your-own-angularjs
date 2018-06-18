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
var progressSpy = function () {
    debugger;
}
d.promise
    .then(_.noop)
    .then(null, null, function (progress) {
        return '***' + progress + '***';
    })
    .catch(_.noop)
    .then(null, null, progressSpy);
d.notify('working...');
$rootScope.$apply();
expect(progressSpy).toHaveBeenCalledWith('***working...***');
