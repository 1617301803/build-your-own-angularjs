'use strict';

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
        if (this.isNumber(this.ch)) {
            this.readNumber();
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
    let number = '';
    while (this.index < this.text.length) {
        let ch = this.text.charAt(this.index);
        if (this.isNumber(ch)) {
            number += ch;
        } else {
            break;
        }
        this.index++;
    }
    this.tokens.push({
        text: number,
        value: +number
    });
};

//endregion

//region -- AST --

function AST(lexer) {
    this.lexer = lexer;
}

AST.Program = 'Program';
AST.Literal = 'Literal';

AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
};

AST.prototype.program = function () {
    return {
        type: AST.Program,
        body: this.constant()
    };
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
            return ast.value;
    }
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