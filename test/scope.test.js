import chai from 'chai';
import {Scope} from '../src/Scope.js';

var expect = chai.expect;
describe('Scope', function () {
    it('test scope', () => {
        var scope = new Scope();
        scope.a = 1;

        expect(scope.a).to.be.equal(1);
    })
});