import _ from 'lodash';
import './Angular';

function initWatchValue() { }

export function $RootScopeProvider() {
    var TTL = 10;

    this.digestTtl = function (value) {
        if (_.isNumber(value)) {
            TTL = value;
        }
        return TTL;
    };

    this.$get = ['$parse', function ($parse) {

        let n = 0;

        function Scope() {
            this.$$watchers = [];
            this.$$lastDirtyWatch = null;
            this.$$asyncQuene = [];
            this.$$applyAsyncQueue = [];
            this.$$applyAsyncId = null;
            this.$$postDigestQueue = [];
            this.$root = this;
            this.$$children = [];
            this.$$listeners = {};
            this.$$phase = null;
        }

        Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {

            watchFn = $parse(watchFn);

            if (watchFn.$$watchDelegate) {
                return watchFn.$$watchDelegate(this, listenerFn, valueEq, watchFn);
            }

            let watcher = {
                n: n++,
                watchFn: watchFn,
                listenerFn: listenerFn || (() => { }),
                valueEq: !!valueEq,
                last: initWatchValue
            };

            this.$$watchers.unshift(watcher);
            this.$root.$$lastDirtyWatch = null;

            return () => {
                const index = this.$$watchers.indexOf(watcher);
                if (index >= 0) {
                    this.$$watchers.splice(index, 1);
                    this.$root.$$lastDirtyWatch = null;
                }
            };
        };

        Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
            if (valueEq) {
                return _.isEqual(newValue, oldValue);
            } else {
                return newValue === oldValue ||
                    (typeof newValue === 'number' && typeof oldValue === 'number' &&
                        isNaN(newValue) && isNaN(newValue));
            }
        };

        Scope.prototype.$$everyScope = function (fn) {
            if (fn(this)) {
                return this.$$children.every((child) => {
                    return child.$$everyScope(fn);
                });
            } else {
                return false;
            }
        };

        Scope.prototype.$$digestOnce = function () {
            let dirty,
                continueLoop = true;

            this.$$everyScope((scope) => {
                let newValue, oldValue;
                _.forEachRight(scope.$$watchers, (watcher) => {
                    try {
                        if (watcher) {
                            newValue = watcher.watchFn(scope);
                            oldValue = watcher.last;
                            if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                                scope.$root.$$lastDirtyWatch = watcher;
                                watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                                watcher.listenerFn(newValue,
                                    (oldValue === initWatchValue ? newValue : oldValue),
                                    scope);
                                dirty = true;
                            } else if (scope.$root.$$lastDirtyWatch === watcher) {
                                continueLoop = false;
                                return false;
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                });
                return continueLoop;
            });
            return dirty;
        };

        Scope.prototype.$digest = function () {
            let ttl = TTL;
            let dirty;
            this.$root.$$lastDirtyWatch = null;
            this.$beginPhase('$digest');

            if (this.$root.$$applyAsyncId) {
                clearTimeout(this.$root.$$applyAsyncId);
                this.$$flushApplyAsync();
            }

            do {
                while (this.$$asyncQuene.length) {
                    try {
                        let asyncTask = this.$$asyncQuene.shift();
                        asyncTask.scope.$eval(asyncTask.expression);
                    } catch (e) {
                        console.error(e);
                    }
                }
                dirty = this.$$digestOnce();
                if ((dirty || this.$$asyncQuene.length) && !(ttl--)) {
                    this.$clearPhase();
                    throw '10 digest iterations reached';
                }
            } while (dirty || this.$$asyncQuene.length);
            this.$clearPhase();

            while (this.$$postDigestQueue.length) {
                try {
                    this.$$postDigestQueue.shift()();
                } catch (e) {
                    console.error(e);
                }
            }
        };

        Scope.prototype.$eval = function (expr, locals) {
            return $parse(expr)(this, locals);
        };

        Scope.prototype.$evalAsync = function (expr) {
            if (!this.$$phase && !this.$$asyncQuene.length) {
                setTimeout(() => {
                    if (this.$$asyncQuene.length) {
                        this.$root.$digest();
                    }
                }, 0);
            }
            this.$$asyncQuene.push({
                scope: this,
                expression: expr
            });
        };

        Scope.prototype.$apply = function (expr) {
            try {
                this.$beginPhase('$apply');
                return this.$eval(expr);
            } finally {
                this.$clearPhase();
                this.$root.$digest();
            }
        };

        Scope.prototype.$$flushApplyAsync = function () {
            while (this.$$applyAsyncQueue.length) {
                try {
                    this.$$applyAsyncQueue.shift()();
                } catch (e) {
                    console.error(e);
                }
            }
            this.$root.$$applyAsyncId = null;
        };

        Scope.prototype.$applyAsync = function (expr) {
            this.$$applyAsyncQueue.push(() => {
                this.$eval(expr);
            });
            if (this.$root.$$applyAsyncId === null) {
                this.$root.$$applyAsyncId = setTimeout(() => {
                    this.$apply(_.bind(this.$$flushApplyAsync, this));
                }, 0);
            }
        };

        Scope.prototype.$beginPhase = function (phase) {
            if (this.$$phase) {
                throw this.$$phase + ' already in progress';
            }
            this.$$phase = phase;
        };

        Scope.prototype.$clearPhase = function () {
            this.$$phase = null;
        };

        Scope.prototype.$$postDigest = function (fn) {
            this.$$postDigestQueue.push(fn);
        };

        Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
            let self = this,
                newValues = [],
                oldValues = [],
                changeReactionScheduled = false,
                firstRun = true;

            if (watchFns.length === 0) {
                let shouldCall = true;
                this.$evalAsync(() => {
                    if (shouldCall) {
                        listenerFn(newValues, newValues, this);
                    }
                });

                return () => {
                    shouldCall = false;
                };
            }

            function watchGroupListener() {
                if (firstRun) {
                    firstRun = false;
                    listenerFn(newValues, newValues, self);
                } else {
                    listenerFn(newValues, oldValues, self);
                }
                changeReactionScheduled = false;
            }
            let destoryFunctions = _.map(watchFns, (watchFn, i) => {
                return this.$watch(watchFn, (newValue, oldValue) => {
                    newValues[i] = newValue;
                    oldValues[i] = oldValue;
                    if (!changeReactionScheduled) {
                        changeReactionScheduled = true;
                        this.$evalAsync(watchGroupListener);
                    }
                });
            });

            return () => {
                _.forEach(destoryFunctions, (destoryFunction) => {
                    destoryFunction();
                });
            };
        };

        Scope.prototype.$new = function (isolated, parent) {
            let child;
            parent = parent || this;
            if (isolated) {
                child = new Scope();
                child.$root = parent.$root;
                child.$$asyncQuene = parent.$$asyncQuene;
                child.$$postDigestQueue = parent.$$postDigestQueue;
            } else {
                let ChildScope = function () { };
                ChildScope.prototype = this;
                child = new ChildScope();
            }
            parent.$$children.push(child);
            child.$$watchers = [];
            child.$$listeners = {};
            child.$$children = [];
            child.$parent = parent;
            return child;
        };

        Scope.prototype.$destroy = function () {
            this.$broadcast('$destroy');
            if (this.$parent) {
                let siblings = this.$parent.$$children;
                var indexOfThis = siblings.indexOf(this);
                if (indexOfThis >= 0) {
                    siblings.splice(indexOfThis, 1);
                }
            }
            this.$$watchers = null;
            this.$$listeners = {};
        };

        Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
            let newValue,
                oldValue,
                oldLength,
                veryOldValue,
                trackVeryOldValue = (listenerFn.length > 0),
                changeCount = 0,
                firstRun = true;

            watchFn = $parse(watchFn);

            let internalWatchFn = (scope) => {
                let newLength;
                newValue = watchFn(scope);

                if (_.isObject(newValue)) {
                    if (_.isArrayLike(newValue)) {
                        if (!_.isArray(oldValue)) {
                            changeCount++;
                            oldValue = [];
                        }
                        if (newValue.length !== oldValue.length) {
                            changeCount++;
                            oldValue.length = newValue.length;
                        }
                        _.forEach(newValue, (newItem, i) => {
                            let bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
                            if (!bothNaN && newItem !== oldValue[i]) {
                                changeCount++;
                                oldValue[i] = newItem;
                            }
                        });
                    } else {
                        if (!_.isObject(oldValue) || _.isArrayLike(oldValue)) {
                            changeCount++;
                            oldValue = {};
                            oldLength = 0;
                        }
                        newLength = 0;
                        _.forEach(newValue, (newVal, key) => {
                            newLength++;
                            if (oldValue.hasOwnProperty(key)) {
                                let bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
                                if (!bothNaN && newVal !== oldValue[key]) {
                                    changeCount++;
                                    oldValue[key] = newVal;
                                }
                            } else {
                                changeCount++;
                                oldLength++;
                                oldValue[key] = newVal;
                            }
                        });
                        if (oldLength > newLength) {
                            changeCount++;
                            _.forEach(oldValue, (oldVal, key) => {
                                if (!newValue.hasOwnProperty(key)) {
                                    oldLength--;
                                    delete oldValue[key];
                                }
                            });
                        }
                    }
                } else {
                    if (!this.$$areEqual(newValue, oldValue, false)) {
                        changeCount++;
                    }
                    oldValue = newValue;
                }


                return changeCount;
            };

            let internalListenerFn = () => {
                if (firstRun) {
                    listenerFn(newValue, newValue, this);
                    firstRun = false;
                } else {
                    listenerFn(newValue, veryOldValue, this);
                }

                if (trackVeryOldValue) {
                    veryOldValue = _.clone(newValue);
                }
            };

            return this.$watch(internalWatchFn, internalListenerFn);
        };

        Scope.prototype.$on = function (eventName, listener) {
            let listeners = this.$$listeners[eventName];
            if (!listeners) {
                this.$$listeners[eventName] = listeners = [];
            }
            listeners.push(listener);

            return () => {
                var index = listeners.indexOf(listener);
                if (index >= 0) {
                    listeners[index] = null;
                }
            };
        };

        Scope.prototype.$emit = function (eventName, ...additionalArgs) {
            let propagationStopped = false;
            let event = {
                name: eventName,
                targetScope: this,
                stopPropagation: function () {
                    propagationStopped = true;
                },
                preventDefault: function () {
                    event.defaultPrevented = true;
                }
            };
            let listenerArgs = [event].concat(additionalArgs);
            let scope = this;
            do {
                event.currentScope = scope;
                scope.$$fireEventOnScope(eventName, listenerArgs);
                scope = scope.$parent;
            } while (scope && !propagationStopped);
            return event;
        };

        Scope.prototype.$broadcast = function (eventName, ...additionalArgs) {
            let event = {
                name: eventName,
                targetScope: this,
                preventDefault: function () {
                    event.defaultPrevented = true;
                }
            };
            let listenerArgs = [event].concat(additionalArgs);
            this.$$everyScope((scope) => {
                event.currentScope = scope;
                scope.$$fireEventOnScope(eventName, listenerArgs);
                return true;
            });
            return event;
        };

        Scope.prototype.$$fireEventOnScope = function (eventName, listenerArgs) {
            let listeners = this.$$listeners[eventName] || [];
            let i = 0;
            while (i < listeners.length) {
                if (listeners[i] === null) {
                    listeners.splice(i, 1);
                } else {
                    try {
                        listeners[i].apply(null, listenerArgs);
                    } catch (e) {
                        console.error(e);
                    }
                    i++;
                }
            }
        };

        var $rootScope = new Scope();
        return $rootScope;
    }];
}