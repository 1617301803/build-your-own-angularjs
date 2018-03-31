import _ from 'lodash';
import { parse } from '../src/Parse';

describe("parse", () => {
    test("can parse an integer", () => {
        let fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });
});