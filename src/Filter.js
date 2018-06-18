import _ from 'lodash';
import { filterFilter } from './Filter_Filter';

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

    this.register('filter', filterFilter);
}
$FilterProvider.$inject = ['$provide'];

export { $FilterProvider };