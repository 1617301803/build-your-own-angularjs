import _ from 'lodash';
import { parse } from '../src/Parse';

describe("parse", () => {

    test("can parse an integer", () => {
        let fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });

    test("can parse a floating point number", () => {
        let fn = parse('4.2');
        expect(fn()).toBe(4.2);
    });

    test("can parse a float poing number without an interger part", () => {
        let fn = parse('.42');
        expect(fn()).toBe(0.42);
    });

    test("can parse a number in scientific notation", () => {
        let fn = parse('42e3');
        expect(fn()).toBe(42000);
    });

    test("can parse scientific notation with a float coefficient", () => {
        let fn = parse('.42e2');
        expect(fn()).toBe(42);
    });

    test("can parse scientific notation with negative exponents", () => {
        let fn = parse('4200e-2');
        expect(fn()).toBe(42);
    });

    test("can parse scientific notation with the + sign", () => {
        let fn = parse('.42e+2');
        expect(fn()).toBe(42);
    });

    test("can parse upper case scientific notation", () => {
        let fn = parse('.42E2');
        expect(fn()).toBe(42);
    });

    test("will not parse invalid scientific notation", () => {
        expect(function () { parse('42e-'); }).toThrow();
        expect(function () { parse('42e-a'); }).toThrow();

        //增加下面这种情况
        expect(function () { parse('42e'); }).toThrow();
    });

    test("will not parse two floating point number", () => {
        expect(function () { parse('4..2'); }).toThrow();
    });

    test("can parse a string in single quotes", () => {
        let fn = parse("'abc'");
        expect(fn()).toEqual('abc');
    });

    test("can parse a string in double quotes", () => {
        let fn = parse('"abc"');
        expect(fn()).toEqual('abc');
    });

    test("will not parse a string with mismatching quotes", () => {
        expect(function () { parse('"abc\''); }).toThrow();
    });

    test('can parse a string with single quotes inside', () => {
        let fn = parse("'a\\\'b'");
        expect(fn()).toEqual('a\'b');
    });

    test('can parse a string with double quotes inside', () => {
        let fn = parse('"a\\\"b"');
        expect(fn()).toEqual('a\"b');
    });

    test("will parse a string with unicode escapes", () => {
        let fn = parse('"\\u00A0"');
        expect(fn()).toEqual('\u00A0');
    });

    test("will not parse a string with invalid unicode escapes", () => {
        expect(function () { parse('"\\u00T0"'); }).toThrow();
    });

    test("will parse null", () => {
        let fn = parse('null');
        expect(fn()).toBe(null);
    });

    test("will parse true", () => {
        let fn = parse('true');
        expect(fn()).toBe(true);
    });

    test("will parse false", () => {
        let fn = parse('false');
        expect(fn()).toBe(false);
    });

    test('ignores whitespace', () => {
        let fn = parse(' \n42 ');
        expect(fn()).toEqual(42);
    });

    test("will parse an empty array", () => {
        let fn = parse('[]');
        expect(fn()).toEqual([]);
    });

    test("will parse a non-empty array", () => {
        let fn = parse('[1, "two", [3], true]');
        expect(fn()).toEqual([1, 'two', [3], true]);
    });

    //两个连续的逗号是不允许的，即使js允许，因为解析成了undefined
    test("will parse an array with trailing commas", () => {
        let fn = parse('[1, 2, 3,]');
        expect(fn()).toEqual([1, 2, 3]);
    });

    test("will parse an empty object", () => {
        let fn = parse('{}');
        expect(fn()).toEqual({});
    });

    test("will parse a non-empty object", () => {
        let fn = parse('{"a key": 1, \'another-key\': 2}');
        expect(fn()).toEqual({ 'a key': 1, 'another-key': 2 });
    });

    test("will parse an object with identifier keys", () => {
        let fn = parse('{a: 1, b: [2, 3], c: {d: 4}}');
        expect(fn()).toEqual({ a: 1, b: [2, 3], c: { d: 4 } });
    });

    test('looks up an attribute from the scope', () => {
        let fn = parse('aKey');
        expect(fn({ aKey: 42 })).toBe(42);
        expect(fn({})).toBeUndefined();
    });

    test('returns undefined when looking up attribute from undefined', () => {
        let fn = parse('aKey');
        expect(fn()).toBeUndefined();
    });
});