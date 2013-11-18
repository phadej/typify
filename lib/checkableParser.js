"use strict";

var A = require("./aparser.js");
var cons = require("./checkableConstructors.js");

var identifierRe = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
var numberRe = /^[0-9]+$/;

function isIdentifier(token) {
  return identifierRe.test(token);
}

function isNumber(token) {
  return numberRe.test(token);
}

var altP;

function parensP(p) {
  return A.lift(A.token("("), p, A.token(")"), function(a, b, c) {
    return b;
  });
}

var identifierP = A.satisfying(isIdentifier);

var numberP = A.lift(A.satisfying(isNumber), function (x) {
  return cons.number(parseFloat(x));
});

var literalP = A.or(numberP);

var anyP = A.lift(A.token("*"), function () {
  return cons.any;
});

var varP = A.lift(identifierP, cons.variable);

var termP = A.or(anyP, literalP, varP, parensP(A.delay(function () { return altP; })));

var optP = A.lift(termP, A.optional(A.token("?")), function (term, opt) {
  if (opt === "?" && term.type !== "opt" && term.type !== "any") {
    return cons.opt(term);
  } else {
    return term;
  }
});

var polyP1 = A.lift(identifierP, A.some(optP), cons.poly);

var polyP = A.or(polyP1, optP);

var andP = A.lift(A.sepBy(polyP, "&"), cons.and);

altP = A.lift(A.sepBy(andP, "|"), cons.alt);

var checkableP = altP;

var checkableTypeCheckRe = /^([a-zA-Z_][a-zA-Z0-9_]*||[0-9]+|\*|\?|\||&|\(|\)|\s+)*$/;
var checkableTypeTokenRe = /([a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|\*|\?|\||&|\(|\))/g;

function parseCheckableType(type) {
   if (!checkableTypeCheckRe.test(type)) { throw new TypeError("invalid checkable type: " + type); }
  var tokens = type.match(checkableTypeTokenRe);
  var parsed = A.parse(checkableP, tokens);
   if (parsed === undefined) { throw new TypeError("invalid checkable type: " + type); }
   return parsed;
}

module.exports = {
  identifierP: identifierP,
  checkableP: checkableP,
  polyP: polyP,
  parse: parseCheckableType,
};