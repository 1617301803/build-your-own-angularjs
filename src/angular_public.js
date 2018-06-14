import { setupModuleLoader } from './Loader';

function publishExternalAPI() {
    setupModuleLoader(window);
}

export { publishExternalAPI };