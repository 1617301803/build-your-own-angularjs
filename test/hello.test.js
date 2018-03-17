import chai from 'chai';
import add from '../src/hello.js';
var expect = chai.expect;

describe('test', () => {
    it('test', () => {
        expect(add(1,1)).to.be.equal(3);
    });
})