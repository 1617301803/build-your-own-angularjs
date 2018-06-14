import { setupModuleLoader } from './Loader';
import {$FilterProvider} from './Filter';

function publishExternalAPI() {
    setupModuleLoader(window);

    var ngModule = angular.module('ng', []);
    ngModule.provider('$filter', $FilterProvider);
}

export { publishExternalAPI };