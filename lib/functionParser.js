"use strict";

var A = require("./aparser.js");
var identifierP = require("./checkableParser").identifierP;
var polyP = require("./checkableParser").polyP;
var checkableP = require("./checkableParser").checkableP;

var nameP = A.optional(A.lift(identifierP, A.token("::"), function (identifier, sep) {
  return identifier;
}), "");

var actionP = A.lift(nameP, A.token("->"), checkableP, function (name, arrow, result) {
  return {
    name: name,
    context: {},
    params: [],
    rest: undefined,
    result: result,
  };
});

var typesetP = A.sepBy(polyP, "|");

var contextDefP = A.lift(identifierP, A.token(":"), typesetP, function (name, sep, typeset) {
  // console.log("contextDefP", name, typeset);
  return {
    name: name,
    typeset: typeset,
  };
});

var contextP = A.optional(A.lift(A.sepBy(contextDefP, ","), A.token("=>"), function (defs, arrow) {
  return defs.reduce(function (context, def) {
    context[def.name] = def.typeset;
    return context;
  }, {});
}), {});

var paramsP = A.many(A.lift(checkableP, A.token("->"), function (param, arrow) {
  return param;
}));

var restP = A.optional(A.lift(A.optional(checkableP), A.token("..."), A.token("->"), function (type, ellipsis, arrow) {
  // console.log("restP", type, ellipsis, arrow);
  return type || { type: "any" };
}));

var functionTypeP1 = A.lift(nameP, contextP, paramsP, restP, checkableP, function (name, context, params, rest, result) {
  // console.log("functionTypeP1", name, context, params, rest, result);
  return {
    name: name,
    context: context,
    params: params,
    rest: rest,
    result: result,
  };
});

var functionTypeP = A.or(actionP, functionTypeP1);

module.exports = {
  functionP: functionTypeP,
};
