import _ from 'lodash';

function initWatchValue() { }

let n = 0;

export function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQuene = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$phase = null;
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    let watcher = {
        n: n++,
        watchFn: watchFn,
        listenerFn: listenerFn || (() => { }),
        valueEq: !!valueEq,
        last: initWatchValue
    };

    this.$$watchers.push(watcher);
    this.$$lastDirtyWatch = null;
};

Scope.prototype.$$digestOnce = function () {
    let newValue, oldValue, valueEq, dirty;
    _.forEach(this.$$watchers, (watcher) => {
        newValue = watcher.watchFn(this);
        oldValue = watcher.last;
        valueEq = watcher.valueEq;
        if (!this.$$areEqual(newValue, oldValue, valueEq)) {
            this.$$lastDirtyWatch = watcher;
            watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
            watcher.listenerFn(newValue,
                (oldValue === initWatchValue ? newValue : oldValue),
                this);
            dirty = true;
        } else if (this.$$lastDirtyWatch === watcher) {
            return false;
        }
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    let ttl = 10;
    let dirty;
    this.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');

    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$asyncQuene.length) {
            let asyncTask = this.$$asyncQuene.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }
        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQuene.length) && !(ttl--)) {
            this.$clearPhase();
            throw '10 digest iterations reached';
        }
    } while (dirty || this.$$asyncQuene.length);
    this.$clearPhase();
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

Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$evalAsync = function (expr) {
    if (!this.$$phase && !this.$$asyncQuene.length) {
        setTimeout(() => {
            if (this.$$asyncQuene.length) {
                this.$digest();
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
        this.$digest();
    }
};

Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        this.$$applyAsyncQueue.shift()();
    }
    this.$$applyAsyncId = null;
};

Scope.prototype.$applyAsync = function (expr) {
    this.$$applyAsyncQueue.push(() => {
        this.$eval(expr);
    });
    if (this.$$applyAsyncId === null) {
        this.$$applyAsyncId = setTimeout(() => {
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