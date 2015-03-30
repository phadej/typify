(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jsc = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  var closed = parsed.closed;

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

    if (closed) {
      for (var key in arg) {
        if (!fields[key]) {
          return false;
        }
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
    checkableRecord:  { type: 'record', fields: map checkable, closed: boolean }
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

// :: map checkable -> boolean -> checkableRecord
function record(fields, closed) {
  return { type: "record", fields: fields, closed: !!closed };
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
var toString = Object.prototype.toString;

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
  return toString.call(val) === "[object Date]";
}

// :: any -> boolean
function isRegExp(val) {
  return toString.call(val) === "[object RegExp]";
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

var VERSION = [0, 2, 9];

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
// :: checkableEmbedded -> boolean? -> checkable
function parse(definition, closed) {
  if (p.isString(definition)) {
    return parseCheckableType(definition);
  } else if (p.isFunction(definition)) {
    return cons.user(definition);
  } else if (p.isArray(definition)) {
    var options = utils.map(definition, parse);
    return cons.alt(options);
  } else /* if (p.isObject(definition)) */ {
    var fields = utils.mapValues(definition, parse);
    return cons.record(fields, closed);
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
function addParsedTypes(environment, parsed, closed) {
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

function addType(environment, name, definition, closed) {
  var parsed = {};
  parsed[name] = parse(definition, closed);
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
  record: "string -> map string -> boolean? -> *",
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
  if (util.isNumber(value) && !isFinite(value)) {
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
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
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

},{"util/":15}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],14:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],15:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":14,"_process":13,"inherits":12}]},{},[9])(9)
});