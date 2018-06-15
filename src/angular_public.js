import { setupModuleLoader } from './Loader';
import { $FilterProvider } from './Filter';
import { $ParseProvider } from './Parse';
import { $RootScopeProvider } from './Scope';

function publishExternalAPI() {
    setupModuleLoader(window);

    var ngModule = angular.module('ng', []);
    ngModule.provider('$filter', $FilterProvider);
    ngModule.provider('$parse', $ParseProvider);
    ngModule.provider('$rootScope', $RootScopeProvider);
}

export { publishExternalAPI };