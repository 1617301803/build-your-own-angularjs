import _ from 'lodash';
var filters = {};

function register(name, factory) {
    if (_.isObject(name)) {
        return _.map(name, function (factory, name) {
            return register(name, factory);
        });
    } else {
        var filter = factory();
        filters[name] = filter;
        return filter;
    }
}

function filter(name) {
    return filters[name];
}

function $FilterProvider($provide) {

    this.register = function (name, factory) {
        if (_.isObject(name)) {
            return _.map(name, (factory, name) => {
                return this.register(name, factory);
            });
        } else {
            return $provide.factory(name + 'Filter', factory);
        }
    };

    this.$get = ['$injector', function ($injector) {
        return function filter(name) {
            return $injector.get(name + 'Filter');
        };
    }];
}
$FilterProvider.$inject = ['$provide']

export { register, filter, $FilterProvider };