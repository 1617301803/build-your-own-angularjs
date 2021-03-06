import _ from 'lodash';

function Export(expr) {
    this.expression = expr;
}

Export.prototype.log = function (title, value) {
    document.write(title + ':' + value + '<br>');
};

Export.prototype.toBe = function (value) {
    var result = this.expression === value;
    this.log('toBe', result);
};

Export.prototype.toEqual = function (value) {
    var result = _.isEqual(this.expression, value);
    this.log('toEqual', result);
};

Export.prototype.toBeDefined = function () {
    var result = !(this.expression === undefined);
    this.log('toBeDefined', result);
};

Export.prototype.toBeUndefined = function () {
    var result = (this.expression === undefined);
    this.log('toBeUndefined', result);
};

Export.prototype.toThrow = function () {
    var result = false;
    try {
        this.expression();
    } catch (e) {
        result = true;
    }
    finally {
        this.log('toThrow', result);
    }

}

export function expect(expr) {
    return new Export(expr);
}