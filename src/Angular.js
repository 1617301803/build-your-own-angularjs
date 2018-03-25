import _ from 'lodash';

_.mixin({
    isArrayLike: function (obj) {
        if (_.isNull(obj) || _.isUndefined(obj)) {
            return false;
        }
        let length = obj.length;
        return length === 0 ||
            (_.isNumber(length) && length > 0 && (length - 1) in obj);
    }
});