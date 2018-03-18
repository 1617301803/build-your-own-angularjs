import _ from 'lodash';

function initWatchValue() { }

let n = 0;

export function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
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
    do {
        dirty = this.$$digestOnce();
        if (dirty && !(ttl--)) {
            throw '10 digest iterations reached';
        }
    } while (dirty);
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

Scope.prototype.$apply = function (expr) {
    try {
        this.$eval(expr);
    } finally {
        this.$digest();
    }
};