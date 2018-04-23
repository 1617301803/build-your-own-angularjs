'use strict';
import _ from 'lodash';

let ESCAPES = {
    'n': '\n', 'f': '\f', 'r': '\r', 't': '\t',
    'v': '\v', '\'': '\'', '"': '"'
};

export function parse(expr) {
    let lexer = new Lexer();
    let parser = new Parser(lexer);
    return parser.parse(expr);
}

//region -- Lexer --

function Lexer() {

}

Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch) ||
            (this.ch === '.' && this.isNumber(this.peek()))) {
            this.readNumber();
        } else if (this.is('\'"')) {
            this.readString(this.ch);
        } else if (this.is('[],{}:.()')) {
            this.tokens.push({
                text: this.ch
            });
            this.index++;
        } else if (this.isIdent(this.ch)) {
            this.readIdent();
        } else if (this.isWhitespace(this.ch)) {
            this.index++;
        } else {
            throw 'Unexpected next character: ' + this.ch;
        }
    }

    return this.tokens;
};

Lexer.prototype.is = function (chs) {
    return chs.indexOf(this.ch) >= 0;
};

Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
};

Lexer.prototype.readNumber = function () {
    let hasFloatingPoint = false;
    let number = '';
    while (this.index < this.text.length) {
        let ch = this.text.charAt(this.index).toLowerCase();
        if (ch === '.') {
            if (hasFloatingPoint) {
                throw 'Invalid exponent';
            } else {
                hasFloatingPoint = true;
            }
        }
        if (ch === '.' || this.isNumber(ch)) {
            number += ch;
        } else {
            let nextCh = this.peek();
            let prevCh = number.charAt(number.length - 1);
            if (ch === 'e' && this.isExpOperator(nextCh) && nextCh) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                nextCh && this.isNumber(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                (!nextCh || !this.isNumber(nextCh))) {
                throw 'Invalid exponent';
            } else if (ch === 'e' && this.isExpOperator(nextCh) && !nextCh) {
                throw 'Invalid exponent';
            } else {
                break;
            }
        }
        this.index++;
    }
    this.tokens.push({
        text: number,
        value: +number
    });
};

Lexer.prototype.peek = function () {
    return this.index < this.text.length - 1 ?
        this.text.charAt(this.index + 1) :
        false;
};

Lexer.prototype.isExpOperator = function (ch) {
    return ch === '-' || ch === '+' || this.isNumber(ch);
};

Lexer.prototype.readString = function (quoat) {
    this.index++;
    let string = '';
    let escape = false;
    while (this.index < this.text.length) {
        let ch = this.text.charAt(this.index);
        if (escape) {
            if (ch === 'u') {
                let hex = this.text.substring(this.index + 1, this.index + 5);
                if (!hex.match(/[\da-f]{4}/i)) {
                    throw 'Invalid unicode escape';
                }
                this.index += 4;
                string += String.fromCharCode(parseInt(hex, 16));
            } else {
                let replacement = ESCAPES[ch];
                if (replacement) {
                    string += replacement;
                } else {
                    string += ch;
                }
            }
            escape = false;
        } else if (ch === quoat) {
            this.index++;
            this.tokens.push({
                text: string,
                value: string
            });
            return;
        } else if (ch === '\\') {
            escape = true;
        } else {
            string += ch;
        }
        this.index++;
    }
    throw 'Unmateched quoat';
};

Lexer.prototype.isIdent = function (ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
        ch === '_' || ch === '$';
};

Lexer.prototype.readIdent = function () {
    let text = '';
    while (this.index < this.text.length) {
        let ch = this.text.charAt(this.index);
        if (this.isIdent(ch) || this.isNumber(ch)) {
            text += ch;
        } else {
            break;
        }
        this.index++;
    }

    let token = {
        text: text,
        identifier: true
    };
    this.tokens.push(token);
};

Lexer.prototype.isWhitespace = function (ch) {
    return ch === ' ' || ch === '\r' || ch === '\t' ||
        ch === '\n' || ch === '\v' || ch === '\u00A0';
};

//endregion

//region -- AST --

function AST(lexer) {
    this.lexer = lexer;
}

AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identifier = 'Identifier';
AST.ThisExpression = 'ThisExpression';
AST.MemberExpression = 'MemberExpression';
AST.CallExpression = 'CallExpression';

AST.prototype.constants = {
    'null': { type: AST.Literal, value: null },
    'true': { type: AST.Literal, value: true },
    'false': { type: AST.Literal, value: false },
    'this': { type: AST.ThisExpression }
};

AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
};

AST.prototype.program = function () {
    return {
        type: AST.Program,
        body: this.primary()
    };
};

AST.prototype.primary = function () {
    let primary;
    if (this.expect('[')) {
        primary = this.arrayDeclaration();
    } else if (this.expect('{')) {
        primary = this.object();
    } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
        primary = this.constants[this.consume().text];
    } else if (this.peek().identifier) {
        primary = this.identifier();
    } else {
        primary = this.constant();
    }
    let next;
    while ((next = this.expect('.', '[', '('))) {
        if (next.text === '[') {
            primary = {
                type: AST.MemberExpression,
                object: primary,
                property: this.primary(),
                computed: true
            };
            this.consume(']');
        } else if (next.text === '.') {
            primary = {
                type: AST.MemberExpression,
                object: primary,
                property: this.identifier(),
                computed: false
            };
        } else if (next.text === '(') {
            primary = {
                type: AST.CallExpression,
                callee: primary,
                arguments: this.parseArguments()
            };
            this.consume(')');
        }
    }

    return primary;
};

