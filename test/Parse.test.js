import _ from 'lodash';
import { publishExternalAPI } from '../src/angular_public';
import { createInjector } from '../src/Injector';

describe('Parse', () => {
    var parse;

    beforeEach(function () {
        publishExternalAPI();
        parse = createInjector(['ng']).get('$parse');
    });

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

        test('will parse this', () => {
            let fn = parse('this');
            let scope = {};
            expect(fn(scope)).toBe(scope);
            expect(fn()).toBeUndefined();
        });

        test('looks up a 2-part identifier path from the scope', () => {
            let fn = parse('aKey.anotherKey');
            expect(fn({ aKey: { anotherKey: 42 } })).toBe(42);
            expect(fn({ aKey: {} })).toBeUndefined();
            expect(fn({})).toBeUndefined();
        });

        test('looks up a member from an object', () => {
            let fn = parse('{aKey: 42}.aKey');
            expect(fn()).toBe(42);
        });

        test('looks up a 4-part identifier path from the scope', () => {
            let fn = parse('aKey.secondKey.thirdKey.fourthKey');
            expect(fn({ aKey: { secondKey: { thirdKey: { fourthKey: 42 } } } })).toBe(42);
            expect(fn({ aKey: { secondKey: { thirdKey: {} } } })).toBeUndefined();
            expect(fn({ aKey: {} })).toBeUndefined();
            expect(fn()).toBeUndefined();
        });

        test('uses locals instead of scope when there is a matching key', () => {
            let fn = parse('aKey');
            let scope = { aKey: 42 };
            let locals = { aKey: 43 };
            expect(fn(scope, locals)).toBe(43);
        });

        test('does not use locals instead of scope when no matching key', () => {
            let fn = parse('aKey');
            let scope = { aKey: 42 };
            let locals = { otherKey: 43 };
            expect(fn(scope, locals)).toBe(42);
        });

        test('uses locals instead of scope when the first part matches', () => {
            let fn = parse('aKey.anotherKey');
            let scope = { aKey: { anotherKey: 42 } };
            let locals = { aKey: {} };
            expect(fn(scope, locals)).toBeUndefined();
        });


        test('parses a simple computed property access', () => {
            let fn = parse('aKey["anotherKey"]');
            expect(fn({ aKey: { anotherKey: 42 } })).toBe(42);
        });

        test('parses a computed numeric array access', () => {
            let fn = parse('anArray[1]');
            expect(fn({ anArray: [1, 2, 3] })).toBe(2);
        });


        test('parses a computed access with another key as property', () => {
            let fn = parse('lock[key]');
            expect(fn({ key: 'theKey', lock: { theKey: 42 } })).toBe(42);
        });

        test('parses computed access with another access as property', () => {
            let fn = parse('lock[keys["aKey"]]');
            expect(fn({ keys: { aKey: 'theKey' }, lock: { theKey: 42 } })).toBe(42);
        });

        test('parses a function call', () => {
            let fn = parse('aFunction()');
            expect(fn({ aFunction: function () { return 42; } })).toBe(42);
        });

        test('parses a function call with a single number argument', () => {
            let fn = parse('aFunction(42)');
            expect(fn({ aFunction: function (n) { return n; } })).toBe(42);
        });

        test('parses a function call with a single identifier argument', () => {
            let fn = parse('aFunction(n)');
            expect(fn({ n: 42, aFunction: function (arg) { return arg; } })).toBe(42);
        });

        test('parses a function call with a single function call argument', () => {
            let fn = parse('aFunction(argFn())');
            expect(fn({
                argFn: _.constant(42),
                aFunction: function (arg) { return arg; }
            })).toBe(42);
        });

        test('parses a function call with a single function call argument', () => {
            let fn = parse('aFunction(argFn())');
            expect(fn({
                argFn: _.constant(42),
                aFunction: function (arg) { return arg; }
            })).toBe(42);
        });

        test('parses a function call with multiple arguments', () => {
            let fn = parse('aFunction(37, n, argFn())');
            expect(fn({
                n: 3,
                argFn: _.constant(2),
                aFunction: function (a1, a2, a3) { return a1 + a2 + a3; }
            })).toBe(42);
        });

        it('calls methods accessed as computed properties', function () {
            var scope = {
                anObject: {
                    aMember: 42,
                    aFunction: function () {
                        return this.aMember;
                    }
                }
            };
            var fn = parse('anObject["aFunction"]()');
            expect(fn(scope)).toBe(42);
        });

        it('calls methods accessed as non-computed properties', function () {
            var scope = {
                anObject: {
                    aMember: 42,
                    aFunction: function () {
                        return this.aMember;
                    }
                }
            };
            var fn = parse('anObject.aFunction()');
            expect(fn(scope)).toBe(42);
        });

        it('binds bare functions to the scope', function () {
            var scope = {
                aFunction: function () {
                    return this;
                }
            };
            var fn = parse('aFunction()');
            expect(fn(scope)).toBe(scope);
        });

        it('binds bare functions on locals to the locals', function () {
            var scope = {};
            var locals = {
                aFunction: function () {
                    return this;
                }
            };
            var fn = parse('aFunction()');
            expect(fn(scope, locals)).toBe(locals);
        });

        it(`parses a simple attribute assignment`, function () {
            var fn = parse(`anAttribute = 42`);
            var scope = {};
            fn(scope);
            expect(scope.anAttribute).toBe(42);
        });

        it(`can assign any primary expression`, function () {
            var fn = parse(`anAttribute = aFunction()`);
            var scope = { aFunction: _.constant(42) }; fn(scope);
            expect(scope.anAttribute).toBe(42);
        });

        it('can assign a computed object property', function () {
            var fn = parse('anObject["anAttribute"] = 42');
            var scope = { anObject: {} };
            fn(scope); expect(scope.anObject.anAttribute).toBe(42);
        });

        it('can assign a non - computed object property', function () {
            var fn = parse('anObject.anAttribute = 42');
            var scope = { anObject: {} };
            fn(scope);
            expect(scope.anObject.anAttribute).toBe(42);
        });

        it('can assign a nested object property', function () {
            var fn = parse('anArray[0].anAttribute = 42');
            var scope = { anArray: [{}] };
            fn(scope); expect(scope.anArray[0].anAttribute).toBe(42);
        });

        it('creates the objects in the assignment path that do not exist', function () {
            var fn = parse('some["nested"].property.path = 42');
            var scope = {};
            fn(scope);
            expect(scope.some.nested.property.path).toBe(42);
        });

        it('does not allow calling the function constructor ', function () {
            expect(function () {
                var fn = parse('aFunction.constructor("return window;")()');
                fn({ aFunction: function () { } });
            }).toThrow();
        });

        it('does not allow accessing __proto__', function () {
            expect(function () {
                var fn = parse('obj.__proto__');
                fn({ obj: {} });
            }).toThrow();
        });

        it('does not allow calling __defineGetter__', function () {
            expect(function () {
                var fn = parse('obj.__defineGetter__("evil", fn)');
                fn({ obj: {}, fn: function () { } });
            }).toThrow();
        });

        it('does not allow calling __defineSetter__', function () {
            expect(function () {
                var fn = parse('obj.__defineSetter__("evil", fn)');
                fn({ obj: {}, fn: function () { } });
            }).toThrow();
        });

        it('does not allow calling __lookupGetter__ ', function () {
            expect(function () {
                var fn = parse('obj.__lookupGetter__("evil") ');
                fn({ obj: {} });
            }).toThrow();
        });

        it('does not allow calling __lookupSetter__', function () {
            expect(function () {
                var fn = parse('obj.__lookupSetter__("evil")');
                fn({ obj: {} });
            }).toThrow();
        });

        it('does not allow accessing window as computed property', function () {
            var fn = parse('anObject["wnd"]');
            expect(function () { fn({ anObject: { wnd: window } }); }).toThrow();
        });

        it('does not allow accessing window as non - computed property', function () {
            var fn = parse('anObject.wnd');
            expect(function () { fn({ anObject: { wnd: window } }); }).toThrow();
        });

        it('does not allow passing window as function argument', function () {
            var fn = parse('aFunction(wnd)');
            expect(function () {
                fn({ aFunction: function () { }, wnd: window });
            }).toThrow();
        });

        it('does not allow calling methods on window', function () {
            var fn = parse('wnd.scrollTo(0)');
            expect(function () {
                fn({ wnd: window });
            }).toThrow();
        });

        it('does not allow functions to return window ', function () {
            var fn = parse('getWnd()');
            expect(function () { fn({ getWnd: _.constant(window) }); }).toThrow();
        });

        it('does not allow assigning window', function () {
            var fn = parse('wnd = anObject');
            expect(function () {
                fn({ anObject: window });
            }).toThrow();
        });

        it('does not allow referencing window', function () {
            var fn = parse('wnd');
            expect(function () {
                fn({ wnd: window });
            }).toThrow();
        });


        it('does not allow calling functions on DOM elements', function () {
            var fn = parse('el.setAttribute("evil", "true")');
            expect(function () { fn({ el: document.documentElement }); }).toThrow();
        });

        it('does not allow calling the aliased function constructor', function () {
            var fn = parse('fnConstructor("return window;")');
            expect(function () {
                fn({ fnConstructor: (function () { }).constructor });
            }).toThrow();
        });

        it('does not allow calling functions on Object', function () {
            var fn = parse('obj.create({})');
            expect(function () {
                fn({ obj: Object });
            }).toThrow();
        });

        it('does not allow calling call', function () {
            var fn = parse('fun.call(obj)');
            expect(function () { fn({ fun: function () { }, obj: {} }); }).toThrow();
        });

        it('does not allow calling apply', function () {
            var fn = parse('fun.apply(obj)');
            expect(function () { fn({ fun: function () { }, obj: {} }); }).toThrow();
        });

        it('can parse filter expressions', function () {
            parse = createInjector(['ng', function ($filterProvider) {
                $filterProvider.register('upcase', function () {
                    return function (str) {
                        return str.toUpperCase();
                    };
                });
            }]).get('$parse');
            var fn = parse('aString | upcase');
            expect(fn({ aString: 'Hello' })).toEqual('HELLO');
        });

        it('can parse filter chain expressions', function () {
            parse = createInjector(['ng', function ($filterProvider) {
                $filterProvider.register('upcase', function () {
                    return function (s) {
                        return s.toUpperCase();
                    };
                });
                $filterProvider.register('exclamate', function () {
                    return function (s) {
                        return s + '!';
                    };
                });
            }]).get('$parse');
            var fn = parse('"hello" | upcase | exclamate');
            expect(fn()).toEqual('HELLO!');
        });

        it('can pass an additional argument to filters', function () {
            parse = createInjector(['ng', function ($filterProvider) {
                $filterProvider.register('repeat', function () {
                    return function (s, times) {
                        return _.repeat(s, times);
                    };
                });
            }]).get('$parse');
            var fn = parse('"hello" | repeat: 3');
            expect(fn()).toEqual('hellohellohello');
        });

        it('can pass several additional arguments to filters', function () {
            parse = createInjector(['ng', function ($filterProvider) {
                $filterProvider.register('surround', function () {
                    return function (s, left, right) {
                        return left + s + right;
                    };
                });
            }]).get('$parse');
            var fn = parse('"hello" | surround: "*": "!"'); expect(fn()).toEqual('*hello!');
        });
    });

    describe('Operator', () => {
        it('parses a unary + ', function () {
            expect(parse('+42')()).toBe(42);
            expect(parse('+a')({ a: 42 })).toBe(42);
        });

        it('replaces undefined with zero for unary +', function () {
            expect(parse('+a')({})).toBe(0);
        });

        it('parses a unary!', function () {
            expect(parse('!true')()).toBe(false);
            expect(parse('!42')()).toBe(false);
            expect(parse('!a')({ a: false })).toBe(true);
            expect(parse('!!a')({ a: false })).toBe(false);
        });

        it(`parses a unary -`, function () {
            expect(parse(`-42`)()).toBe(-42);
            expect(parse(`-a`)({ a: -42 })).toBe(42);
            expect(parse(`--a`)({ a: -42 })).toBe(-42);
            expect(parse(`-a`)({})).toBe(-0);// 0===-0??
        });

        it('parses a ! in a string', function () {
            expect(parse('"!"')()).toBe('!');
        });

        it('parses a multiplication', function () {
            expect(parse('21 * 2')()).toBe(42);
        });

        it('parses a division', function () {
            expect(parse('84 / 2')()).toBe(42);
        });

        it('parses a remainder', function () {
            expect(parse('85 % 43')()).toBe(42);
        });

        it('parses several multiplicatives', function () {
            expect(parse('36 * 2 % 5')()).toBe(2);
        });

        it('parses an addition', function () {
            expect(parse('20 + 22')()).toBe(42);
        });

        it('parses a subtraction', function () {
            expect(parse('42 - 22')()).toBe(20);
        });

        it('parses multiplicatives on a higher precedence than additives', function () {
            expect(parse('2 + 3 * 5')()).toBe(17);
            expect(parse('2 + 3 * 2 + 3')()).toBe(11);
        });

        it('substitutes undefined with zero in addition', function () {
            expect(parse('a + 22')()).toBe(22);
            expect(parse('42 + a')()).toBe(42);
        });

        it('substitutes undefined with zero in subtraction', function () {
            expect(parse('a - 22')()).toBe(-22);
            expect(parse('42 - a')()).toBe(42);
        });

        it('parses relational operators', function () {
            expect(parse('1 < 2')()).toBe(true);
            expect(parse('1 > 2')()).toBe(false);
            expect(parse('1 <= 2')()).toBe(true);
            expect(parse('2 <= 2')()).toBe(true);
            expect(parse('1 >= 2')()).toBe(false);
            expect(parse('2 >= 2')()).toBe(true);
        });

        it('parses equality operators', function () {
            expect(parse('42 == 42')()).toBe(true);
            expect(parse('42 == "42"')()).toBe(true);
            expect(parse('42 != 42')()).toBe(false);
            expect(parse('42 === 42')()).toBe(true);
            expect(parse('42 === "42"')()).toBe(false);
            expect(parse('42 !== 42')()).toBe(false);
        });

        it('parses relationals on a higher precedence than equality', function () {
            expect(parse('2 == "2" > 2 === "2"')()).toBe(false);
        });

        it('parses additives on a higher precedence than relationals', function () {
            expect(parse('2 + 3 < 6 - 2')()).toBe(false);
        });

        it('parses logical AND', function () {
            expect(parse('true && true')()).toBe(true);
            expect(parse('true && false')()).toBe(false);
        });

        it('parses logical OR', function () {
            expect(parse('true || true')()).toBe(true);
            expect(parse('true || false')()).toBe(true);
            expect(parse('fales || false')()).toBe(false);
        });

        it('parses multiple ANDs', function () {
            expect(parse('true && true && true')()).toBe(true);
            expect(parse('true && true && false')()).toBe(false);
        });

        it('parses multiple ORs', function () {
            expect(parse('true || true || true')()).toBe(true);
            expect(parse('true || true || false')()).toBe(true);
            expect(parse('false || false || true')()).toBe(true);
            expect(parse('false || false || false')()).toBe(false);
        });

        it('short - circuits AND', function () {
            var invoked;
            var scope = { fn: function () { invoked = true; } };
            parse('false && fn()')(scope);
            expect(invoked).toBeUndefined();
        });

        it('short-circuits OR', function () {
            var invoked;
            var scope = { fn: function () { invoked = true; } };
            parse('true || fn()')(scope);
            expect(invoked).toBeUndefined();
        });

        it('parses AND with a higher precedence than OR', function () {
            expect(parse('false && true || true')()).toBe(true);
        });

        it('parses OR with a lower precedence than equality', function () {
            expect(parse('1 === 2 || 2 === 2')()).toBeTruthy();
        });

        it('parses the ternary expression', function () {
            expect(parse('a === 42 ? true : false')({ a: 42 })).toBe(true);
            expect(parse('a === 42 ? true : false')({ a: 43 })).toBe(false);
        });

        it('parses OR with a higher precedence than ternary', function () {
            expect(parse('0 || 1 ? 0 || 2 : 0 || 3')()).toBe(2);
        });

        it('parses nested ternaries', function () {
            expect(
                parse('a === 42 ? b === 42 ? "a and b" : "a" : c === 42 ? "c" : "none"')({
                    a: 44,
                    b: 43,
                    c: 42
                })).toEqual('c');
        });

        it('parses parentheses altering precedence order', function () {
            expect(parse('21 * (3 - 1)')()).toBe(42);
            expect(parse('false && (true || true)')()).toBe(false);
            expect(parse('-((a % 2) === 0 ? 1 : 2)')({ a: 42 })).toBe(-1);
        });

        it('parses several statements', function () {
            var fn = parse('a = 1; b = 2; c = 3');
            var scope = {};
            fn(scope);
            expect(scope).toEqual({ a: 1, b: 2, c: 3 });
        });

        it('returns the value of the last statement', function () {
            expect(parse('a = 1; b = 2; a + b')({})).toBe(3);
        });

    });

    describe('Expressions And Watches', () => {
        it('returns the function itself when given one', function () {
            var fn = function () { };
            expect(parse(fn)).toBe(fn);
        });

        it('marks integers literal', function () {
            var fn = parse('42');
            expect(fn.literal).toBe(true);
        });

        it('marks strings literal', function () {
            var fn = parse('"abc"');
            expect(fn.literal).toBe(true);
        });

        it('marks booleans literal', function () {
            var fn = parse('true');
            expect(fn.literal).toBe(true);
        });

        it('marks arrays literal', function () {
            var fn = parse('[1, 2, aVariable]');
            expect(fn.literal).toBe(true);
        });

        it('marks objects literal', function () {
            var fn = parse('{ a: 1, b: aVariable }');
            expect(fn.literal).toBe(true);
        });

        it('marks unary expressions non - literal', function () {
            var fn = parse('!false');
            expect(fn.literal).toBe(false);
        });

        it('marks binary expressions non - literal', function () {
            var fn = parse('1 + 2');
            expect(fn.literal).toBe(false);
        });

        it('marks integers constant', function () {
            var fn = parse('42');
            expect(fn.constant).toBe(true);
        });
        it('marks strings constant', function () {
            var fn = parse('"abc"');
            expect(fn.constant).toBe(true);
        });
        it('marks booleans constant', function () {
            var fn = parse('true');
            expect(fn.constant).toBe(true);
        });

        it('marks identifiers non - constant', function () {
            var fn = parse('a');
            expect(fn.constant).toBe(false);
        });

        it('marks arrays constant when elements are constant', function () {
            expect(parse('[1, 2, 3]').constant).toBe(true);
            expect(parse('[1, [2, [3]]]').constant).toBe(true);
            expect(parse('[1, 2, a]').constant).toBe(false);
            expect(parse('[1, [2, [a]]]').constant).toBe(false);
        });

        it('marks objects constant when values are constant', function () {
            expect(parse('{ a: 1, b: 2 }').constant).toBe(true);
            expect(parse('{ a: 1, b: { c: 3 } }').constant).toBe(true);
            expect(parse('{ a: 1, b: something }').constant).toBe(false);
            expect(parse('{ a: 1, b: { c: something } }').constant).toBe(false);
        });

        it('marks this as non - constant', function () {
            expect(parse('this').constant).toBe(false);
        });

        it('marks non - computed lookup constant when object is constant', function () {
            expect(parse('{ a: 1 }.a').constant).toBe(true);
            expect(parse('obj.a').constant).toBe(false);
        });

        it('marks computed lookup constant when object and key are', function () {
            expect(parse('{ a: 1 }["a"]').constant).toBe(true);
            expect(parse('obj["a"]').constant).toBe(false);
            expect(parse('{ a: 1 }[something]').constant).toBe(false);
            expect(parse('obj[something]').constant).toBe(false);
        });

        it('marks function calls non - constant', function () {
            expect(parse('aFunction()').constant).toBe(false);
        });

        it('marks filters constant if arguments are', function () {
            parse = createInjector(['ng', function ($filterProvider) {
                $filterProvider.register('aFilter', function () {
                    return _.identity;
                });
            }]).get('$parse');
            expect(parse('[1, 2, 3] | aFilter').constant).toBe(true);
            expect(parse('[1, 2, a] | aFilter').constant).toBe(false);
            expect(parse('[1, 2, 3] | aFilter: 42').constant).toBe(true);
            expect(parse('[1, 2, 3] | aFilter: a').constant).toBe(false);
        });

        it('marks assignments constant when both sides are', function () {
            expect(parse('1 = 2').constant).toBe(true);
            expect(parse('a = 2').constant).toBe(false);
            expect(parse('1 = b').constant).toBe(false);
            expect(parse('a = b').constant).toBe(false);
        });

        it('marks unaries constant when arguments are constant', function () {
            expect(parse('+42').constant).toBe(true);
            expect(parse('+a').constant).toBe(false);
        });

        it('marks binaries constant when both arguments are constant', function () {
            expect(parse('1 + 2').constant).toBe(true);
            expect(parse('1 + 2').literal).toBe(false);
            expect(parse('1 + a').constant).toBe(false);
            expect(parse('a + 1').constant).toBe(false);
            expect(parse('a + a').constant).toBe(false);
        });

        it('marks logicals constant when both arguments are constant', function () {
            expect(parse('true && false').constant).toBe(true);
            expect(parse('true && false').literal).toBe(false);
            expect(parse('true && a').constant).toBe(false);
            expect(parse('a && false').constant).toBe(false);
            expect(parse('a && b').constant).toBe(false);
        });

        it('marks ternaries constant when all arguments are', function () {
            expect(parse('true ? 1 : 2').constant).toBe(true);
            expect(parse('a ? 1 : 2').constant).toBe(false);
            expect(parse('true ? a : 2').constant).toBe(false);
            expect(parse('true ? 1 : b').constant).toBe(false);
            expect(parse('a ? b : c').constant).toBe(false);
        });

        it('allows calling assign on identifier expressions', function () {
            var fn = parse('anAttribute');
            expect(fn.assign).toBeDefined();
            var scope = {};
            fn.assign(scope, 42);
            expect(scope.anAttribute).toBe(42);
        });

        it('allows calling assign on member expressions', function () {
            var fn = parse('anObject.anAttribute');
            expect(fn.assign).toBeDefined();
            var scope = {};
            fn.assign(scope, 42);
            expect(scope.anObject).toEqual({ anAttribute: 42 });
        });

    });
});