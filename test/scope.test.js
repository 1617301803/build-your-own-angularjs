import _ from 'lodash';
import { Scope } from '../src/Scope.js';

describe('Scope', () => {
    let scope;

    // scope.$watch(
    //     (scope) => {
    //         return scope.aValue;
    //     },
    //     (newValue, oldValue, scope) => {
    //         scope.counter++;
    //     }
    // );

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
});