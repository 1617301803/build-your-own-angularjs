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
        } else if (this.ch === '\'' || this.ch === '"') {
            this.readString(this.ch);
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
        text: text
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

AST.prototype.constants = {
    'null': { type: AST.Literal, value: null },
    'true': { type: AST.Literal, value: true },
    'false': { type: AST.Literal, value: false }
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
    if (this.constants.hasOwnProperty(this.tokens[0].text)) {
        return this.constants[this.tokens[0].text];
    }
    return this.constant();
};

AST.prototype.constant = function () {
    return {
        type: AST.Literal,
        value: this.tokens[0].value
    };
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
        body: []
    };
    this.recurse(ast);

    return new Function(this.state.body.join(''));
};

ASTCompiler.prototype.recurse = function (ast) {
    switch (ast.type) {
        case AST.Program:
            this.state.body.push('return ', this.recurse(ast.body), ';');
            break;
        case AST.Literal:
            return this.escape(ast.value);
    }
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