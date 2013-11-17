"use strict";

var A = require("./aparser.js");

var identifierRe = /^[a-zA-Z]+$/;

function isIdentifier(token) {
  return identifierRe.test(token);
}

var altP;

function parensP(p) {
  return A.lift(A.token("("), p, A.token(")"), function(a, b, c) {
    return b;
  });
}

var identifierP = A.satisfying(isIdentifier);

var anyP = A.lift(A.token("*"), function () {
  return {
    type: "any",
  };
});

var varP = A.lift(identifierP, function (name) {
  return {
    type: "var",
    name: name,
  };
});

var termP = A.or(anyP, varP, parensP(A.delay(function () { return altP; })));

var optP = A.lift(termP, A.optional(A.token("?")), function (term, opt) {
  if (opt === "?" && term.type !== "opt" && term.type !== "any") {
     return {
      type: "opt",
      term: term,
    };
  } else {
    return term;
  }
});

var polyP1 = A.lift(identifierP, A.some(optP), function (name, args) {
  return {
    type: "poly",
    name: name,
    args: args,
  };
});

var polyP = A.or(polyP1, optP);

var andP = A.lift(A.sepBy(polyP, "&"), function (options) {
  return options.reduce(function (a, b) {
    var options;
    if (a.type === "and") {
      if (b.type === "and") {
        options = a.options.concat(b.options);
      } else {
        options = a.options.concat([b]);
      }
    } else {
      if (b.type === "and") {
        options = [a].concat(b.options);
      } else {
        options = [a, b];
      }
    }

    return {
      type: "and",
      options: options,
    };
  });
});

altP = A.lift(A.sepBy(andP, "|"), function (options) {
  return options.reduce(function (a, b) {
    var options;
    if (a.type === "alt") {
      if (b.type === "alt") {
        options = a.options.concat(b.options);
      } else {
        options = a.options.concat([b]);
      }
    } else {
      if (b.type === "alt") {
        options = [a].concat(b.options);
      } else {
        options = [a, b];
      }
    }

    return {
      type: "alt",
      options: options,
    };
  });
});

var checkableP = altP;

var checkableTypeCheckRe = /^([a-zA-Z]+|\*|\?|\||&|\(|\)|\s+)*$/;
var checkableTypeTokenRe = /([a-zA-Z]+|\*|\?|\||&|\(|\))/g;

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