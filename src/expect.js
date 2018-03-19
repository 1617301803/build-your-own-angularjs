import _ from 'lodash';
function Export(expr) {
    this.expression = expr;
}

Export.prototype.toBe = function (value) {
    console.log(_.isEqual(this.expression, value));
};

export function expect(expr) {
    return new Export(expr);
}