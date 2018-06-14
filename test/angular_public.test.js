import { publishExternalAPI } from '../src/angular_public';
describe('angularPublic', function () {
    it('sets up the angular object and the module loader', function () {
        publishExternalAPI();
        expect(window.angular).toBeDefined();
        expect(window.angular.module).toBeDefined();
    });
});