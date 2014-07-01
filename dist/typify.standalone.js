!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jsc=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var utils = require("./utils.js");

// typify: instance Thunk

// Thunk, for the lazy-evaluation and recursive parser.
// :: fn -> undefined
function Thunk(f) {
  this.thunk = f;
  this.forced = false;
  this.value = undefined;
}

// :: any -> Thunk
function delay(f) {
  return new Thunk(f);
}

// :: any -> *
function force(thunk) {
  if (thunk instanceof Thunk) {
    if (!thunk.forced) {
      thunk.value = thunk.thunk();
      thunk.forced = true;
    }
    return thunk.value;
  } else {
    return thunk;
  }
}

// :: fn -> array string -> *
function parse(p, tokens) {
  var res = p(tokens, 0);
  // console.log("parse", res, tokens, tokens.length);
  if (res !== undefined && res[1] >= tokens.length) {
    return res[0];
  } else {
    return undefined;
  }
}

// :: array string -> nat -> (tuple undefined idx)?
function eof(tokens, idx) {
  // console.log("eof", tokens, idx);
  if (idx < tokens.length) {
    return undefined;
  } else {
    return [undefined, idx];
  }
}

// :: string -> fn
function token(tok) {
  // :: array string -> nat -> (tuple string nat)?
  return function (tokens, idx) {
    // console.log("token", tokens, idx, tok);
    if (idx >= tokens.length) { return undefined; }
    if (tokens[idx] === tok) {
      return [tok, idx+1];
    } else {
      return undefined;
    }
  };
}

// :: fn -> fn
function satisfying(predicate) {
  // :: array string -> nat -> (tuple string nat)?
  return function (tokens, idx) {
    // console.log("satisfying", predicate.name || predicate, tokens, idx);
    if (idx >= tokens.length) { return undefined; }
    if (predicate(tokens[idx])) {
      return [tokens[idx], idx+1];
    } else {
      return undefined;
    }
  };
}

// :: -> fn
function any() {
  // :: array string -> nat -> (tuple string nat)?
  return function (tokens, idx) {
    if (idx < tokens.length) {
      return [tokens[idx], idx+1];
    } else {
      return undefined;
    }
  };
}

// :: * -> fn
function pure(x) {
  // :: array string -> nat -> tuple * nat
  return function (tokens, idx) {
    return [x, idx];
  };
}

// :: fn... -> fn
function or() {
  var args = utils.slice(arguments);
  var len = args.length;
  // :: array string -> nat -> (tuple * nat)?
  return function (tokens, idx) {
    for (var i = 0; i < len; i++) {
      var res = force(args[i])(tokens, idx);
      if (res !== undefined) { return res; }
    }
    return undefined;
  };
}

// :: fn | Thunk ... -> fn
function lift() {
  var len = arguments.length - 1;
  var f = arguments[len];
  var args = utils.slice(arguments, 0, -1);
  // :: array string -> nat -> (tuple * nat)?
  return function(tokens, idx) {
    var resargs = new Array(len);
    for (var i = 0; i < len; i++) {
      var res = force(args[i])(tokens, idx);
      // console.log("lift argument:", res, force(args[i]));
      if (res === undefined) { return undefined; }
      resargs[i] = res[0];
      idx = res[1];
    }
    // console.log("lift value", f.apply(undefined, resargs), idx);
    return [f.apply(undefined, resargs), idx];
  };
}

// :: array -> * -> array string -> nat -> tuple array nat
function manyLoop(res, a, tokens, idx) {
  while (true) {
    var aq = a(tokens, idx);
    if (aq === undefined) { return [res, idx]; }
    res.push(aq[0]);
    idx = aq[1];
  }
}

// :: fn -> fn
function some(a) {
  // :: array string -> nat -> (tuple array nat)?
  return function (tokens, idx) {
    a = force(a);
    var res = [];
    var ap = a(tokens, idx);
    if (ap === undefined) { return undefined; }
    res.push(ap[0]);
    idx = ap[1];
    return manyLoop(res, a, tokens, idx);
  };
}

// :: fn -> fn
function many(a) {
  // :: array string -> nat -> tuple array nat
  return function (tokens, idx) {
    a = force(a);
    var res = [];
    return manyLoop(res, a, tokens, idx);
  };
}

// :: fn -> string -> fn
function sepBy(a, sep) {
  // :: array string -> nat -> (tuple array nat)?
  return function (tokens, idx) {
    a = force(a);
    var res = [];
    var ap = a(tokens, idx);
    if (ap === undefined) { return undefined; }
    res.push(ap[0]);
    idx = ap[1];
    while (true) {
      if (tokens[idx] !== sep) { return [res, idx]; }
      idx += 1;
      var aq = a(tokens, idx);
      if (aq === undefined) { return [res, idx]; }
      res.push(aq[0]);
      idx = aq[1];
    }
  };
}

// :: fn -> * -> fn
function optional(p, def) {
  // :: array string -> nat -> (tuple * nat)?
  return function (tokens, idx) {
    var res = force(p)(tokens, idx);
    if (res === undefined) {
      return [def, idx];
    } else {
      return res;
    }
  };
}

module.exports = {
  parse: parse,
  pure: pure,
  or: or,
  lift: lift,
  many: many,
  some: some,
  sepBy: sepBy,
  eof: eof,
  token: token,
  any: any,
  satisfying: satisfying,
  optional: optional,
  delay: delay,
};

},{"./utils.js":10}],2:[function(require,module,exports){
"use strict";

var p = require("./predicates.js");
var utils = require("./utils.js");

module.exports = {
  "number": p.isNumber,
  "integer": p.isInteger,
  "nat": function (val) {
    return p.isInteger(val) && p.isNonNegative(val);
  },
  "positive": function (val, valueCheck) {
    return p.isPositive(val) && (!valueCheck || valueCheck(val));
  },
  "nonnegative": function (val, valueCheck) {
    return p.isNonNegative(val) && (!valueCheck || valueCheck(val));
  },
  "finite": function (val, valueCheck) {
    return p.isFinite(val) && (!valueCheck || valueCheck(val));
  },
  "boolean": p.isBoolean,
  "string": p.isString,
  "date": p.isDate,
  "regexp": p.isRegExp,
  "function": p.isFunction,
  "fn": p.isFunction,
  "arguments": p.isArguments,
  "any": p.constTrue,
  "array": function (arr, valueCheck) {
    return p.isArray(arr) && (!valueCheck || utils.every(arr, valueCheck));
  },
  "map": function (map, valueCheck) {
    return (p.isObject(map) && !p.isArray(map)) && (!valueCheck || utils.every(utils.values(map), valueCheck));
  },
  "tuple": function (v) {
    if (!Array.isArray(v)) { return false; }
    var args = utils.slice(arguments, 1);
    if (args.length !== v.length) { return false; }
    for (var i = 0; i < args.length; i++) {
      if (!args[i](v[i])) {
        return false;
      }
    }
    return true;
  },
};

},{"./predicates.js":7,"./utils.js":10}],3:[function(require,module,exports){
"use strict";

var utils = require("./utils.js");
var p = require("./predicates.js");

// Forward declaration
var compileCheckableTypeRecursive;

// :: Environment -> map (array checkable) -> array string -> checkableAlt | checkableAnd -> fn
function compileAndAlt(environment, context, recNames, parsed, operator) {
  var cs = utils.map(parsed.options, compileCheckableTypeRecursive.bind(undefined, environment, context, recNames));
  // compiledOptAlt :: map fn -> fn -> any -> fn... -> boolean
  operator = parsed.type === "and" ? "every" : "some";
  return function (recChecks, varCheck, arg) {
    return cs[operator](function (c) {
      return c(recChecks, varCheck, arg);
    });
  };
}

// :: Environment -> map (array checkable) -> array string -> checkableVar -> fn
function compileVar(environment, context, recNames, parsed) {
  if (utils.has(context, parsed.name)) {
    // compiledContext :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      // console.log("varcheck", varCheck, arg);
      return varCheck(parsed.name, arg);
    };
  } else if (environment.has(parsed.name)) {
    var check = environment.get(parsed.name);
    // compiledEnv :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck) {
      var args = utils.slice(arguments, 2);
      return check.apply(undefined, args);
    };
  } else if (recNames && utils.contains(recNames, parsed.name)) {
    // compiledRec :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      return recChecks[parsed.name](recChecks, varCheck, arg);
    };
  } else {
    throw new Error("unknown type: " + parsed.name);
  }
}

// :: Environment -> map (array checkable) -> array string -> checkablePoly -> fn
function compilePoly(environment, context, recNames, parsed) {
  var args = utils.map(parsed.args, compileCheckableTypeRecursive.bind(undefined, environment, context, recNames));
  if (utils.has(context, parsed.name)) {
    // compiledPoly :: map fn -> fn -> any -> fn... -> boolean
    return function compiledPolyEnv(recChecks, varCheck, arg) {
      var argsChecks = args.map(function (argCheck) {
        return argCheck.bind(undefined, recChecks, varCheck);
      });
      return varCheck.apply(undefined, [parsed.name, arg].concat(argsChecks));
    };
  } else if (environment.has(parsed.name)) {
    var polyCheck = environment.get(parsed.name);
    // compiledPoly :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      var argsChecks = args.map(function (argCheck) {
        return argCheck.bind(undefined, recChecks, varCheck);
      });
      return polyCheck.apply(undefined, [arg].concat(argsChecks));
    };
  } else {
    throw new Error("unknown type: " + parsed.name);
  }
}

// :: Environment -> map (array checkable) -> array string -> checkableOpt -> fn
function compileOpt(environment, context, recNames, parsed) {
  var c = compileCheckableTypeRecursive(environment, context, recNames, parsed.term);
  // compiledOpt :: map fn -> fn -> any -> fn... -> boolean
  return function (recChecks, varCheck, arg) {
    return arg === undefined || c(recChecks, varCheck, arg);
  };
}

// :: Environment -> map (array checkable) -> array string -> checkableLiteral -> fn
function compileLiteral(environment, context, recNames, parsed) {
  if (parsed.value !== parsed.value) {
    // NaN
    // compiledNaN :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      return arg !== arg;
    };
  } else {
    // compiledLiteral :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      return arg === parsed.value;
    };
  }
}

// :: Environment -> map (array checkable) -> array string -> checkableRecord -> fn
function compileRecord(environment, context, recNames, parsed) {
  var fields = {};
  for (var name in parsed.fields) {
    fields[name] = compileCheckableTypeRecursive(environment, context, recNames, parsed.fields[name]);
  }
  // compiledRecord : map fn -> fn -> any -> fn... -> boolean
  return function (recChecks, varCheck, arg) {
    if (!p.isObject(arg)) {
      return false;
    }

    for (var fieldName in fields) {
      if (!fields[fieldName](recChecks, varCheck, arg[fieldName])) {
        return false;
      }
    }

    return true;
  };
}

// :: Environment -> map (array checkable) -> array string -> checkableUser -> fn
function compileUser(environment, context, recNames, parsed) {
  // compiledUser :: map fn -> fn -> any -> fn... -> boolean
  return function (recChecks, varCheck, arg) {
    return parsed.predicate(arg);
  };
}

// :: Environment -> map (array checkable) -> array string -> checkable -> fn
function compileCheckableTypeRecursive(environment, context, recNames, parsed) {
  switch (parsed.type) {
    case "var": return compileVar(environment, context, recNames, parsed);
    case "literal": return compileLiteral(environment, context, recNames, parsed);
    case "poly": return compilePoly(environment, context, recNames, parsed);
    case "any": return p.constTrue;
    case "opt": return compileOpt(environment, context, recNames, parsed);
    case "alt": return compileAndAlt(environment, context, recNames, parsed);
    case "and": return compileAndAlt(environment, context, recNames, parsed);
    case "record": return compileRecord(environment, context, recNames, parsed);
    case "user": return compileUser(environment, context, recNames, parsed);
  }
}

// :: Environment -> map (array checkable) -> checkable -> fn
function compileCheckableType(environment, context, parsed) {
  return compileCheckableTypeRecursive(environment, context, [], parsed).bind(undefined, {});
}

