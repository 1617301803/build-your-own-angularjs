import _ from 'lodash';

export function Scope() {
    this.$$watchers = [];
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
    let watcher = {
        warcFn: watchFn,
        listenerFn: listenerFn
    };

    this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function () {
    _.forEach(this.$$watchers, (watcher) => {
        watcher.listenerFn();
    });
};