AST.prototype.peek = function (e1, e2, e3, e4) {
    if (this.tokens.length > 0) {
        let text = this.tokens[0].text;
        if (text === e1 || text === e2 || text === e3 || text === e4 ||
            (!e1 && !e2 && !e3 && !e4)) {
            return this.tokens[0];
        }
    }
};

AST.prototype.expect = function (e1, e2, e3, e4) {
    let token = this.peek(e1, e2, e3, e4);
    if (token) {
        return this.tokens.shift();
    }
};

AST.prototype.consume = function (e) {
    let token = this.expect(e);
    if (!token) {
        throw 'Unexpected. Expecting: ' + e;
    }
    return token;
};

AST.prototype.constant = function () {
    return {
        type: AST.Literal,
        value: this.consume().value
    };
};

AST.prototype.identifier = function () {
    return {
        type: AST.Identifier,
        name: this.consume().text
    };
};

AST.prototype.arrayDeclaration = function () {
    let elements = [];
    if (!this.peek(']')) {
        do {
            if (this.peek(']')) {
                break;
            }
            elements.push(this.primary());
        } while (this.expect(','));
    }
    this.consume(']');
    return {
        type: AST.ArrayExpression,
        elements: elements
    };
};

AST.prototype.object = function () {
    let properties = [];
    if (!this.peek('}')) {
        do {
            let property = {
                type: AST.Property
            };
            if (this.peek().identifier) {
                property.key = this.identifier();
            } else {
                property.key = this.constant();
            }
            this.consume(':');
            property.value = this.primary();
            properties.push(property);
        } while (this.expect(','));
    }
    this.consume('}');
    return {
        type: AST.ObjectExpression,
        properties: properties
    };
};

AST.prototype.parseArguments = function () {
    let args = [];
    if (!this.peek(')')) {
        do {
            args.push(this.primary());
        } while (this.expect(','))
    }
    return args;
};

//endregion

//region -- ASTCompiler --

function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}

ASTCompiler.prototype.stringEscapeRegex = /[^ a-zA-Z0-9]/g;

ASTCompiler.prototype.compile = function (text) {
    let ast = this.astBuilder.ast(text);
    this.state = {
        body: [], nextId: 0, vars: []
    };
    this.recurse(ast);

    return new Function('s', 'l',
        (this.state.vars.length ?
            `var ${this.state.vars.join(',')};` :
            ''
        ) + this.state.body.join(''));
};

ASTCompiler.prototype.recurse = function (ast) {
    /* eslint-disable */
    let intoId;
    switch (ast.type) {
        case AST.Program:
            this.state.body.push('return ', this.recurse(ast.body), ';');
            break;
        case AST.Literal:
            return this.escape(ast.value);
        case AST.ArrayExpression:
            var elements = _.map(ast.elements, (element) => {
                return this.recurse(element);
            });
            return '[' + elements.join(',') + ']';
        case AST.ObjectExpression:
            var properties = _.map(ast.properties, (property) => {
                let key = property.key.type === AST.Identifier ?
                    property.key.name :
                    this.escape(property.key.value);
                let value = this.recurse(property.value);
                return key + ':' + value;
            });
            return '{' + properties.join(',') + '}';
        case AST.Identifier:
            intoId = this.nextId();
            this.if_(this.getHasOwnProperty('l', ast.name),
                this.assign(intoId, this.nonComputedMember('l', ast.name)));
            this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',
                this.assign(intoId, this.nonComputedMember('s', ast.name)));
            return intoId;
        case AST.ThisExpression:
            return 's';
        case AST.MemberExpression:
            intoId = this.nextId();
            var left = this.recurse(ast.object);
            if (ast.computed) {
                let right = this.recurse(ast.property);
                this.if_(left,
                    this.assign(intoId, this.computedMember(left, right)));
            } else {
                this.if_(left,
                    this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
            }
            return intoId;
        case AST.CallExpression:
            let callee = this.recurse(ast.callee);
            let args = _.map(ast.arguments, (arg) => {
                return this.recurse(arg);
            });
            return `${callee}&&${callee}(${args.join(',')})`;
    }

    /* eslint-enable */
};

ASTCompiler.prototype.escape = function (value) {
    if (_.isString(value)) {
        return '\'' +
            value.replace(this.stringEscapeRegex, this.stringEscapeFn) +
            '\'';
    } else if (_.isNull(value)) {
        return 'null';
    } else {
        return value;
    }
};

ASTCompiler.prototype.stringEscapeFn = function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
};

ASTCompiler.prototype.computedMember = function (left, right) {
    return `(${left})[${right}]`;
};

ASTCompiler.prototype.nonComputedMember = function (left, right) {
    return `(${left}).${right}`;
};

ASTCompiler.prototype.if_ = function (test, consequent) {
    this.state.body.push('if(', test, '){', consequent, '}');
};

ASTCompiler.prototype.assign = function (id, value) {
    return `${id} = ${value};`;
};

ASTCompiler.prototype.nextId = function () {
    let id = `v${this.state.nextId++}`;
    this.state.vars.push(id);
    return id;
};

ASTCompiler.prototype.not = function (e) {
    return `!(${e})`;
};

ASTCompiler.prototype.getHasOwnProperty = function (object, property) {
    return `${object}&&(${this.escape(property)} in ${object})`;
};

//endregion

//region -- Parser --

function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);
};

//endregion