module.exports = {
  compile: compileCheckableType,
  compileRecursive: compileCheckableTypeRecursive,
  compileRecord: compileRecord,
};

},{"./predicates.js":7,"./utils.js":10}],4:[function(require,module,exports){
"use strict";

var assert = require("assert");

var any = { type: "any" };

/*
  typify: adt checkable
    checkableAny:     { type: 'any' }
    checkableLiteral: { type: 'literal', value: string|number|boolean|null|undefined|nan }
    checkableVar:     { type: 'var', name: string }
    checkableRecord:  { type: 'record', fields: map checkable }
    checkablePoly:    { type: 'poly', name: string, args: array checkable }
    checkableAlt:     { type: 'alt', options: array checkable }
    checkableAnd:     { type: 'and', options: array checkable }
    checkableOpt:     { type: 'opt', term: checkable }
    checkableUser:    { type: 'user', predicate: fn }
*/

// typify: type contextDef = { name: string, typeset: array checkable }
// typify: type context = map (array checkable)
// typify: type functionType = { name: string, context: context, params: array checkable, rest: checkable?, result: checkable }

// :: string -> { type: 'literal', value: null|boolean|infinity|ninfinity|undefined|nan } | checkableVar
function variable(name) {
  switch (name) {
    case "true": return { type: "literal", value: true };
    case "false": return { type: "literal", value: false };
    case "null": return { type: "literal", value: null };
    case "infinity": return { type: "literal", value: Infinity };
    case "ninfinity": return { type: "literal", value: -Infinity };
    case "undefined": return { type: "literal", value: undefined };
    case "nan": return { type: "literal", value: NaN };
  }
  return { type: "var", name: name };
}

// :: number -> { type: 'literal', value: number }
function number(value) {
  assert(typeof value === "number");
  return { type: "literal", value: value };
}

// :: string -> { type: 'literal', value: string }
function string(value) {
  assert(typeof value === "string");
  return { type: "literal", value: value };
}

// :: checkable -> checkableOpt | checkableAny
function opt(t) {
  if (t.type === "any") {
    return t;
  } else if (t.type === "opt") {
    return t;
  } else {
    return { type: "opt", term: t };
  }
}

// :: string -> array checkable -> checkablePoly
function poly(name, args) {
  return { type: "poly", name: name, args: args };
}

// :: map checkable -> checkableRecord
function record(fields) {
  return { type: "record", fields: fields };
}

// :: 'and'|'alt' -> checkable -> checkable -> checkable | array checkable
function mergeOptions(type, a, b) {
  if (a.type === type) {
    if (b.type === type) {
      return a.options.concat(b.options);
    } else {
      return a.options.concat([b]);
    }
  } else {
    if (b.type === type) {
      return [a].concat(b.options);
    } else {
      return [a, b];
    }
  }
}

// :: 'and'|'alt' -> array checkable -> checkable
function andOr(type, options) {
  assert(options.length > 0);

  if (options.length === 1) {
    return options[0];
  }

  return options.reduce(function (a, b) {
    return {
      type: type,
      options: mergeOptions(type, a, b),
    };
  });
}

// :: fn -> checkableUser
function user(predicate) {
  return { type: "user", predicate: predicate };
}

module.exports = {
  any: any,
  variable: variable,
  number: number,
  string: string,
  opt: opt,
  poly: poly,
  record: record,
  and: andOr.bind(undefined, "and"),
  alt: andOr.bind(undefined, "alt"),
  user: user,
};

},{"assert":11}],5:[function(require,module,exports){
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

},{"./aparser.js":1,"./checkableConstructors.js":4}],6:[function(require,module,exports){
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

},{"./aparser.js":1,"./checkableParser":5}],7:[function(require,module,exports){
"use strict";

// Type predicates

// :: any -> boolean
function isBoolean(val) {
  return typeof val === "boolean";
}

// :: any -> boolean
function isNumber(val) {
  return typeof val === "number";
}

// :: any -> boolean
function isInteger(val) {
  return val === (val|0);
}

// :: any -> boolean
function isPositive(val) {
  return typeof val === "number" && val > 0;
}

// :: any -> boolean
function isNonNegative(val) {
  return typeof val === "number" && val >= 0;
}

// :: any -> boolean
function isFinite(val) {
  return typeof val === "number" && val !== Infinity && val !== -Infinity && val === +val;
}

// :: any -> boolean
function isString(val) {
  return typeof val === "string";
}

// :: any -> boolean
function isFunction(val) {
  return typeof val === "function";
}

// :: any -> boolean
function isDate(val) {
  return val instanceof Date;
}

// :: any -> boolean
function isRegExp(val) {
  return val instanceof RegExp;
}

// :: any -> boolean
function isArray(val) {
  return Array.isArray(val);
}

// :: any -> boolean
function isObject(val) {
  return Object(val) === val;
}

// :: any -> boolean
function isArguments(val) {
  return val && isObject(arguments) && isInteger(val.length) && Object.prototype.toString.call(val) === "[object Arguments]" || false;
}

// :: *... -> true
function constTrue() {
  return true;
}

module.exports = {
  isBoolean: isBoolean,
  isNumber: isNumber,
  isInteger: isInteger,
  isPositive: isPositive,
  isNonNegative: isNonNegative,
  isFinite: isFinite,
  isString: isString,
  isFunction: isFunction,
  isDate: isDate,
  isRegExp: isRegExp,
  isArray: isArray,
  isObject: isObject,
  isArguments: isArguments,
  constTrue: constTrue,
};

},{}],8:[function(require,module,exports){
"use strict";

var utils = require("./utils.js");

// :: boolean -> string -> string
function parensS(guard, str) {
  return guard ? "(" + str + ")" : str;
}

// Forward declaration
var showCheckableTypePrecedence;

// :: checkableLiteral -> string
function showLiteral(type) {
  if (typeof type.value === "string") {
    return "'" + type.value + "'";
  } else {
    return "" + type.value;
  }
}

// :: checkableRecord -> string
function showRecord(type) {
  var pairs = [];
  for (var t in type.fields) {
    pairs.push(t + ": " + showCheckableTypePrecedence(0, type.fields[t]));
  }
  return "{" + pairs.join(", ") + "}";
}

// :: nat -> checkable -> string
function showCheckableTypePrecedence(precedence, type) {
  switch (type.type) {
    case "any": return "*";
    case "literal": return showLiteral(type);
    case "var": return type.name;
    case "record":
      return showRecord(type);
    case "alt":
      return parensS(precedence > 0,
        utils.map(type.options, showCheckableTypePrecedence.bind(undefined, 0)).join("|"));
    case "and":
      return parensS(precedence > 1,
        utils.map(type.options, showCheckableTypePrecedence.bind(undefined, 1)).join("&"));
    case "poly":
      return parensS(precedence > 2,
        type.name + " " + utils.map(type.args, showCheckableTypePrecedence.bind(undefined, 3)).join(" "));
    case "opt":
      return parensS(precedence > 3,
        showCheckableTypePrecedence(3, type.term) + "?");
  }
}

// :: checkable -> string
function showCheckableType(type) {
  return showCheckableTypePrecedence(0, type);
}

// :: map (array checkable) -> string
function showContext(context) {
  var res = "";
  for (var name in context) {
    res += name + " : " + utils.map(context[name], showCheckableTypePrecedence.bind(undefined, 1)).join(" | ");
  }
  return res;
}

module.exports = {
  checkable: showCheckableType,
  context: showContext,
};

},{"./utils.js":10}],9:[function(require,module,exports){
/*
* typify
* https://github.com/phadej/typify
*
* Copyright (c) 2013 Oleg Grenrus
* Licensed under the MIT license.
*/
"use strict";

var VERSION = [0, 2, 6];

var utils = require("./utils.js");
var p = require("./predicates.js");
var A = require("./aparser.js");
var c = require("./checkableCompiler.js");
var cons = require("./checkableConstructors.js");
var show = require("./show.js");
var parseCheckableType = require("./checkableParser").parse;
var compileCheckableType = c.compile;
var compileCheckableTypeRecursive = c.compileRecursive;
var functionP = require("./functionParser.js").functionP;

// Few almost predicates
// :: *... -> *
function throwAlways() {
  throw new Error("this shouldn't been called");
}

var functionTypeCheckRe = /^([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|\*|\?|\||&|\(|\)|\{|\}|::|:|,|=>|->|\.\.\.|\s+)*$/;
var functionTypeTokenRe = /([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|\*|\?|\||&|\(|\)|\{|\}|::|:|,|=>|->|\.\.\.)/g;

// Function type parsing, checks pre-compiling & pretty-printing

// :: checkable -> *... -> boolean
function optional(parsed) {
  if (parsed.type === "any") { return true; }
  if (parsed.type === "opt") { return true; }
  if (parsed.type === "alt") { return parsed.options.some(optional); }
  return false;
}

// :: functionType -> nat | infinity
function maxParamsF(parsed) {
  return parsed.rest === undefined ? parsed.params.length : Infinity;
}

// :: functionType -> nat
function minParamsF(parsed) {
  var result = parsed.params.length;
  for (var i = result - 1; i >= 0; i--) {
    if (!optional(parsed.params[i])) {
      break;
    }
    result = i;
  }
  return result;
}

// :: Environment -> map (array checkable) -> map (array fn)
function compileContext(environment, context) {
  return utils.mapValues(context, function (v) {
    return utils.map(v, compileCheckableType.bind(undefined, environment, context));
  });
}

// :: string -> functionType
function parseFunctionType(type) {
  if (!functionTypeCheckRe.test(type)) { throw new TypeError("invalid function type: " + type); }
  var tokens = type.match(functionTypeTokenRe);
  var parsed = A.parse(functionP, tokens);
  if (parsed === undefined) { throw new TypeError("invalid function type: " + type); }
  return parsed;
}

// :: Environment -> functionType -> *
function compileFunctionType(environment, parsed) {
  return {
    name: parsed.name,
    context: compileContext(environment, parsed.context),
    params: utils.map(parsed.params, compileCheckableType.bind(undefined, environment, parsed.context)),
    rest: parsed.rest && compileCheckableType(environment, parsed.context, parsed.rest),
    result: compileCheckableType(environment, parsed.context, parsed.result),
    minParams: minParamsF(parsed),
    maxParams: maxParamsF(parsed),
  };
}

// :: map (array fn) -> fn -> string -> *... ->  boolean
function contextCheckGeneric(context, compiled, varname) {
  var options = context[varname];
  var args = utils.slice(arguments, 3);

  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    var res = option.apply(undefined, [compiled].concat(args));
    if (res) {
      context[varname] = [option];
      return true;
    }
  }
  return false;
}

// Decorate function with type-signature check
function decorate(environment, type, method) {
  var parsed = parseFunctionType(type);
  var compiled = compileFunctionType(environment, parsed);

  return function() {
    // check there are enough parameters
    if (arguments.length < compiled.minParams || arguments.length > compiled.maxParams) {
      if (compiled.minParams === compiled.maxParams) {
        throw new TypeError("function " + compiled.name + " expects " + compiled.maxParams + " arguments, " + arguments.length + " given");
      } else {
        throw new TypeError("function " + compiled.name + " expects " + compiled.minParams + "-" + compiled.maxParams + " arguments, " + arguments.length + " given");
      }
    }

    var contextCheckUn = contextCheckGeneric.bind(undefined, utils.copyObj(compiled.context));
    var contextCheck = utils.y(contextCheckUn);

    // check that parameters are of right type
    for (var i = 0; i < arguments.length; i++) {
      var argCheck = i < compiled.params.length ? compiled.params[i] : compiled.rest;
      var argType =  i < compiled.params.length ? parsed.params[i] : parsed.rest;
      if (!argCheck(contextCheck, arguments[i])) {
        // TODO: str checkable type
        throw new TypeError("type of " + parsed.name + " " + (i+1) + ". parameter is not `" + show.checkable(argType) + "` in context `" + show.context(parsed.context) + "` -- " + JSON.stringify(arguments[i]));
      }
    }

    // call original function
    var r = method.apply(this, arguments);

    // check type of return value
    if (!compiled.result(contextCheck, r)) {
      // TODO: str checkable type
      throw new TypeError("type of `" + parsed.name + "` return value is not `" + show.checkable(parsed.result) + "` in context `" + show.context(parsed.context) + "` -- " + r);
    }

    // return
    return r;
  };
}

// typify: type checkableEmbedded = string | fn | array checkableEmbedded | map checkableEmbedded
// :: checkableEmbedded -> checkable
function parse(definition) {
  if (p.isString(definition)) {
    return parseCheckableType(definition);
  } else if (p.isFunction(definition)) {
    return cons.user(definition);
  } else if (p.isArray(definition)) {
    var options = utils.map(definition, parse);
    return cons.alt(options);
  } else /* if (p.isObject(definition)) */ {
    var fields = utils.mapValues(definition, parse);
    return cons.record(fields);
  }
}

// Check checkable type
function check(environment, type, variable) {
  if (arguments.length !== 2 && arguments.length !== 3) {
    throw new TypeError("check takes 1 or 2 arguments, " + (arguments.length-1) + " provided");
  }

  var parsed = parseCheckableType(type);
  // console.log(parsed);
  // console.log(JSON.stringify(parsed, null));
  var compiled = compileCheckableType(environment, {}, parsed); // using empty context

  switch (arguments.length) {
    case 2: return function (variable1) {
      return compiled(throwAlways, variable1) === true;
    };
    case 3:
      return compiled(throwAlways, variable) === true;
  }
}

function assert(environment, type, variable) {
  if (arguments.length !== 2 && arguments.length !== 3) {
    throw new TypeError("assert takes 1 or 2 arguments, " + (arguments.length-1) + " provided");
  }

  var parsed = parseCheckableType(type);
  // console.log(parsed);
  // console.log(JSON.stringify(parsed, null));
  var compiled = compileCheckableType(environment, {}, parsed); // using empty context

  switch (arguments.length) {
    case 2: return function (variable1) {
      var result1 = compiled(throwAlways, variable1);
      if (result1 !== true) {
        throw new TypeError(result1);
      }
    };
    case 3:
      var result = compiled(throwAlways, variable);
      if (result !== true) {
        throw new TypeError(result);
      }
  }
}

// Add single parsable type
// :: Environment -> map checkable -> undefined
function addParsedTypes(environment, parsed) {
  var names = Object.keys(parsed);
  names.forEach(function (name) {
    if (environment.has(name)) { throw new Error(name + " is already defined"); }
  });

  var compiled = utils.mapValues(parsed, compileCheckableTypeRecursive.bind(undefined, environment, {}, names));
  var checks = utils.mapValues(compiled, function (check) {
    return check.bind(undefined, compiled, throwAlways);
  });

  environment.add(checks);
}

function addType(environment, name, definition) {
  var parsed = {};
  parsed[name] = parse(definition);
  return addParsedTypes(environment, parsed);
}

// Or many simultanouslty
function mutual(environment, definitions) {
  var parsed = utils.mapValues(definitions, parse);
  return addParsedTypes(environment, parsed);
}

function adt(environment, name, definitions) {
  if (utils.has(definitions, name)) {
    throw new Error("adt and it's constructor cannot has the same name");
  }

  var constructors = Object.keys(definitions);
  var parsed = utils.mapValues(definitions, parse);
  parsed[name] = parse(constructors);

  return addParsedTypes(environment, parsed);
}

function instance(environment, name, cls) {
  return addType(environment, name, function (arg) {
    return arg instanceof cls;
  });
}

function wrap(environment, module, signatures) {
  for (var fn in signatures) {
    module[fn] = decorate(environment, fn + " :: " + signatures[fn], module[fn]);
  }

  return module;
}

var buildInTypes = require("./builtin.js");

// typify: instance Environment
// :: -> undefined
function Environment() {
  this.types = {};
}

Environment.prototype.has = function environmentHas(type) {
  return utils.has(this.types, type) || utils.has(buildInTypes, type);
};

Environment.prototype.get = function environmentGet(type) {
  return this.types[type] || buildInTypes[type];
};

Environment.prototype.add = function environmentAdd(checks) {
  Object.keys(checks).forEach(function (type) {
    this.types[type] = checks[type];
  }, this);
};

// typify public API type signatures
var TYPE_SIGNATURES = {
  // TODO: change fn to multi type and deprecate alias & record
  type: "string -> fn -> *",
// TODO: support alternative function signatures
// TODO: support specifying required but "any" parameter
//  check: "string -> * -> boolean",
  alias: "string -> string -> *",
  record: "string -> map string -> *",
  mutual: "map string -> *",
  instance: "string -> fn -> *",
  wrap: "* -> map string -> *",
  adt: "string -> map string -> *",
};

// Create typify
// We could want use prototype-style, instead of closure, but we cannot make callable objects.
// TODO: add reference
function create() {
  var env = new Environment();

  var typify = decorate.bind(undefined, env);
  typify.type = addType.bind(undefined, env);
  typify.alias = addType.bind(undefined, env);
  typify.record = addType.bind(undefined, env);
  typify.mutual = mutual.bind(undefined, env);
  typify.adt = adt.bind(undefined, env);
  typify.instance = instance.bind(undefined, env);
  typify.check = check.bind(undefined, env);
  typify.assert = assert.bind(undefined, env);
  typify.wrap = wrap.bind(undefined, env);
  typify.version = VERSION;

  // also add recursive create
  // make recursive environments or just possible to merge types from old?
  typify.create = create;

  return typify.wrap(typify, TYPE_SIGNATURES);
}

// Export  stuff
module.exports = create();

},{"./aparser.js":1,"./builtin.js":2,"./checkableCompiler.js":3,"./checkableConstructors.js":4,"./checkableParser":5,"./functionParser.js":6,"./predicates.js":7,"./show.js":8,"./utils.js":10}],10:[function(require,module,exports){
"use strict";

// Does the object contain given key? http://underscorejs.org/#has
// :: map -> string -> boolean
function has(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

// :: array -> any -> boolean
function contains(array, element) {
  return array.indexOf(element) !== -1;
}

// Create a shallow-copied clone of the object. http://underscorejs.org/#clone
// :: map -> map
function copyObj(obj) {
  var res = {};
  for (var k in obj) {
    res[k] = obj[k];
  }
  return res;
}

// Returns values of the object
// :: map -> array
function values(obj) {
  var res = [];
  for (var k in obj) {
    if (has(obj, k)) {
      res.push(obj[k]);
    }
  }
  return res;
}

// :: map -> fn -> map
function mapValues(obj, f) {
  var res = {};
  for (var k in obj) {
    if (has(obj, k)) {
      res[k] = f(obj[k]);
    }
  }
  return res;
}

// :: array|arguments -> integer? -> integer? -> array
function slice(array, n, m) {
  return Array.prototype.slice.call(array, n, m);
}

// :: array -> fn -> array
function map(array, f) {
  return array.map(function (x) {
    return f(x);
  });
}

// This has different semantics than Array#every
// utils.every([1, 2, 3], function (x) { return x; }); // 3
// [1, 2, 3].every(function (x) { return x; }); // true
// :: array -> fn -> *
function every(array, f) {
  var acc = true;
  for (var i = 0; i < array.length; i++) {
    acc = acc && f(array[i]);
    if (!acc) {
      return acc;
    }
  }
  return acc;
}

// :: fn -> fn
function y(f) {
  // :: fn -> fn
  function p(h) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      return f.apply(undefined, [h(h)].concat(args));
    };
  }
  return p(p);
}

// try { throw new Error(); } catch (e) { console.log(e.stack); }

module.exports = {
  has: has,
  contains: contains,
  copyObj: copyObj,
  values: values,
  mapValues: mapValues,
  slice: slice,
  map: map,
  every: every,
  y: y,
};

},{}],11:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":13}],12:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],13:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":12,"__browserify_process":15,"inherits":14}],14:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],15:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[9])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvb2dyZS9Ecm9wYm94L2tvb2RhaWx1dC90eXBpZnkvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvb2dyZS9Ecm9wYm94L2tvb2RhaWx1dC90eXBpZnkvbGliL2xpYi9hcGFyc2VyLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9saWIvYnVpbHRpbi5qcyIsIi9Vc2Vycy9vZ3JlL0Ryb3Bib3gva29vZGFpbHV0L3R5cGlmeS9saWIvbGliL2NoZWNrYWJsZUNvbXBpbGVyLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9saWIvY2hlY2thYmxlQ29uc3RydWN0b3JzLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9saWIvY2hlY2thYmxlUGFyc2VyLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9saWIvZnVuY3Rpb25QYXJzZXIuanMiLCIvVXNlcnMvb2dyZS9Ecm9wYm94L2tvb2RhaWx1dC90eXBpZnkvbGliL2xpYi9wcmVkaWNhdGVzLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9saWIvc2hvdy5qcyIsIi9Vc2Vycy9vZ3JlL0Ryb3Bib3gva29vZGFpbHV0L3R5cGlmeS9saWIvbGliL3R5cGlmeS5qcyIsIi9Vc2Vycy9vZ3JlL0Ryb3Bib3gva29vZGFpbHV0L3R5cGlmeS9saWIvbGliL3V0aWxzLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsIi9Vc2Vycy9vZ3JlL0Ryb3Bib3gva29vZGFpbHV0L3R5cGlmeS9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Fzc2VydC9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9vZ3JlL0Ryb3Bib3gva29vZGFpbHV0L3R5cGlmeS9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Fzc2VydC9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL29ncmUvRHJvcGJveC9rb29kYWlsdXQvdHlwaWZ5L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9Vc2Vycy9vZ3JlL0Ryb3Bib3gva29vZGFpbHV0L3R5cGlmeS9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKTtcblxuLy8gdHlwaWZ5OiBpbnN0YW5jZSBUaHVua1xuXG4vLyBUaHVuaywgZm9yIHRoZSBsYXp5LWV2YWx1YXRpb24gYW5kIHJlY3Vyc2l2ZSBwYXJzZXIuXG4vLyA6OiBmbiAtPiB1bmRlZmluZWRcbmZ1bmN0aW9uIFRodW5rKGYpIHtcbiAgdGhpcy50aHVuayA9IGY7XG4gIHRoaXMuZm9yY2VkID0gZmFsc2U7XG4gIHRoaXMudmFsdWUgPSB1bmRlZmluZWQ7XG59XG5cbi8vIDo6IGFueSAtPiBUaHVua1xuZnVuY3Rpb24gZGVsYXkoZikge1xuICByZXR1cm4gbmV3IFRodW5rKGYpO1xufVxuXG4vLyA6OiBhbnkgLT4gKlxuZnVuY3Rpb24gZm9yY2UodGh1bmspIHtcbiAgaWYgKHRodW5rIGluc3RhbmNlb2YgVGh1bmspIHtcbiAgICBpZiAoIXRodW5rLmZvcmNlZCkge1xuICAgICAgdGh1bmsudmFsdWUgPSB0aHVuay50aHVuaygpO1xuICAgICAgdGh1bmsuZm9yY2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRodW5rLnZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aHVuaztcbiAgfVxufVxuXG4vLyA6OiBmbiAtPiBhcnJheSBzdHJpbmcgLT4gKlxuZnVuY3Rpb24gcGFyc2UocCwgdG9rZW5zKSB7XG4gIHZhciByZXMgPSBwKHRva2VucywgMCk7XG4gIC8vIGNvbnNvbGUubG9nKFwicGFyc2VcIiwgcmVzLCB0b2tlbnMsIHRva2Vucy5sZW5ndGgpO1xuICBpZiAocmVzICE9PSB1bmRlZmluZWQgJiYgcmVzWzFdID49IHRva2Vucy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcmVzWzBdO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLy8gOjogYXJyYXkgc3RyaW5nIC0+IG5hdCAtPiAodHVwbGUgdW5kZWZpbmVkIGlkeCk/XG5mdW5jdGlvbiBlb2YodG9rZW5zLCBpZHgpIHtcbiAgLy8gY29uc29sZS5sb2coXCJlb2ZcIiwgdG9rZW5zLCBpZHgpO1xuICBpZiAoaWR4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFt1bmRlZmluZWQsIGlkeF07XG4gIH1cbn1cblxuLy8gOjogc3RyaW5nIC0+IGZuXG5mdW5jdGlvbiB0b2tlbih0b2spIHtcbiAgLy8gOjogYXJyYXkgc3RyaW5nIC0+IG5hdCAtPiAodHVwbGUgc3RyaW5nIG5hdCk/XG4gIHJldHVybiBmdW5jdGlvbiAodG9rZW5zLCBpZHgpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcInRva2VuXCIsIHRva2VucywgaWR4LCB0b2spO1xuICAgIGlmIChpZHggPj0gdG9rZW5zLmxlbmd0aCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgaWYgKHRva2Vuc1tpZHhdID09PSB0b2spIHtcbiAgICAgIHJldHVybiBbdG9rLCBpZHgrMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9O1xufVxuXG4vLyA6OiBmbiAtPiBmblxuZnVuY3Rpb24gc2F0aXNmeWluZyhwcmVkaWNhdGUpIHtcbiAgLy8gOjogYXJyYXkgc3RyaW5nIC0+IG5hdCAtPiAodHVwbGUgc3RyaW5nIG5hdCk/XG4gIHJldHVybiBmdW5jdGlvbiAodG9rZW5zLCBpZHgpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcInNhdGlzZnlpbmdcIiwgcHJlZGljYXRlLm5hbWUgfHwgcHJlZGljYXRlLCB0b2tlbnMsIGlkeCk7XG4gICAgaWYgKGlkeCA+PSB0b2tlbnMubGVuZ3RoKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICBpZiAocHJlZGljYXRlKHRva2Vuc1tpZHhdKSkge1xuICAgICAgcmV0dXJuIFt0b2tlbnNbaWR4XSwgaWR4KzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gOjogLT4gZm5cbmZ1bmN0aW9uIGFueSgpIHtcbiAgLy8gOjogYXJyYXkgc3RyaW5nIC0+IG5hdCAtPiAodHVwbGUgc3RyaW5nIG5hdCk/XG4gIHJldHVybiBmdW5jdGlvbiAodG9rZW5zLCBpZHgpIHtcbiAgICBpZiAoaWR4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFt0b2tlbnNbaWR4XSwgaWR4KzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gOjogKiAtPiBmblxuZnVuY3Rpb24gcHVyZSh4KSB7XG4gIC8vIDo6IGFycmF5IHN0cmluZyAtPiBuYXQgLT4gdHVwbGUgKiBuYXRcbiAgcmV0dXJuIGZ1bmN0aW9uICh0b2tlbnMsIGlkeCkge1xuICAgIHJldHVybiBbeCwgaWR4XTtcbiAgfTtcbn1cblxuLy8gOjogZm4uLi4gLT4gZm5cbmZ1bmN0aW9uIG9yKCkge1xuICB2YXIgYXJncyA9IHV0aWxzLnNsaWNlKGFyZ3VtZW50cyk7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgLy8gOjogYXJyYXkgc3RyaW5nIC0+IG5hdCAtPiAodHVwbGUgKiBuYXQpP1xuICByZXR1cm4gZnVuY3Rpb24gKHRva2VucywgaWR4KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIHJlcyA9IGZvcmNlKGFyZ3NbaV0pKHRva2VucywgaWR4KTtcbiAgICAgIGlmIChyZXMgIT09IHVuZGVmaW5lZCkgeyByZXR1cm4gcmVzOyB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH07XG59XG5cbi8vIDo6IGZuIHwgVGh1bmsgLi4uIC0+IGZuXG5mdW5jdGlvbiBsaWZ0KCkge1xuICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7XG4gIHZhciBmID0gYXJndW1lbnRzW2xlbl07XG4gIHZhciBhcmdzID0gdXRpbHMuc2xpY2UoYXJndW1lbnRzLCAwLCAtMSk7XG4gIC8vIDo6IGFycmF5IHN0cmluZyAtPiBuYXQgLT4gKHR1cGxlICogbmF0KT9cbiAgcmV0dXJuIGZ1bmN0aW9uKHRva2VucywgaWR4KSB7XG4gICAgdmFyIHJlc2FyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgcmVzID0gZm9yY2UoYXJnc1tpXSkodG9rZW5zLCBpZHgpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJsaWZ0IGFyZ3VtZW50OlwiLCByZXMsIGZvcmNlKGFyZ3NbaV0pKTtcbiAgICAgIGlmIChyZXMgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgICByZXNhcmdzW2ldID0gcmVzWzBdO1xuICAgICAgaWR4ID0gcmVzWzFdO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhcImxpZnQgdmFsdWVcIiwgZi5hcHBseSh1bmRlZmluZWQsIHJlc2FyZ3MpLCBpZHgpO1xuICAgIHJldHVybiBbZi5hcHBseSh1bmRlZmluZWQsIHJlc2FyZ3MpLCBpZHhdO1xuICB9O1xufVxuXG4vLyA6OiBhcnJheSAtPiAqIC0+IGFycmF5IHN0cmluZyAtPiBuYXQgLT4gdHVwbGUgYXJyYXkgbmF0XG5mdW5jdGlvbiBtYW55TG9vcChyZXMsIGEsIHRva2VucywgaWR4KSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdmFyIGFxID0gYSh0b2tlbnMsIGlkeCk7XG4gICAgaWYgKGFxID09PSB1bmRlZmluZWQpIHsgcmV0dXJuIFtyZXMsIGlkeF07IH1cbiAgICByZXMucHVzaChhcVswXSk7XG4gICAgaWR4ID0gYXFbMV07XG4gIH1cbn1cblxuLy8gOjogZm4gLT4gZm5cbmZ1bmN0aW9uIHNvbWUoYSkge1xuICAvLyA6OiBhcnJheSBzdHJpbmcgLT4gbmF0IC0+ICh0dXBsZSBhcnJheSBuYXQpP1xuICByZXR1cm4gZnVuY3Rpb24gKHRva2VucywgaWR4KSB7XG4gICAgYSA9IGZvcmNlKGEpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgYXAgPSBhKHRva2VucywgaWR4KTtcbiAgICBpZiAoYXAgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgcmVzLnB1c2goYXBbMF0pO1xuICAgIGlkeCA9IGFwWzFdO1xuICAgIHJldHVybiBtYW55TG9vcChyZXMsIGEsIHRva2VucywgaWR4KTtcbiAgfTtcbn1cblxuLy8gOjogZm4gLT4gZm5cbmZ1bmN0aW9uIG1hbnkoYSkge1xuICAvLyA6OiBhcnJheSBzdHJpbmcgLT4gbmF0IC0+IHR1cGxlIGFycmF5IG5hdFxuICByZXR1cm4gZnVuY3Rpb24gKHRva2VucywgaWR4KSB7XG4gICAgYSA9IGZvcmNlKGEpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICByZXR1cm4gbWFueUxvb3AocmVzLCBhLCB0b2tlbnMsIGlkeCk7XG4gIH07XG59XG5cbi8vIDo6IGZuIC0+IHN0cmluZyAtPiBmblxuZnVuY3Rpb24gc2VwQnkoYSwgc2VwKSB7XG4gIC8vIDo6IGFycmF5IHN0cmluZyAtPiBuYXQgLT4gKHR1cGxlIGFycmF5IG5hdCk/XG4gIHJldHVybiBmdW5jdGlvbiAodG9rZW5zLCBpZHgpIHtcbiAgICBhID0gZm9yY2UoYSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBhcCA9IGEodG9rZW5zLCBpZHgpO1xuICAgIGlmIChhcCA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICByZXMucHVzaChhcFswXSk7XG4gICAgaWR4ID0gYXBbMV07XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmICh0b2tlbnNbaWR4XSAhPT0gc2VwKSB7IHJldHVybiBbcmVzLCBpZHhdOyB9XG4gICAgICBpZHggKz0gMTtcbiAgICAgIHZhciBhcSA9IGEodG9rZW5zLCBpZHgpO1xuICAgICAgaWYgKGFxID09PSB1bmRlZmluZWQpIHsgcmV0dXJuIFtyZXMsIGlkeF07IH1cbiAgICAgIHJlcy5wdXNoKGFxWzBdKTtcbiAgICAgIGlkeCA9IGFxWzFdO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gOjogZm4gLT4gKiAtPiBmblxuZnVuY3Rpb24gb3B0aW9uYWwocCwgZGVmKSB7XG4gIC8vIDo6IGFycmF5IHN0cmluZyAtPiBuYXQgLT4gKHR1cGxlICogbmF0KT9cbiAgcmV0dXJuIGZ1bmN0aW9uICh0b2tlbnMsIGlkeCkge1xuICAgIHZhciByZXMgPSBmb3JjZShwKSh0b2tlbnMsIGlkeCk7XG4gICAgaWYgKHJlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gW2RlZiwgaWR4XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwYXJzZTogcGFyc2UsXG4gIHB1cmU6IHB1cmUsXG4gIG9yOiBvcixcbiAgbGlmdDogbGlmdCxcbiAgbWFueTogbWFueSxcbiAgc29tZTogc29tZSxcbiAgc2VwQnk6IHNlcEJ5LFxuICBlb2Y6IGVvZixcbiAgdG9rZW46IHRva2VuLFxuICBhbnk6IGFueSxcbiAgc2F0aXNmeWluZzogc2F0aXNmeWluZyxcbiAgb3B0aW9uYWw6IG9wdGlvbmFsLFxuICBkZWxheTogZGVsYXksXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBwID0gcmVxdWlyZShcIi4vcHJlZGljYXRlcy5qc1wiKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgXCJudW1iZXJcIjogcC5pc051bWJlcixcbiAgXCJpbnRlZ2VyXCI6IHAuaXNJbnRlZ2VyLFxuICBcIm5hdFwiOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHAuaXNJbnRlZ2VyKHZhbCkgJiYgcC5pc05vbk5lZ2F0aXZlKHZhbCk7XG4gIH0sXG4gIFwicG9zaXRpdmVcIjogZnVuY3Rpb24gKHZhbCwgdmFsdWVDaGVjaykge1xuICAgIHJldHVybiBwLmlzUG9zaXRpdmUodmFsKSAmJiAoIXZhbHVlQ2hlY2sgfHwgdmFsdWVDaGVjayh2YWwpKTtcbiAgfSxcbiAgXCJub25uZWdhdGl2ZVwiOiBmdW5jdGlvbiAodmFsLCB2YWx1ZUNoZWNrKSB7XG4gICAgcmV0dXJuIHAuaXNOb25OZWdhdGl2ZSh2YWwpICYmICghdmFsdWVDaGVjayB8fCB2YWx1ZUNoZWNrKHZhbCkpO1xuICB9LFxuICBcImZpbml0ZVwiOiBmdW5jdGlvbiAodmFsLCB2YWx1ZUNoZWNrKSB7XG4gICAgcmV0dXJuIHAuaXNGaW5pdGUodmFsKSAmJiAoIXZhbHVlQ2hlY2sgfHwgdmFsdWVDaGVjayh2YWwpKTtcbiAgfSxcbiAgXCJib29sZWFuXCI6IHAuaXNCb29sZWFuLFxuICBcInN0cmluZ1wiOiBwLmlzU3RyaW5nLFxuICBcImRhdGVcIjogcC5pc0RhdGUsXG4gIFwicmVnZXhwXCI6IHAuaXNSZWdFeHAsXG4gIFwiZnVuY3Rpb25cIjogcC5pc0Z1bmN0aW9uLFxuICBcImZuXCI6IHAuaXNGdW5jdGlvbixcbiAgXCJhcmd1bWVudHNcIjogcC5pc0FyZ3VtZW50cyxcbiAgXCJhbnlcIjogcC5jb25zdFRydWUsXG4gIFwiYXJyYXlcIjogZnVuY3Rpb24gKGFyciwgdmFsdWVDaGVjaykge1xuICAgIHJldHVybiBwLmlzQXJyYXkoYXJyKSAmJiAoIXZhbHVlQ2hlY2sgfHwgdXRpbHMuZXZlcnkoYXJyLCB2YWx1ZUNoZWNrKSk7XG4gIH0sXG4gIFwibWFwXCI6IGZ1bmN0aW9uIChtYXAsIHZhbHVlQ2hlY2spIHtcbiAgICByZXR1cm4gKHAuaXNPYmplY3QobWFwKSAmJiAhcC5pc0FycmF5KG1hcCkpICYmICghdmFsdWVDaGVjayB8fCB1dGlscy5ldmVyeSh1dGlscy52YWx1ZXMobWFwKSwgdmFsdWVDaGVjaykpO1xuICB9LFxuICBcInR1cGxlXCI6IGZ1bmN0aW9uICh2KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHYpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIHZhciBhcmdzID0gdXRpbHMuc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoYXJncy5sZW5ndGggIT09IHYubGVuZ3RoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFhcmdzW2ldKHZbaV0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xudmFyIHAgPSByZXF1aXJlKFwiLi9wcmVkaWNhdGVzLmpzXCIpO1xuXG4vLyBGb3J3YXJkIGRlY2xhcmF0aW9uXG52YXIgY29tcGlsZUNoZWNrYWJsZVR5cGVSZWN1cnNpdmU7XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBhcnJheSBzdHJpbmcgLT4gY2hlY2thYmxlQWx0IHwgY2hlY2thYmxlQW5kIC0+IGZuXG5mdW5jdGlvbiBjb21waWxlQW5kQWx0KGVudmlyb25tZW50LCBjb250ZXh0LCByZWNOYW1lcywgcGFyc2VkLCBvcGVyYXRvcikge1xuICB2YXIgY3MgPSB1dGlscy5tYXAocGFyc2VkLm9wdGlvbnMsIGNvbXBpbGVDaGVja2FibGVUeXBlUmVjdXJzaXZlLmJpbmQodW5kZWZpbmVkLCBlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMpKTtcbiAgLy8gY29tcGlsZWRPcHRBbHQgOjogbWFwIGZuIC0+IGZuIC0+IGFueSAtPiBmbi4uLiAtPiBib29sZWFuXG4gIG9wZXJhdG9yID0gcGFyc2VkLnR5cGUgPT09IFwiYW5kXCIgPyBcImV2ZXJ5XCIgOiBcInNvbWVcIjtcbiAgcmV0dXJuIGZ1bmN0aW9uIChyZWNDaGVja3MsIHZhckNoZWNrLCBhcmcpIHtcbiAgICByZXR1cm4gY3Nbb3BlcmF0b3JdKGZ1bmN0aW9uIChjKSB7XG4gICAgICByZXR1cm4gYyhyZWNDaGVja3MsIHZhckNoZWNrLCBhcmcpO1xuICAgIH0pO1xuICB9O1xufVxuXG4vLyA6OiBFbnZpcm9ubWVudCAtPiBtYXAgKGFycmF5IGNoZWNrYWJsZSkgLT4gYXJyYXkgc3RyaW5nIC0+IGNoZWNrYWJsZVZhciAtPiBmblxuZnVuY3Rpb24gY29tcGlsZVZhcihlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMsIHBhcnNlZCkge1xuICBpZiAodXRpbHMuaGFzKGNvbnRleHQsIHBhcnNlZC5uYW1lKSkge1xuICAgIC8vIGNvbXBpbGVkQ29udGV4dCA6OiBtYXAgZm4gLT4gZm4gLT4gYW55IC0+IGZuLi4uIC0+IGJvb2xlYW5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZykge1xuICAgICAgLy8gY29uc29sZS5sb2coXCJ2YXJjaGVja1wiLCB2YXJDaGVjaywgYXJnKTtcbiAgICAgIHJldHVybiB2YXJDaGVjayhwYXJzZWQubmFtZSwgYXJnKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmhhcyhwYXJzZWQubmFtZSkpIHtcbiAgICB2YXIgY2hlY2sgPSBlbnZpcm9ubWVudC5nZXQocGFyc2VkLm5hbWUpO1xuICAgIC8vIGNvbXBpbGVkRW52IDo6IG1hcCBmbiAtPiBmbiAtPiBhbnkgLT4gZm4uLi4gLT4gYm9vbGVhblxuICAgIHJldHVybiBmdW5jdGlvbiAocmVjQ2hlY2tzLCB2YXJDaGVjaykge1xuICAgICAgdmFyIGFyZ3MgPSB1dGlscy5zbGljZShhcmd1bWVudHMsIDIpO1xuICAgICAgcmV0dXJuIGNoZWNrLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgfTtcbiAgfSBlbHNlIGlmIChyZWNOYW1lcyAmJiB1dGlscy5jb250YWlucyhyZWNOYW1lcywgcGFyc2VkLm5hbWUpKSB7XG4gICAgLy8gY29tcGlsZWRSZWMgOjogbWFwIGZuIC0+IGZuIC0+IGFueSAtPiBmbi4uLiAtPiBib29sZWFuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZWNDaGVja3MsIHZhckNoZWNrLCBhcmcpIHtcbiAgICAgIHJldHVybiByZWNDaGVja3NbcGFyc2VkLm5hbWVdKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZyk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGU6IFwiICsgcGFyc2VkLm5hbWUpO1xuICB9XG59XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBhcnJheSBzdHJpbmcgLT4gY2hlY2thYmxlUG9seSAtPiBmblxuZnVuY3Rpb24gY29tcGlsZVBvbHkoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpIHtcbiAgdmFyIGFyZ3MgPSB1dGlscy5tYXAocGFyc2VkLmFyZ3MsIGNvbXBpbGVDaGVja2FibGVUeXBlUmVjdXJzaXZlLmJpbmQodW5kZWZpbmVkLCBlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMpKTtcbiAgaWYgKHV0aWxzLmhhcyhjb250ZXh0LCBwYXJzZWQubmFtZSkpIHtcbiAgICAvLyBjb21waWxlZFBvbHkgOjogbWFwIGZuIC0+IGZuIC0+IGFueSAtPiBmbi4uLiAtPiBib29sZWFuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNvbXBpbGVkUG9seUVudihyZWNDaGVja3MsIHZhckNoZWNrLCBhcmcpIHtcbiAgICAgIHZhciBhcmdzQ2hlY2tzID0gYXJncy5tYXAoZnVuY3Rpb24gKGFyZ0NoZWNrKSB7XG4gICAgICAgIHJldHVybiBhcmdDaGVjay5iaW5kKHVuZGVmaW5lZCwgcmVjQ2hlY2tzLCB2YXJDaGVjayk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB2YXJDaGVjay5hcHBseSh1bmRlZmluZWQsIFtwYXJzZWQubmFtZSwgYXJnXS5jb25jYXQoYXJnc0NoZWNrcykpO1xuICAgIH07XG4gIH0gZWxzZSBpZiAoZW52aXJvbm1lbnQuaGFzKHBhcnNlZC5uYW1lKSkge1xuICAgIHZhciBwb2x5Q2hlY2sgPSBlbnZpcm9ubWVudC5nZXQocGFyc2VkLm5hbWUpO1xuICAgIC8vIGNvbXBpbGVkUG9seSA6OiBtYXAgZm4gLT4gZm4gLT4gYW55IC0+IGZuLi4uIC0+IGJvb2xlYW5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZykge1xuICAgICAgdmFyIGFyZ3NDaGVja3MgPSBhcmdzLm1hcChmdW5jdGlvbiAoYXJnQ2hlY2spIHtcbiAgICAgICAgcmV0dXJuIGFyZ0NoZWNrLmJpbmQodW5kZWZpbmVkLCByZWNDaGVja3MsIHZhckNoZWNrKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBvbHlDaGVjay5hcHBseSh1bmRlZmluZWQsIFthcmddLmNvbmNhdChhcmdzQ2hlY2tzKSk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGU6IFwiICsgcGFyc2VkLm5hbWUpO1xuICB9XG59XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBhcnJheSBzdHJpbmcgLT4gY2hlY2thYmxlT3B0IC0+IGZuXG5mdW5jdGlvbiBjb21waWxlT3B0KGVudmlyb25tZW50LCBjb250ZXh0LCByZWNOYW1lcywgcGFyc2VkKSB7XG4gIHZhciBjID0gY29tcGlsZUNoZWNrYWJsZVR5cGVSZWN1cnNpdmUoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQudGVybSk7XG4gIC8vIGNvbXBpbGVkT3B0IDo6IG1hcCBmbiAtPiBmbiAtPiBhbnkgLT4gZm4uLi4gLT4gYm9vbGVhblxuICByZXR1cm4gZnVuY3Rpb24gKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZykge1xuICAgIHJldHVybiBhcmcgPT09IHVuZGVmaW5lZCB8fCBjKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZyk7XG4gIH07XG59XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBhcnJheSBzdHJpbmcgLT4gY2hlY2thYmxlTGl0ZXJhbCAtPiBmblxuZnVuY3Rpb24gY29tcGlsZUxpdGVyYWwoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpIHtcbiAgaWYgKHBhcnNlZC52YWx1ZSAhPT0gcGFyc2VkLnZhbHVlKSB7XG4gICAgLy8gTmFOXG4gICAgLy8gY29tcGlsZWROYU4gOjogbWFwIGZuIC0+IGZuIC0+IGFueSAtPiBmbi4uLiAtPiBib29sZWFuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZWNDaGVja3MsIHZhckNoZWNrLCBhcmcpIHtcbiAgICAgIHJldHVybiBhcmcgIT09IGFyZztcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGNvbXBpbGVkTGl0ZXJhbCA6OiBtYXAgZm4gLT4gZm4gLT4gYW55IC0+IGZuLi4uIC0+IGJvb2xlYW5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZykge1xuICAgICAgcmV0dXJuIGFyZyA9PT0gcGFyc2VkLnZhbHVlO1xuICAgIH07XG4gIH1cbn1cblxuLy8gOjogRW52aXJvbm1lbnQgLT4gbWFwIChhcnJheSBjaGVja2FibGUpIC0+IGFycmF5IHN0cmluZyAtPiBjaGVja2FibGVSZWNvcmQgLT4gZm5cbmZ1bmN0aW9uIGNvbXBpbGVSZWNvcmQoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpIHtcbiAgdmFyIGZpZWxkcyA9IHt9O1xuICBmb3IgKHZhciBuYW1lIGluIHBhcnNlZC5maWVsZHMpIHtcbiAgICBmaWVsZHNbbmFtZV0gPSBjb21waWxlQ2hlY2thYmxlVHlwZVJlY3Vyc2l2ZShlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMsIHBhcnNlZC5maWVsZHNbbmFtZV0pO1xuICB9XG4gIC8vIGNvbXBpbGVkUmVjb3JkIDogbWFwIGZuIC0+IGZuIC0+IGFueSAtPiBmbi4uLiAtPiBib29sZWFuXG4gIHJldHVybiBmdW5jdGlvbiAocmVjQ2hlY2tzLCB2YXJDaGVjaywgYXJnKSB7XG4gICAgaWYgKCFwLmlzT2JqZWN0KGFyZykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBmaWVsZE5hbWUgaW4gZmllbGRzKSB7XG4gICAgICBpZiAoIWZpZWxkc1tmaWVsZE5hbWVdKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZ1tmaWVsZE5hbWVdKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG59XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBhcnJheSBzdHJpbmcgLT4gY2hlY2thYmxlVXNlciAtPiBmblxuZnVuY3Rpb24gY29tcGlsZVVzZXIoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpIHtcbiAgLy8gY29tcGlsZWRVc2VyIDo6IG1hcCBmbiAtPiBmbiAtPiBhbnkgLT4gZm4uLi4gLT4gYm9vbGVhblxuICByZXR1cm4gZnVuY3Rpb24gKHJlY0NoZWNrcywgdmFyQ2hlY2ssIGFyZykge1xuICAgIHJldHVybiBwYXJzZWQucHJlZGljYXRlKGFyZyk7XG4gIH07XG59XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBhcnJheSBzdHJpbmcgLT4gY2hlY2thYmxlIC0+IGZuXG5mdW5jdGlvbiBjb21waWxlQ2hlY2thYmxlVHlwZVJlY3Vyc2l2ZShlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMsIHBhcnNlZCkge1xuICBzd2l0Y2ggKHBhcnNlZC50eXBlKSB7XG4gICAgY2FzZSBcInZhclwiOiByZXR1cm4gY29tcGlsZVZhcihlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMsIHBhcnNlZCk7XG4gICAgY2FzZSBcImxpdGVyYWxcIjogcmV0dXJuIGNvbXBpbGVMaXRlcmFsKGVudmlyb25tZW50LCBjb250ZXh0LCByZWNOYW1lcywgcGFyc2VkKTtcbiAgICBjYXNlIFwicG9seVwiOiByZXR1cm4gY29tcGlsZVBvbHkoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpO1xuICAgIGNhc2UgXCJhbnlcIjogcmV0dXJuIHAuY29uc3RUcnVlO1xuICAgIGNhc2UgXCJvcHRcIjogcmV0dXJuIGNvbXBpbGVPcHQoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpO1xuICAgIGNhc2UgXCJhbHRcIjogcmV0dXJuIGNvbXBpbGVBbmRBbHQoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpO1xuICAgIGNhc2UgXCJhbmRcIjogcmV0dXJuIGNvbXBpbGVBbmRBbHQoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpO1xuICAgIGNhc2UgXCJyZWNvcmRcIjogcmV0dXJuIGNvbXBpbGVSZWNvcmQoZW52aXJvbm1lbnQsIGNvbnRleHQsIHJlY05hbWVzLCBwYXJzZWQpO1xuICAgIGNhc2UgXCJ1c2VyXCI6IHJldHVybiBjb21waWxlVXNlcihlbnZpcm9ubWVudCwgY29udGV4dCwgcmVjTmFtZXMsIHBhcnNlZCk7XG4gIH1cbn1cblxuLy8gOjogRW52aXJvbm1lbnQgLT4gbWFwIChhcnJheSBjaGVja2FibGUpIC0+IGNoZWNrYWJsZSAtPiBmblxuZnVuY3Rpb24gY29tcGlsZUNoZWNrYWJsZVR5cGUoZW52aXJvbm1lbnQsIGNvbnRleHQsIHBhcnNlZCkge1xuICByZXR1cm4gY29tcGlsZUNoZWNrYWJsZVR5cGVSZWN1cnNpdmUoZW52aXJvbm1lbnQsIGNvbnRleHQsIFtdLCBwYXJzZWQpLmJpbmQodW5kZWZpbmVkLCB7fSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb21waWxlOiBjb21waWxlQ2hlY2thYmxlVHlwZSxcbiAgY29tcGlsZVJlY3Vyc2l2ZTogY29tcGlsZUNoZWNrYWJsZVR5cGVSZWN1cnNpdmUsXG4gIGNvbXBpbGVSZWNvcmQ6IGNvbXBpbGVSZWNvcmQsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xuXG52YXIgYW55ID0geyB0eXBlOiBcImFueVwiIH07XG5cbi8qXG4gIHR5cGlmeTogYWR0IGNoZWNrYWJsZVxuICAgIGNoZWNrYWJsZUFueTogICAgIHsgdHlwZTogJ2FueScgfVxuICAgIGNoZWNrYWJsZUxpdGVyYWw6IHsgdHlwZTogJ2xpdGVyYWwnLCB2YWx1ZTogc3RyaW5nfG51bWJlcnxib29sZWFufG51bGx8dW5kZWZpbmVkfG5hbiB9XG4gICAgY2hlY2thYmxlVmFyOiAgICAgeyB0eXBlOiAndmFyJywgbmFtZTogc3RyaW5nIH1cbiAgICBjaGVja2FibGVSZWNvcmQ6ICB7IHR5cGU6ICdyZWNvcmQnLCBmaWVsZHM6IG1hcCBjaGVja2FibGUgfVxuICAgIGNoZWNrYWJsZVBvbHk6ICAgIHsgdHlwZTogJ3BvbHknLCBuYW1lOiBzdHJpbmcsIGFyZ3M6IGFycmF5IGNoZWNrYWJsZSB9XG4gICAgY2hlY2thYmxlQWx0OiAgICAgeyB0eXBlOiAnYWx0Jywgb3B0aW9uczogYXJyYXkgY2hlY2thYmxlIH1cbiAgICBjaGVja2FibGVBbmQ6ICAgICB7IHR5cGU6ICdhbmQnLCBvcHRpb25zOiBhcnJheSBjaGVja2FibGUgfVxuICAgIGNoZWNrYWJsZU9wdDogICAgIHsgdHlwZTogJ29wdCcsIHRlcm06IGNoZWNrYWJsZSB9XG4gICAgY2hlY2thYmxlVXNlcjogICAgeyB0eXBlOiAndXNlcicsIHByZWRpY2F0ZTogZm4gfVxuKi9cblxuLy8gdHlwaWZ5OiB0eXBlIGNvbnRleHREZWYgPSB7IG5hbWU6IHN0cmluZywgdHlwZXNldDogYXJyYXkgY2hlY2thYmxlIH1cbi8vIHR5cGlmeTogdHlwZSBjb250ZXh0ID0gbWFwIChhcnJheSBjaGVja2FibGUpXG4vLyB0eXBpZnk6IHR5cGUgZnVuY3Rpb25UeXBlID0geyBuYW1lOiBzdHJpbmcsIGNvbnRleHQ6IGNvbnRleHQsIHBhcmFtczogYXJyYXkgY2hlY2thYmxlLCByZXN0OiBjaGVja2FibGU/LCByZXN1bHQ6IGNoZWNrYWJsZSB9XG5cbi8vIDo6IHN0cmluZyAtPiB7IHR5cGU6ICdsaXRlcmFsJywgdmFsdWU6IG51bGx8Ym9vbGVhbnxpbmZpbml0eXxuaW5maW5pdHl8dW5kZWZpbmVkfG5hbiB9IHwgY2hlY2thYmxlVmFyXG5mdW5jdGlvbiB2YXJpYWJsZShuYW1lKSB7XG4gIHN3aXRjaCAobmFtZSkge1xuICAgIGNhc2UgXCJ0cnVlXCI6IHJldHVybiB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogdHJ1ZSB9O1xuICAgIGNhc2UgXCJmYWxzZVwiOiByZXR1cm4geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IGZhbHNlIH07XG4gICAgY2FzZSBcIm51bGxcIjogcmV0dXJuIHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBudWxsIH07XG4gICAgY2FzZSBcImluZmluaXR5XCI6IHJldHVybiB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogSW5maW5pdHkgfTtcbiAgICBjYXNlIFwibmluZmluaXR5XCI6IHJldHVybiB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogLUluZmluaXR5IH07XG4gICAgY2FzZSBcInVuZGVmaW5lZFwiOiByZXR1cm4geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IHVuZGVmaW5lZCB9O1xuICAgIGNhc2UgXCJuYW5cIjogcmV0dXJuIHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBOYU4gfTtcbiAgfVxuICByZXR1cm4geyB0eXBlOiBcInZhclwiLCBuYW1lOiBuYW1lIH07XG59XG5cbi8vIDo6IG51bWJlciAtPiB7IHR5cGU6ICdsaXRlcmFsJywgdmFsdWU6IG51bWJlciB9XG5mdW5jdGlvbiBudW1iZXIodmFsdWUpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIik7XG4gIHJldHVybiB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogdmFsdWUgfTtcbn1cblxuLy8gOjogc3RyaW5nIC0+IHsgdHlwZTogJ2xpdGVyYWwnLCB2YWx1ZTogc3RyaW5nIH1cbmZ1bmN0aW9uIHN0cmluZyh2YWx1ZSkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKTtcbiAgcmV0dXJuIHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiB2YWx1ZSB9O1xufVxuXG4vLyA6OiBjaGVja2FibGUgLT4gY2hlY2thYmxlT3B0IHwgY2hlY2thYmxlQW55XG5mdW5jdGlvbiBvcHQodCkge1xuICBpZiAodC50eXBlID09PSBcImFueVwiKSB7XG4gICAgcmV0dXJuIHQ7XG4gIH0gZWxzZSBpZiAodC50eXBlID09PSBcIm9wdFwiKSB7XG4gICAgcmV0dXJuIHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHsgdHlwZTogXCJvcHRcIiwgdGVybTogdCB9O1xuICB9XG59XG5cbi8vIDo6IHN0cmluZyAtPiBhcnJheSBjaGVja2FibGUgLT4gY2hlY2thYmxlUG9seVxuZnVuY3Rpb24gcG9seShuYW1lLCBhcmdzKSB7XG4gIHJldHVybiB7IHR5cGU6IFwicG9seVwiLCBuYW1lOiBuYW1lLCBhcmdzOiBhcmdzIH07XG59XG5cbi8vIDo6IG1hcCBjaGVja2FibGUgLT4gY2hlY2thYmxlUmVjb3JkXG5mdW5jdGlvbiByZWNvcmQoZmllbGRzKSB7XG4gIHJldHVybiB7IHR5cGU6IFwicmVjb3JkXCIsIGZpZWxkczogZmllbGRzIH07XG59XG5cbi8vIDo6ICdhbmQnfCdhbHQnIC0+IGNoZWNrYWJsZSAtPiBjaGVja2FibGUgLT4gY2hlY2thYmxlIHwgYXJyYXkgY2hlY2thYmxlXG5mdW5jdGlvbiBtZXJnZU9wdGlvbnModHlwZSwgYSwgYikge1xuICBpZiAoYS50eXBlID09PSB0eXBlKSB7XG4gICAgaWYgKGIudHlwZSA9PT0gdHlwZSkge1xuICAgICAgcmV0dXJuIGEub3B0aW9ucy5jb25jYXQoYi5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGEub3B0aW9ucy5jb25jYXQoW2JdKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGIudHlwZSA9PT0gdHlwZSkge1xuICAgICAgcmV0dXJuIFthXS5jb25jYXQoYi5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFthLCBiXTtcbiAgICB9XG4gIH1cbn1cblxuLy8gOjogJ2FuZCd8J2FsdCcgLT4gYXJyYXkgY2hlY2thYmxlIC0+IGNoZWNrYWJsZVxuZnVuY3Rpb24gYW5kT3IodHlwZSwgb3B0aW9ucykge1xuICBhc3NlcnQob3B0aW9ucy5sZW5ndGggPiAwKTtcblxuICBpZiAob3B0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gb3B0aW9uc1swXTtcbiAgfVxuXG4gIHJldHVybiBvcHRpb25zLnJlZHVjZShmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgb3B0aW9uczogbWVyZ2VPcHRpb25zKHR5cGUsIGEsIGIpLFxuICAgIH07XG4gIH0pO1xufVxuXG4vLyA6OiBmbiAtPiBjaGVja2FibGVVc2VyXG5mdW5jdGlvbiB1c2VyKHByZWRpY2F0ZSkge1xuICByZXR1cm4geyB0eXBlOiBcInVzZXJcIiwgcHJlZGljYXRlOiBwcmVkaWNhdGUgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFueTogYW55LFxuICB2YXJpYWJsZTogdmFyaWFibGUsXG4gIG51bWJlcjogbnVtYmVyLFxuICBzdHJpbmc6IHN0cmluZyxcbiAgb3B0OiBvcHQsXG4gIHBvbHk6IHBvbHksXG4gIHJlY29yZDogcmVjb3JkLFxuICBhbmQ6IGFuZE9yLmJpbmQodW5kZWZpbmVkLCBcImFuZFwiKSxcbiAgYWx0OiBhbmRPci5iaW5kKHVuZGVmaW5lZCwgXCJhbHRcIiksXG4gIHVzZXI6IHVzZXIsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBBID0gcmVxdWlyZShcIi4vYXBhcnNlci5qc1wiKTtcbnZhciBjb25zID0gcmVxdWlyZShcIi4vY2hlY2thYmxlQ29uc3RydWN0b3JzLmpzXCIpO1xuXG52YXIgaWRlbnRpZmllclJlID0gL15bYS16QS1aX11bYS16QS1aMC05X10qJC87XG52YXIgbnVtYmVyUmUgPSAvXlswLTldKyQvO1xudmFyIHN0cmluZ1JlID0gL14oJ1teJ10qJ3xcIlteXCJdKlwiKSQvO1xuXG4vLyA6OiBzdHJpbmcgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNJZGVudGlmaWVyKHRva2VuKSB7XG4gIHJldHVybiBpZGVudGlmaWVyUmUudGVzdCh0b2tlbik7XG59XG5cbi8vIDo6IHN0cmluZyAtPiBib29sZWFuXG5mdW5jdGlvbiBpc051bWJlcih0b2tlbikge1xuICByZXR1cm4gbnVtYmVyUmUudGVzdCh0b2tlbik7XG59XG5cbi8vIDo6IHN0cmluZyAtPiBib29sZWFuXG5mdW5jdGlvbiBpc1N0cmluZyh0b2tlbikge1xuICByZXR1cm4gc3RyaW5nUmUudGVzdCh0b2tlbik7XG59XG5cbnZhciBhbHRQO1xuXG4vLyA6OiBmbnxUaHVuayAtPiBmblxuZnVuY3Rpb24gcGFyZW5zUChwKSB7XG4gIHJldHVybiBBLmxpZnQoQS50b2tlbihcIihcIiksIHAsIEEudG9rZW4oXCIpXCIpLCBmdW5jdGlvbihhLCBiLCBjKSB7XG4gICAgcmV0dXJuIGI7XG4gIH0pO1xufVxuXG52YXIgaWRlbnRpZmllclAgPSBBLnNhdGlzZnlpbmcoaXNJZGVudGlmaWVyKTtcblxudmFyIG51bWJlclAgPSBBLmxpZnQoQS5zYXRpc2Z5aW5nKGlzTnVtYmVyKSwgZnVuY3Rpb24gKHgpIHtcbiAgcmV0dXJuIGNvbnMubnVtYmVyKHBhcnNlRmxvYXQoeCkpO1xufSk7XG5cbnZhciBzdHJpbmdQID0gQS5saWZ0KEEuc2F0aXNmeWluZyhpc1N0cmluZyksIGZ1bmN0aW9uICh4KSB7XG4gIHggPSB4LnN1YnN0cigxLCB4Lmxlbmd0aCAtIDIpO1xuICByZXR1cm4gY29ucy5zdHJpbmcoeCk7XG59KTtcblxudmFyIGxpdGVyYWxQID0gQS5vcihudW1iZXJQLCBzdHJpbmdQKTtcblxudmFyIGFueVAgPSBBLmxpZnQoQS50b2tlbihcIipcIiksIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGNvbnMuYW55O1xufSk7XG5cbnZhciB2YXJQID0gQS5saWZ0KGlkZW50aWZpZXJQLCBjb25zLnZhcmlhYmxlKTtcblxudmFyIGVtcHR5UmVjb3JkUCA9IEEubGlmdChBLnRva2VuKFwie1wiKSwgQS50b2tlbihcIn1cIiksIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGNvbnMucmVjb3JkKHt9KTtcbn0pO1xuXG52YXIgcGFpclAgPSBBLmxpZnQoaWRlbnRpZmllclAsIEEudG9rZW4oXCI6XCIpLCBBLmRlbGF5KGZ1bmN0aW9uICgpIHsgcmV0dXJuIGFsdFA7IH0pLCBmdW5jdGlvbiAoaywgYywgdikge1xuICByZXR1cm4ge1xuICAgIGlkZW50OiBrLFxuICAgIHZhbHVlOiB2LFxuICB9O1xufSk7XG5cbnZhciBub25FbXB0eVJlY29yZFAgPSBBLmxpZnQoQS50b2tlbihcIntcIiksIEEuc2VwQnkocGFpclAsIFwiLFwiKSwgQS50b2tlbihcIn1cIiksIGZ1bmN0aW9uIChvLCBwcywgYykge1xuICB2YXIgb2JqID0ge307XG4gIHBzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICBvYmpbcC5pZGVudF0gPSBwLnZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIGNvbnMucmVjb3JkKG9iaik7XG59KTtcblxudmFyIHJlY29yZFAgPSBBLm9yKGVtcHR5UmVjb3JkUCwgbm9uRW1wdHlSZWNvcmRQKTtcblxudmFyIHRlcm1QID0gQS5vcihhbnlQLCBsaXRlcmFsUCwgdmFyUCwgcmVjb3JkUCwgcGFyZW5zUChBLmRlbGF5KGZ1bmN0aW9uICgpIHsgcmV0dXJuIGFsdFA7IH0pKSk7XG5cbnZhciBvcHRQID0gQS5saWZ0KHRlcm1QLCBBLm9wdGlvbmFsKEEudG9rZW4oXCI/XCIpKSwgZnVuY3Rpb24gKHRlcm0sIG9wdCkge1xuICBpZiAob3B0ID09PSBcIj9cIiAmJiB0ZXJtLnR5cGUgIT09IFwib3B0XCIgJiYgdGVybS50eXBlICE9PSBcImFueVwiKSB7XG4gICAgcmV0dXJuIGNvbnMub3B0KHRlcm0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG59KTtcblxudmFyIHBvbHlQMSA9IEEubGlmdChpZGVudGlmaWVyUCwgQS5zb21lKG9wdFApLCBjb25zLnBvbHkpO1xuXG52YXIgcG9seVAgPSBBLm9yKHBvbHlQMSwgb3B0UCk7XG5cbnZhciBhbmRQID0gQS5saWZ0KEEuc2VwQnkocG9seVAsIFwiJlwiKSwgY29ucy5hbmQpO1xuXG5hbHRQID0gQS5saWZ0KEEuc2VwQnkoYW5kUCwgXCJ8XCIpLCBjb25zLmFsdCk7XG5cbnZhciBjaGVja2FibGVQID0gYWx0UDtcblxudmFyIGNoZWNrYWJsZVR5cGVDaGVja1JlID0gL14oW2EtekEtWl9dW2EtekEtWjAtOV9dKnxcIlteXCJdKlwifCdbXiddKid8WzAtOV0rfDp8LHxcXHt8XFx9fFxcKnxcXD98XFx8fCZ8XFwofFxcKXxcXHMrKSokLztcbnZhciBjaGVja2FibGVUeXBlVG9rZW5SZSA9IC8oW2EtekEtWl9dW2EtekEtWjAtOV9dKnxcIlteXCJdKlwifCdbXiddKid8WzAtOV0rfDp8LHxcXHt8XFx9fFxcKnxcXD98XFx8fCZ8XFwofFxcKSkvZztcblxuLy8gOjogc3RyaW5nIC0+IGNoZWNrYWJsZVxuZnVuY3Rpb24gcGFyc2VDaGVja2FibGVUeXBlKHR5cGUpIHtcbiAgIGlmICghY2hlY2thYmxlVHlwZUNoZWNrUmUudGVzdCh0eXBlKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiaW52YWxpZCBjaGVja2FibGUgdHlwZTogXCIgKyB0eXBlKTsgfVxuICB2YXIgdG9rZW5zID0gdHlwZS5tYXRjaChjaGVja2FibGVUeXBlVG9rZW5SZSk7XG4gIHZhciBwYXJzZWQgPSBBLnBhcnNlKGNoZWNrYWJsZVAsIHRva2Vucyk7XG4gICBpZiAocGFyc2VkID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcImludmFsaWQgY2hlY2thYmxlIHR5cGU6IFwiICsgdHlwZSk7IH1cbiAgIHJldHVybiBwYXJzZWQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpZGVudGlmaWVyUDogaWRlbnRpZmllclAsXG4gIGNoZWNrYWJsZVA6IGNoZWNrYWJsZVAsXG4gIHBvbHlQOiBwb2x5UCxcbiAgcGFyc2U6IHBhcnNlQ2hlY2thYmxlVHlwZSxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIEEgPSByZXF1aXJlKFwiLi9hcGFyc2VyLmpzXCIpO1xudmFyIGlkZW50aWZpZXJQID0gcmVxdWlyZShcIi4vY2hlY2thYmxlUGFyc2VyXCIpLmlkZW50aWZpZXJQO1xudmFyIHBvbHlQID0gcmVxdWlyZShcIi4vY2hlY2thYmxlUGFyc2VyXCIpLnBvbHlQO1xudmFyIGNoZWNrYWJsZVAgPSByZXF1aXJlKFwiLi9jaGVja2FibGVQYXJzZXJcIikuY2hlY2thYmxlUDtcblxudmFyIG5hbWVQID0gQS5vcHRpb25hbChBLmxpZnQoaWRlbnRpZmllclAsIEEudG9rZW4oXCI6OlwiKSwgZnVuY3Rpb24gKGlkZW50aWZpZXIsIHNlcCkge1xuICByZXR1cm4gaWRlbnRpZmllcjtcbn0pLCBcIlwiKTtcblxudmFyIGFjdGlvblAgPSBBLmxpZnQobmFtZVAsIEEudG9rZW4oXCItPlwiKSwgY2hlY2thYmxlUCwgZnVuY3Rpb24gKG5hbWUsIGFycm93LCByZXN1bHQpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGNvbnRleHQ6IHt9LFxuICAgIHBhcmFtczogW10sXG4gICAgcmVzdDogdW5kZWZpbmVkLFxuICAgIHJlc3VsdDogcmVzdWx0LFxuICB9O1xufSk7XG5cbnZhciB0eXBlc2V0UCA9IEEuc2VwQnkocG9seVAsIFwifFwiKTtcblxudmFyIGNvbnRleHREZWZQID0gQS5saWZ0KGlkZW50aWZpZXJQLCBBLnRva2VuKFwiOlwiKSwgdHlwZXNldFAsIGZ1bmN0aW9uIChuYW1lLCBzZXAsIHR5cGVzZXQpIHtcbiAgLy8gY29uc29sZS5sb2coXCJjb250ZXh0RGVmUFwiLCBuYW1lLCB0eXBlc2V0KTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIHR5cGVzZXQ6IHR5cGVzZXQsXG4gIH07XG59KTtcblxudmFyIGNvbnRleHRQID0gQS5vcHRpb25hbChBLmxpZnQoQS5zZXBCeShjb250ZXh0RGVmUCwgXCIsXCIpLCBBLnRva2VuKFwiPT5cIiksIGZ1bmN0aW9uIChkZWZzLCBhcnJvdykge1xuICByZXR1cm4gZGVmcy5yZWR1Y2UoZnVuY3Rpb24gKGNvbnRleHQsIGRlZikge1xuICAgIGNvbnRleHRbZGVmLm5hbWVdID0gZGVmLnR5cGVzZXQ7XG4gICAgcmV0dXJuIGNvbnRleHQ7XG4gIH0sIHt9KTtcbn0pLCB7fSk7XG5cbnZhciBwYXJhbXNQID0gQS5tYW55KEEubGlmdChjaGVja2FibGVQLCBBLnRva2VuKFwiLT5cIiksIGZ1bmN0aW9uIChwYXJhbSwgYXJyb3cpIHtcbiAgcmV0dXJuIHBhcmFtO1xufSkpO1xuXG52YXIgcmVzdFAgPSBBLm9wdGlvbmFsKEEubGlmdChBLm9wdGlvbmFsKGNoZWNrYWJsZVApLCBBLnRva2VuKFwiLi4uXCIpLCBBLnRva2VuKFwiLT5cIiksIGZ1bmN0aW9uICh0eXBlLCBlbGxpcHNpcywgYXJyb3cpIHtcbiAgLy8gY29uc29sZS5sb2coXCJyZXN0UFwiLCB0eXBlLCBlbGxpcHNpcywgYXJyb3cpO1xuICByZXR1cm4gdHlwZSB8fCB7IHR5cGU6IFwiYW55XCIgfTtcbn0pKTtcblxudmFyIGZ1bmN0aW9uVHlwZVAxID0gQS5saWZ0KG5hbWVQLCBjb250ZXh0UCwgcGFyYW1zUCwgcmVzdFAsIGNoZWNrYWJsZVAsIGZ1bmN0aW9uIChuYW1lLCBjb250ZXh0LCBwYXJhbXMsIHJlc3QsIHJlc3VsdCkge1xuICAvLyBjb25zb2xlLmxvZyhcImZ1bmN0aW9uVHlwZVAxXCIsIG5hbWUsIGNvbnRleHQsIHBhcmFtcywgcmVzdCwgcmVzdWx0KTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGNvbnRleHQ6IGNvbnRleHQsXG4gICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgcmVzdDogcmVzdCxcbiAgICByZXN1bHQ6IHJlc3VsdCxcbiAgfTtcbn0pO1xuXG52YXIgZnVuY3Rpb25UeXBlUCA9IEEub3IoYWN0aW9uUCwgZnVuY3Rpb25UeXBlUDEpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZnVuY3Rpb25QOiBmdW5jdGlvblR5cGVQLFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBUeXBlIHByZWRpY2F0ZXNcblxuLy8gOjogYW55IC0+IGJvb2xlYW5cbmZ1bmN0aW9uIGlzQm9vbGVhbih2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09IFwiYm9vbGVhblwiO1xufVxuXG4vLyA6OiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNOdW1iZXIodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSBcIm51bWJlclwiO1xufVxuXG4vLyA6OiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNJbnRlZ2VyKHZhbCkge1xuICByZXR1cm4gdmFsID09PSAodmFsfDApO1xufVxuXG4vLyA6OiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNQb3NpdGl2ZSh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIgJiYgdmFsID4gMDtcbn1cblxuLy8gOjogYW55IC0+IGJvb2xlYW5cbmZ1bmN0aW9uIGlzTm9uTmVnYXRpdmUodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSBcIm51bWJlclwiICYmIHZhbCA+PSAwO1xufVxuXG4vLyA6OiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNGaW5pdGUodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSBcIm51bWJlclwiICYmIHZhbCAhPT0gSW5maW5pdHkgJiYgdmFsICE9PSAtSW5maW5pdHkgJiYgdmFsID09PSArdmFsO1xufVxuXG4vLyA6OiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNTdHJpbmcodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiO1xufVxuXG4vLyA6OiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuLy8gOjogYW55IC0+IGJvb2xlYW5cbmZ1bmN0aW9uIGlzRGF0ZSh2YWwpIHtcbiAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIERhdGU7XG59XG5cbi8vIDo6IGFueSAtPiBib29sZWFuXG5mdW5jdGlvbiBpc1JlZ0V4cCh2YWwpIHtcbiAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIFJlZ0V4cDtcbn1cblxuLy8gOjogYW55IC0+IGJvb2xlYW5cbmZ1bmN0aW9uIGlzQXJyYXkodmFsKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHZhbCk7XG59XG5cbi8vIDo6IGFueSAtPiBib29sZWFuXG5mdW5jdGlvbiBpc09iamVjdCh2YWwpIHtcbiAgcmV0dXJuIE9iamVjdCh2YWwpID09PSB2YWw7XG59XG5cbi8vIDo6IGFueSAtPiBib29sZWFuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWwpIHtcbiAgcmV0dXJuIHZhbCAmJiBpc09iamVjdChhcmd1bWVudHMpICYmIGlzSW50ZWdlcih2YWwubGVuZ3RoKSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsKSA9PT0gXCJbb2JqZWN0IEFyZ3VtZW50c11cIiB8fCBmYWxzZTtcbn1cblxuLy8gOjogKi4uLiAtPiB0cnVlXG5mdW5jdGlvbiBjb25zdFRydWUoKSB7XG4gIHJldHVybiB0cnVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNCb29sZWFuOiBpc0Jvb2xlYW4sXG4gIGlzTnVtYmVyOiBpc051bWJlcixcbiAgaXNJbnRlZ2VyOiBpc0ludGVnZXIsXG4gIGlzUG9zaXRpdmU6IGlzUG9zaXRpdmUsXG4gIGlzTm9uTmVnYXRpdmU6IGlzTm9uTmVnYXRpdmUsXG4gIGlzRmluaXRlOiBpc0Zpbml0ZSxcbiAgaXNTdHJpbmc6IGlzU3RyaW5nLFxuICBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uLFxuICBpc0RhdGU6IGlzRGF0ZSxcbiAgaXNSZWdFeHA6IGlzUmVnRXhwLFxuICBpc0FycmF5OiBpc0FycmF5LFxuICBpc09iamVjdDogaXNPYmplY3QsXG4gIGlzQXJndW1lbnRzOiBpc0FyZ3VtZW50cyxcbiAgY29uc3RUcnVlOiBjb25zdFRydWUsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xuXG4vLyA6OiBib29sZWFuIC0+IHN0cmluZyAtPiBzdHJpbmdcbmZ1bmN0aW9uIHBhcmVuc1MoZ3VhcmQsIHN0cikge1xuICByZXR1cm4gZ3VhcmQgPyBcIihcIiArIHN0ciArIFwiKVwiIDogc3RyO1xufVxuXG4vLyBGb3J3YXJkIGRlY2xhcmF0aW9uXG52YXIgc2hvd0NoZWNrYWJsZVR5cGVQcmVjZWRlbmNlO1xuXG4vLyA6OiBjaGVja2FibGVMaXRlcmFsIC0+IHN0cmluZ1xuZnVuY3Rpb24gc2hvd0xpdGVyYWwodHlwZSkge1xuICBpZiAodHlwZW9mIHR5cGUudmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gXCInXCIgKyB0eXBlLnZhbHVlICsgXCInXCI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFwiXCIgKyB0eXBlLnZhbHVlO1xuICB9XG59XG5cbi8vIDo6IGNoZWNrYWJsZVJlY29yZCAtPiBzdHJpbmdcbmZ1bmN0aW9uIHNob3dSZWNvcmQodHlwZSkge1xuICB2YXIgcGFpcnMgPSBbXTtcbiAgZm9yICh2YXIgdCBpbiB0eXBlLmZpZWxkcykge1xuICAgIHBhaXJzLnB1c2godCArIFwiOiBcIiArIHNob3dDaGVja2FibGVUeXBlUHJlY2VkZW5jZSgwLCB0eXBlLmZpZWxkc1t0XSkpO1xuICB9XG4gIHJldHVybiBcIntcIiArIHBhaXJzLmpvaW4oXCIsIFwiKSArIFwifVwiO1xufVxuXG4vLyA6OiBuYXQgLT4gY2hlY2thYmxlIC0+IHN0cmluZ1xuZnVuY3Rpb24gc2hvd0NoZWNrYWJsZVR5cGVQcmVjZWRlbmNlKHByZWNlZGVuY2UsIHR5cGUpIHtcbiAgc3dpdGNoICh0eXBlLnR5cGUpIHtcbiAgICBjYXNlIFwiYW55XCI6IHJldHVybiBcIipcIjtcbiAgICBjYXNlIFwibGl0ZXJhbFwiOiByZXR1cm4gc2hvd0xpdGVyYWwodHlwZSk7XG4gICAgY2FzZSBcInZhclwiOiByZXR1cm4gdHlwZS5uYW1lO1xuICAgIGNhc2UgXCJyZWNvcmRcIjpcbiAgICAgIHJldHVybiBzaG93UmVjb3JkKHR5cGUpO1xuICAgIGNhc2UgXCJhbHRcIjpcbiAgICAgIHJldHVybiBwYXJlbnNTKHByZWNlZGVuY2UgPiAwLFxuICAgICAgICB1dGlscy5tYXAodHlwZS5vcHRpb25zLCBzaG93Q2hlY2thYmxlVHlwZVByZWNlZGVuY2UuYmluZCh1bmRlZmluZWQsIDApKS5qb2luKFwifFwiKSk7XG4gICAgY2FzZSBcImFuZFwiOlxuICAgICAgcmV0dXJuIHBhcmVuc1MocHJlY2VkZW5jZSA+IDEsXG4gICAgICAgIHV0aWxzLm1hcCh0eXBlLm9wdGlvbnMsIHNob3dDaGVja2FibGVUeXBlUHJlY2VkZW5jZS5iaW5kKHVuZGVmaW5lZCwgMSkpLmpvaW4oXCImXCIpKTtcbiAgICBjYXNlIFwicG9seVwiOlxuICAgICAgcmV0dXJuIHBhcmVuc1MocHJlY2VkZW5jZSA+IDIsXG4gICAgICAgIHR5cGUubmFtZSArIFwiIFwiICsgdXRpbHMubWFwKHR5cGUuYXJncywgc2hvd0NoZWNrYWJsZVR5cGVQcmVjZWRlbmNlLmJpbmQodW5kZWZpbmVkLCAzKSkuam9pbihcIiBcIikpO1xuICAgIGNhc2UgXCJvcHRcIjpcbiAgICAgIHJldHVybiBwYXJlbnNTKHByZWNlZGVuY2UgPiAzLFxuICAgICAgICBzaG93Q2hlY2thYmxlVHlwZVByZWNlZGVuY2UoMywgdHlwZS50ZXJtKSArIFwiP1wiKTtcbiAgfVxufVxuXG4vLyA6OiBjaGVja2FibGUgLT4gc3RyaW5nXG5mdW5jdGlvbiBzaG93Q2hlY2thYmxlVHlwZSh0eXBlKSB7XG4gIHJldHVybiBzaG93Q2hlY2thYmxlVHlwZVByZWNlZGVuY2UoMCwgdHlwZSk7XG59XG5cbi8vIDo6IG1hcCAoYXJyYXkgY2hlY2thYmxlKSAtPiBzdHJpbmdcbmZ1bmN0aW9uIHNob3dDb250ZXh0KGNvbnRleHQpIHtcbiAgdmFyIHJlcyA9IFwiXCI7XG4gIGZvciAodmFyIG5hbWUgaW4gY29udGV4dCkge1xuICAgIHJlcyArPSBuYW1lICsgXCIgOiBcIiArIHV0aWxzLm1hcChjb250ZXh0W25hbWVdLCBzaG93Q2hlY2thYmxlVHlwZVByZWNlZGVuY2UuYmluZCh1bmRlZmluZWQsIDEpKS5qb2luKFwiIHwgXCIpO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjaGVja2FibGU6IHNob3dDaGVja2FibGVUeXBlLFxuICBjb250ZXh0OiBzaG93Q29udGV4dCxcbn07XG4iLCIvKlxuKiB0eXBpZnlcbiogaHR0cHM6Ly9naXRodWIuY29tL3BoYWRlai90eXBpZnlcbipcbiogQ29weXJpZ2h0IChjKSAyMDEzIE9sZWcgR3JlbnJ1c1xuKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4qL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBWRVJTSU9OID0gWzAsIDIsIDZdO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKTtcbnZhciBwID0gcmVxdWlyZShcIi4vcHJlZGljYXRlcy5qc1wiKTtcbnZhciBBID0gcmVxdWlyZShcIi4vYXBhcnNlci5qc1wiKTtcbnZhciBjID0gcmVxdWlyZShcIi4vY2hlY2thYmxlQ29tcGlsZXIuanNcIik7XG52YXIgY29ucyA9IHJlcXVpcmUoXCIuL2NoZWNrYWJsZUNvbnN0cnVjdG9ycy5qc1wiKTtcbnZhciBzaG93ID0gcmVxdWlyZShcIi4vc2hvdy5qc1wiKTtcbnZhciBwYXJzZUNoZWNrYWJsZVR5cGUgPSByZXF1aXJlKFwiLi9jaGVja2FibGVQYXJzZXJcIikucGFyc2U7XG52YXIgY29tcGlsZUNoZWNrYWJsZVR5cGUgPSBjLmNvbXBpbGU7XG52YXIgY29tcGlsZUNoZWNrYWJsZVR5cGVSZWN1cnNpdmUgPSBjLmNvbXBpbGVSZWN1cnNpdmU7XG52YXIgZnVuY3Rpb25QID0gcmVxdWlyZShcIi4vZnVuY3Rpb25QYXJzZXIuanNcIikuZnVuY3Rpb25QO1xuXG4vLyBGZXcgYWxtb3N0IHByZWRpY2F0ZXNcbi8vIDo6ICouLi4gLT4gKlxuZnVuY3Rpb24gdGhyb3dBbHdheXMoKSB7XG4gIHRocm93IG5ldyBFcnJvcihcInRoaXMgc2hvdWxkbid0IGJlZW4gY2FsbGVkXCIpO1xufVxuXG52YXIgZnVuY3Rpb25UeXBlQ2hlY2tSZSA9IC9eKFthLXpBLVpfXVthLXpBLVowLTlfXSp8XCJbXlwiXSpcInwnW14nXSonfFswLTldK3xcXCp8XFw/fFxcfHwmfFxcKHxcXCl8XFx7fFxcfXw6Onw6fCx8PT58LT58XFwuXFwuXFwufFxccyspKiQvO1xudmFyIGZ1bmN0aW9uVHlwZVRva2VuUmUgPSAvKFthLXpBLVpfXVthLXpBLVowLTlfXSp8XCJbXlwiXSpcInwnW14nXSonfFswLTldK3xcXCp8XFw/fFxcfHwmfFxcKHxcXCl8XFx7fFxcfXw6Onw6fCx8PT58LT58XFwuXFwuXFwuKS9nO1xuXG4vLyBGdW5jdGlvbiB0eXBlIHBhcnNpbmcsIGNoZWNrcyBwcmUtY29tcGlsaW5nICYgcHJldHR5LXByaW50aW5nXG5cbi8vIDo6IGNoZWNrYWJsZSAtPiAqLi4uIC0+IGJvb2xlYW5cbmZ1bmN0aW9uIG9wdGlvbmFsKHBhcnNlZCkge1xuICBpZiAocGFyc2VkLnR5cGUgPT09IFwiYW55XCIpIHsgcmV0dXJuIHRydWU7IH1cbiAgaWYgKHBhcnNlZC50eXBlID09PSBcIm9wdFwiKSB7IHJldHVybiB0cnVlOyB9XG4gIGlmIChwYXJzZWQudHlwZSA9PT0gXCJhbHRcIikgeyByZXR1cm4gcGFyc2VkLm9wdGlvbnMuc29tZShvcHRpb25hbCk7IH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyA6OiBmdW5jdGlvblR5cGUgLT4gbmF0IHwgaW5maW5pdHlcbmZ1bmN0aW9uIG1heFBhcmFtc0YocGFyc2VkKSB7XG4gIHJldHVybiBwYXJzZWQucmVzdCA9PT0gdW5kZWZpbmVkID8gcGFyc2VkLnBhcmFtcy5sZW5ndGggOiBJbmZpbml0eTtcbn1cblxuLy8gOjogZnVuY3Rpb25UeXBlIC0+IG5hdFxuZnVuY3Rpb24gbWluUGFyYW1zRihwYXJzZWQpIHtcbiAgdmFyIHJlc3VsdCA9IHBhcnNlZC5wYXJhbXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gcmVzdWx0IC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoIW9wdGlvbmFsKHBhcnNlZC5wYXJhbXNbaV0pKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmVzdWx0ID0gaTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyA6OiBFbnZpcm9ubWVudCAtPiBtYXAgKGFycmF5IGNoZWNrYWJsZSkgLT4gbWFwIChhcnJheSBmbilcbmZ1bmN0aW9uIGNvbXBpbGVDb250ZXh0KGVudmlyb25tZW50LCBjb250ZXh0KSB7XG4gIHJldHVybiB1dGlscy5tYXBWYWx1ZXMoY29udGV4dCwgZnVuY3Rpb24gKHYpIHtcbiAgICByZXR1cm4gdXRpbHMubWFwKHYsIGNvbXBpbGVDaGVja2FibGVUeXBlLmJpbmQodW5kZWZpbmVkLCBlbnZpcm9ubWVudCwgY29udGV4dCkpO1xuICB9KTtcbn1cblxuLy8gOjogc3RyaW5nIC0+IGZ1bmN0aW9uVHlwZVxuZnVuY3Rpb24gcGFyc2VGdW5jdGlvblR5cGUodHlwZSkge1xuICBpZiAoIWZ1bmN0aW9uVHlwZUNoZWNrUmUudGVzdCh0eXBlKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiaW52YWxpZCBmdW5jdGlvbiB0eXBlOiBcIiArIHR5cGUpOyB9XG4gIHZhciB0b2tlbnMgPSB0eXBlLm1hdGNoKGZ1bmN0aW9uVHlwZVRva2VuUmUpO1xuICB2YXIgcGFyc2VkID0gQS5wYXJzZShmdW5jdGlvblAsIHRva2Vucyk7XG4gIGlmIChwYXJzZWQgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiaW52YWxpZCBmdW5jdGlvbiB0eXBlOiBcIiArIHR5cGUpOyB9XG4gIHJldHVybiBwYXJzZWQ7XG59XG5cbi8vIDo6IEVudmlyb25tZW50IC0+IGZ1bmN0aW9uVHlwZSAtPiAqXG5mdW5jdGlvbiBjb21waWxlRnVuY3Rpb25UeXBlKGVudmlyb25tZW50LCBwYXJzZWQpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBwYXJzZWQubmFtZSxcbiAgICBjb250ZXh0OiBjb21waWxlQ29udGV4dChlbnZpcm9ubWVudCwgcGFyc2VkLmNvbnRleHQpLFxuICAgIHBhcmFtczogdXRpbHMubWFwKHBhcnNlZC5wYXJhbXMsIGNvbXBpbGVDaGVja2FibGVUeXBlLmJpbmQodW5kZWZpbmVkLCBlbnZpcm9ubWVudCwgcGFyc2VkLmNvbnRleHQpKSxcbiAgICByZXN0OiBwYXJzZWQucmVzdCAmJiBjb21waWxlQ2hlY2thYmxlVHlwZShlbnZpcm9ubWVudCwgcGFyc2VkLmNvbnRleHQsIHBhcnNlZC5yZXN0KSxcbiAgICByZXN1bHQ6IGNvbXBpbGVDaGVja2FibGVUeXBlKGVudmlyb25tZW50LCBwYXJzZWQuY29udGV4dCwgcGFyc2VkLnJlc3VsdCksXG4gICAgbWluUGFyYW1zOiBtaW5QYXJhbXNGKHBhcnNlZCksXG4gICAgbWF4UGFyYW1zOiBtYXhQYXJhbXNGKHBhcnNlZCksXG4gIH07XG59XG5cbi8vIDo6IG1hcCAoYXJyYXkgZm4pIC0+IGZuIC0+IHN0cmluZyAtPiAqLi4uIC0+ICBib29sZWFuXG5mdW5jdGlvbiBjb250ZXh0Q2hlY2tHZW5lcmljKGNvbnRleHQsIGNvbXBpbGVkLCB2YXJuYW1lKSB7XG4gIHZhciBvcHRpb25zID0gY29udGV4dFt2YXJuYW1lXTtcbiAgdmFyIGFyZ3MgPSB1dGlscy5zbGljZShhcmd1bWVudHMsIDMpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBvcHRpb24gPSBvcHRpb25zW2ldO1xuICAgIHZhciByZXMgPSBvcHRpb24uYXBwbHkodW5kZWZpbmVkLCBbY29tcGlsZWRdLmNvbmNhdChhcmdzKSk7XG4gICAgaWYgKHJlcykge1xuICAgICAgY29udGV4dFt2YXJuYW1lXSA9IFtvcHRpb25dO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gRGVjb3JhdGUgZnVuY3Rpb24gd2l0aCB0eXBlLXNpZ25hdHVyZSBjaGVja1xuZnVuY3Rpb24gZGVjb3JhdGUoZW52aXJvbm1lbnQsIHR5cGUsIG1ldGhvZCkge1xuICB2YXIgcGFyc2VkID0gcGFyc2VGdW5jdGlvblR5cGUodHlwZSk7XG4gIHZhciBjb21waWxlZCA9IGNvbXBpbGVGdW5jdGlvblR5cGUoZW52aXJvbm1lbnQsIHBhcnNlZCk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIC8vIGNoZWNrIHRoZXJlIGFyZSBlbm91Z2ggcGFyYW1ldGVyc1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgY29tcGlsZWQubWluUGFyYW1zIHx8IGFyZ3VtZW50cy5sZW5ndGggPiBjb21waWxlZC5tYXhQYXJhbXMpIHtcbiAgICAgIGlmIChjb21waWxlZC5taW5QYXJhbXMgPT09IGNvbXBpbGVkLm1heFBhcmFtcykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZnVuY3Rpb24gXCIgKyBjb21waWxlZC5uYW1lICsgXCIgZXhwZWN0cyBcIiArIGNvbXBpbGVkLm1heFBhcmFtcyArIFwiIGFyZ3VtZW50cywgXCIgKyBhcmd1bWVudHMubGVuZ3RoICsgXCIgZ2l2ZW5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZnVuY3Rpb24gXCIgKyBjb21waWxlZC5uYW1lICsgXCIgZXhwZWN0cyBcIiArIGNvbXBpbGVkLm1pblBhcmFtcyArIFwiLVwiICsgY29tcGlsZWQubWF4UGFyYW1zICsgXCIgYXJndW1lbnRzLCBcIiArIGFyZ3VtZW50cy5sZW5ndGggKyBcIiBnaXZlblwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29udGV4dENoZWNrVW4gPSBjb250ZXh0Q2hlY2tHZW5lcmljLmJpbmQodW5kZWZpbmVkLCB1dGlscy5jb3B5T2JqKGNvbXBpbGVkLmNvbnRleHQpKTtcbiAgICB2YXIgY29udGV4dENoZWNrID0gdXRpbHMueShjb250ZXh0Q2hlY2tVbik7XG5cbiAgICAvLyBjaGVjayB0aGF0IHBhcmFtZXRlcnMgYXJlIG9mIHJpZ2h0IHR5cGVcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGFyZ0NoZWNrID0gaSA8IGNvbXBpbGVkLnBhcmFtcy5sZW5ndGggPyBjb21waWxlZC5wYXJhbXNbaV0gOiBjb21waWxlZC5yZXN0O1xuICAgICAgdmFyIGFyZ1R5cGUgPSAgaSA8IGNvbXBpbGVkLnBhcmFtcy5sZW5ndGggPyBwYXJzZWQucGFyYW1zW2ldIDogcGFyc2VkLnJlc3Q7XG4gICAgICBpZiAoIWFyZ0NoZWNrKGNvbnRleHRDaGVjaywgYXJndW1lbnRzW2ldKSkge1xuICAgICAgICAvLyBUT0RPOiBzdHIgY2hlY2thYmxlIHR5cGVcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInR5cGUgb2YgXCIgKyBwYXJzZWQubmFtZSArIFwiIFwiICsgKGkrMSkgKyBcIi4gcGFyYW1ldGVyIGlzIG5vdCBgXCIgKyBzaG93LmNoZWNrYWJsZShhcmdUeXBlKSArIFwiYCBpbiBjb250ZXh0IGBcIiArIHNob3cuY29udGV4dChwYXJzZWQuY29udGV4dCkgKyBcImAgLS0gXCIgKyBKU09OLnN0cmluZ2lmeShhcmd1bWVudHNbaV0pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjYWxsIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgdmFyIHIgPSBtZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIC8vIGNoZWNrIHR5cGUgb2YgcmV0dXJuIHZhbHVlXG4gICAgaWYgKCFjb21waWxlZC5yZXN1bHQoY29udGV4dENoZWNrLCByKSkge1xuICAgICAgLy8gVE9ETzogc3RyIGNoZWNrYWJsZSB0eXBlXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwidHlwZSBvZiBgXCIgKyBwYXJzZWQubmFtZSArIFwiYCByZXR1cm4gdmFsdWUgaXMgbm90IGBcIiArIHNob3cuY2hlY2thYmxlKHBhcnNlZC5yZXN1bHQpICsgXCJgIGluIGNvbnRleHQgYFwiICsgc2hvdy5jb250ZXh0KHBhcnNlZC5jb250ZXh0KSArIFwiYCAtLSBcIiArIHIpO1xuICAgIH1cblxuICAgIC8vIHJldHVyblxuICAgIHJldHVybiByO1xuICB9O1xufVxuXG4vLyB0eXBpZnk6IHR5cGUgY2hlY2thYmxlRW1iZWRkZWQgPSBzdHJpbmcgfCBmbiB8IGFycmF5IGNoZWNrYWJsZUVtYmVkZGVkIHwgbWFwIGNoZWNrYWJsZUVtYmVkZGVkXG4vLyA6OiBjaGVja2FibGVFbWJlZGRlZCAtPiBjaGVja2FibGVcbmZ1bmN0aW9uIHBhcnNlKGRlZmluaXRpb24pIHtcbiAgaWYgKHAuaXNTdHJpbmcoZGVmaW5pdGlvbikpIHtcbiAgICByZXR1cm4gcGFyc2VDaGVja2FibGVUeXBlKGRlZmluaXRpb24pO1xuICB9IGVsc2UgaWYgKHAuaXNGdW5jdGlvbihkZWZpbml0aW9uKSkge1xuICAgIHJldHVybiBjb25zLnVzZXIoZGVmaW5pdGlvbik7XG4gIH0gZWxzZSBpZiAocC5pc0FycmF5KGRlZmluaXRpb24pKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB1dGlscy5tYXAoZGVmaW5pdGlvbiwgcGFyc2UpO1xuICAgIHJldHVybiBjb25zLmFsdChvcHRpb25zKTtcbiAgfSBlbHNlIC8qIGlmIChwLmlzT2JqZWN0KGRlZmluaXRpb24pKSAqLyB7XG4gICAgdmFyIGZpZWxkcyA9IHV0aWxzLm1hcFZhbHVlcyhkZWZpbml0aW9uLCBwYXJzZSk7XG4gICAgcmV0dXJuIGNvbnMucmVjb3JkKGZpZWxkcyk7XG4gIH1cbn1cblxuLy8gQ2hlY2sgY2hlY2thYmxlIHR5cGVcbmZ1bmN0aW9uIGNoZWNrKGVudmlyb25tZW50LCB0eXBlLCB2YXJpYWJsZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCAhPT0gMiAmJiBhcmd1bWVudHMubGVuZ3RoICE9PSAzKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNoZWNrIHRha2VzIDEgb3IgMiBhcmd1bWVudHMsIFwiICsgKGFyZ3VtZW50cy5sZW5ndGgtMSkgKyBcIiBwcm92aWRlZFwiKTtcbiAgfVxuXG4gIHZhciBwYXJzZWQgPSBwYXJzZUNoZWNrYWJsZVR5cGUodHlwZSk7XG4gIC8vIGNvbnNvbGUubG9nKHBhcnNlZCk7XG4gIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHBhcnNlZCwgbnVsbCkpO1xuICB2YXIgY29tcGlsZWQgPSBjb21waWxlQ2hlY2thYmxlVHlwZShlbnZpcm9ubWVudCwge30sIHBhcnNlZCk7IC8vIHVzaW5nIGVtcHR5IGNvbnRleHRcblxuICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbiAodmFyaWFibGUxKSB7XG4gICAgICByZXR1cm4gY29tcGlsZWQodGhyb3dBbHdheXMsIHZhcmlhYmxlMSkgPT09IHRydWU7XG4gICAgfTtcbiAgICBjYXNlIDM6XG4gICAgICByZXR1cm4gY29tcGlsZWQodGhyb3dBbHdheXMsIHZhcmlhYmxlKSA9PT0gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnQoZW52aXJvbm1lbnQsIHR5cGUsIHZhcmlhYmxlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAyICYmIGFyZ3VtZW50cy5sZW5ndGggIT09IDMpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXNzZXJ0IHRha2VzIDEgb3IgMiBhcmd1bWVudHMsIFwiICsgKGFyZ3VtZW50cy5sZW5ndGgtMSkgKyBcIiBwcm92aWRlZFwiKTtcbiAgfVxuXG4gIHZhciBwYXJzZWQgPSBwYXJzZUNoZWNrYWJsZVR5cGUodHlwZSk7XG4gIC8vIGNvbnNvbGUubG9nKHBhcnNlZCk7XG4gIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHBhcnNlZCwgbnVsbCkpO1xuICB2YXIgY29tcGlsZWQgPSBjb21waWxlQ2hlY2thYmxlVHlwZShlbnZpcm9ubWVudCwge30sIHBhcnNlZCk7IC8vIHVzaW5nIGVtcHR5IGNvbnRleHRcblxuICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbiAodmFyaWFibGUxKSB7XG4gICAgICB2YXIgcmVzdWx0MSA9IGNvbXBpbGVkKHRocm93QWx3YXlzLCB2YXJpYWJsZTEpO1xuICAgICAgaWYgKHJlc3VsdDEgIT09IHRydWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihyZXN1bHQxKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGNhc2UgMzpcbiAgICAgIHZhciByZXN1bHQgPSBjb21waWxlZCh0aHJvd0Fsd2F5cywgdmFyaWFibGUpO1xuICAgICAgaWYgKHJlc3VsdCAhPT0gdHJ1ZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHJlc3VsdCk7XG4gICAgICB9XG4gIH1cbn1cblxuLy8gQWRkIHNpbmdsZSBwYXJzYWJsZSB0eXBlXG4vLyA6OiBFbnZpcm9ubWVudCAtPiBtYXAgY2hlY2thYmxlIC0+IHVuZGVmaW5lZFxuZnVuY3Rpb24gYWRkUGFyc2VkVHlwZXMoZW52aXJvbm1lbnQsIHBhcnNlZCkge1xuICB2YXIgbmFtZXMgPSBPYmplY3Qua2V5cyhwYXJzZWQpO1xuICBuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKGVudmlyb25tZW50LmhhcyhuYW1lKSkgeyB0aHJvdyBuZXcgRXJyb3IobmFtZSArIFwiIGlzIGFscmVhZHkgZGVmaW5lZFwiKTsgfVxuICB9KTtcblxuICB2YXIgY29tcGlsZWQgPSB1dGlscy5tYXBWYWx1ZXMocGFyc2VkLCBjb21waWxlQ2hlY2thYmxlVHlwZVJlY3Vyc2l2ZS5iaW5kKHVuZGVmaW5lZCwgZW52aXJvbm1lbnQsIHt9LCBuYW1lcykpO1xuICB2YXIgY2hlY2tzID0gdXRpbHMubWFwVmFsdWVzKGNvbXBpbGVkLCBmdW5jdGlvbiAoY2hlY2spIHtcbiAgICByZXR1cm4gY2hlY2suYmluZCh1bmRlZmluZWQsIGNvbXBpbGVkLCB0aHJvd0Fsd2F5cyk7XG4gIH0pO1xuXG4gIGVudmlyb25tZW50LmFkZChjaGVja3MpO1xufVxuXG5mdW5jdGlvbiBhZGRUeXBlKGVudmlyb25tZW50LCBuYW1lLCBkZWZpbml0aW9uKSB7XG4gIHZhciBwYXJzZWQgPSB7fTtcbiAgcGFyc2VkW25hbWVdID0gcGFyc2UoZGVmaW5pdGlvbik7XG4gIHJldHVybiBhZGRQYXJzZWRUeXBlcyhlbnZpcm9ubWVudCwgcGFyc2VkKTtcbn1cblxuLy8gT3IgbWFueSBzaW11bHRhbm91c2x0eVxuZnVuY3Rpb24gbXV0dWFsKGVudmlyb25tZW50LCBkZWZpbml0aW9ucykge1xuICB2YXIgcGFyc2VkID0gdXRpbHMubWFwVmFsdWVzKGRlZmluaXRpb25zLCBwYXJzZSk7XG4gIHJldHVybiBhZGRQYXJzZWRUeXBlcyhlbnZpcm9ubWVudCwgcGFyc2VkKTtcbn1cblxuZnVuY3Rpb24gYWR0KGVudmlyb25tZW50LCBuYW1lLCBkZWZpbml0aW9ucykge1xuICBpZiAodXRpbHMuaGFzKGRlZmluaXRpb25zLCBuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImFkdCBhbmQgaXQncyBjb25zdHJ1Y3RvciBjYW5ub3QgaGFzIHRoZSBzYW1lIG5hbWVcIik7XG4gIH1cblxuICB2YXIgY29uc3RydWN0b3JzID0gT2JqZWN0LmtleXMoZGVmaW5pdGlvbnMpO1xuICB2YXIgcGFyc2VkID0gdXRpbHMubWFwVmFsdWVzKGRlZmluaXRpb25zLCBwYXJzZSk7XG4gIHBhcnNlZFtuYW1lXSA9IHBhcnNlKGNvbnN0cnVjdG9ycyk7XG5cbiAgcmV0dXJuIGFkZFBhcnNlZFR5cGVzKGVudmlyb25tZW50LCBwYXJzZWQpO1xufVxuXG5mdW5jdGlvbiBpbnN0YW5jZShlbnZpcm9ubWVudCwgbmFtZSwgY2xzKSB7XG4gIHJldHVybiBhZGRUeXBlKGVudmlyb25tZW50LCBuYW1lLCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgcmV0dXJuIGFyZyBpbnN0YW5jZW9mIGNscztcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHdyYXAoZW52aXJvbm1lbnQsIG1vZHVsZSwgc2lnbmF0dXJlcykge1xuICBmb3IgKHZhciBmbiBpbiBzaWduYXR1cmVzKSB7XG4gICAgbW9kdWxlW2ZuXSA9IGRlY29yYXRlKGVudmlyb25tZW50LCBmbiArIFwiIDo6IFwiICsgc2lnbmF0dXJlc1tmbl0sIG1vZHVsZVtmbl0pO1xuICB9XG5cbiAgcmV0dXJuIG1vZHVsZTtcbn1cblxudmFyIGJ1aWxkSW5UeXBlcyA9IHJlcXVpcmUoXCIuL2J1aWx0aW4uanNcIik7XG5cbi8vIHR5cGlmeTogaW5zdGFuY2UgRW52aXJvbm1lbnRcbi8vIDo6IC0+IHVuZGVmaW5lZFxuZnVuY3Rpb24gRW52aXJvbm1lbnQoKSB7XG4gIHRoaXMudHlwZXMgPSB7fTtcbn1cblxuRW52aXJvbm1lbnQucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIGVudmlyb25tZW50SGFzKHR5cGUpIHtcbiAgcmV0dXJuIHV0aWxzLmhhcyh0aGlzLnR5cGVzLCB0eXBlKSB8fCB1dGlscy5oYXMoYnVpbGRJblR5cGVzLCB0eXBlKTtcbn07XG5cbkVudmlyb25tZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBlbnZpcm9ubWVudEdldCh0eXBlKSB7XG4gIHJldHVybiB0aGlzLnR5cGVzW3R5cGVdIHx8IGJ1aWxkSW5UeXBlc1t0eXBlXTtcbn07XG5cbkVudmlyb25tZW50LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBlbnZpcm9ubWVudEFkZChjaGVja3MpIHtcbiAgT2JqZWN0LmtleXMoY2hlY2tzKS5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdGhpcy50eXBlc1t0eXBlXSA9IGNoZWNrc1t0eXBlXTtcbiAgfSwgdGhpcyk7XG59O1xuXG4vLyB0eXBpZnkgcHVibGljIEFQSSB0eXBlIHNpZ25hdHVyZXNcbnZhciBUWVBFX1NJR05BVFVSRVMgPSB7XG4gIC8vIFRPRE86IGNoYW5nZSBmbiB0byBtdWx0aSB0eXBlIGFuZCBkZXByZWNhdGUgYWxpYXMgJiByZWNvcmRcbiAgdHlwZTogXCJzdHJpbmcgLT4gZm4gLT4gKlwiLFxuLy8gVE9ETzogc3VwcG9ydCBhbHRlcm5hdGl2ZSBmdW5jdGlvbiBzaWduYXR1cmVzXG4vLyBUT0RPOiBzdXBwb3J0IHNwZWNpZnlpbmcgcmVxdWlyZWQgYnV0IFwiYW55XCIgcGFyYW1ldGVyXG4vLyAgY2hlY2s6IFwic3RyaW5nIC0+ICogLT4gYm9vbGVhblwiLFxuICBhbGlhczogXCJzdHJpbmcgLT4gc3RyaW5nIC0+ICpcIixcbiAgcmVjb3JkOiBcInN0cmluZyAtPiBtYXAgc3RyaW5nIC0+ICpcIixcbiAgbXV0dWFsOiBcIm1hcCBzdHJpbmcgLT4gKlwiLFxuICBpbnN0YW5jZTogXCJzdHJpbmcgLT4gZm4gLT4gKlwiLFxuICB3cmFwOiBcIiogLT4gbWFwIHN0cmluZyAtPiAqXCIsXG4gIGFkdDogXCJzdHJpbmcgLT4gbWFwIHN0cmluZyAtPiAqXCIsXG59O1xuXG4vLyBDcmVhdGUgdHlwaWZ5XG4vLyBXZSBjb3VsZCB3YW50IHVzZSBwcm90b3R5cGUtc3R5bGUsIGluc3RlYWQgb2YgY2xvc3VyZSwgYnV0IHdlIGNhbm5vdCBtYWtlIGNhbGxhYmxlIG9iamVjdHMuXG4vLyBUT0RPOiBhZGQgcmVmZXJlbmNlXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBlbnYgPSBuZXcgRW52aXJvbm1lbnQoKTtcblxuICB2YXIgdHlwaWZ5ID0gZGVjb3JhdGUuYmluZCh1bmRlZmluZWQsIGVudik7XG4gIHR5cGlmeS50eXBlID0gYWRkVHlwZS5iaW5kKHVuZGVmaW5lZCwgZW52KTtcbiAgdHlwaWZ5LmFsaWFzID0gYWRkVHlwZS5iaW5kKHVuZGVmaW5lZCwgZW52KTtcbiAgdHlwaWZ5LnJlY29yZCA9IGFkZFR5cGUuYmluZCh1bmRlZmluZWQsIGVudik7XG4gIHR5cGlmeS5tdXR1YWwgPSBtdXR1YWwuYmluZCh1bmRlZmluZWQsIGVudik7XG4gIHR5cGlmeS5hZHQgPSBhZHQuYmluZCh1bmRlZmluZWQsIGVudik7XG4gIHR5cGlmeS5pbnN0YW5jZSA9IGluc3RhbmNlLmJpbmQodW5kZWZpbmVkLCBlbnYpO1xuICB0eXBpZnkuY2hlY2sgPSBjaGVjay5iaW5kKHVuZGVmaW5lZCwgZW52KTtcbiAgdHlwaWZ5LmFzc2VydCA9IGFzc2VydC5iaW5kKHVuZGVmaW5lZCwgZW52KTtcbiAgdHlwaWZ5LndyYXAgPSB3cmFwLmJpbmQodW5kZWZpbmVkLCBlbnYpO1xuICB0eXBpZnkudmVyc2lvbiA9IFZFUlNJT047XG5cbiAgLy8gYWxzbyBhZGQgcmVjdXJzaXZlIGNyZWF0ZVxuICAvLyBtYWtlIHJlY3Vyc2l2ZSBlbnZpcm9ubWVudHMgb3IganVzdCBwb3NzaWJsZSB0byBtZXJnZSB0eXBlcyBmcm9tIG9sZD9cbiAgdHlwaWZ5LmNyZWF0ZSA9IGNyZWF0ZTtcblxuICByZXR1cm4gdHlwaWZ5LndyYXAodHlwaWZ5LCBUWVBFX1NJR05BVFVSRVMpO1xufVxuXG4vLyBFeHBvcnQgIHN0dWZmXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZSgpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIERvZXMgdGhlIG9iamVjdCBjb250YWluIGdpdmVuIGtleT8gaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2hhc1xuLy8gOjogbWFwIC0+IHN0cmluZyAtPiBib29sZWFuXG5mdW5jdGlvbiBoYXMob2JqZWN0LCBwcm9wZXJ0eSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpO1xufVxuXG4vLyA6OiBhcnJheSAtPiBhbnkgLT4gYm9vbGVhblxuZnVuY3Rpb24gY29udGFpbnMoYXJyYXksIGVsZW1lbnQpIHtcbiAgcmV0dXJuIGFycmF5LmluZGV4T2YoZWxlbWVudCkgIT09IC0xO1xufVxuXG4vLyBDcmVhdGUgYSBzaGFsbG93LWNvcGllZCBjbG9uZSBvZiB0aGUgb2JqZWN0LiBodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jY2xvbmVcbi8vIDo6IG1hcCAtPiBtYXBcbmZ1bmN0aW9uIGNvcHlPYmoob2JqKSB7XG4gIHZhciByZXMgPSB7fTtcbiAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICByZXNba10gPSBvYmpba107XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuLy8gUmV0dXJucyB2YWx1ZXMgb2YgdGhlIG9iamVjdFxuLy8gOjogbWFwIC0+IGFycmF5XG5mdW5jdGlvbiB2YWx1ZXMob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICBpZiAoaGFzKG9iaiwgaykpIHtcbiAgICAgIHJlcy5wdXNoKG9ialtrXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59XG5cbi8vIDo6IG1hcCAtPiBmbiAtPiBtYXBcbmZ1bmN0aW9uIG1hcFZhbHVlcyhvYmosIGYpIHtcbiAgdmFyIHJlcyA9IHt9O1xuICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgIGlmIChoYXMob2JqLCBrKSkge1xuICAgICAgcmVzW2tdID0gZihvYmpba10pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG4vLyA6OiBhcnJheXxhcmd1bWVudHMgLT4gaW50ZWdlcj8gLT4gaW50ZWdlcj8gLT4gYXJyYXlcbmZ1bmN0aW9uIHNsaWNlKGFycmF5LCBuLCBtKSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnJheSwgbiwgbSk7XG59XG5cbi8vIDo6IGFycmF5IC0+IGZuIC0+IGFycmF5XG5mdW5jdGlvbiBtYXAoYXJyYXksIGYpIHtcbiAgcmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBmKHgpO1xuICB9KTtcbn1cblxuLy8gVGhpcyBoYXMgZGlmZmVyZW50IHNlbWFudGljcyB0aGFuIEFycmF5I2V2ZXJ5XG4vLyB1dGlscy5ldmVyeShbMSwgMiwgM10sIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9KTsgLy8gM1xuLy8gWzEsIDIsIDNdLmV2ZXJ5KGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9KTsgLy8gdHJ1ZVxuLy8gOjogYXJyYXkgLT4gZm4gLT4gKlxuZnVuY3Rpb24gZXZlcnkoYXJyYXksIGYpIHtcbiAgdmFyIGFjYyA9IHRydWU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBhY2MgPSBhY2MgJiYgZihhcnJheVtpXSk7XG4gICAgaWYgKCFhY2MpIHtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfVxuICB9XG4gIHJldHVybiBhY2M7XG59XG5cbi8vIDo6IGZuIC0+IGZuXG5mdW5jdGlvbiB5KGYpIHtcbiAgLy8gOjogZm4gLT4gZm5cbiAgZnVuY3Rpb24gcChoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGYuYXBwbHkodW5kZWZpbmVkLCBbaChoKV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiBwKHApO1xufVxuXG4vLyB0cnkgeyB0aHJvdyBuZXcgRXJyb3IoKTsgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmxvZyhlLnN0YWNrKTsgfVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaGFzOiBoYXMsXG4gIGNvbnRhaW5zOiBjb250YWlucyxcbiAgY29weU9iajogY29weU9iaixcbiAgdmFsdWVzOiB2YWx1ZXMsXG4gIG1hcFZhbHVlczogbWFwVmFsdWVzLFxuICBzbGljZTogc2xpY2UsXG4gIG1hcDogbWFwLFxuICBldmVyeTogZXZlcnksXG4gIHk6IHksXG59O1xuIiwiLy8gaHR0cDovL3dpa2kuY29tbW9uanMub3JnL3dpa2kvVW5pdF9UZXN0aW5nLzEuMFxuLy9cbi8vIFRISVMgSVMgTk9UIFRFU1RFRCBOT1IgTElLRUxZIFRPIFdPUksgT1VUU0lERSBWOCFcbi8vXG4vLyBPcmlnaW5hbGx5IGZyb20gbmFyd2hhbC5qcyAoaHR0cDovL25hcndoYWxqcy5vcmcpXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgVGhvbWFzIFJvYmluc29uIDwyODBub3J0aC5jb20+XG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgJ1NvZnR3YXJlJyksIHRvXG4vLyBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZVxuLy8gcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG4vLyBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuLy8gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuLy8gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHdoZW4gdXNlZCBpbiBub2RlLCB0aGlzIHdpbGwgYWN0dWFsbHkgbG9hZCB0aGUgdXRpbCBtb2R1bGUgd2UgZGVwZW5kIG9uXG4vLyB2ZXJzdXMgbG9hZGluZyB0aGUgYnVpbHRpbiB1dGlsIG1vZHVsZSBhcyBoYXBwZW5zIG90aGVyd2lzZVxuLy8gdGhpcyBpcyBhIGJ1ZyBpbiBub2RlIG1vZHVsZSBsb2FkaW5nIGFzIGZhciBhcyBJIGFtIGNvbmNlcm5lZFxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsLycpO1xuXG52YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIDEuIFRoZSBhc3NlcnQgbW9kdWxlIHByb3ZpZGVzIGZ1bmN0aW9ucyB0aGF0IHRocm93XG4vLyBBc3NlcnRpb25FcnJvcidzIHdoZW4gcGFydGljdWxhciBjb25kaXRpb25zIGFyZSBub3QgbWV0LiBUaGVcbi8vIGFzc2VydCBtb2R1bGUgbXVzdCBjb25mb3JtIHRvIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuXG52YXIgYXNzZXJ0ID0gbW9kdWxlLmV4cG9ydHMgPSBvaztcblxuLy8gMi4gVGhlIEFzc2VydGlvbkVycm9yIGlzIGRlZmluZWQgaW4gYXNzZXJ0LlxuLy8gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7IG1lc3NhZ2U6IG1lc3NhZ2UsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWwsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pXG5cbmFzc2VydC5Bc3NlcnRpb25FcnJvciA9IGZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpIHtcbiAgdGhpcy5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcbiAgdGhpcy5hY3R1YWwgPSBvcHRpb25zLmFjdHVhbDtcbiAgdGhpcy5leHBlY3RlZCA9IG9wdGlvbnMuZXhwZWN0ZWQ7XG4gIHRoaXMub3BlcmF0b3IgPSBvcHRpb25zLm9wZXJhdG9yO1xuICBpZiAob3B0aW9ucy5tZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubWVzc2FnZSA9IGdldE1lc3NhZ2UodGhpcyk7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gdHJ1ZTtcbiAgfVxuICB2YXIgc3RhY2tTdGFydEZ1bmN0aW9uID0gb3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb24gfHwgZmFpbDtcblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIG5vbiB2OCBicm93c2VycyBzbyB3ZSBjYW4gaGF2ZSBhIHN0YWNrdHJhY2VcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgdmFyIG91dCA9IGVyci5zdGFjaztcblxuICAgICAgLy8gdHJ5IHRvIHN0cmlwIHVzZWxlc3MgZnJhbWVzXG4gICAgICB2YXIgZm5fbmFtZSA9IHN0YWNrU3RhcnRGdW5jdGlvbi5uYW1lO1xuICAgICAgdmFyIGlkeCA9IG91dC5pbmRleE9mKCdcXG4nICsgZm5fbmFtZSk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgLy8gb25jZSB3ZSBoYXZlIGxvY2F0ZWQgdGhlIGZ1bmN0aW9uIGZyYW1lXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc3RyaXAgb3V0IGV2ZXJ5dGhpbmcgYmVmb3JlIGl0IChhbmQgaXRzIGxpbmUpXG4gICAgICAgIHZhciBuZXh0X2xpbmUgPSBvdXQuaW5kZXhPZignXFxuJywgaWR4ICsgMSk7XG4gICAgICAgIG91dCA9IG91dC5zdWJzdHJpbmcobmV4dF9saW5lICsgMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3RhY2sgPSBvdXQ7XG4gICAgfVxuICB9XG59O1xuXG4vLyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgaW5zdGFuY2VvZiBFcnJvclxudXRpbC5pbmhlcml0cyhhc3NlcnQuQXNzZXJ0aW9uRXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gcmVwbGFjZXIoa2V5LCB2YWx1ZSkge1xuICBpZiAodXRpbC5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgfVxuICBpZiAodXRpbC5pc051bWJlcih2YWx1ZSkgJiYgKGlzTmFOKHZhbHVlKSB8fCAhaXNGaW5pdGUodmFsdWUpKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIGlmICh1dGlsLmlzRnVuY3Rpb24odmFsdWUpIHx8IHV0aWwuaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiB0cnVuY2F0ZShzLCBuKSB7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHMpKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoIDwgbiA/IHMgOiBzLnNsaWNlKDAsIG4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2Uoc2VsZikge1xuICByZXR1cm4gdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5hY3R1YWwsIHJlcGxhY2VyKSwgMTI4KSArICcgJyArXG4gICAgICAgICBzZWxmLm9wZXJhdG9yICsgJyAnICtcbiAgICAgICAgIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuZXhwZWN0ZWQsIHJlcGxhY2VyKSwgMTI4KTtcbn1cblxuLy8gQXQgcHJlc2VudCBvbmx5IHRoZSB0aHJlZSBrZXlzIG1lbnRpb25lZCBhYm92ZSBhcmUgdXNlZCBhbmRcbi8vIHVuZGVyc3Rvb2QgYnkgdGhlIHNwZWMuIEltcGxlbWVudGF0aW9ucyBvciBzdWIgbW9kdWxlcyBjYW4gcGFzc1xuLy8gb3RoZXIga2V5cyB0byB0aGUgQXNzZXJ0aW9uRXJyb3IncyBjb25zdHJ1Y3RvciAtIHRoZXkgd2lsbCBiZVxuLy8gaWdub3JlZC5cblxuLy8gMy4gQWxsIG9mIHRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIG11c3QgdGhyb3cgYW4gQXNzZXJ0aW9uRXJyb3Jcbi8vIHdoZW4gYSBjb3JyZXNwb25kaW5nIGNvbmRpdGlvbiBpcyBub3QgbWV0LCB3aXRoIGEgbWVzc2FnZSB0aGF0XG4vLyBtYXkgYmUgdW5kZWZpbmVkIGlmIG5vdCBwcm92aWRlZC4gIEFsbCBhc3NlcnRpb24gbWV0aG9kcyBwcm92aWRlXG4vLyBib3RoIHRoZSBhY3R1YWwgYW5kIGV4cGVjdGVkIHZhbHVlcyB0byB0aGUgYXNzZXJ0aW9uIGVycm9yIGZvclxuLy8gZGlzcGxheSBwdXJwb3Nlcy5cblxuZnVuY3Rpb24gZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvciwgc3RhY2tTdGFydEZ1bmN0aW9uKSB7XG4gIHRocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe1xuICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgYWN0dWFsOiBhY3R1YWwsXG4gICAgZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcbiAgICBzdGFja1N0YXJ0RnVuY3Rpb246IHN0YWNrU3RhcnRGdW5jdGlvblxuICB9KTtcbn1cblxuLy8gRVhURU5TSU9OISBhbGxvd3MgZm9yIHdlbGwgYmVoYXZlZCBlcnJvcnMgZGVmaW5lZCBlbHNld2hlcmUuXG5hc3NlcnQuZmFpbCA9IGZhaWw7XG5cbi8vIDQuIFB1cmUgYXNzZXJ0aW9uIHRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyB0cnV0aHksIGFzIGRldGVybWluZWRcbi8vIGJ5ICEhZ3VhcmQuXG4vLyBhc3NlcnQub2soZ3VhcmQsIG1lc3NhZ2Vfb3B0KTtcbi8vIFRoaXMgc3RhdGVtZW50IGlzIGVxdWl2YWxlbnQgdG8gYXNzZXJ0LmVxdWFsKHRydWUsICEhZ3VhcmQsXG4vLyBtZXNzYWdlX29wdCk7LiBUbyB0ZXN0IHN0cmljdGx5IGZvciB0aGUgdmFsdWUgdHJ1ZSwgdXNlXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwodHJ1ZSwgZ3VhcmQsIG1lc3NhZ2Vfb3B0KTsuXG5cbmZ1bmN0aW9uIG9rKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICghdmFsdWUpIGZhaWwodmFsdWUsIHRydWUsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5vayk7XG59XG5hc3NlcnQub2sgPSBvaztcblxuLy8gNS4gVGhlIGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzaGFsbG93LCBjb2VyY2l2ZSBlcXVhbGl0eSB3aXRoXG4vLyA9PS5cbi8vIGFzc2VydC5lcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPSBleHBlY3RlZCkgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQuZXF1YWwpO1xufTtcblxuLy8gNi4gVGhlIG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHdoZXRoZXIgdHdvIG9iamVjdHMgYXJlIG5vdCBlcXVhbFxuLy8gd2l0aCAhPSBhc3NlcnQubm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RXF1YWwgPSBmdW5jdGlvbiBub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPScsIGFzc2VydC5ub3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDcuIFRoZSBlcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgYSBkZWVwIGVxdWFsaXR5IHJlbGF0aW9uLlxuLy8gYXNzZXJ0LmRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwRXF1YWwnLCBhc3NlcnQuZGVlcEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0J1ZmZlcihhY3R1YWwpICYmIHV0aWwuaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgaWYgKGFjdHVhbC5sZW5ndGggIT0gZXhwZWN0ZWQubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdHVhbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFjdHVhbFtpXSAhPT0gZXhwZWN0ZWRbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICAvLyA3LjIuIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIERhdGUgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIERhdGUgb2JqZWN0IHRoYXQgcmVmZXJzIHRvIHRoZSBzYW1lIHRpbWUuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0RhdGUoYWN0dWFsKSAmJiB1dGlsLmlzRGF0ZShleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMyBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIFJlZ0V4cCBvYmplY3Qgd2l0aCB0aGUgc2FtZSBzb3VyY2UgYW5kXG4gIC8vIHByb3BlcnRpZXMgKGBnbG9iYWxgLCBgbXVsdGlsaW5lYCwgYGxhc3RJbmRleGAsIGBpZ25vcmVDYXNlYCkuXG4gIH0gZWxzZSBpZiAodXRpbC5pc1JlZ0V4cChhY3R1YWwpICYmIHV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5zb3VyY2UgPT09IGV4cGVjdGVkLnNvdXJjZSAmJlxuICAgICAgICAgICBhY3R1YWwuZ2xvYmFsID09PSBleHBlY3RlZC5nbG9iYWwgJiZcbiAgICAgICAgICAgYWN0dWFsLm11bHRpbGluZSA9PT0gZXhwZWN0ZWQubXVsdGlsaW5lICYmXG4gICAgICAgICAgIGFjdHVhbC5sYXN0SW5kZXggPT09IGV4cGVjdGVkLmxhc3RJbmRleCAmJlxuICAgICAgICAgICBhY3R1YWwuaWdub3JlQ2FzZSA9PT0gZXhwZWN0ZWQuaWdub3JlQ2FzZTtcblxuICAvLyA3LjQuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNPYmplY3QoYWN0dWFsKSAmJiAhdXRpbC5pc09iamVjdChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIDcuNSBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIpIHtcbiAgaWYgKHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYSkgfHwgdXRpbC5pc051bGxPclVuZGVmaW5lZChiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS5cbiAgaWYgKGEucHJvdG90eXBlICE9PSBiLnByb3RvdHlwZSkgcmV0dXJuIGZhbHNlO1xuICAvL35+fkkndmUgbWFuYWdlZCB0byBicmVhayBPYmplY3Qua2V5cyB0aHJvdWdoIHNjcmV3eSBhcmd1bWVudHMgcGFzc2luZy5cbiAgLy8gICBDb252ZXJ0aW5nIHRvIGFycmF5IHNvbHZlcyB0aGUgcHJvYmxlbS5cbiAgaWYgKGlzQXJndW1lbnRzKGEpKSB7XG4gICAgaWYgKCFpc0FyZ3VtZW50cyhiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBfZGVlcEVxdWFsKGEsIGIpO1xuICB9XG4gIHRyeSB7XG4gICAgdmFyIGthID0gb2JqZWN0S2V5cyhhKSxcbiAgICAgICAga2IgPSBvYmplY3RLZXlzKGIpLFxuICAgICAgICBrZXksIGk7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIV9kZWVwRXF1YWwoYVtrZXldLCBiW2tleV0pKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIDguIFRoZSBub24tZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGZvciBhbnkgZGVlcCBpbmVxdWFsaXR5LlxuLy8gYXNzZXJ0Lm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3REZWVwRXF1YWwgPSBmdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBFcXVhbCcsIGFzc2VydC5ub3REZWVwRXF1YWwpO1xuICB9XG59O1xuXG4vLyA5LiBUaGUgc3RyaWN0IGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzdHJpY3QgZXF1YWxpdHksIGFzIGRldGVybWluZWQgYnkgPT09LlxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnN0cmljdEVxdWFsID0gZnVuY3Rpb24gc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09PScsIGFzc2VydC5zdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDEwLiBUaGUgc3RyaWN0IG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHN0cmljdCBpbmVxdWFsaXR5LCBhc1xuLy8gZGV0ZXJtaW5lZCBieSAhPT0uICBhc3NlcnQubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90U3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT09JywgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkge1xuICBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGV4cGVjdGVkKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgIHJldHVybiBleHBlY3RlZC50ZXN0KGFjdHVhbCk7XG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChleHBlY3RlZC5jYWxsKHt9LCBhY3R1YWwpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIF90aHJvd3Moc2hvdWxkVGhyb3csIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICB2YXIgYWN0dWFsO1xuXG4gIGlmICh1dGlsLmlzU3RyaW5nKGV4cGVjdGVkKSkge1xuICAgIG1lc3NhZ2UgPSBleHBlY3RlZDtcbiAgICBleHBlY3RlZCA9IG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGJsb2NrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBhY3R1YWwgPSBlO1xuICB9XG5cbiAgbWVzc2FnZSA9IChleHBlY3RlZCAmJiBleHBlY3RlZC5uYW1lID8gJyAoJyArIGV4cGVjdGVkLm5hbWUgKyAnKS4nIDogJy4nKSArXG4gICAgICAgICAgICAobWVzc2FnZSA/ICcgJyArIG1lc3NhZ2UgOiAnLicpO1xuXG4gIGlmIChzaG91bGRUaHJvdyAmJiAhYWN0dWFsKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnTWlzc2luZyBleHBlY3RlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoIXNob3VsZFRocm93ICYmIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnR290IHVud2FudGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICgoc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmIGV4cGVjdGVkICYmXG4gICAgICAhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8ICghc2hvdWxkVGhyb3cgJiYgYWN0dWFsKSkge1xuICAgIHRocm93IGFjdHVhbDtcbiAgfVxufVxuXG4vLyAxMS4gRXhwZWN0ZWQgdG8gdGhyb3cgYW4gZXJyb3I6XG4vLyBhc3NlcnQudGhyb3dzKGJsb2NrLCBFcnJvcl9vcHQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnRocm93cyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFt0cnVlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuLy8gRVhURU5TSU9OISBUaGlzIGlzIGFubm95aW5nIHRvIHdyaXRlIG91dHNpZGUgdGhpcyBtb2R1bGUuXG5hc3NlcnQuZG9lc05vdFRocm93ID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbZmFsc2VdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG5hc3NlcnQuaWZFcnJvciA9IGZ1bmN0aW9uKGVycikgeyBpZiAoZXJyKSB7dGhyb3cgZXJyO319O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChoYXNPd24uY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiBrZXlzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIiksZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTsvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
(9)
});
