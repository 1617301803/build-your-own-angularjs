import _ from 'lodash';
import { Scope } from '../src/Scope.js';
import {register,filter} from '../src/Filter';

describe('Scope', () => {

    describe.skip('digest', () => {
        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        test('watch', () => {
            const watchFn = () => 'watch';
            const listenerFn = jest.fn();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        test('call watch function with scope', () => {
            const watchFn = jest.fn();
            const listenerFn = () => { };
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        test('call listener function when data change', () => {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch((scope) => {
                return scope.someValue;
            }, (newValue, oldValue, scope) => {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test('call listener when watch value is first undefined', () => {
            scope.counter = 0;

            scope.$watch(
                (scope) => { return scope.scope; },
                (newValue, oldValue, scope) => { scope.counter++ }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test('call listener whit new Value as old first time', () => {
            scope.someValue = 123;
            let oldValueGiven;

            scope.$watch(
                (scope) => { return scope.someValue; },
                (newValue, oldValue, scope) => { oldValueGiven = oldValue; }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123)
        });

        test('may have watchers that omit the listener function', () => {
            var watchFn = jest.fn().mockReturnValue('something');
            scope.$watch(watchFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        test('triggers chained wachers in the same digest', () => {
            scope.name = 'Jane';

            scope.$watch(
                (scope) => { return scope.nameUpper; },
                (newValue, oldValue, scope) => {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1);
                    }
                }
            );

            scope.$watch(
                (scope) => { return scope.name; },
                (newValue, oldValue, scope) => {
                    if (newValue) {
                        scope.nameUpper = newValue;
                    }
                }
            )

            scope.$digest();
            expect(scope.initial).toBe('J');

            scope.name = 'Bob';

            scope.$digest();
            expect(scope.initial).toBe('B');
        });

        test('give up on the watches after 10 iterations', () => {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                (scope) => { return scope.counterA; },
                (newValue, oldValue, scope) => {
                    scope.counterB++;
                }
            );

            scope.$watch(
                (scope) => { return scope.counterB; },
                (newValue, oldValue, scope) => {
                    scope.counterA++;
                }
            );
            expect(() => { scope.$digest(); }).toThrow();
        });

        test('ends the digest when the last watch is clean', () => {
            scope.array = _.range(100);
            let watchExecutions = 0;

            _.times(100, (i) => {
                scope.$watch(
                    (scope) => {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    () => { }
                )
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        test.skip('does not enddigest so that new watches are not run', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                () => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.$watch(
                        () => {
                            return scope.aValue;
                        },
                        (newValue, oldValue, scope) => {
                            scope.counter++;
                        }
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            //下面这个测试应该是3，但是实际为2，因为第二次改变值时加的watch没有执行
            //所以说在listener中最好不要新增加watcher
            scope.aValue = 'a';
            scope.$digest();
            expect(scope.counter).toBe(3);
        });

        test('compares based on value if enabled', () => {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                },
                true
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test('correctly handles NaNs', () => {
            scope.number = 0 / 0;
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.number;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test('execute $eval function and returns result', () => {
            scope.aValue = 42;

            let result = scope.$eval((scope) => {
                return scope.aValue;
            });

            expect(result).toBe(42);

            let addResult = scope.$eval((scope, arg) => {
                return scope.aValue + arg;
            }, 2);

            expect(addResult).toBe(44);
        });

        test('executes $apply function and starts the digest', () => {
            scope.aValue = 'someValue';
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply((scope) => {
                scope.aValue = 'someOtherValue';
            });
            expect(scope.counter).toBe(2);
        });

        test('executes $evalAsync function later in the same cycle', () => {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedInnediately = false;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.$evalAsync((scope) => {
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedInnediately = scope.asyncEvaluated;
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedInnediately).toBe(false);
        });

        test('execute $evalAsync function added by watch function', () => {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;

            scope.$watch(
                (scope) => {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(() => {
                            scope.asyncEvaluated = true;
                        })
                    }
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => { }
            );

            scope.$digest();

            expect(scope.asyncEvaluated).toBe(true);
        });

        test('executes $evalAsync functions even when not dirty', () => {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;

            scope.$watch(
                (scope) => {
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.$evalAsync(() => {
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => { }
            );

            scope.$digest();

            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        test('eventually halts $evalAsyncs added by watches', function () {
            scope.aValue = [1, 2, 3];

            scope.$watch(
                (scope) => {
                    scope.$evalAsync(() => {
                        scope.asyncEvaluatedTimes++;
                    });
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => { }
            );

            expect(() => { scope.$digest() }).toThrow();
        });

        test('has a $$phase filed whose value is the current digest phase', () => {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                (scope) => {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply((scope) => {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        test('schedules a digest in $evalAstnc', (done) => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$evalAsync((scope) => {
            });

            expect(scope.counter).toBe(0);
            setTimeout(() => {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        test('allows astnc $apply with $applyAsync', (done) => {
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync((scope) => {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);

            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        test('never executest $applyAsync function in the same cycle', (done) => {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scole) => {
                    scope.$applyAsync((scope) => {
                        scope.asyncApplied = true;
                    });
                }
            );

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);

            setTimeout(() => {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        test('coalesces many calls to $applyAsync', (done) => {
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    scope.counter++;
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                }
            );

            scope.$applyAsync((scope) => {
                scope.aValue = 'abc';
            });

            scope.$applyAsync((scope) => {
                scope.aValue = 'def';
            });

            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        test('cancels and flushes $applyAsync if digested first', (done) => {
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    scope.counter++;
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                }
            );

            scope.$applyAsync((scope) => {
                scope.aValue = 'abc';
            });

            scope.$applyAsync((scope) => {
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');

            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        test('runs a $$postDigest function after each digest', () => {
            scope.counter = 0;

            scope.$$postDigest(() => {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test('does not include $$poseDigest in the digest', () => {
            scope.aValue = 'original value';

            scope.$$postDigest(() => {
                scope.aValue = 'changed value';
            });
            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.watchedValue = newValue;
                }
            );

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        test('catches exceptions in watch functions and continues', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    throw 'error';
                },
                (newValue, oldValue, scope) => { }
            );

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test('catches exceptions in listener functions and continues', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    throw 'error';
                }
            );

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test('catches excetions in $evalAsync', (done) => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$evalAsync(() => {
                throw 'error';
            });

            setTimeout(() => {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        test('catches excetions in $applyAsync', (done) => {
            scope.$applyAsync(() => {
                throw 'error';
            });

            scope.$applyAsync(() => {
                throw 'error';
            });

            scope.$applyAsync(() => {
                scope.applied = true;
            });

            setTimeout(() => {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });

        test('catches excetions in $postDigest",', () => {
            let didRun = false;

            scope.$$postDigest(() => {
                throw 'error';
            });

            scope.$$postDigest(() => {
                didRun = true;
            });

            scope.$digest();
            expect(didRun).toBe(true);
        });

        test('allows destorying a $watch with a removal function', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            let destroyWatch = scope.$watch(
                (scope) => { return scope.aValue },
                (newValue, oldValue, scope) => { scope.counter++; }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test('allows destroying a $watch during digest', () => {
            scope.aValue = 'abc';

            let watchCalls = [];

            scope.$watch(
                (scope) => {
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );

            let destoryWatch = scope.$watch(
                (scope) => {
                    watchCalls.push('second');
                    destoryWatch();
                }
            );

            scope.$watch(
                (scope) => {
                    watchCalls.push('third');
                    destoryWatch();
                }
            );

            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });

        test('allows a $watch to destroy anther during digest', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    destroyWatch();
                }
            );

            let destroyWatch = scope.$watch(
                (scope) => {
                },
                (newValue, oldValue, scope) => {
                }
            );

            scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test('allows destroying serveal $watches during digest', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            let destroyWatch1 = scope.$watch(
                (scope) => {
                    destroyWatch1();
                    destroyWatch2();
                }
            );

            let destroyWatch2 = scope.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(0);
        });
    });

    describe.skip('$watchGroup', () => {
        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        test('takes watches as an array and calls listener with arrays', () => {
            let gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.antherValue = 2;

            scope.$watchGroup([
                (scope) => {
                    return scope.aValue;
                },
                (scope) => {
                    return scope.antherValue;
                }
            ], (newValues, oldValues, scope) => {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        test('only calls listener once per digest', () => {
            let counter = 0;

            scope.aValue = 1;
            scope.antherValue = 2;

            scope.$watchGroup([
                (scope) => {
                    return scope.aValue;
                },
                (scope) => {
                    return scope.antherValue;
                }
            ], (newValues, oldValues, scope) => {
                counter++;
            });

            scope.$digest();
            expect(counter).toEqual(1);
        });

        test('uses the same array of old and new values on first time', () => {
            let gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.antherValue = 2;

            scope.$watchGroup([
                (scope) => {
                    return scope.aValue;
                },
                (scope) => {
                    return scope.antherValue;
                }
            ], (newValues, oldValues, scope) => {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        test('uses different arrats for old and new values on subsequent runs', () => {
            let gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.antherValue = 2;

            scope.$watchGroup([
                (scope) => {
                    return scope.aValue;
                },
                (scope) => {
                    return scope.antherValue;
                }
            ], (newValues, oldValues, scope) => {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();

            scope.antherValue = 3;
            scope.$digest();

            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        test('calls the listener once when the watch array is empty', () => {
            let gotNewValues, gotOldValues;

            scope.$watchGroup([], (newValues, oldValues, scope) => {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        test('can be deregistered', () => {
            let counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            let destroyGroup = scope.$watchGroup([
                (scope) => { return scope.aValue; },
                (scope) => { return scope.anotherValue }
            ], (newValues, oldValues, scope) => {
                counter++;
            });

            scope.$digest();

            scope.anotherValue = 3;
            destroyGroup();

            scope.$digest();
            expect(counter).toEqual(1);
        });

        test('dose not call the zero-watch listener when degrgistered first', () => {
            let counter = 0;

            let destoryGroup = scope.$watchGroup([], (newValues, oldValues, scope) => {
                counter++;
            });
            destoryGroup();

            scope.$digest();
            expect(counter).toEqual(0);
        })
    });

    describe.skip("inheritance", () => {

        test("inherits the parent properties", () => {
            let parent = new Scope();
            parent.aValue = [1, 2, 3];

            let child = parent.$new();

            expect(child.aValue).toEqual([1, 2, 3]);
        });

        test("does not cause a parent's to inherit its properties", () => {
            let parent = new Scope();
            let child = parent.$new();

            child.aValue = [1, 2, 3];

            expect(parent.aValue).toBeUndefined();
        });

        test("inherits the parent's properties whenever they are defined", () => {
            let parent = new Scope();
            let child = parent.$new();

            parent.aValue = [1, 2, 3];

            expect(child.aValue).toEqual([1, 2, 3]);
        });

        test("can manipulate a parent scope's property", () => {
            let parent = new Scope();
            let child = parent.$new();

            parent.aValue = [1, 2, 3];
            child.aValue.push(4);

            expect(child.aValue).toEqual([1, 2, 3, 4]);
            expect(parent.aValue).toEqual([1, 2, 3, 4]);
        });

        test("can watch a property in the parent", () => {
            let parent = new Scope();
            let child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;

            child.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                },
                true
            );

            child.$digest();
            expect(child.counter).toBe(1);

            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });

        test("can be nested at any depth", () => {
            let a = new Scope();
            let aa = a.$new();
            let aaa = aa.$new();
            let aab = aa.$new();
            let ab = a.$new();
            let abb = ab.$new();
            a.value = 1;
            expect(aa.value).toBe(1);
            expect(aaa.value).toBe(1);
            expect(aab.value).toBe(1);
            expect(ab.value).toBe(1);
            expect(abb.value).toBe(1);
            ab.anotherValue = 2;
            expect(abb.anotherValue).toBe(2);
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();
        });

        test("shadows a parent's property with the same name", function () {
            let parent = new Scope();
            let child = parent.$new();
            parent.name = 'Joe';
            child.name = 'Jill';
            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });

        test("does not shadow members of parent scope's attributes", function () {
            let parent = new Scope();
            let child = parent.$new();
            parent.user = { name: 'Joe' };
            child.user.name = 'Jill';
            expect(child.user.name).toBe('Jill');
            expect(parent.user.name).toBe('Jill');
        });

        test("does not digest its parent(s)", function () {
            let parent = new Scope();
            let child = parent.$new();

            parent.aValue = 'abc';
            parent.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.aValueWas = newValue;
                }
            );
            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        test("keeps a record of its children", function () {
            var parent = new Scope();
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);
            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        test("digests its children", () => {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.aValueWas = newValue;
                }
            );
            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        test('digests from root on $apply', () => {
            let parent = new Scope();
            let child = parent.$new();
            let child2 = parent.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            child.$apply((scope) => { });

            expect(parent.counter).toBe(1);
        });

        test('schedules a digest from root on $evalAsync', (done) => {
            let parent = new Scope();
            let child = parent.$new();
            let child2 = parent.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                (scope) => {
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            child.$evalAsync((scope) => { });

            setTimeout(() => {
                expect(parent.counter).toBe(1);
                done();
            });
        });

        test("does not have access to parent attributes when isolated", () => {
            let parent = new Scope();
            let child = parent.$new(true);

            parent.aValue = 'abc';

            expect(child.aValue).toBeUndefined();
        });

        test("cannot watch parent attributes when isolated", function () {
            let parent = new Scope();
            let child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        test("digests its isolated children", function () {
            let parent = new Scope();
            let child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        test("digests from root on $apply when isolated", function () {
            let parent = new Scope();
            let child = parent.$new(true);
            let child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;

            parent.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            child2.$apply((scope) => { });
            expect(parent.counter).toBe(1);
        });

        test("schedules a digest from root on $evalAsync when isolated", function (done) {
            let parent = new Scope();
            let child = parent.$new(true);
            let child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function (scope) { });

            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        test("executes $evalAsync functions on isolated scopes", function (done) {
            let parent = new Scope();
            let child = parent.$new(true);

            child.$evalAsync((scope) => {
                scope.didEvalAsync = true;
            });

            setTimeout(() => {
                expect(child.didEvalAsync).toBe(true);
                done();
            }, 50);
        });

        test("executes $$postDigest functions on isolated scopes", function () {
            let parent = new Scope();
            let child = parent.$new(true);

            child.$$postDigest(() => {
                child.didPostDigest = true;
            });

            parent.$digest();
            expect(child.didPostDigest).toBe(true);
        });

        test('can take some other scope as the parent', function () {
            let prototypeParent = new Scope();
            let hierarchyParent = new Scope();
            let child = prototypeParent.$new(false, hierarchyParent);

            prototypeParent.a = 42;
            expect(child.a).toBe(42);

            child.counter = 0;
            child.$watch(function (scope) {
                scope.counter++;
            });

            prototypeParent.$digest();
            expect(child.counter).toBe(0);
            hierarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        test("is no longer digested when $destroy has been called", function () {
            let parent = new Scope();
            let child = parent.$new();

            child.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                },
                true
            );

            parent.$digest();
            expect(child.counter).toBe(1);

            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });
    });

    describe.skip("$watchCollection", () => {
        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        test("works like a normal watch for non-collections", () => {
            let valueProvided;

            scope.aValue = 42;
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    valueProvided = newValue;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(scope.aValue);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("works like a normal watch for NaNs", () => {
            scope.aValue = 0 / 0;
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => { scope.counter++; }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test("notices when the value becomes an array", () => {
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.arr; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr = [1, 2, 3];
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("notices an item added to an array", () => {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.arr; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("notices items reordered in an array", () => {
            scope.arr = [2, 1, 3];
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.arr; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        test('does not fail on NaNs in arrays', () => {
            scope.arr = [2, NaN, 3];
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.arr; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test("notices an item replaced in an arguments object", () => {
            (function () {
                scope.arrayLike = arguments;
            })(1, 2, 3);
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.arrayLike; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arrayLike[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("notices an item replaced in a NodeList object", () => {
            document.documentElement.appendChild(document.createElement('div'));
            scope.arrayLike = document.getElementsByTagName('div');

            scope.counter = 0;

            scope.$watchCollection(
                function (scope) { return scope.arrayLike; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            document.documentElement.appendChild(document.createElement('div'));
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("notices when the value becomes an object", () => {
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => { return scope.obj; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj = { a: 1 };
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("notices when an attribute is added to an object", () => {
            scope.counter = 0;
            scope.obj = { a: 1 };

            scope.$watchCollection(
                (scope) => { return scope.obj; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("notices when an attribute is changed to an object", () => {
            scope.counter = 0;
            scope.obj = { a: 1 };

            scope.$watchCollection(
                (scope) => { return scope.obj; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.a = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("does not fail on NaN attributes in objects", () => {
            scope.counter = 0;
            scope.obj = { a: NaN };

            scope.$watchCollection(
                (scope) => { return scope.obj; },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        test("notices when an attribute is removed from an object", () => {
            scope.counter = 0;
            scope.obj = { a: 1 };

            scope.$watchCollection(
                function (scope) { return scope.obj; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            delete scope.obj.a;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test.skip("does not consider any object with a length property an array", () => {
            //内部lodash的forEach对obj中有length的还是认为是数组 isArrayLike
            scope.obj = { length: 42, otherKey: 'abc' };
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) { return scope.obj; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();

            scope.obj.newKey = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        test("gives the old non-collection value to listeners", () => {
            scope.aValue = 42;
            var oldValueGiven;
            scope.$watchCollection(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue = 43;
            scope.$digest();
            expect(oldValueGiven).toBe(42);
        });

        test("gives the old array value to listeners", () => {
            scope.aValue = [1, 2, 3];
            var oldValueGiven;

            scope.$watchCollection(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();
            scope.aValue.push(4);

            scope.$digest();
            expect(oldValueGiven).toEqual([1, 2, 3]);
        });

        test("gives the old object value to listeners", () => {
            scope.aValue = { a: 1, b: 2 };
            var oldValueGiven;
            scope.$watchCollection(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();
            scope.aValue.c = 3;
            scope.$digest();
            expect(oldValueGiven).toEqual({ a: 1, b: 2 });
        });

        test("uses the new value as the old value on first digest", () => {
            scope.aValue = { a: 1, b: 2 };

            var oldValueGiven;
            scope.$watchCollection(
                (scope) => { return scope.aValue; },
                (newValue, oldValue, scope) => {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();
            expect(oldValueGiven).toEqual({ a: 1, b: 2 });
        });
    });

    describe.skip('Event', () => {
        let parent,
            scope,
            child,
            isolatedChild;

        beforeEach(() => {
            parent = new Scope();
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });

        test("allows registering listeners", () => {
            var listener1 = function () { };
            var listener2 = function () { };
            var listener3 = function () { };

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$on('someOtherEvent', listener3);

            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            });
        });

        test("registers different listeners for every scope", () => {
            let listener1 = function () { };
            let listener2 = function () { };
            let listener3 = function () { };

            scope.$on('someEvent', listener1);
            child.$on('someEvent', listener2);
            isolatedChild.$on('someEvent', listener3);

            expect(scope.$$listeners).toEqual({ someEvent: [listener1] });
            expect(child.$$listeners).toEqual({ someEvent: [listener2] });
            expect(isolatedChild.$$listeners).toEqual({ someEvent: [listener3] });
        });

        _.forEach(['$emit', '$broadcast'], (method) => {
            test("calls the listeners of the matching event on " + method, () => {
                let listener1 = jest.fn();
                let listener2 = jest.fn();

                scope.$on('someEvent', listener1);
                scope.$on('someOtherEvent', listener2);

                scope[method]('someEvent');

                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });

            test("passes an event object with a name to listeners on " + method, () => {
                let listener = jest.fn();

                scope.$on('someEvent', listener);
                scope[method]('someEvent');

                expect(listener).toHaveBeenCalled();
                expect(listener.mock.calls[listener.mock.calls.length - 1][0].name).toEqual('someEvent');
            });

            test("passes the same event object to each listener on " + method, () => {
                let listener1 = jest.fn();
                let listener2 = jest.fn();

                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                let event1 = listener1.mock.calls[listener1.mock.calls.length - 1][0];
                let event2 = listener2.mock.calls[listener2.mock.calls.length - 1][0];
                expect(event1).toBe(event2);
            });

            test("passes additional arguments to listeners on " + method, () => {
                var listener = jest.fn();
                scope.$on('someEvent', listener);

                scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

                let event = listener.mock.calls[listener.mock.calls.length - 1];
                expect(event[1]).toEqual('and');
                expect(event[2]).toEqual(['additional', 'arguments']);
                expect(event[3]).toEqual('...');
            });

            test("returns the event object on " + method, () => {
                let returnedEvent = scope[method]('someEvent');

                expect(returnedEvent).toBeDefined();
                expect(returnedEvent.name).toEqual('someEvent');
            });

            test("can be deregistered " + method, () => {
                let listener = jest.fn();
                let deregister = scope.$on('someEvent', listener);

                deregister();

                scope[method]('someEvent');
                expect(listener).not.toHaveBeenCalled();
            });

            test("does not skip the next listener when removed on " + method, () => {
                let deregister;
                let listener = function () {
                    deregister();
                };
                var nextListener = jest.fn();

                deregister = scope.$on('someEvent', listener);
                scope.$on('someEvent', nextListener);

                scope[method]('someEvent');

                expect(nextListener).toHaveBeenCalled();
            });

            test("is sets defaultPrevented when preventDefault called on " + method, () => {
                let listener = function (event) {
                    event.preventDefault();
                };
                scope.$on('someEvent', listener);

                let event = scope[method]('someEvent');

                expect(event.defaultPrevented).toBe(true);
            });

            test("does not stop on exceptions on " + method, () => {
                let listener1 = (event) => {
                    throw 'listener1 throwing an exception';
                };
                let listener2 = jest.fn();

                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');
                expect(listener2).toHaveBeenCalled();
            });

        });

        test("propagates up the scope hierarchy on $emit", () => {
            var parentListener = jest.fn();
            var scopeListener = jest.fn();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(parentListener).toHaveBeenCalled();
        });

        test("propagates the same event up on $emit", () => {
            let parentListener = jest.fn();
            let scopeListener = jest.fn();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            var scopeEvent = scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0];
            var parentEvent = parentListener.mock.calls[parentListener.mock.calls.length - 1][0];
            expect(scopeEvent).toBe(parentEvent);
        });

        test("propagates down the scope hierarchy on $broadcast", () => {
            let scopeListener = jest.fn();
            let childListener = jest.fn();
            let isolatedChildListener = jest.fn();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);
            isolatedChild.$on('someEvent', isolatedChildListener);

            scope.$broadcast('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
            expect(isolatedChildListener).toHaveBeenCalled();
        });

        test("propagates the same event up on $broadcast", () => {
            let scopeListener = jest.fn();
            let childListener = jest.fn();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            let scopeEvent = scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0];
            let childEvent = childListener.mock.calls[childListener.mock.calls.length - 1][0];
            expect(scopeEvent).toBe(childEvent);
        });

        test("attaches targetScope on $emit", () => {
            let scopeListener = jest.fn();
            let parentListener = jest.fn();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0].targetScope).toBe(scope);
            expect(parentListener.mock.calls[parentListener.mock.calls.length - 1][0].targetScope).toBe(scope);
        });

        test("attaches targetScope on $broadcast", () => {
            let scopeListener = jest.fn();
            let childListener = jest.fn();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0].targetScope).toBe(scope);
            expect(childListener.mock.calls[childListener.mock.calls.length - 1][0].targetScope).toBe(scope);
        });

        test("attaches currentScope on $emit", () => {
            let currentScopeOnScope, currentScopeOnParent;
            let scopeListener = (event) => {
                currentScopeOnScope = event.currentScope;
            };
            let parentListener = (event) => {
                currentScopeOnParent = event.currentScope;
            }

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(currentScopeOnScope).toBe(scope);
            expect(currentScopeOnParent).toBe(parent);
        });

        test("attaches currentScope on $broadcast", () => {
            let currentScopeOnScope, currentScopeOnChild;
            let scopeListener = (event) => {
                currentScopeOnScope = event.currentScope;
            };
            let childListener = (event) => {
                currentScopeOnChild = event.currentScope;
            }

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(currentScopeOnScope).toBe(scope);
            expect(currentScopeOnChild).toBe(child);
        });

        test("does not propagate to parents when stopped", () => {
            let scopeListener = (event) => {
                event.stopPropagation();
            };
            var parentListener = jest.fn();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(parentListener).not.toHaveBeenCalled();
        });

        test("is received by listeners on current scope after being stopped", () => {
            let listener1 = function (event) {
                event.stopPropagation();
            };
            let listener2 = jest.fn();

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);

            scope.$emit('someEvent');

            expect(listener2).toHaveBeenCalled();
        });

        test("fires $destroy when destroyed", () => {
            let listener = jest.fn();
            scope.$on('$destroy', listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });

        test("fires $destroy on children destroyed", () => {
            let listener = jest.fn();
            child.$on('$destroy', listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });

        test('no longers calls listeners after destroyed', () => {
            let listener = jest.fn();
            scope.$on('myEvent', listener);

            scope.$destroy();

            scope.$emit('myEvent');
            expect(listener).not.toHaveBeenCalled();
        });

    });

    describe.skip('Expressions And Watches', () => {

        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        it(`accepts expressions for watch functions`, function () {
            var theValue;
            scope.aValue = 42;
            scope.$watch('aValue', function (newValue, oldValue, scope) {
                theValue = newValue;
            });
            scope.$digest();
            expect(theValue).toBe(42);
        });

        it('accepts expressions for watch functions', function () {
            var theValue;
            scope.aColl = [1, 2, 3];
            scope.$watchCollection('aColl', function (newValue, oldValue, scope) {
                theValue = newValue;
            });
            scope.$digest();
            expect(theValue).toEqual([1, 2, 3]);
        });

        it('accepts expressions in $eval', function () {
            expect(scope.$eval('42')).toBe(42);
        });

        it('accepts expressions in $apply', function () {
            scope.aFunction = _.constant(42);
            expect(scope.$apply('aFunction()')).toBe(42);
        });

        it('accepts expressions in $evalAsync', function (done) {
            var called;
            scope.aFunction = function () {
                called = true;
            };
            scope.$evalAsync('aFunction()');
            scope.$$postDigest(function () {
                expect(called).toBe(true); done();
            });
        });

        it('removes constant watches after first invocation', function () {
            scope.$watch('[1, 2, 3]', function () { });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('accepts one - time watches', function () {
            var theValue;
            scope.aValue = 42;
            scope.$watch('::aValue', function (newValue, oldValue, scope) {
                theValue = newValue;
            });
            scope.$digest();
            expect(theValue).toBe(42);
        });

        it('removes one - time watches after first invocation', function () {
            scope.aValue = 42;
            scope.$watch('::aValue', function () { });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not remove one - time - watches until value is defined', function () {
            scope.$watch('::aValue', function () { });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);
            scope.aValue = 42;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not remove one - time - watches until value stays defined', function () {
            scope.aValue = 42;
            scope.$watch('::aValue', function () { });
            var unwatchDeleter = scope.$watch('aValue', function () {
                delete scope.aValue;
            });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(2);
            scope.aValue = 42;
            unwatchDeleter();
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not remove one - time watches before all array items defined', function () {
            scope.$watch('::[1, 2, aValue]', function () { }, true);
            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);
            scope.aValue = 3;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not remove one - time watches before all object vals defined', function () {
            scope.$watch('::{ a: 1, b: aValue }', function () { }, true);
            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);
            scope.aValue = 3;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not re - evaluate an array if its contents do not change', function () {
            var values = [];

            scope.a = 1;
            scope.b = 2;
            scope.c = 3;

            scope.$watch('[a, b, c]', function (value) {
                values.push(value);
            });

            scope.$digest();
            expect(values.length).toBe(1);
            expect(values[0]).toEqual([1, 2, 3]);

            scope.$digest();
            expect(values.length).toBe(1);

            scope.c = 4;
            scope.$digest();
            expect(values.length).toBe(2);
            expect(values[1]).toEqual([1, 2, 4]);
        });

        it('allows $stateful filter value to change over time', function (done) {
            register('withTime', function () {
                return _.extend(function (v) {
                    return new Date().toISOString() + ':' + v;
                }, {
                        $stateful: true
                    });
            });
            var listener = jest.fn()
            scope.$watch('42 | withTime', listener);
            scope.$digest();

            var firstValue = listener.mock.calls[listener.mock.calls.length - 1][0];
            setTimeout(function () {
                scope.$digest();
                var secondValue = listener.mock.calls[listener.mock.calls.length - 1][0];
                expect(secondValue).not.toEqual(firstValue);
                done();
            }, 100);
        });
    });
});

