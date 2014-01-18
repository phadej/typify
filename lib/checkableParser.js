"use strict";

var A = require("./aparser.js");
var cons = require("./checkableConstructors.js");

var identifierRe = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
var numberRe = /^[0-9]+$/;
var stringRe = /^('[^']*'|"[^"]*")$/;

// :: string -> boolean
function isIdentifier(token) {
  return identifierRe.test(token);
}

// :: string -> boolean
function isNumber(token) {
  return numberRe.test(token);
}

// :: string -> boolean
function isString(token) {
  return stringRe.test(token);
}

var altP;

// :: fn|Thunk -> fn
function parensP(p) {
  return A.lift(A.token("("), p, A.token(")"), function(a, b, c) {
    return b;
  });
}

var identifierP = A.satisfying(isIdentifier);

var numberP = A.lift(A.satisfying(isNumber), function (x) {
  return cons.number(parseFloat(x));
});

var stringP = A.lift(A.satisfying(isString), function (x) {
  x = x.substr(1, x.length - 2);
  return cons.string(x);
});

var literalP = A.or(numberP, stringP);

var anyP = A.lift(A.token("*"), function () {
  return cons.any;
});

var varP = A.lift(identifierP, cons.variable);

var emptyRecordP = A.lift(A.token("{"), A.token("}"), function () {
  return cons.record({});
});

var pairP = A.lift(identifierP, A.token(":"), A.delay(function () { return altP; }), function (k, c, v) {
  return {
    ident: k,
    value: v,
  };
});

var nonEmptyRecordP = A.lift(A.token("{"), A.sepBy(pairP, ","), A.token("}"), function (o, ps, c) {
  var obj = {};
  ps.forEach(function (p) {
    obj[p.ident] = p.value;
  });
  return cons.record(obj);
});

var recordP = A.or(emptyRecordP, nonEmptyRecordP);

var termP = A.or(anyP, literalP, varP, recordP, parensP(A.delay(function () { return altP; })));

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

var checkableTypeCheckRe = /^([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|:|,|\{|\}|\*|\?|\||&|\(|\)|\s+)*$/;
var checkableTypeTokenRe = /([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|:|,|\{|\}|\*|\?|\||&|\(|\))/g;

// :: string -> checkable
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
